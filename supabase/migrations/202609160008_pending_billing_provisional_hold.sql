-- The automated reconciliation may only combine a known provisional hold with
-- one later finished attempt. Keep this diagnostic metadata redacted: it never
-- exposes photo data, generated image bytes or provider responses.
create or replace function public.localhost_image_test_pending_billing_diagnostics()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'status', attempt.status,
    'startedAt', attempt.started_at,
    'finishedAt', attempt.finished_at,
    'providerReceipt', attempt.provider_request_id is not null,
    'provisionalBillingHold', coalesce((attempt.usage->'provisionalBillingHold'->>'awaitingGoogleBilling')::boolean, false),
    'failureStage', attempt.failure_stage,
    'failureCode', attempt.failure_code
  ) order by attempt.started_at), '[]'::jsonb)
  from public.guest_image_test_attempts attempt
  cross join public.localhost_image_test_pool pool
  where pool.billing_checked_at is null or attempt.started_at >= pool.billing_checked_at;
$$;

revoke all on function public.localhost_image_test_pending_billing_diagnostics() from public, anon, authenticated;
grant execute on function public.localhost_image_test_pending_billing_diagnostics() to service_role;
