-- A bounded operator-approved campaign permits three deliberate attempts
-- before the delayed Google billing export is available.
alter table public.localhost_image_test_pool
  add column campaign_attempts_remaining integer not null default 0 check (campaign_attempts_remaining between 0 and 3),
  add column campaign_active boolean not null default false,
  add column campaign_stopped_at timestamptz;

create function public.localhost_image_test_stop_campaign_on_unknown()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status='unknown' and old.status is distinct from new.status then
    update public.localhost_image_test_pool
      set campaign_attempts_remaining=0,campaign_active=false,campaign_stopped_at=now()
      where id and campaign_active;
  elsif new.status <> 'reserved' and old.status is distinct from new.status then
    update public.localhost_image_test_pool
      set campaign_active=false
      where id and campaign_active and campaign_attempts_remaining=0;
  end if;
  return new;
end;
$$;
create trigger localhost_image_test_stop_campaign_on_unknown
after update of status on public.guest_image_test_attempts
for each row execute function public.localhost_image_test_stop_campaign_on_unknown();
revoke all on function public.localhost_image_test_stop_campaign_on_unknown() from public, anon, authenticated, service_role;

create or replace function public.guest_image_test_reserve(target_session uuid, target_secret_hash text, request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.localhost_image_test_pool; s public.guest_image_test_sessions;
begin
  select * into p from public.localhost_image_test_pool where id for update;
  if request_id is null or exists(select 1 from public.guest_image_test_attempts where id=request_id) then raise exception 'duplicate request'; end if;
  if p.active_attempt is not null then raise exception 'previous attempt unresolved'; end if;
  if p.campaign_stopped_at is not null then raise exception 'stopped campaign requires explicit restart'; end if;
  if not (p.campaign_active and p.campaign_attempts_remaining > 0) and exists(
    select 1 from public.guest_image_test_attempts attempt
    where (p.billing_checked_at is null or attempt.started_at >= p.billing_checked_at)
      and not (attempt.status='unknown' and coalesce((attempt.usage->'provisionalBillingHold'->>'awaitingGoogleBilling')::boolean, false))
  ) then raise exception 'billing reconciliation required'; end if;
  if p.historical_reserved_cents + p.reserved_cents + 30 > p.maximum_total_cents then raise exception 'localhost test budget reached'; end if;
  select * into s from public.guest_image_test_sessions where id=target_session and secret_hash=target_secret_hash and revoked_at is null and expires_at>now() for update;
  if not found or s.source_base64 is null then raise exception 'guest consent unavailable'; end if;
  insert into public.guest_image_test_attempts(id,session_id,reserved_cents) values(request_id,s.id,30);
  update public.localhost_image_test_pool set reserved_cents=reserved_cents+30,active_attempt=request_id,
    campaign_attempts_remaining=case when campaign_active and campaign_attempts_remaining > 0 then campaign_attempts_remaining-1 else 0 end
    where id;
  return jsonb_build_object('reservedCents',30,'style',s.style,'budgetEuro',s.budget_euro,'grantedAt',s.consent_at,'policyVersion','localhost-three-attempt-campaign-v1');
end;
$$;

-- A three-attempt campaign is reconciled as one bounded batch after it ends.
create or replace function public.localhost_image_test_reconcile_pending_batch(confirmed_actual_cents integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pool_row public.localhost_image_test_pool; attempt_count integer; maximum_batch_cents integer;
begin
  if confirmed_actual_cents is null or confirmed_actual_cents < 0 or confirmed_actual_cents > 90 then
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
  if attempt_count < 1 or attempt_count > 3 then raise exception 'unexpected pending billing batch'; end if;
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
revoke all on function public.localhost_image_test_reconcile_pending_batch(integer) from public, anon, authenticated;
grant execute on function public.localhost_image_test_reconcile_pending_batch(integer) to service_role;

create or replace function public.localhost_image_test_ledger_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'maximumTotalCents', p.maximum_total_cents,
    'historicalReservedCents', p.historical_reserved_cents,
    'reservedCents', p.reserved_cents,
    'actualCents', p.actual_cents,
    'remainingCents', greatest(0, p.maximum_total_cents - p.historical_reserved_cents - p.reserved_cents),
    'activeAttempt', p.active_attempt is not null,
    'activeAttemptInGuestFlow', exists(select 1 from public.guest_image_test_attempts a where a.id = p.active_attempt),
    'activeAttemptInLegacyFlow', exists(select 1 from public.image_test_attempts a where a.id = p.active_attempt),
    'activeAttemptStatus', (select a.status from public.guest_image_test_attempts a where a.id = p.active_attempt),
    'activeAttemptHasProviderReceipt', exists(select 1 from public.guest_image_test_attempts a where a.id = p.active_attempt and a.provider_request_id is not null),
    'billingCheckedAt', p.billing_checked_at,
    'campaignAttemptsRemaining', p.campaign_attempts_remaining,
    'campaignActive', p.campaign_active,
    'campaignStoppedAt', p.campaign_stopped_at
  )
  from public.localhost_image_test_pool p
  where p.id;
$$;

create function public.localhost_image_test_start_three_attempt_campaign()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.localhost_image_test_pool;
begin
  select * into p from public.localhost_image_test_pool where id for update;
  if p.active_attempt is not null then raise exception 'active attempt blocks campaign'; end if;
  if p.campaign_active then raise exception 'campaign already active'; end if;
  if p.historical_reserved_cents + p.reserved_cents + 90 > p.maximum_total_cents then raise exception 'insufficient free pool for three attempts'; end if;
  if p.billing_checked_at is null or exists(select 1 from public.guest_image_test_attempts a where a.started_at >= p.billing_checked_at) then raise exception 'billing reconciliation required before campaign'; end if;
  update public.localhost_image_test_pool set campaign_attempts_remaining=3,campaign_active=true,campaign_stopped_at=null where id;
  return public.localhost_image_test_ledger_status();
end;
$$;
revoke all on function public.localhost_image_test_start_three_attempt_campaign() from public, anon, authenticated;
grant execute on function public.localhost_image_test_start_three_attempt_campaign() to service_role;
