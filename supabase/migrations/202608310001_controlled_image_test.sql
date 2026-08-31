-- Phase 7: local preparation only. Applying this migration does not authorize Google.
create table public.image_test_campaign (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  approved_until timestamptz,
  price_review text,
  reservation_cents integer check (reservation_cents between 1 and 300),
  reserved_cents integer not null default 0 check (reserved_cents between 0 and 300),
  photo_count integer not null default 0 check (photo_count between 0 and 5),
  active_attempt uuid,
  actual_cents integer check (actual_cents >= 0),
  billing_checked_at timestamptz,
  closed_at timestamptz
);
insert into public.image_test_campaign(id) values (true);

create table public.image_test_members (
  user_id uuid primary key references auth.users on delete cascade
);
create table public.image_test_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  photo_id uuid unique references public.project_photos on delete set null,
  content_hash text check (content_hash ~ '^[a-f0-9]{64}$'),
  style text not null check (char_length(style) between 1 and 80),
  budget_euro integer not null check (budget_euro between 100 and 10000),
  consent_id uuid references public.consent_events on delete set null,
  approved_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts between 0 and 2),
  unique(content_hash)
);
create table public.image_test_attempts (
  id uuid primary key,
  test_photo_id uuid not null references public.image_test_photos,
  user_id uuid references auth.users on delete set null,
  status text not null default 'reserved' check (status in ('reserved','succeeded','unknown','discarded','deleted')),
  reserved_cents integer not null check (reserved_cents between 1 and 300),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  provider_request_id text,
  usage jsonb
);
-- At most ten small test images: private DB storage makes deletion transactional.
-- No public URLs, storage orphan cleanup or additional bucket permissions required.
create table public.image_test_results (
  attempt_id uuid primary key references public.image_test_attempts,
  user_id uuid not null references auth.users on delete cascade,
  photo_id uuid not null references public.project_photos on delete cascade,
  image_base64 text not null check (octet_length(image_base64) between 1 and 14000000),
  mime_type text not null check (mime_type in ('image/png','image/jpeg','image/webp')),
  expires_at timestamptz not null default now() + interval '29 days 23 hours'
);

alter table public.image_test_campaign enable row level security;
alter table public.image_test_members enable row level security;
alter table public.image_test_photos enable row level security;
alter table public.image_test_attempts enable row level security;
alter table public.image_test_results enable row level security;
revoke all on public.image_test_campaign, public.image_test_members, public.image_test_photos,
  public.image_test_attempts, public.image_test_results from public, anon, authenticated, service_role;

create function public.image_test_allowed(target_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.image_test_members where user_id = target_user)
    and not exists(select 1 from public.account_deletion_requests where user_id = target_user);
$$;

