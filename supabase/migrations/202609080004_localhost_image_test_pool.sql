-- A fresh localhost pool keeps the permanently closed historical campaign and
-- its accounting immutable. Its starting balance includes all prior reserves.
create table public.localhost_image_test_pool (
  id boolean primary key default true check (id),
  historical_reserved_cents integer not null check (historical_reserved_cents between 0 and 300),
  reserved_cents integer not null default 0 check (reserved_cents between 0 and 300),
  maximum_total_cents integer not null default 300 check (maximum_total_cents = 300),
  active_attempt uuid,
  created_at timestamptz not null default now()
);
alter table public.localhost_image_test_pool enable row level security;
revoke all on public.localhost_image_test_pool from public, anon, authenticated, service_role;
insert into public.localhost_image_test_pool(id,historical_reserved_cents)
  select true, coalesce(reserved_cents,0) from public.image_test_campaign where id
  on conflict (id) do nothing;

create or replace function public.guest_image_test_reserve(target_session uuid, target_secret_hash text, request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.localhost_image_test_pool; s public.guest_image_test_sessions;
begin
  select * into p from public.localhost_image_test_pool where id for update;
  if request_id is null or exists(select 1 from public.guest_image_test_attempts where id=request_id) then raise exception 'duplicate request'; end if;
  if p.active_attempt is not null then raise exception 'previous attempt unresolved'; end if;
  if p.historical_reserved_cents + p.reserved_cents + 30 > p.maximum_total_cents then raise exception 'localhost test budget reached'; end if;
  select * into s from public.guest_image_test_sessions where id=target_session and secret_hash=target_secret_hash and revoked_at is null and expires_at>now() for update;
  if not found or s.source_base64 is null then raise exception 'guest consent unavailable'; end if;
  insert into public.guest_image_test_attempts(id,session_id,reserved_cents) values(request_id,s.id,30);
  update public.localhost_image_test_pool set reserved_cents=reserved_cents+30,active_attempt=request_id where id;
  return jsonb_build_object('reservedCents',30,'style',s.style,'budgetEuro',s.budget_euro,'grantedAt',s.consent_at,'policyVersion','localhost-one-click-v1');
end;
$$;

create or replace function public.guest_image_test_check_dispatch(target_session uuid, target_secret_hash text, request_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.guest_image_test_attempts a join public.guest_image_test_sessions s on s.id=a.session_id join public.localhost_image_test_pool p on p.active_attempt=a.id
    where a.id=request_id and s.id=target_session and s.secret_hash=target_secret_hash and a.status='reserved' and a.started_at>now()-interval '2 minutes'
      and s.revoked_at is null and s.expires_at>now());
$$;

create or replace function public.guest_image_test_finish(target_session uuid, target_secret_hash text, request_id uuid, result_image text default null,
  result_mime text default null, elapsed_ms integer default null, provider_id text default null, usage_data jsonb default null) returns text
language plpgsql security definer set search_path = '' as $$
declare a public.guest_image_test_attempts; validation jsonb; validation_status text; outcome text := 'unknown';
begin
  perform 1 from public.localhost_image_test_pool where id for update;
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
  if outcome <> 'unknown' then update public.localhost_image_test_pool set active_attempt=null where id; end if;
  return outcome;
end;
$$;

do $$ declare f regprocedure; begin
  foreach f in array array['public.guest_image_test_reserve(uuid,text,uuid)'::regprocedure,'public.guest_image_test_check_dispatch(uuid,text,uuid)'::regprocedure,'public.guest_image_test_finish(uuid,text,uuid,text,text,integer,text,jsonb)'::regprocedure]
  loop execute format('revoke all on function %s from public, anon, authenticated',f); execute format('grant execute on function %s to service_role',f); end loop;
end $$;
