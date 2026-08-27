create extension if not exists pgcrypto;

alter table public.projects
  add column if not exists deleted_at timestamptz,
  add column if not exists purge_attempts integer not null default 0,
  add column if not exists last_purge_error text;

create index if not exists projects_user_deleted_idx
  on public.projects (user_id, deleted_at);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  delete_after timestamptz not null,
  purge_attempts integer not null default 0,
  last_purge_error text,
  check (delete_after >= requested_at + interval '14 days')
);

create table if not exists public.deletion_audit (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  event_type text not null check (event_type in ('requested', 'cancelled', 'completed', 'failed')),
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);

alter table public.account_deletion_requests enable row level security;
alter table public.deletion_audit enable row level security;

revoke all on table public.account_deletion_requests from anon, authenticated;
revoke all on table public.deletion_audit from anon, authenticated;
grant select on table public.account_deletion_requests to authenticated;

drop policy if exists "Users read own deletion request" on public.account_deletion_requests;
create policy "Users read own deletion request" on public.account_deletion_requests
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users read own projects" on public.projects;
drop policy if exists "Users create own projects" on public.projects;
drop policy if exists "Users update own projects" on public.projects;
drop policy if exists "Users delete own projects" on public.projects;

create policy "Users read own projects" on public.projects
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    and not exists (
      select 1 from public.account_deletion_requests request
      where request.user_id = (select auth.uid())
    )
  );

create policy "Users create own projects" on public.projects
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and deleted_at is null
    and not exists (
      select 1 from public.account_deletion_requests request
      where request.user_id = (select auth.uid())
    )
  );

create policy "Users update own projects" on public.projects
  for update to authenticated
  using (
    (select auth.uid()) = user_id
    and not exists (
      select 1 from public.account_deletion_requests request
      where request.user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = user_id
    and not exists (
      select 1 from public.account_deletion_requests request
      where request.user_id = (select auth.uid())
    )
  );

revoke insert, update, delete on table public.projects from authenticated;
grant insert (id, user_id, name, living_room, created_at, updated_at)
  on table public.projects to authenticated;
grant update (name, living_room, updated_at, deleted_at)
  on table public.projects to authenticated;

drop policy if exists "Users read own photo metadata" on public.project_photos;
drop policy if exists "Users create own photo metadata" on public.project_photos;
drop policy if exists "Users delete own photo metadata" on public.project_photos;

create policy "Users read own photo metadata" on public.project_photos
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.projects project
      where project.id = project_id and project.deleted_at is null
    )
    and not exists (
      select 1 from public.account_deletion_requests request
      where request.user_id = (select auth.uid())
    )
  );

create policy "Users create own photo metadata" on public.project_photos
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
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

create policy "Users delete own photo metadata" on public.project_photos
  for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.projects project
      where project.id = project_id and project.deleted_at is null
    )
    and not exists (
      select 1 from public.account_deletion_requests request
      where request.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users read own room photos" on storage.objects;
drop policy if exists "Users upload own room photos" on storage.objects;
drop policy if exists "Users update own room photos" on storage.objects;
drop policy if exists "Users delete own room photos" on storage.objects;

create policy "Users read own active room photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'room-photos'
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

create policy "Users upload own active room photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'room-photos'
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

create policy "Users update own active room photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'room-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1 from public.projects project
      where project.id::text = (storage.foldername(name))[2]
        and project.user_id = (select auth.uid())
        and project.deleted_at is null
    )
  )
  with check (
    bucket_id = 'room-photos'
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

create policy "Users delete own active room photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'room-photos'
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

create or replace function public.request_account_deletion()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_row public.account_deletion_requests;
begin
  if caller_id is null then
    raise exception 'authentication required';
  end if;

  insert into public.account_deletion_requests (user_id, delete_after)
  values (caller_id, now() + interval '14 days')
  on conflict (user_id) do update
    set requested_at = excluded.requested_at,
        delete_after = excluded.delete_after,
        purge_attempts = 0,
        last_purge_error = null
  returning * into request_row;

  insert into public.deletion_audit (request_id, event_type)
  values (request_row.id, 'requested');

  return request_row.delete_after;
end;
$$;

create or replace function public.cancel_account_deletion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_id uuid;
begin
  if caller_id is null then
    raise exception 'authentication required';
  end if;

  delete from public.account_deletion_requests
  where user_id = caller_id and delete_after > now()
  returning id into request_id;

  if request_id is null then
    raise exception 'no cancellable deletion request';
  end if;

  insert into public.deletion_audit (request_id, event_type)
  values (request_id, 'cancelled');
end;
$$;

create or replace function public.record_project_purge_failure(target_project_id uuid, failure_message text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.projects
  set purge_attempts = purge_attempts + 1,
      last_purge_error = left(failure_message, 1000)
  where id = target_project_id;
$$;

create or replace function public.record_account_purge_failure(target_request_id uuid, failure_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.account_deletion_requests
  set purge_attempts = purge_attempts + 1,
      last_purge_error = left(failure_message, 1000)
  where id = target_request_id;

  insert into public.deletion_audit (request_id, event_type, details)
  values (target_request_id, 'failed', jsonb_build_object('message', left(failure_message, 1000)));
end;
$$;

revoke all on function public.request_account_deletion() from public;
revoke all on function public.cancel_account_deletion() from public;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;

revoke all on function public.record_project_purge_failure(uuid, text) from public, anon, authenticated;
revoke all on function public.record_account_purge_failure(uuid, text) from public, anon, authenticated;
grant execute on function public.record_project_purge_failure(uuid, text) to service_role;
grant execute on function public.record_account_purge_failure(uuid, text) to service_role;

revoke execute on function public.delete_own_account() from authenticated;
