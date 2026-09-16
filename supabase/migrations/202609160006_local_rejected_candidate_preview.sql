-- A rejected candidate remains hidden from the product. During a local,
-- explicitly enabled provider evaluation, its owner may inspect the exact
-- provider receipt for up to the existing 24-hour session lifetime.
create or replace function public.guest_image_test_read_rejected_candidate(target_session uuid, target_secret_hash text, request_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('data',attempt.provider_image_base64,'mime',attempt.provider_image_mime)
  from public.guest_image_test_attempts attempt
  join public.guest_image_test_sessions session_row on session_row.id=attempt.session_id
  where attempt.id=request_id and session_row.id=target_session and session_row.secret_hash=target_secret_hash
    and session_row.revoked_at is null and session_row.expires_at>now()
    and attempt.status='discarded' and attempt.provider_image_received_at is not null
    and attempt.provider_image_base64 is not null and attempt.provider_image_mime in ('image/png','image/jpeg','image/webp');
$$;

revoke all on function public.guest_image_test_read_rejected_candidate(uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.guest_image_test_read_rejected_candidate(uuid,text,uuid) to service_role;
