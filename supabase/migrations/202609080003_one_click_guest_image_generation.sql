-- A one-click image request records the consent and photo first. The private
-- architecture profile is intentionally created only after the paid request
-- has reserved its fixed 30-cent ceiling and immediately before dispatch.
alter table public.guest_image_test_sessions alter column room_fidelity_profile drop not null;

create or replace function public.guest_image_test_prepare(target_session uuid, target_secret_hash text, target_style text,
  target_budget integer, target_profile jsonb, target_source_hash text, target_source_base64 text, target_source_mime text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if target_session is null or target_secret_hash !~ '^[a-f0-9]{64}$' or target_source_hash !~ '^[a-f0-9]{64}$'
    or target_style is null or char_length(target_style) not between 1 and 80 or target_budget not between 100 and 10000
    or (target_profile is not null and not public.guest_image_test_profile_valid(target_profile))
    or target_source_mime not in ('image/png','image/jpeg','image/webp')
    or octet_length(target_source_base64) not between 1 and 10000000 then raise exception 'invalid guest test preparation'; end if;
  if exists(select 1 from public.guest_image_test_sessions where id = target_session) then
    update public.guest_image_test_sessions set consent_at=now(), style=target_style, budget_euro=target_budget,
      room_fidelity_profile=target_profile, source_hash=target_source_hash, source_base64=target_source_base64,
      source_mime=target_source_mime, expires_at=now()+interval '24 hours'
      where id=target_session and secret_hash=target_secret_hash and revoked_at is null and expires_at > now()
        and not exists(select 1 from public.guest_image_test_attempts where session_id=target_session);
    if not found then raise exception 'guest session unavailable'; end if;
  else
    insert into public.guest_image_test_sessions(id,secret_hash,consent_at,style,budget_euro,room_fidelity_profile,source_hash,source_base64,source_mime)
      values(target_session,target_secret_hash,now(),target_style,target_budget,target_profile,target_source_hash,target_source_base64,target_source_mime);
  end if;
end;
$$;
