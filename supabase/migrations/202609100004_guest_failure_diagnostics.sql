-- Safe diagnostics only; no reservation is released and no provider is enabled.
alter table public.guest_image_test_attempts
  add column failure_stage text,
  add column failure_code text;

create function public.guest_image_test_record_failure(target_session uuid, target_secret_hash text,
  request_id uuid, failure_stage text, failure_code text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if failure_stage not in ('Testfoto lesen','Kostenreservierung','Architektur-Scan','Architekturprofil speichern',
    'Versandfreigabe','Vertex-Bildgenerierung','Vertex-Ergebnis sichern','Raumtreue-Prüfung','Ergebnis speichern')
    or failure_code not in ('SCAN_EMPTY','SCAN_TRUNCATED','SCAN_INVALID','GOOGLE_AUTH','GOOGLE_QUOTA','TIMEOUT','IMAGE_MISSING','UNCLASSIFIED')
    or failure_stage is null or failure_code is null then raise exception 'invalid diagnostic'; end if;
  update public.guest_image_test_attempts a
    set failure_stage=guest_image_test_record_failure.failure_stage,
        failure_code=guest_image_test_record_failure.failure_code
    from public.guest_image_test_sessions s
    where a.id=request_id and a.session_id=s.id and s.id=target_session
      and s.secret_hash=target_secret_hash and a.status in ('reserved','unknown');
  if not found then raise exception 'attempt unavailable'; end if;
end;
$$;
revoke all on function public.guest_image_test_record_failure(uuid,text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.guest_image_test_record_failure(uuid,text,uuid,text,text) to service_role;

-- Explicit fields prevent polling from transferring raw images and internal architecture reports.
create or replace function public.guest_image_test_state(target_session uuid, target_secret_hash text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('prepared',true,'expiresAt',s.expires_at,'attempts',
    coalesce((select jsonb_agg(jsonb_build_object(
      'id',a.id,'status',a.status,'progress_stage',a.progress_stage,
      'room_fidelity_status',a.room_fidelity_status,'failure_stage',a.failure_stage,'failure_code',a.failure_code,
      'imageReady',a.status='succeeded' and a.room_fidelity_status='pending' and exists(
        select 1 from public.guest_image_test_results r where r.attempt_id=a.id and r.expires_at>now())
    ) order by a.started_at desc) from public.guest_image_test_attempts a where a.session_id=s.id),'[]'::jsonb))
  from public.guest_image_test_sessions s where s.id=target_session and s.secret_hash=target_secret_hash
    and s.revoked_at is null and s.expires_at>now();
$$;
