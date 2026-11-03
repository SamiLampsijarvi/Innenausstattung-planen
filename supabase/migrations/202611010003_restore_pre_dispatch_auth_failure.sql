-- Recover exactly one operator-confirmed local ADC failure that happened after
-- reservation but before a provider receipt. Future requests preflight ADC.
create function public.localhost_image_test_recover_pre_dispatch_auth_failure(confirmed_local_adc_unavailable boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pool_row public.localhost_image_test_pool; attempt_row public.guest_image_test_attempts;
begin
  if confirmed_local_adc_unavailable is not true then raise exception 'explicit local auth confirmation required'; end if;
  select * into pool_row from public.localhost_image_test_pool where id for update;
  if pool_row.active_attempt is null or pool_row.reserved_cents < 30 or pool_row.campaign_stopped_at is null then
    raise exception 'no stopped pre-dispatch attempt available';
  end if;
  select * into attempt_row from public.guest_image_test_attempts where id=pool_row.active_attempt for update;
  if attempt_row.status<>'unknown' or attempt_row.provider_request_id is not null or
     attempt_row.failure_stage<>'Vertex-Bildgenerierung' or attempt_row.failure_code not in ('UNCLASSIFIED','GOOGLE_AUTH') or
     attempt_row.finished_at is null or attempt_row.finished_at < now()-interval '24 hours' then
    raise exception 'attempt is not an eligible local auth failure';
  end if;
  update public.guest_image_test_attempts set status='deleted',failure_code='GOOGLE_AUTH',usage=coalesce(usage,'{}'::jsonb) || jsonb_build_object(
    'preDispatchRecovery',jsonb_build_object('nonBillable',true,'releasedReservedCents',30,'recoveredAt',now(),'reason','local-adc-unavailable')
  ) where id=attempt_row.id;
  update public.localhost_image_test_pool set reserved_cents=reserved_cents-30,active_attempt=null,
    campaign_active=false,campaign_attempts_remaining=0,campaign_stopped_at=null where id;
  return public.localhost_image_test_ledger_status();
end;
$$;
revoke all on function public.localhost_image_test_recover_pre_dispatch_auth_failure(boolean) from public, anon, authenticated;
grant execute on function public.localhost_image_test_recover_pre_dispatch_auth_failure(boolean) to service_role;

create or replace function public.localhost_image_test_pending_billing_diagnostics()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'status', attempt.status,'startedAt', attempt.started_at,'finishedAt', attempt.finished_at,
    'providerReceipt', attempt.provider_request_id is not null,
    'provisionalBillingHold', coalesce((attempt.usage->'provisionalBillingHold'->>'awaitingGoogleBilling')::boolean,false),
    'campaignBillingCarry', coalesce((attempt.usage->'campaignBillingCarry'->>'awaitingGoogleBilling')::boolean,false),
    'failureStage', attempt.failure_stage,'failureCode', attempt.failure_code
  ) order by attempt.started_at),'[]'::jsonb)
  from public.guest_image_test_attempts attempt cross join public.localhost_image_test_pool pool
  where (pool.billing_checked_at is null or attempt.started_at>=pool.billing_checked_at)
    and not coalesce((attempt.usage->'preDispatchRecovery'->>'nonBillable')::boolean,false);
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
  if p.historical_reserved_cents+p.reserved_cents+90>p.maximum_total_cents then raise exception 'insufficient free pool for three attempts'; end if;
  if p.billing_checked_at is null then raise exception 'billing reconciliation required before campaign'; end if;
  select count(*),count(*) filter(where coalesce((a.usage->'campaignBillingCarry'->>'awaitingGoogleBilling')::boolean,false))
    into pending_count,carry_count from public.guest_image_test_attempts a where a.started_at>=p.billing_checked_at
    and not coalesce((a.usage->'preDispatchRecovery'->>'nonBillable')::boolean,false);
  if pending_count>0 and not (pending_count=1 and carry_count=1) then raise exception 'billing reconciliation required before campaign'; end if;
  update public.localhost_image_test_pool set campaign_attempts_remaining=3,campaign_active=true,campaign_stopped_at=null where id;
  return public.localhost_image_test_ledger_status();
end;
$$;
revoke all on function public.localhost_image_test_start_three_attempt_campaign() from public, anon, authenticated;
grant execute on function public.localhost_image_test_start_three_attempt_campaign() to service_role;
