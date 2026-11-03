-- Keep one stale provider-receipt attempt fully reserved and visible while a
-- separately bounded three-attempt campaign runs. No cost is guessed or freed.
create function public.localhost_image_test_carry_stale_completed_attempt()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pool_row public.localhost_image_test_pool; attempt_row public.guest_image_test_attempts; pending_count integer;
begin
  select * into pool_row from public.localhost_image_test_pool where id for update;
  if pool_row.active_attempt is not null or pool_row.campaign_active then raise exception 'active work blocks billing carry'; end if;
  select count(*) into pending_count from public.guest_image_test_attempts attempt
    where pool_row.billing_checked_at is null or attempt.started_at >= pool_row.billing_checked_at;
  if pending_count <> 1 then raise exception 'exactly one stale attempt required'; end if;
  select * into attempt_row from public.guest_image_test_attempts attempt
    where pool_row.billing_checked_at is null or attempt.started_at >= pool_row.billing_checked_at
    limit 1 for update;
  if attempt_row.status not in ('succeeded','discarded') or attempt_row.provider_request_id is null or
     attempt_row.finished_at is null or attempt_row.finished_at > now()-interval '7 days' then
    raise exception 'attempt is not eligible for conservative billing carry';
  end if;
  update public.guest_image_test_attempts
    set usage=coalesce(usage,'{}'::jsonb) || jsonb_build_object('campaignBillingCarry',jsonb_build_object(
      'awaitingGoogleBilling',true,'reservedCents',30,'markedAt',now()
    ))
    where id=attempt_row.id;
  return public.localhost_image_test_ledger_status();
end;
$$;
revoke all on function public.localhost_image_test_carry_stale_completed_attempt() from public, anon, authenticated;
grant execute on function public.localhost_image_test_carry_stale_completed_attempt() to service_role;

create or replace function public.localhost_image_test_pending_billing_diagnostics()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'status', attempt.status,
    'startedAt', attempt.started_at,
    'finishedAt', attempt.finished_at,
    'providerReceipt', attempt.provider_request_id is not null,
    'provisionalBillingHold', coalesce((attempt.usage->'provisionalBillingHold'->>'awaitingGoogleBilling')::boolean, false),
    'campaignBillingCarry', coalesce((attempt.usage->'campaignBillingCarry'->>'awaitingGoogleBilling')::boolean, false),
    'failureStage', attempt.failure_stage,
    'failureCode', attempt.failure_code
  ) order by attempt.started_at), '[]'::jsonb)
  from public.guest_image_test_attempts attempt
  cross join public.localhost_image_test_pool pool
  where pool.billing_checked_at is null or attempt.started_at >= pool.billing_checked_at;
$$;
revoke all on function public.localhost_image_test_pending_billing_diagnostics() from public, anon, authenticated;
grant execute on function public.localhost_image_test_pending_billing_diagnostics() to service_role;

create or replace function public.localhost_image_test_start_three_attempt_campaign()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.localhost_image_test_pool; pending_count integer; carry_count integer;
begin
  select * into p from public.localhost_image_test_pool where id for update;
  if p.active_attempt is not null then raise exception 'active attempt blocks campaign'; end if;
  if p.campaign_active then raise exception 'campaign already active'; end if;
  if p.historical_reserved_cents + p.reserved_cents + 90 > p.maximum_total_cents then raise exception 'insufficient free pool for three attempts'; end if;
  if p.billing_checked_at is null then raise exception 'billing reconciliation required before campaign'; end if;
  select count(*), count(*) filter(where coalesce((a.usage->'campaignBillingCarry'->>'awaitingGoogleBilling')::boolean,false))
    into pending_count,carry_count from public.guest_image_test_attempts a where a.started_at >= p.billing_checked_at;
  if pending_count > 0 and not (pending_count=1 and carry_count=1) then raise exception 'billing reconciliation required before campaign'; end if;
  update public.localhost_image_test_pool set campaign_attempts_remaining=3,campaign_active=true,campaign_stopped_at=null where id;
  return public.localhost_image_test_ledger_status();
end;
$$;
revoke all on function public.localhost_image_test_start_three_attempt_campaign() from public, anon, authenticated;
grant execute on function public.localhost_image_test_start_three_attempt_campaign() to service_role;

create or replace function public.localhost_image_test_reconcile_pending_batch(confirmed_actual_cents integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pool_row public.localhost_image_test_pool; attempt_count integer; maximum_batch_cents integer; carry_count integer;
begin
  if confirmed_actual_cents is null or confirmed_actual_cents < 0 or confirmed_actual_cents > 120 then raise exception 'invalid confirmed batch cost'; end if;
  select * into pool_row from public.localhost_image_test_pool where id for update;
  if pool_row.active_attempt is not null then raise exception 'active attempt requires separate reconciliation'; end if;
  if exists(select 1 from public.guest_image_test_attempts attempt where
    (pool_row.billing_checked_at is null or attempt.started_at >= pool_row.billing_checked_at) and attempt.status='unknown' and
    not coalesce((attempt.usage->'provisionalBillingHold'->>'awaitingGoogleBilling')::boolean,false)) then
    raise exception 'unknown attempt requires separate reconciliation';
  end if;
  select count(*),count(*) filter(where coalesce((attempt.usage->'campaignBillingCarry'->>'awaitingGoogleBilling')::boolean,false))
    into attempt_count,carry_count from public.guest_image_test_attempts attempt where
    (pool_row.billing_checked_at is null or attempt.started_at >= pool_row.billing_checked_at) and
    (attempt.status in ('succeeded','discarded') or coalesce((attempt.usage->'provisionalBillingHold'->>'awaitingGoogleBilling')::boolean,false));
  if attempt_count < 1 or attempt_count > 4 or (attempt_count=4 and carry_count<>1) then raise exception 'unexpected pending billing batch'; end if;
  maximum_batch_cents := attempt_count*30;
  if confirmed_actual_cents > maximum_batch_cents then raise exception 'confirmed cost exceeds reserved batch limit'; end if;
  update public.guest_image_test_attempts attempt set usage=coalesce(attempt.usage,'{}'::jsonb) || jsonb_build_object(
    'billingReconciliation',jsonb_build_object('actualCents',confirmed_actual_cents,'checkedAt',now(),'source','Google Cloud Billing report','batchSize',attempt_count),
    'provisionalBillingHold',case when attempt.usage ? 'provisionalBillingHold' then coalesce(attempt.usage->'provisionalBillingHold','{}'::jsonb) || jsonb_build_object('awaitingGoogleBilling',false,'reconciledAt',now()) else coalesce(attempt.usage->'provisionalBillingHold','{}'::jsonb) end,
    'campaignBillingCarry',case when attempt.usage ? 'campaignBillingCarry' then coalesce(attempt.usage->'campaignBillingCarry','{}'::jsonb) || jsonb_build_object('awaitingGoogleBilling',false,'reconciledAt',now()) else coalesce(attempt.usage->'campaignBillingCarry','{}'::jsonb) end
  ) where (pool_row.billing_checked_at is null or attempt.started_at >= pool_row.billing_checked_at) and
    (attempt.status in ('succeeded','discarded') or coalesce((attempt.usage->'provisionalBillingHold'->>'awaitingGoogleBilling')::boolean,false));
  update public.localhost_image_test_pool set actual_cents=actual_cents+confirmed_actual_cents,billing_checked_at=now() where id;
  return public.localhost_image_test_ledger_status();
end;
$$;
revoke all on function public.localhost_image_test_reconcile_pending_batch(integer) from public, anon, authenticated;
grant execute on function public.localhost_image_test_reconcile_pending_batch(integer) to service_role;
