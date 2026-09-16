-- A finished candidate can still incur asynchronous provider costs. Do not
-- allow the next paid dispatch until an operator has reconciled it in Google
-- Billing. This applies equally to accepted and fidelity-rejected images.
create or replace function public.guest_image_test_reserve(target_session uuid, target_secret_hash text, request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.localhost_image_test_pool; s public.guest_image_test_sessions;
begin
  select * into p from public.localhost_image_test_pool where id for update;
  if request_id is null or exists(select 1 from public.guest_image_test_attempts where id=request_id) then raise exception 'duplicate request'; end if;
  if p.active_attempt is not null then raise exception 'previous attempt unresolved'; end if;
  if exists(select 1 from public.guest_image_test_attempts where p.billing_checked_at is null or started_at >= p.billing_checked_at) then
    raise exception 'billing reconciliation required';
  end if;
  if p.historical_reserved_cents + p.reserved_cents + 30 > p.maximum_total_cents then raise exception 'localhost test budget reached'; end if;
  select * into s from public.guest_image_test_sessions where id=target_session and secret_hash=target_secret_hash and revoked_at is null and expires_at>now() for update;
  if not found or s.source_base64 is null then raise exception 'guest consent unavailable'; end if;
  insert into public.guest_image_test_attempts(id,session_id,reserved_cents) values(request_id,s.id,30);
  update public.localhost_image_test_pool set reserved_cents=reserved_cents+30,active_attempt=request_id where id;
  return jsonb_build_object('reservedCents',30,'style',s.style,'budgetEuro',s.budget_euro,'grantedAt',s.consent_at,'policyVersion','localhost-one-click-v1');
end;
$$;

-- This deliberate operator action records the verified invoice amount for one
-- fully completed localhost attempt. It cannot touch active or unknown work.
create or replace function public.localhost_image_test_reconcile_completed_attempt(confirmed_actual_cents integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pool_row public.localhost_image_test_pool; attempt_row public.guest_image_test_attempts;
begin
  if confirmed_actual_cents is null or confirmed_actual_cents < 0 or confirmed_actual_cents > 30 then
    raise exception 'invalid confirmed actual cost';
  end if;
  select * into pool_row from public.localhost_image_test_pool where id for update;
  if pool_row.active_attempt is not null then raise exception 'active attempt requires separate reconciliation'; end if;
  select * into attempt_row from public.guest_image_test_attempts
    where pool_row.billing_checked_at is null or started_at >= pool_row.billing_checked_at
    order by started_at asc limit 1 for update;
  if not found or attempt_row.status not in ('succeeded','discarded') then
    raise exception 'no completed attempt awaiting billing reconciliation';
  end if;
  if exists(select 1 from public.guest_image_test_attempts where (pool_row.billing_checked_at is null or started_at >= pool_row.billing_checked_at) and id <> attempt_row.id) then
    raise exception 'more than one attempt requires billing reconciliation';
  end if;
  update public.guest_image_test_attempts
    set usage=coalesce(usage,'{}'::jsonb) || jsonb_build_object('billingReconciliation',jsonb_build_object('actualCents',confirmed_actual_cents,'checkedAt',now(),'source','Google Cloud Billing report'))
    where id=attempt_row.id;
  update public.localhost_image_test_pool
    set actual_cents=actual_cents+confirmed_actual_cents, billing_checked_at=now()
    where id;
  return public.localhost_image_test_ledger_status();
end;
$$;

revoke all on function public.localhost_image_test_reconcile_completed_attempt(integer) from public, anon, authenticated;
grant execute on function public.localhost_image_test_reconcile_completed_attempt(integer) to service_role;
