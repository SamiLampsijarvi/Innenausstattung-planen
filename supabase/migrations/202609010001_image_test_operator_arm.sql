-- A server-only operator action keeps a controlled test independent of the
-- Supabase Dashboard. It never dispatches a provider request by itself.
create function public.image_test_arm(
  target_price_review text,
  target_reservation_cents integer,
  active_for_seconds integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.image_test_campaign; expires_at timestamptz;
begin
  if target_price_review is null or length(trim(target_price_review)) = 0 then
    raise exception 'price review required';
  end if;
  if target_reservation_cents not between 1 and 300 then
    raise exception 'invalid reservation';
  end if;
  if active_for_seconds not between 60 and 900 then
    raise exception 'invalid approval window';
  end if;
  select * into c from public.image_test_campaign where id for update;
  if c.closed_at is not null then raise exception 'test closed'; end if;
  if c.enabled or c.active_attempt is not null then raise exception 'test already armed or unresolved'; end if;
  if exists(select 1 from public.image_test_attempts a where c.billing_checked_at is null or a.started_at >= c.billing_checked_at) then
    raise exception 'billing reconciliation required';
  end if;
  if c.reserved_cents + target_reservation_cents > 300 then raise exception 'three euro limit reached'; end if;
  expires_at := now() + make_interval(secs => active_for_seconds);
  update public.image_test_campaign set enabled = true, approved_until = expires_at,
    price_review = trim(target_price_review), reservation_cents = target_reservation_cents,
    billing_checked_at = now() where id;
  return jsonb_build_object('approvedUntil', expires_at, 'reservationCents', target_reservation_cents);
end;
$$;
revoke all on function public.image_test_arm(text, integer, integer) from public, anon, authenticated;
grant execute on function public.image_test_arm(text, integer, integer) to service_role;
