-- A user-approved, conservative release for a failed pre-dispatch attempt.
-- The original 30-cent reservation remains part of the fixed test budget.
-- It is not recorded as an invoice cost until Google Billing confirms it.
create or replace function public.guest_image_test_reserve(target_session uuid, target_secret_hash text, request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.localhost_image_test_pool; s public.guest_image_test_sessions;
begin
  select * into p from public.localhost_image_test_pool where id for update;
  if request_id is null or exists(select 1 from public.guest_image_test_attempts where id=request_id) then raise exception 'duplicate request'; end if;
  if p.active_attempt is not null then raise exception 'previous attempt unresolved'; end if;
  if exists(
    select 1 from public.guest_image_test_attempts attempt
    where (p.billing_checked_at is null or attempt.started_at >= p.billing_checked_at)
      and not (
        attempt.status='unknown'
        and coalesce((attempt.usage->'provisionalBillingHold'->>'awaitingGoogleBilling')::boolean, false)
      )
  ) then raise exception 'billing reconciliation required'; end if;
  if p.historical_reserved_cents + p.reserved_cents + 30 > p.maximum_total_cents then raise exception 'localhost test budget reached'; end if;
  select * into s from public.guest_image_test_sessions where id=target_session and secret_hash=target_secret_hash and revoked_at is null and expires_at>now() for update;
  if not found or s.source_base64 is null then raise exception 'guest consent unavailable'; end if;
  insert into public.guest_image_test_attempts(id,session_id,reserved_cents) values(request_id,s.id,30);
  update public.localhost_image_test_pool set reserved_cents=reserved_cents+30,active_attempt=request_id where id;
  return jsonb_build_object('reservedCents',30,'style',s.style,'budgetEuro',s.budget_euro,'grantedAt',s.consent_at,'policyVersion','localhost-one-click-v1');
end;
$$;

-- This is deliberately limited to an unknown attempt without a provider
-- receipt: it cannot release a request that reached image generation.
create or replace function public.localhost_image_test_release_unknown_attempt_with_conservative_cap()
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

-- Reconciles the provisional hold and, if present, the one later completed
-- test together. A further paid test remains blocked until this batch is
-- explicitly reconciled against Google Billing.
create or replace function public.localhost_image_test_reconcile_pending_batch(confirmed_actual_cents integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pool_row public.localhost_image_test_pool; attempt_count integer; maximum_batch_cents integer;
begin
  if confirmed_actual_cents is null or confirmed_actual_cents < 0 or confirmed_actual_cents > 60 then
    raise exception 'invalid confirmed batch cost';
  end if;
  select * into pool_row from public.localhost_image_test_pool where id for update;
  if pool_row.active_attempt is not null then raise exception 'active attempt requires separate reconciliation'; end if;
  if exists(
    select 1 from public.guest_image_test_attempts attempt
    where (pool_row.billing_checked_at is null or attempt.started_at >= pool_row.billing_checked_at)
      and attempt.status='unknown'
      and not coalesce((attempt.usage->'provisionalBillingHold'->>'awaitingGoogleBilling')::boolean, false)
  ) then raise exception 'unknown attempt requires separate reconciliation'; end if;
  select count(*) into attempt_count from public.guest_image_test_attempts attempt
    where (pool_row.billing_checked_at is null or attempt.started_at >= pool_row.billing_checked_at)
      and (attempt.status in ('succeeded','discarded') or coalesce((attempt.usage->'provisionalBillingHold'->>'awaitingGoogleBilling')::boolean, false));
  if attempt_count < 1 or attempt_count > 2 then raise exception 'unexpected pending billing batch'; end if;
  maximum_batch_cents := attempt_count * 30;
  if confirmed_actual_cents > maximum_batch_cents then raise exception 'confirmed cost exceeds reserved batch limit'; end if;
  update public.guest_image_test_attempts attempt
    set usage=coalesce(attempt.usage,'{}'::jsonb) || jsonb_build_object(
      'billingReconciliation',jsonb_build_object(
        'actualCents',confirmed_actual_cents,
        'checkedAt',now(),
        'source','Google Cloud Billing report',
        'batchSize',attempt_count
      ),
      'provisionalBillingHold',case when attempt.usage ? 'provisionalBillingHold' then
        coalesce(attempt.usage->'provisionalBillingHold','{}'::jsonb) || jsonb_build_object('awaitingGoogleBilling',false,'reconciledAt',now())
        else coalesce(attempt.usage->'provisionalBillingHold','{}'::jsonb) end
    )
    where (pool_row.billing_checked_at is null or attempt.started_at >= pool_row.billing_checked_at)
      and (attempt.status in ('succeeded','discarded') or coalesce((attempt.usage->'provisionalBillingHold'->>'awaitingGoogleBilling')::boolean, false));
  update public.localhost_image_test_pool
    set actual_cents=actual_cents+confirmed_actual_cents, billing_checked_at=now()
    where id;
  return public.localhost_image_test_ledger_status();
end;
$$;

revoke all on function public.localhost_image_test_release_unknown_attempt_with_conservative_cap() from public, anon, authenticated;
grant execute on function public.localhost_image_test_release_unknown_attempt_with_conservative_cap() to service_role;
revoke all on function public.localhost_image_test_reconcile_pending_batch(integer) from public, anon, authenticated;
grant execute on function public.localhost_image_test_reconcile_pending_batch(integer) to service_role;
