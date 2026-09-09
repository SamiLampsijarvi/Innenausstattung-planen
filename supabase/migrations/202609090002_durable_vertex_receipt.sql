-- A provider response is stored before any validation or UI response. This
-- makes a received image recoverable if the browser disconnects afterwards.
alter table public.guest_image_test_attempts
  add column provider_image_base64 text check (provider_image_base64 is null or octet_length(provider_image_base64) between 1 and 14000000),
  add column provider_image_mime text check (provider_image_mime is null or provider_image_mime in ('image/png','image/jpeg','image/webp')),
  add column provider_image_received_at timestamptz;

create or replace function public.guest_image_test_record_provider_image(target_session uuid, target_secret_hash text, request_id uuid,
  provider_image text, provider_mime text, elapsed_ms integer, provider_id text, usage_data jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.guest_image_test_attempts attempt
    set provider_image_base64=provider_image, provider_image_mime=provider_mime,
        provider_image_received_at=coalesce(provider_image_received_at,now()), duration_ms=elapsed_ms,
        provider_request_id=left(provider_id,200), usage=usage_data
    from public.guest_image_test_sessions session_row
    where attempt.id=request_id and attempt.session_id=session_row.id and session_row.id=target_session
      and session_row.secret_hash=target_secret_hash and attempt.status='reserved'
      and provider_image is not null and octet_length(provider_image) between 1 and 14000000
      and provider_mime in ('image/png','image/jpeg','image/webp');
  if not found then raise exception 'provider receipt unavailable'; end if;
end;
$$;

create or replace function public.guest_image_test_finish(target_session uuid, target_secret_hash text, request_id uuid, result_image text default null,
  result_mime text default null, elapsed_ms integer default null, provider_id text default null, usage_data jsonb default null) returns text
language plpgsql security definer set search_path = '' as $$
declare attempt_row public.guest_image_test_attempts; validation jsonb; validation_status text; outcome text := 'unknown';
begin
  perform 1 from public.localhost_image_test_pool where id for update;
  select attempt.* into attempt_row from public.guest_image_test_attempts attempt join public.guest_image_test_sessions session_row on session_row.id=attempt.session_id
    where attempt.id=request_id and session_row.id=target_session and session_row.secret_hash=target_secret_hash for update;
  if not found then raise exception 'attempt unavailable'; end if;
  if attempt_row.status in ('succeeded','discarded','unknown') then return attempt_row.status; end if;
  validation:=usage_data->'raumlyValidation'; validation_status:=validation->>'status';
  if provider_id is not null and validation_status='rejected' then outcome:='discarded'; update public.guest_image_test_attempts set room_fidelity_status='rejected' where id=request_id;
  elsif result_image is not null and result_mime in ('image/png','image/jpeg','image/webp') and validation_status='passed'
    and public.guest_image_test_check_dispatch(target_session,target_secret_hash,request_id) then
    insert into public.guest_image_test_results(attempt_id,image_base64,mime_type) values(request_id,result_image,result_mime) on conflict (attempt_id) do nothing;
    outcome:='succeeded';
  end if;
  update public.guest_image_test_attempts set status=outcome,finished_at=now(),duration_ms=coalesce(elapsed_ms,duration_ms),provider_request_id=coalesce(left(provider_id,200),provider_request_id),usage=coalesce(usage_data-'raumlyValidation',usage),
    automatic_fidelity_status=case when validation_status in ('passed','rejected') then validation_status else 'not_checked' end,
    automatic_fidelity_report=case when validation_status in ('passed','rejected') then validation else null end where id=request_id;
  if outcome <> 'unknown' then update public.localhost_image_test_pool set active_attempt=null where id; end if;
  return outcome;
end;
$$;

do $$ begin
  revoke all on function public.guest_image_test_record_provider_image(uuid,text,uuid,text,text,integer,text,jsonb) from public, anon, authenticated;
  grant execute on function public.guest_image_test_record_provider_image(uuid,text,uuid,text,text,integer,text,jsonb) to service_role;
end $$;
