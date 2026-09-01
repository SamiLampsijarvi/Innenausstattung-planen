alter table public.image_test_photos add column room_fidelity_profile jsonb;
alter table public.image_test_attempts add column room_fidelity_status text not null default 'pending'
  check (room_fidelity_status in ('pending','accepted','rejected'));

create function public.image_test_set_room_fidelity(
  target_user uuid, target_test_photo uuid, profile jsonb
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if profile is null or jsonb_typeof(profile) <> 'object'
    or not (profile ?& array['doors','windows','openings','protectedArchitecture'])
    or profile->>'protectedArchitecture' <> 'true'
    or profile->>'doors' !~ '^(0|[1-9]|1[0-2])$'
    or profile->>'windows' !~ '^(0|[1-9]|1[0-2])$'
    or profile->>'openings' !~ '^(0|[1-9]|1[0-2])$' then
    raise exception 'invalid room fidelity profile';
  end if;
  update public.image_test_photos set room_fidelity_profile = profile
    where id = target_test_photo and user_id = target_user and attempts = 0
      and public.image_test_valid_photo(target_user, photo_id);
  if not found then raise exception 'room fidelity profile unavailable'; end if;
end;
$$;

create or replace function public.image_test_reserve(target_user uuid, target_test_photo uuid, request_id uuid, photo_hash text)
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
  if p.room_fidelity_profile is null then raise exception 'room fidelity profile required'; end if;
  if p.attempts >= 2 then raise exception 'two attempts exhausted'; end if;
  if c.reserved_cents + c.reservation_cents > 300 then raise exception 'three euro limit reached'; end if;
  insert into public.image_test_attempts(id, test_photo_id, user_id, reserved_cents)
    values(request_id, p.id, target_user, c.reservation_cents);
  update public.image_test_photos set attempts = attempts + 1 where id = p.id;
  update public.image_test_campaign set reserved_cents = reserved_cents + reservation_cents,
    enabled = false, active_attempt = request_id where id;
  return jsonb_build_object('reservedCents', c.reservation_cents, 'style', p.style, 'budgetEuro', p.budget_euro,
    'grantedAt', (select occurred_at from public.consent_events where id = p.consent_id), 'policyVersion', 'vertex-test-v1',
    'roomFidelityProfile', p.room_fidelity_profile);
end;
$$;

create function public.image_test_review_room_fidelity(
  target_user uuid, request_id uuid, accepted boolean
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if accepted then
    update public.image_test_attempts set room_fidelity_status = 'accepted'
      where id = request_id and user_id = target_user and status = 'succeeded' and room_fidelity_status = 'pending';
  else
    delete from public.image_test_results where attempt_id = request_id and user_id = target_user;
    update public.image_test_attempts set room_fidelity_status = 'rejected', status = 'discarded'
      where id = request_id and user_id = target_user and status = 'succeeded' and room_fidelity_status = 'pending';
  end if;
  if not found then raise exception 'room fidelity review unavailable'; end if;
end;
$$;

do $$ declare f regprocedure; begin
  foreach f in array array[
    'public.image_test_set_room_fidelity(uuid,uuid,jsonb)'::regprocedure,
    'public.image_test_review_room_fidelity(uuid,uuid,boolean)'::regprocedure
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
