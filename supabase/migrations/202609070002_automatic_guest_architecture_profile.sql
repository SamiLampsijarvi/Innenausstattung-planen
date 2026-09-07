-- The guest never supplies architecture counts. A server-only scanner adds the
-- profile immediately before a separately approved external generation.
alter table public.guest_image_test_sessions alter column room_fidelity_profile drop not null;

create or replace function public.guest_image_test_prepare(target_session uuid, target_secret_hash text, target_style text,
  target_budget integer, target_profile jsonb, target_source_hash text, target_source_base64 text, target_source_mime text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if target_session is null or target_secret_hash !~ '^[a-f0-9]{64}$' or target_source_hash !~ '^[a-f0-9]{64}$'
    or target_style is null or char_length(target_style) not between 1 and 80 or target_budget not between 100 and 10000
    or (target_profile is not null and not public.guest_image_test_profile_valid(target_profile))
    or target_source_mime not in ('image/png','image/jpeg','image/webp')
    or octet_length(target_source_base64) not between 1 and 10000000 then raise exception 'invalid guest test preparation'; end if;
  if exists(select 1 from public.guest_image_test_sessions where id = target_session) then
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

create function public.guest_image_test_set_room_fidelity(target_session uuid, target_secret_hash text, profile jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.guest_image_test_profile_valid(profile) then raise exception 'invalid room fidelity profile'; end if;
  update public.guest_image_test_sessions set room_fidelity_profile=profile
    where id=target_session and secret_hash=target_secret_hash and revoked_at is null and expires_at>now()
      and not exists(select 1 from public.guest_image_test_attempts where session_id=target_session);
  if not found then raise exception 'guest session unavailable'; end if;
end;
$$;

create or replace function public.guest_image_test_reserve(target_session uuid, target_secret_hash text, request_id uuid)
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
  if not found or s.room_fidelity_profile is null then raise exception 'architecture scan required'; end if;
  insert into public.guest_image_test_attempts(id,session_id,reserved_cents) values(request_id,s.id,c.reservation_cents);
  update public.image_test_campaign set reserved_cents=reserved_cents+reservation_cents,enabled=false,active_attempt=request_id where id;
  return jsonb_build_object('reservedCents',c.reservation_cents,'style',s.style,'budgetEuro',s.budget_euro,'grantedAt',s.consent_at,'policyVersion','guest-vertex-test-v1','roomFidelityProfile',s.room_fidelity_profile);
end;
$$;
do $$ declare f regprocedure; begin
  foreach f in array array['public.guest_image_test_set_room_fidelity(uuid,text,jsonb)'::regprocedure]
  loop execute format('revoke all on function %s from public, anon, authenticated', f); execute format('grant execute on function %s to service_role', f); end loop;
end $$;