create function public.image_test_current_consent(target_user uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from (
    select id, action, policy_version from public.consent_events
    where user_id = target_user and consent_kind = 'ai_processing'
    order by event_sequence desc limit 1
  ) latest where action = 'granted' and policy_version = 'vertex-test-v1';
$$;

create function public.image_test_valid_photo(target_user uuid, target_photo uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.image_test_allowed(target_user)
    and public.image_test_current_consent(target_user) is not null
    and coalesce((select action = 'granted' from public.consent_events
      where user_id = target_user and consent_kind = 'photo_storage' order by event_sequence desc limit 1), false)
    and exists(select 1 from public.project_photos p join public.projects j on j.id = p.project_id
      where p.id = target_photo and p.user_id = target_user and j.user_id = target_user and j.deleted_at is null);
$$;

create function public.image_test_state(target_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.image_test_allowed(target_user) then raise exception 'test access denied'; end if;
  return jsonb_build_object(
    'consent', public.image_test_current_consent(target_user) is not null,
    'campaign', (select to_jsonb(c) from public.image_test_campaign c),
    'photos', coalesce((select jsonb_agg(to_jsonb(p)) from public.image_test_photos p where p.user_id = target_user), '[]'::jsonb),
    'attempts', coalesce((select jsonb_agg(to_jsonb(a) order by started_at desc) from public.image_test_attempts a where a.user_id = target_user), '[]'::jsonb)
  );
end;
$$;

create function public.image_test_approve(target_user uuid, target_photo uuid, photo_hash text, target_style text, target_budget integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare existing_id uuid; result_id uuid; count_photos integer;
begin
  select photo_count into count_photos from public.image_test_campaign where id for update;
  if not public.image_test_valid_photo(target_user, target_photo) then raise exception 'photo or consent unavailable'; end if;
  if photo_hash is null or photo_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid hash'; end if;
  if exists(select 1 from public.image_test_campaign where closed_at is not null) then raise exception 'test closed'; end if;
  select id into existing_id from public.image_test_photos where photo_id = target_photo or content_hash = photo_hash;
  if existing_id is not null then
    -- New consent requires deliberate reapproval, without resetting either counter.
    update public.image_test_photos set consent_id = public.image_test_current_consent(target_user)
      where id = existing_id and user_id = target_user and photo_id = target_photo and content_hash = photo_hash;
    if not found then raise exception 'photo already approved with different identity or contents'; end if;
    return existing_id;
  end if;
  if count_photos >= 5 then raise exception 'five photos exhausted'; end if;
  if exists(select 1 from public.image_test_campaign where closed_at is not null) then raise exception 'test closed'; end if;
  insert into public.image_test_photos(user_id, photo_id, content_hash, style, budget_euro, consent_id)
    values(target_user, target_photo, photo_hash, target_style, target_budget, public.image_test_current_consent(target_user)) returning id into result_id;
  update public.image_test_campaign set photo_count = photo_count + 1 where id;
  return result_id;
end;
$$;

create function public.image_test_reserve(target_user uuid, target_test_photo uuid, request_id uuid, photo_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.image_test_campaign; p public.image_test_photos;
begin
  select * into c from public.image_test_campaign where id for update;
  if request_id is null or exists(select 1 from public.image_test_attempts where id = request_id) then raise exception 'duplicate request'; end if;
  if not c.enabled or c.closed_at is not null or c.approved_until is null or c.approved_until <= now()
    or c.price_review is null or length(trim(c.price_review)) = 0 or c.reservation_cents is null then raise exception 'test disabled or price unverified'; end if;
  if c.active_attempt is not null then raise exception 'previous attempt unresolved'; end if;
  if exists(select 1 from public.image_test_attempts where c.billing_checked_at is null or started_at >= c.billing_checked_at)
    then raise exception 'billing reconciliation required'; end if;
  if c.actual_cents >= 300 then raise exception 'actual cost limit reached'; end if;
  select * into p from public.image_test_photos where id = target_test_photo and user_id = target_user for update;
  if not found or not public.image_test_valid_photo(target_user, p.photo_id)
    or p.consent_id is distinct from public.image_test_current_consent(target_user)
    or photo_hash is distinct from p.content_hash then raise exception 'photo or consent changed'; end if;
  if p.attempts >= 2 then raise exception 'two attempts exhausted'; end if;
  if c.reserved_cents + c.reservation_cents > 300 then raise exception 'three euro limit reached'; end if;
  insert into public.image_test_attempts(id, test_photo_id, user_id, reserved_cents)
    values(request_id, p.id, target_user, c.reservation_cents);
  update public.image_test_photos set attempts = attempts + 1 where id = p.id;
  update public.image_test_campaign set reserved_cents = reserved_cents + reservation_cents,
    enabled = false, active_attempt = request_id where id;
  return jsonb_build_object('reservedCents', c.reservation_cents, 'style', p.style, 'budgetEuro', p.budget_euro,
    'grantedAt', (select occurred_at from public.consent_events where id = p.consent_id), 'policyVersion', 'vertex-test-v1');
end;
$$;

create function public.image_test_check_dispatch(target_user uuid, request_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.image_test_attempts a join public.image_test_photos p on p.id = a.test_photo_id
    join public.image_test_campaign c on c.active_attempt = a.id
    where a.id = request_id and a.user_id = target_user and a.status = 'reserved'
      and a.started_at > now() - interval '2 minutes' and c.closed_at is null and c.approved_until > now()
      and public.image_test_valid_photo(target_user, p.photo_id)
      and p.consent_id = public.image_test_current_consent(target_user));
$$;

create function public.image_test_finish(target_user uuid, request_id uuid, result_image text default null,
  result_mime text default null, elapsed_ms integer default null, provider_id text default null, usage_data jsonb default null)
returns text language plpgsql security definer set search_path = '' as $$
declare p public.image_test_photos; a public.image_test_attempts; outcome text;
begin
  perform 1 from public.image_test_campaign where id for update;
  select * into a from public.image_test_attempts where id = request_id and user_id = target_user for update;
  if not found or a.status <> 'reserved' then raise exception 'attempt unavailable'; end if;
  select * into p from public.image_test_photos where id = a.test_photo_id;
  outcome := 'unknown';
  if result_image is not null then
    outcome := 'discarded';
    if public.image_test_check_dispatch(target_user, request_id) then
      insert into public.image_test_results(attempt_id, user_id, photo_id, image_base64, mime_type)
        values(request_id, target_user, p.photo_id, result_image, result_mime);
      outcome := 'succeeded';
    end if;
  end if;
  update public.image_test_attempts set status = outcome, finished_at = now(), duration_ms = elapsed_ms,
    provider_request_id = left(provider_id, 200), usage = usage_data where id = request_id;
  -- Unknown outcomes retain the global lock until an operator reconciles them.
  if outcome <> 'unknown' then update public.image_test_campaign set active_attempt = null where id; end if;
  return outcome;
end;
$$;

create function public.image_test_read_result(target_user uuid, request_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('data', r.image_base64, 'mime', r.mime_type) from public.image_test_results r
    join public.image_test_attempts a on a.id = r.attempt_id
    join public.image_test_photos p on p.id = a.test_photo_id
    where r.attempt_id = request_id and r.user_id = target_user and r.expires_at > now()
      and public.image_test_valid_photo(target_user, r.photo_id)
      and p.consent_id = public.image_test_current_consent(target_user);
$$;

create function public.image_test_delete_result(target_user uuid, request_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.image_test_results where attempt_id = request_id and user_id = target_user;
  update public.image_test_attempts set status = 'deleted' where id = request_id and user_id = target_user and status = 'succeeded';
end;
$$;

-- Existing consent calls also trigger cleanup, including the existing photo withdrawal.
create function public.image_test_consent_cleanup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.action = 'withdrawn' then
    perform 1 from public.image_test_campaign where id for update;
    delete from public.image_test_results where user_id = new.user_id;
    update public.image_test_photos set consent_id = null where user_id = new.user_id;
    update public.image_test_campaign set enabled = false where id;
  end if;
  return new;
end;
$$;
create trigger image_test_consent_cleanup after insert on public.consent_events
  for each row execute function public.image_test_consent_cleanup();

create function public.image_test_photo_cleanup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Once a content fingerprint is erased, duplicates can no longer be detected.
  -- Close this one-off campaign rather than silently permitting a fresh allowance.
  if exists(select 1 from public.image_test_photos where photo_id = old.id) then
    update public.image_test_campaign set enabled = false, closed_at = coalesce(closed_at, now()) where id;
  end if;
  update public.image_test_photos set content_hash = null, consent_id = null, style = 'deleted', budget_euro = 100
    where photo_id = old.id;
  return old;
end;
$$;
create trigger image_test_photo_cleanup before delete on public.project_photos
  for each row execute function public.image_test_photo_cleanup();

create function public.image_test_purge_results() returns void
language sql security definer set search_path = '' as $$
  delete from public.image_test_results where expires_at <= now();
$$;

create function public.image_test_anonymize_attempt() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is null then new.provider_request_id := null; new.usage := null; end if;
  return new;
end;
$$;
create trigger image_test_anonymize_attempt before update on public.image_test_attempts
  for each row execute function public.image_test_anonymize_attempt();

-- Functions accepting target_user are ONLY callable by the authenticated server.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'image_test_%'
  loop execute format('revoke all on function %s from public, anon, authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;
end $$;

-- Local Supabase supports pg_cron; no photo or Google request is scheduled.
create extension if not exists pg_cron;
select cron.schedule('image-test-result-retention', '17 * * * *', 'select public.image_test_purge_results()');
