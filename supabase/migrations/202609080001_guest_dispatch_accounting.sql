-- Reserve the complete, explicitly approved test allowance before the first
-- external request (architecture scan or image generation) is dispatched.
create or replace function public.guest_image_test_set_room_fidelity(target_session uuid, target_secret_hash text, profile jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.guest_image_test_profile_valid(profile) then raise exception 'invalid room fidelity profile'; end if;
  update public.guest_image_test_sessions set room_fidelity_profile=profile
    where id=target_session and secret_hash=target_secret_hash and revoked_at is null and expires_at>now()
      and not exists(select 1 from public.guest_image_test_attempts where session_id=target_session and status not in ('reserved'));
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
    or exists(select 1 from public.guest_image_test_attempts where c.billing_checked_at is null or started_at >= c.billing_checked_at) then raise exception 'billing reconciliation required'; end if;
  if coalesce(c.actual_cents,0) >= 300 or c.reserved_cents+c.reservation_cents > 300 then raise exception 'test budget reached'; end if;
  select * into s from public.guest_image_test_sessions where id=target_session and secret_hash=target_secret_hash and revoked_at is null and expires_at>now() for update;
  if not found or s.source_base64 is null then raise exception 'guest consent unavailable'; end if;
  insert into public.guest_image_test_attempts(id,session_id,reserved_cents) values(request_id,s.id,c.reservation_cents);
  update public.image_test_campaign set reserved_cents=reserved_cents+reservation_cents,enabled=false,active_attempt=request_id where id;
  return jsonb_build_object('reservedCents',c.reservation_cents,'style',s.style,'budgetEuro',s.budget_euro,'grantedAt',s.consent_at,'policyVersion','guest-vertex-test-v1');
end;
$$;

create function public.guest_image_test_read_source(target_session uuid, target_secret_hash text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('data',source_base64,'mime',source_mime) from public.guest_image_test_sessions
  where id=target_session and secret_hash=target_secret_hash and revoked_at is null and expires_at>now() and source_base64 is not null;
$$;
do $$ declare f regprocedure; begin
  foreach f in array array['public.guest_image_test_read_source(uuid,text)'::regprocedure]
  loop execute format('revoke all on function %s from public, anon, authenticated', f); execute format('grant execute on function %s to service_role', f); end loop;
end $$;
