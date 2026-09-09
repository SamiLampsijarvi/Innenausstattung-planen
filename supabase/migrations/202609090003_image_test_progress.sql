alter table public.guest_image_test_attempts
  add column progress_stage text not null default 'reserved' check (progress_stage in ('reserved','architecture','generating','saving','validating','completed','failed'));

create or replace function public.guest_image_test_set_progress(target_session uuid, target_secret_hash text, request_id uuid, next_stage text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.guest_image_test_attempts attempt set progress_stage=next_stage
    from public.guest_image_test_sessions session_row
    where attempt.id=request_id and attempt.session_id=session_row.id and session_row.id=target_session
      and session_row.secret_hash=target_secret_hash and attempt.status='reserved'
      and next_stage in ('architecture','generating','saving','validating');
  if not found then raise exception 'progress update unavailable'; end if;
end;
$$;
do $$ begin
  revoke all on function public.guest_image_test_set_progress(uuid,text,uuid,text) from public, anon, authenticated;
  grant execute on function public.guest_image_test_set_progress(uuid,text,uuid,text) to service_role;
end $$;
