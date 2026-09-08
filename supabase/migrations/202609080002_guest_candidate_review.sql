-- A candidate is readable only through the opaque guest session and only while
-- awaiting the mandatory human room-fidelity decision.
create function public.guest_image_test_read_candidate(target_session uuid, target_secret_hash text, request_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('data',r.image_base64,'mime',r.mime_type) from public.guest_image_test_results r
  join public.guest_image_test_attempts a on a.id=r.attempt_id
  join public.guest_image_test_sessions s on s.id=a.session_id
  where r.attempt_id=request_id and s.id=target_session and s.secret_hash=target_secret_hash
    and s.revoked_at is null and s.expires_at>now() and r.expires_at>now()
    and a.status='succeeded' and a.room_fidelity_status='pending';
$$;
do $$ begin
  revoke all on function public.guest_image_test_read_candidate(uuid,text,uuid) from public, anon, authenticated;
  grant execute on function public.guest_image_test_read_candidate(uuid,text,uuid) to service_role;
end $$;
