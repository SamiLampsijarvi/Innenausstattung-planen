create table if not exists public.deletion_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  kind text not null check (kind in ('request_confirmation', 'cancellation_confirmation', 'deletion_reminder')),
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  unique (request_id, kind)
);

alter table public.deletion_notifications enable row level security;
revoke all on table public.deletion_notifications from public, anon, authenticated;
revoke insert, delete on table public.deletion_notifications from service_role;
grant select, update on table public.deletion_notifications to service_role;

create or replace function public.record_deletion_notification_failure(target_notification_id uuid, failure_message text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.deletion_notifications
  set attempts = attempts + 1, last_error = left(failure_message, 500)
  where id = target_notification_id and sent_at is null;
$$;

revoke all on function public.record_deletion_notification_failure(uuid, text) from public, anon, authenticated;
grant execute on function public.record_deletion_notification_failure(uuid, text) to service_role;

create or replace function public.request_account_deletion()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_row public.account_deletion_requests;
begin
  if caller_id is null then raise exception 'authentication required'; end if;

  insert into public.account_deletion_requests (user_id, delete_after)
  values (caller_id, now() + interval '14 days')
  on conflict (user_id) do update
    set requested_at = excluded.requested_at, delete_after = excluded.delete_after,
        purge_attempts = 0, last_purge_error = null
  returning * into request_row;

  insert into public.deletion_audit (request_id, event_type) values (request_row.id, 'requested');

  insert into public.deletion_notifications (user_id, request_id, kind, scheduled_for)
  values
    (caller_id, request_row.id, 'request_confirmation', now()),
    (caller_id, request_row.id, 'deletion_reminder', request_row.delete_after - interval '7 days')
  on conflict (request_id, kind) do update
    set scheduled_for = excluded.scheduled_for, sent_at = null, attempts = 0, last_error = null;

  return request_row.delete_after;
end;
$$;

create or replace function public.cancel_account_deletion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_request_id uuid;
begin
  if caller_id is null then raise exception 'authentication required'; end if;

  select id into target_request_id from public.account_deletion_requests
  where user_id = caller_id and delete_after > now();
  if target_request_id is null then raise exception 'no cancellable deletion request'; end if;

  delete from public.deletion_notifications
  where request_id = target_request_id and sent_at is null;
  insert into public.deletion_notifications (user_id, request_id, kind, scheduled_for)
  values (caller_id, target_request_id, 'cancellation_confirmation', now());

  delete from public.account_deletion_requests where id = target_request_id;
  insert into public.deletion_audit (request_id, event_type) values (target_request_id, 'cancelled');
end;
$$;
