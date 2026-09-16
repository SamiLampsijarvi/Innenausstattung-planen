-- Keep a redacted audit row for every attempt that is newer than the last
-- Billing check, not only for active attempts. This retains no photo bytes,
-- but keeps a future reconciliation attributable after the 24-hour deletion.
create or replace function public.guest_image_test_purge() returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.guest_image_test_attempts attempt
    set status='unknown', finished_at=coalesce(finished_at,now()), progress_stage='failed'
    from public.guest_image_test_sessions session_row, public.localhost_image_test_pool pool
    where pool.active_attempt=attempt.id and attempt.session_id=session_row.id
      and (session_row.expires_at<=now() or session_row.revoked_at is not null) and attempt.status='reserved';

  update public.guest_image_test_sessions session_row
    set source_base64=null, source_hash=repeat('0',64), room_fidelity_profile=null,
        revoked_at=coalesce(revoked_at,now()), redacted_at=coalesce(redacted_at,now())
    where (session_row.expires_at<=now() or session_row.revoked_at is not null)
      and exists(select 1 from public.guest_image_test_attempts attempt cross join public.localhost_image_test_pool pool
        where attempt.session_id=session_row.id and (
          pool.active_attempt=attempt.id or pool.billing_checked_at is null or attempt.started_at>=pool.billing_checked_at
        ));

  delete from public.guest_image_test_sessions session_row
    where (session_row.expires_at<=now() or session_row.revoked_at is not null)
      and not exists(select 1 from public.guest_image_test_attempts attempt cross join public.localhost_image_test_pool pool
        where attempt.session_id=session_row.id and (
          pool.active_attempt=attempt.id or pool.billing_checked_at is null or attempt.started_at>=pool.billing_checked_at
        ));
end;
$$;

-- For legacy cases already deleted before the audit fix, a zero-cost billing
-- report may still be recorded. Non-zero costs can never be inferred without
-- a retained attempt and remain blocked for manual investigation.
create or replace function public.localhost_image_test_reconcile_completed_attempt(confirmed_actual_cents integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pool_row public.localhost_image_test_pool; attempt_row public.guest_image_test_attempts;
begin
  if confirmed_actual_cents is null or confirmed_actual_cents < 0 or confirmed_actual_cents > 30 then
    raise exception 'invalid confirmed actual cost';
  end if;
  select * into pool_row from public.localhost_image_test_pool where id for update;
  if pool_row.active_attempt is not null then raise exception 'active attempt requires separate reconciliation'; end if;
  if exists(select 1 from public.guest_image_test_attempts where (pool_row.billing_checked_at is null or started_at >= pool_row.billing_checked_at) and status='unknown') then
    raise exception 'unknown attempt requires separate reconciliation';
  end if;
  select * into attempt_row from public.guest_image_test_attempts
    where (pool_row.billing_checked_at is null or started_at >= pool_row.billing_checked_at)
      and status in ('succeeded','discarded')
    order by started_at asc limit 1 for update;
  if not found then
    if confirmed_actual_cents <> 0 then raise exception 'no retained attempt for a non-zero cost'; end if;
    update public.localhost_image_test_pool set billing_checked_at=now() where id;
    return public.localhost_image_test_ledger_status();
  end if;
  if exists(select 1 from public.guest_image_test_attempts where (pool_row.billing_checked_at is null or started_at >= pool_row.billing_checked_at)
    and status in ('succeeded','discarded') and id <> attempt_row.id) then
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
