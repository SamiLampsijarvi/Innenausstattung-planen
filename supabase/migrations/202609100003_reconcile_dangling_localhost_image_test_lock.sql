-- A lock can only be removed after an operator has checked Google Billing.
-- This function refuses to touch any real legacy or guest attempt; it repairs
-- only a dangling reference which cannot represent a dispatchable request.
create or replace function public.localhost_image_test_reconcile_dangling_lock()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pool_row public.localhost_image_test_pool;
begin
  select * into pool_row from public.localhost_image_test_pool where id for update;
  if pool_row.active_attempt is null then
    return public.localhost_image_test_ledger_status();
  end if;
  if exists(select 1 from public.guest_image_test_attempts where id = pool_row.active_attempt)
    or exists(select 1 from public.image_test_attempts where id = pool_row.active_attempt) then
    raise exception 'active attempt requires provider and billing reconciliation';
  end if;
  update public.localhost_image_test_pool
    set active_attempt = null,
        billing_checked_at = now()
    where id;
  return public.localhost_image_test_ledger_status();
end;
$$;

revoke all on function public.localhost_image_test_reconcile_dangling_lock() from public, anon, authenticated;
grant execute on function public.localhost_image_test_reconcile_dangling_lock() to service_role;
