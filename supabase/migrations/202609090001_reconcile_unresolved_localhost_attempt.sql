-- Google Cloud Billing was checked on 2026-09-09. The one unresolved
-- localhost attempt consumed 12 cents of free-trial credit. It produced no
-- durable result, so it is closed as unknown and is never retried.
alter table public.localhost_image_test_pool
  add column actual_cents integer not null default 0 check (actual_cents between 0 and 300),
  add column billing_checked_at timestamptz;

do $$
declare pool_row public.localhost_image_test_pool;
begin
  select * into pool_row from public.localhost_image_test_pool where id for update;
  if pool_row.active_attempt is null then
    raise exception 'no unresolved localhost attempt to reconcile';
  end if;

  update public.guest_image_test_attempts
    set status = 'unknown',
        finished_at = coalesce(finished_at, now()),
        usage = coalesce(usage, '{}'::jsonb) || jsonb_build_object(
          'billingReconciliation', jsonb_build_object(
            'actualCents', 12,
            'checkedAt', now(),
            'source', 'Google Cloud Billing report'
          )
        )
    where id = pool_row.active_attempt
      and status in ('reserved', 'unknown');
  if not found then
    raise exception 'unresolved localhost attempt not found';
  end if;

  update public.localhost_image_test_pool
    set active_attempt = null,
        actual_cents = actual_cents + 12,
        billing_checked_at = now()
    where id;
end;
$$;
