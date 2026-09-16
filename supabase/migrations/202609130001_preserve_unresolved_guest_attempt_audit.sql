-- Expired images are always removed after 24 hours. An unresolved active
-- attempt keeps only a redacted audit row until its billing reconciliation;
-- otherwise ON DELETE CASCADE would leave localhost_image_test_pool pointing
-- at a non-existent attempt and hide the reason for its safety lock.
alter table public.guest_image_test_sessions
  add column redacted_at timestamptz;

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
      and exists(select 1 from public.guest_image_test_attempts attempt join public.localhost_image_test_pool pool on pool.active_attempt=attempt.id
        where attempt.session_id=session_row.id);

  delete from public.guest_image_test_sessions session_row
    where (session_row.expires_at<=now() or session_row.revoked_at is not null)
      and not exists(select 1 from public.guest_image_test_attempts attempt join public.localhost_image_test_pool pool on pool.active_attempt=attempt.id
        where attempt.session_id=session_row.id);
end;
$$;
