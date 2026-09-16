-- Operators may inspect the numeric fidelity report of the newest rejected
-- localhost test. The function deliberately exposes neither source nor
-- generated image bytes, session identifiers, nor architecture profiles.
create or replace function public.localhost_image_test_latest_rejection_diagnostics()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'status', attempt.status,
    'finishedAt', attempt.finished_at,
    'validation', attempt.automatic_fidelity_report
  )
  from public.guest_image_test_attempts attempt
  where attempt.status = 'discarded'
    and attempt.automatic_fidelity_status = 'rejected'
  order by attempt.finished_at desc nulls last
  limit 1;
$$;

revoke all on function public.localhost_image_test_latest_rejection_diagnostics() from public, anon, authenticated;
grant execute on function public.localhost_image_test_latest_rejection_diagnostics() to service_role;
