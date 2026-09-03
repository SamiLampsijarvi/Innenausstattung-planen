alter table public.image_test_attempts
  add column automatic_fidelity_status text not null default 'not_checked'
    check (automatic_fidelity_status in ('not_checked','passed','rejected')),
  add column automatic_fidelity_report jsonb;

create or replace function public.image_test_finish(target_user uuid, request_id uuid, result_image text default null,
  result_mime text default null, elapsed_ms integer default null, provider_id text default null, usage_data jsonb default null)
returns text language plpgsql security definer set search_path = '' as $$
declare p public.image_test_photos; a public.image_test_attempts; outcome text; validation jsonb; validation_status text;
begin
  perform 1 from public.image_test_campaign where id for update;
  select * into a from public.image_test_attempts where id = request_id and user_id = target_user for update;
  if not found or a.status <> 'reserved' then raise exception 'attempt unavailable'; end if;
  select * into p from public.image_test_photos where id = a.test_photo_id;
  validation := usage_data->'raumlyValidation';
  validation_status := validation->>'status';
  outcome := 'unknown';

  if provider_id is not null and validation_status = 'rejected' then
    outcome := 'discarded';
    update public.image_test_attempts set room_fidelity_status = 'rejected' where id = request_id;
  elsif result_image is not null and validation_status = 'passed' then
    outcome := 'discarded';
    if public.image_test_check_dispatch(target_user, request_id) then
      insert into public.image_test_results(attempt_id, user_id, photo_id, image_base64, mime_type)
        values(request_id, target_user, p.photo_id, result_image, result_mime);
      outcome := 'succeeded';
    end if;
  end if;

  update public.image_test_attempts set status = outcome, finished_at = now(), duration_ms = elapsed_ms,
    provider_request_id = left(provider_id, 200), usage = usage_data - 'raumlyValidation',
    automatic_fidelity_status = case when validation_status in ('passed','rejected') then validation_status else 'not_checked' end,
    automatic_fidelity_report = case when validation_status in ('passed','rejected') then validation else null end
    where id = request_id;
  if outcome <> 'unknown' then update public.image_test_campaign set active_attempt = null where id; end if;
  return outcome;
end;
$$;

revoke all on function public.image_test_finish(uuid,uuid,text,text,integer,text,jsonb) from public, anon, authenticated;
grant execute on function public.image_test_finish(uuid,uuid,text,text,integer,text,jsonb) to service_role;
