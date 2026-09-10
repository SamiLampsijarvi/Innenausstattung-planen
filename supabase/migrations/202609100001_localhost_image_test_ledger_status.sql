-- Server-only operator report for the localhost Vertex test pool.
-- It deliberately exposes no photo data, session secrets, request IDs or images.
create or replace function public.localhost_image_test_ledger_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'maximumTotalCents', p.maximum_total_cents,
    'historicalReservedCents', p.historical_reserved_cents,
    'reservedCents', p.reserved_cents,
    'actualCents', p.actual_cents,
    'remainingCents', greatest(0, p.maximum_total_cents - p.historical_reserved_cents - p.reserved_cents),
    'activeAttempt', p.active_attempt is not null,
    'activeAttemptStatus', a.status,
    'activeAttemptHasProviderReceipt', a.provider_request_id is not null,
    'billingCheckedAt', p.billing_checked_at
  )
  from public.localhost_image_test_pool p
  left join public.guest_image_test_attempts a on a.id = p.active_attempt
  where p.id;
$$;

revoke all on function public.localhost_image_test_ledger_status() from public, anon, authenticated;
grant execute on function public.localhost_image_test_ledger_status() to service_role;
