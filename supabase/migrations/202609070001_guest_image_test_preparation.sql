-- Phase 15: anonymous, short-lived image-test preparation.
-- This migration is deliberately inert: it neither enables a campaign nor calls Google.
-- Source/result bytes are private database values so that one purge is transactional.
create table public.guest_image_test_sessions (
  id uuid primary key,
  secret_hash text not null check (secret_hash ~ '^[a-f0-9]{64}$'),
  consent_at timestamptz not null,
  style text not null check (char_length(style) between 1 and 80),
  budget_euro integer not null check (budget_euro between 100 and 10000),
  room_fidelity_profile jsonb not null,
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  source_base64 text check (source_base64 is null or octet_length(source_base64) between 1 and 10000000),
  source_mime text not null check (source_mime in ('image/png','image/jpeg','image/webp')),
  expires_at timestamptz not null default now() + interval '24 hours',
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.guest_image_test_attempts (
  id uuid primary key,
  session_id uuid not null references public.guest_image_test_sessions on delete cascade,
  status text not null default 'reserved' check (status in ('reserved','succeeded','unknown','discarded','deleted')),
  reserved_cents integer not null check (reserved_cents between 1 and 300),
  started_at timestamptz not null default now(), finished_at timestamptz, duration_ms integer,
  provider_request_id text, usage jsonb,
  room_fidelity_status text not null default 'pending' check (room_fidelity_status in ('pending','accepted','rejected')),
  automatic_fidelity_status text not null default 'not_checked' check (automatic_fidelity_status in ('not_checked','passed','rejected')),
  automatic_fidelity_report jsonb
);
create table public.guest_image_test_results (
  attempt_id uuid primary key references public.guest_image_test_attempts on delete cascade,
  image_base64 text not null check (octet_length(image_base64) between 1 and 14000000),
  mime_type text not null check (mime_type in ('image/png','image/jpeg','image/webp')),
  expires_at timestamptz not null default now() + interval '24 hours'
);
alter table public.guest_image_test_sessions enable row level security;
alter table public.guest_image_test_attempts enable row level security;
alter table public.guest_image_test_results enable row level security;
revoke all on public.guest_image_test_sessions, public.guest_image_test_attempts, public.guest_image_test_results from public, anon, authenticated, service_role;

create function public.guest_image_test_profile_valid(profile jsonb) returns boolean language sql immutable security definer set search_path = '' as $$
  select profile is not null and jsonb_typeof(profile) = 'object'
    and profile ?& array['doors','windows','openings','protectedArchitecture']
    and profile->>'protectedArchitecture' = 'true'
    and profile->>'doors' ~ '^(0|[1-9]|1[0-2])$'
    and profile->>'windows' ~ '^(0|[1-9]|1[0-2])$'
    and profile->>'openings' ~ '^(0|[1-9]|1[0-2])$';
$$;

create function public.guest_image_test_prepare(target_session uuid, target_secret_hash text, target_style text,
  target_budget integer, target_profile jsonb, target_source_hash text, target_source_base64 text, target_source_mime text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if target_session is null or target_secret_hash !~ '^[a-f0-9]{64}$' or target_source_hash !~ '^[a-f0-9]{64}$'
    or target_style is null or char_length(target_style) not between 1 and 80 or target_budget not between 100 and 10000
    or not public.guest_image_test_profile_valid(target_profile)
    or target_source_mime not in ('image/png','image/jpeg','image/webp')
    or octet_length(target_source_base64) not between 1 and 10000000 then raise exception 'invalid guest test preparation'; end if;
  if exists(select 1 from public.guest_image_test_sessions where id = target_session) then
    -- A session cannot be silently reused after dispatch or revocation.
    update public.guest_image_test_sessions set consent_at=now(), style=target_style, budget_euro=target_budget,
      room_fidelity_profile=target_profile, source_hash=target_source_hash, source_base64=target_source_base64,
      source_mime=target_source_mime, expires_at=now()+interval '24 hours'
      where id=target_session and secret_hash=target_secret_hash and revoked_at is null and expires_at > now()
        and not exists(select 1 from public.guest_image_test_attempts where session_id=target_session);
    if not found then raise exception 'guest session unavailable'; end if;
  else
    insert into public.guest_image_test_sessions(id,secret_hash,consent_at,style,budget_euro,room_fidelity_profile,source_hash,source_base64,source_mime)
      values(target_session,target_secret_hash,now(),target_style,target_budget,target_profile,target_source_hash,target_source_base64,target_source_mime);
  end if;
end;
$$;

create function public.guest_image_test_state(target_session uuid, target_secret_hash text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('prepared', true, 'expiresAt', s.expires_at,
    'attempts', coalesce((select jsonb_agg(to_jsonb(a) order by a.started_at desc) from public.guest_image_test_attempts a where a.session_id=s.id), '[]'::jsonb))
  from public.guest_image_test_sessions s where s.id=target_session and s.secret_hash=target_secret_hash and s.revoked_at is null and s.expires_at > now();
$$;

create function public.guest_image_test_reserve(target_session uuid, target_secret_hash text, request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.image_test_campaign; s public.guest_image_test_sessions;
begin
  select * into c from public.image_test_campaign where id for update;
  if request_id is null or exists(select 1 from public.image_test_attempts where id=request_id) or exists(select 1 from public.guest_image_test_attempts where id=request_id) then raise exception 'duplicate request'; end if;
  if not c.enabled or c.closed_at is not null or c.approved_until is null or c.approved_until <= now() or c.price_review is null
    or length(trim(c.price_review))=0 or c.reservation_cents is null then raise exception 'test disabled or price unverified'; end if;
  if c.active_attempt is not null then raise exception 'previous attempt unresolved'; end if;
  if exists(select 1 from public.image_test_attempts where c.billing_checked_at is null or started_at >= c.billing_checked_at)
    or exists(select 1 from public.guest_image_test_attempts where c.billing_checked_at is null or started_at >= c.billing_checked_at)
    then raise exception 'billing reconciliation required'; end if;
  if coalesce(c.actual_cents,0) >= 300 or c.reserved_cents+c.reservation_cents > 300 then raise exception 'test budget reached'; end if;
  select * into s from public.guest_image_test_sessions where id=target_session and secret_hash=target_secret_hash and revoked_at is null and expires_at > now() for update;
  if not found then raise exception 'guest consent unavailable'; end if;
  insert into public.guest_image_test_attempts(id,session_id,reserved_cents) values(request_id,s.id,c.reservation_cents);
  update public.image_test_campaign set reserved_cents=reserved_cents+reservation_cents,enabled=false,active_attempt=request_id where id;
  return jsonb_build_object('reservedCents',c.reservation_cents,'style',s.style,'budgetEuro',s.budget_euro,'grantedAt',s.consent_at,'policyVersion','guest-vertex-test-v1','roomFidelityProfile',s.room_fidelity_profile);
end;
$$;

create function public.guest_image_test_check_dispatch(target_session uuid, target_secret_hash text, request_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.guest_image_test_attempts a join public.guest_image_test_sessions s on s.id=a.session_id join public.image_test_campaign c on c.active_attempt=a.id
    where a.id=request_id and s.id=target_session and s.secret_hash=target_secret_hash and a.status='reserved' and a.started_at>now()-interval '2 minutes'
      and s.revoked_at is null and s.expires_at>now() and c.closed_at is null and c.approved_until>now());
$$;

create function public.guest_image_test_finish(target_session uuid, target_secret_hash text, request_id uuid, result_image text default null,
  result_mime text default null, elapsed_ms integer default null, provider_id text default null, usage_data jsonb default null) returns text
language plpgsql security definer set search_path = '' as $$
declare a public.guest_image_test_attempts; validation jsonb; validation_status text; outcome text := 'unknown';
begin
  perform 1 from public.image_test_campaign where id for update;
  select a.* into a from public.guest_image_test_attempts a join public.guest_image_test_sessions s on s.id=a.session_id
    where a.id=request_id and s.id=target_session and s.secret_hash=target_secret_hash for update;
  if not found or a.status <> 'reserved' then raise exception 'attempt unavailable'; end if;
  validation:=usage_data->'raumlyValidation'; validation_status:=validation->>'status';
  if provider_id is not null and validation_status='rejected' then outcome:='discarded'; update public.guest_image_test_attempts set room_fidelity_status='rejected' where id=request_id;
  elsif result_image is not null and result_mime in ('image/png','image/jpeg','image/webp') and validation_status='passed' and public.guest_image_test_check_dispatch(target_session,target_secret_hash,request_id) then
    insert into public.guest_image_test_results(attempt_id,image_base64,mime_type) values(request_id,result_image,result_mime); outcome:='succeeded';
  end if;
  update public.guest_image_test_attempts set status=outcome,finished_at=now(),duration_ms=elapsed_ms,provider_request_id=left(provider_id,200),usage=usage_data-'raumlyValidation',
    automatic_fidelity_status=case when validation_status in ('passed','rejected') then validation_status else 'not_checked' end,
    automatic_fidelity_report=case when validation_status in ('passed','rejected') then validation else null end where id=request_id;
  if outcome <> 'unknown' then update public.image_test_campaign set active_attempt=null where id; end if;
  return outcome;
end;
$$;

create function public.guest_image_test_review(target_session uuid, target_secret_hash text, request_id uuid, accepted boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if accepted then
    update public.guest_image_test_attempts a set room_fidelity_status='accepted' from public.guest_image_test_sessions s
      where a.id=request_id and a.session_id=s.id and s.id=target_session and s.secret_hash=target_secret_hash and a.status='succeeded' and a.room_fidelity_status='pending';
    if not found then raise exception 'room fidelity review unavailable'; end if;
    return;
  end if;
  delete from public.guest_image_test_results r using public.guest_image_test_attempts a, public.guest_image_test_sessions s
    where r.attempt_id=a.id and a.id=request_id and a.session_id=s.id and s.id=target_session and s.secret_hash=target_secret_hash;
  update public.guest_image_test_attempts a set room_fidelity_status='rejected',status='discarded' from public.guest_image_test_sessions s
    where a.id=request_id and a.session_id=s.id and s.id=target_session and s.secret_hash=target_secret_hash and a.status='succeeded' and a.room_fidelity_status='pending';
  if not found then raise exception 'room fidelity review unavailable'; end if;
end;
$$;

create function public.guest_image_test_read_result(target_session uuid, target_secret_hash text, request_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('data',r.image_base64,'mime',r.mime_type) from public.guest_image_test_results r join public.guest_image_test_attempts a on a.id=r.attempt_id join public.guest_image_test_sessions s on s.id=a.session_id
 where r.attempt_id=request_id and s.id=target_session and s.secret_hash=target_secret_hash and s.revoked_at is null and s.expires_at>now() and r.expires_at>now() and a.room_fidelity_status='accepted';
$$;
create function public.guest_image_test_revoke(target_session uuid, target_secret_hash text) returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.guest_image_test_results r using public.guest_image_test_attempts a where r.attempt_id=a.id and a.session_id=target_session;
  update public.guest_image_test_sessions set source_base64=null, revoked_at=now() where id=target_session and secret_hash=target_secret_hash;
  if not found then raise exception 'guest session unavailable'; end if;
  update public.image_test_campaign set enabled=false where active_attempt in (select id from public.guest_image_test_attempts where session_id=target_session and status='reserved');
end;
$$;
create function public.guest_image_test_purge() returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.guest_image_test_sessions where expires_at <= now() or revoked_at is not null;
end;
$$;
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'guest_image_test_%'
 loop execute format('revoke all on function %s from public, anon, authenticated',f.signature); execute format('grant execute on function %s to service_role',f.signature); end loop;
end $$;
select cron.schedule('guest-image-test-retention', '23 * * * *', 'select public.guest_image_test_purge()');
