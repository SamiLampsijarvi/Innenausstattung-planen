-- Adds only provenance flags to the server-only operator report. The flags
-- let an operator distinguish a legacy lock from a guest-flow reservation
-- without exposing an attempt ID or personal test data.
create or replace function public.localhost_image_test_ledger_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'maximumTotalCents', p.maximum_total_cents,
    'historicalReservedCents', p.historical_reserved_cents,
    'reservedCents', p.reserved_cents,
    'actualCents', p.actual_cents,
    'remainingCents', greatest(0, p.maximum_total_cents - p.historical_reserved_cents - p.reserved_cents),
    'activeAttempt', p.active_attempt is not null,
    'activeAttemptInGuestFlow', exists(select 1 from public.guest_image_test_attempts a where a.id = p.active_attempt),
    'activeAttemptInLegacyFlow', exists(select 1 from public.image_test_attempts a where a.id = p.active_attempt),
    'activeAttemptStatus', (select a.status from public.guest_image_test_attempts a where a.id = p.active_attempt),
    'activeAttemptHasProviderReceipt', exists(select 1 from public.guest_image_test_attempts a where a.id = p.active_attempt and a.provider_request_id is not null),
    'billingCheckedAt', p.billing_checked_at
  )
  from public.localhost_image_test_pool p
  where p.id;
$$;
