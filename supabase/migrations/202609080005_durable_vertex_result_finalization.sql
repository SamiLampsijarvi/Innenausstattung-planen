-- Store the exact provider response and its final accounting state in the
-- same database transaction. Distinct variable and table aliases avoid the
-- ambiguous identifier that prevented finalization of the earlier attempt.
create or replace function public.guest_image_test_finish(target_session uuid, target_secret_hash text, request_id uuid, result_image text default null,
  result_mime text default null, elapsed_ms integer default null, provider_id text default null, usage_data jsonb default null) returns text
language plpgsql security definer set search_path = '' as $$
declare attempt_row public.guest_image_test_attempts; validation jsonb; validation_status text; outcome text := 'unknown';
begin
  perform 1 from public.localhost_image_test_pool where id for update;
  select attempt.* into attempt_row from public.guest_image_test_attempts attempt
    join public.guest_image_test_sessions session_row on session_row.id=attempt.session_id
    where attempt.id=request_id and session_row.id=target_session and session_row.secret_hash=target_secret_hash for update;
  if not found or attempt_row.status <> 'reserved' then raise exception 'attempt unavailable'; end if;
  validation:=usage_data->'raumlyValidation'; validation_status:=validation->>'status';
  if provider_id is not null and validation_status='rejected' then
    outcome:='discarded';
    update public.guest_image_test_attempts set room_fidelity_status='rejected' where id=request_id;
  elsif result_image is not null and result_mime in ('image/png','image/jpeg','image/webp') and validation_status='passed'
    and public.guest_image_test_check_dispatch(target_session,target_secret_hash,request_id) then
    insert into public.guest_image_test_results(attempt_id,image_base64,mime_type) values(request_id,result_image,result_mime);
    outcome:='succeeded';
  end if;
  update public.guest_image_test_attempts set status=outcome,finished_at=now(),duration_ms=elapsed_ms,provider_request_id=left(provider_id,200),usage=usage_data-'raumlyValidation',
    automatic_fidelity_status=case when validation_status in ('passed','rejected') then validation_status else 'not_checked' end,
    automatic_fidelity_report=case when validation_status in ('passed','rejected') then validation else null end where id=request_id;
  if outcome <> 'unknown' then update public.localhost_image_test_pool set active_attempt=null where id; end if;
  return outcome;
end;
$$;
