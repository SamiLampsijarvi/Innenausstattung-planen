-- PostgreSQL identifiers are limited to 63 characters. Replace the truncated
-- name from the preceding migration with the short public RPC name.
drop function if exists public.localhost_image_test_release_unknown_attempt_with_conservative_();

create or replace function public.localhost_image_test_release_unknown_attempt_provisionally()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pool_row public.localhost_image_test_pool; attempt_row public.guest_image_test_attempts;
begin
  select * into pool_row from public.localhost_image_test_pool where id for update;
  if pool_row.active_attempt is null then raise exception 'no active unknown attempt'; end if;
  select * into attempt_row from public.guest_image_test_attempts where id=pool_row.active_attempt for update;
  if not found or attempt_row.status <> 'unknown' then raise exception 'active attempt is not unknown'; end if;
  if attempt_row.provider_request_id is not null then raise exception 'attempt has a provider receipt and cannot be provisionally released'; end if;
  if exists(
    select 1 from public.guest_image_test_attempts attempt
    where coalesce((attempt.usage->'provisionalBillingHold'->>'awaitingGoogleBilling')::boolean, false)
  ) then raise exception 'a provisional billing hold already exists'; end if;
  update public.guest_image_test_attempts
    set usage=coalesce(usage,'{}'::jsonb) || jsonb_build_object(
      'provisionalBillingHold', jsonb_build_object(
        'maximumCents',30,
        'releasedAt',now(),
        'reason','user-approved conservative release before Google Billing is available',
        'awaitingGoogleBilling',true
      )
    )
    where id=attempt_row.id;
  update public.localhost_image_test_pool set active_attempt=null where id;
  return public.localhost_image_test_ledger_status();
end;
$$;

revoke all on function public.localhost_image_test_release_unknown_attempt_provisionally() from public, anon, authenticated;
grant execute on function public.localhost_image_test_release_unknown_attempt_provisionally() to service_role;
