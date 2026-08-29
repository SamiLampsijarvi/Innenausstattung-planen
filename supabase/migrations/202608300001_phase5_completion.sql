create table if not exists public.account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_number text not null unique check (account_number ~ '^[0-9]{8}$'),
  created_at timestamptz not null default now()
);

alter table public.account_profiles enable row level security;
revoke all on table public.account_profiles from public, anon, authenticated;
grant select on table public.account_profiles to authenticated;

drop policy if exists "Users read own account profile" on public.account_profiles;
create policy "Users read own account profile" on public.account_profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.ensure_account_profile(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
  attempt integer := 0;
begin
  if exists (select 1 from public.account_profiles where user_id = target_user_id) then
    return;
  end if;

  loop
    attempt := attempt + 1;
    candidate := lpad(floor(random() * 100000000)::bigint::text, 8, '0');
    begin
      insert into public.account_profiles (user_id, account_number)
      values (target_user_id, candidate);
      return;
    exception when unique_violation then
      if attempt >= 20 then
        raise exception 'account number allocation failed';
      end if;
    end;
  end loop;
end;
$$;

revoke all on function public.ensure_account_profile(uuid) from public, anon, authenticated;

create or replace function public.create_account_profile_after_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.ensure_account_profile(new.id);
  return new;
end;
$$;

revoke all on function public.create_account_profile_after_signup() from public, anon, authenticated;

drop trigger if exists create_account_profile_after_signup on auth.users;
create trigger create_account_profile_after_signup
  after insert on auth.users
  for each row execute function public.create_account_profile_after_signup();

do $$
declare
  existing_user record;
begin
  for existing_user in select id from auth.users loop
    perform public.ensure_account_profile(existing_user.id);
  end loop;
end;
$$;

create table if not exists public.consent_events (
  id uuid primary key default gen_random_uuid(),
  event_sequence bigint generated always as identity unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_kind text not null check (consent_kind in ('photo_storage', 'ai_processing')),
  action text not null check (action in ('granted', 'withdrawn')),
  policy_version text not null check (char_length(policy_version) between 1 and 40),
  occurred_at timestamptz not null default now()
);

create index if not exists consent_events_user_kind_time_idx
  on public.consent_events (user_id, consent_kind, event_sequence desc);

alter table public.consent_events enable row level security;
revoke all on table public.consent_events from public, anon, authenticated;
grant select on table public.consent_events to authenticated;

drop policy if exists "Users read own consent history" on public.consent_events;
create policy "Users read own consent history" on public.consent_events
  for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.record_own_consent(
  target_kind text,
  target_action text,
  target_policy_version text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  recorded_at timestamptz;
begin
  if caller_id is null then raise exception 'authentication required'; end if;
  if target_kind not in ('photo_storage', 'ai_processing') then raise exception 'invalid consent kind'; end if;
  if target_action not in ('granted', 'withdrawn') then raise exception 'invalid consent action'; end if;
  if target_policy_version is null or char_length(target_policy_version) not between 1 and 40 then
    raise exception 'invalid policy version';
  end if;

  insert into public.consent_events (user_id, consent_kind, action, policy_version)
  values (caller_id, target_kind, target_action, target_policy_version)
  returning occurred_at into recorded_at;
  return recorded_at;
end;
$$;

revoke all on function public.record_own_consent(text, text, text) from public, anon;
grant execute on function public.record_own_consent(text, text, text) to authenticated;

create or replace function public.has_active_consent(required_kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select event.action = 'granted'
    from public.consent_events event
    where event.user_id = (select auth.uid()) and event.consent_kind = required_kind
    order by event.event_sequence desc
    limit 1
  ), false);
$$;

revoke all on function public.has_active_consent(text) from public, anon;
grant execute on function public.has_active_consent(text) to authenticated;

drop policy if exists "Users create own photo metadata" on public.project_photos;
create policy "Users create own photo metadata" on public.project_photos
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.has_active_consent('photo_storage')
    and exists (
      select 1 from public.projects project
      where project.id = project_id
        and project.user_id = (select auth.uid())
        and project.deleted_at is null
    )
    and not exists (
      select 1 from public.account_deletion_requests request
      where request.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users upload own active room photos" on storage.objects;
create policy "Users upload own active room photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'room-photos'
    and public.has_active_consent('photo_storage')
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1 from public.projects project
      where project.id::text = (storage.foldername(name))[2]
        and project.user_id = (select auth.uid())
        and project.deleted_at is null
    )
    and not exists (
      select 1 from public.account_deletion_requests request
      where request.user_id = (select auth.uid())
    )
  );
