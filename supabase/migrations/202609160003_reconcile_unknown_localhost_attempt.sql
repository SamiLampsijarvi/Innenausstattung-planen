-- An unknown active attempt is released only after an operator has verified
-- Google Billing. The reservation remains counted and no retry is performed.
create or replace function public.localhost_image_test_reconcile_unknown_attempt(confirmed_actual_cents integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pool_row public.localhost_image_test_pool; attempt_row public.guest_image_test_attempts;
begin
  if confirmed_actual_cents is null or confirmed_actual_cents < 0 or confirmed_actual_cents > 30 then
    raise exception 'invalid confirmed actual cost';
  end if;
  select * into pool_row from public.localhost_image_test_pool where id for update;
  if pool_row.active_attempt is null then raise exception 'no active unknown attempt'; end if;
  select * into attempt_row from public.guest_image_test_attempts where id=pool_row.active_attempt for update;
  if not found or attempt_row.status <> 'unknown' then raise exception 'active attempt is not unknown'; end if;
  update public.guest_image_test_attempts
    set usage=coalesce(usage,'{}'::jsonb) || jsonb_build_object('billingReconciliation',jsonb_build_object('actualCents',confirmed_actual_cents,'checkedAt',now(),'source','Google Cloud Billing report'))
    where id=attempt_row.id;
  update public.localhost_image_test_pool
    set active_attempt=null, actual_cents=actual_cents+confirmed_actual_cents, billing_checked_at=now()
    where id;
  return public.localhost_image_test_ledger_status();
end;
$$;

revoke all on function public.localhost_image_test_reconcile_unknown_attempt(integer) from public, anon, authenticated;
grant execute on function public.localhost_image_test_reconcile_unknown_attempt(integer) to service_role;
