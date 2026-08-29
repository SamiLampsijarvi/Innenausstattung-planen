begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email) values
  ('33333333-3333-4333-8333-333333333333', 'phase5-user-1@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'phase5-user-2@example.test');

select results_eq(
  $$select count(*) from public.account_profiles where user_id in ('33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444')$$,
  array[2::bigint],
  'Jedes neue Konto erhält automatisch ein Profil'
);
select results_eq(
  $$select count(distinct account_number) from public.account_profiles where user_id in ('33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444')$$,
  array[2::bigint],
  'Kontonummern sind eindeutig'
);
select results_eq(
  $$select count(*) from public.account_profiles where account_number ~ '^[0-9]{8}$' and user_id in ('33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444')$$,
  array[2::bigint],
  'Kontonummern bestehen aus genau acht Ziffern'
);

insert into public.projects (id, user_id, name) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333', 'Privat 1'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '44444444-4444-4444-8444-444444444444', 'Privat 2');

set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

select results_eq('select count(*) from public.account_profiles', array[1::bigint], 'Nutzer sieht nur die eigene Kontonummer');
select results_eq('select count(*) from public.projects', array[1::bigint], 'Nutzer sieht nur das eigene Projekt');
select results_eq('select count(*) from public.consent_events', array[0::bigint], 'Einwilligungsverlauf beginnt leer');
select is(public.has_active_consent('photo_storage'), false, 'Ohne Nachweis ist die Fotoeinwilligung nicht aktiv');
select lives_ok(
  $$select public.record_own_consent('photo_storage', 'granted', 'phase5-v1')$$,
  'Nutzer kann die Fotoeinwilligung erteilen'
);
select is(public.has_active_consent('photo_storage'), true, 'Erteilte Fotoeinwilligung wird erkannt');
select results_eq('select count(*) from public.consent_events', array[1::bigint], 'Nutzer sieht den eigenen Einwilligungsnachweis');
select lives_ok(
  $$insert into public.project_photos (project_id, user_id, storage_path, original_name) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333/cccccccc-cccc-4ccc-8ccc-cccccccccccc/allowed.png', 'allowed.png')$$,
  'Mit Einwilligung darf eigene Fotometadaten gespeichert werden'
);
select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id) values ('room-photos', '33333333-3333-4333-8333-333333333333/cccccccc-cccc-4ccc-8ccc-cccccccccccc/allowed-storage.png', '33333333-3333-4333-8333-333333333333')$$,
  'Mit Einwilligung darf eine Datei im eigenen aktiven Projekt gespeichert werden'
);
select throws_ok(
  $$insert into public.project_photos (project_id, user_id, storage_path, original_name) values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333/dddddddd-dddd-4ddd-8ddd-dddddddddddd/foreign.png', 'foreign.png')$$,
  '42501', null,
  'Ein Nutzer kann keine Fotometadaten an ein fremdes Projekt hängen'
);
select lives_ok(
  $$select public.record_own_consent('photo_storage', 'withdrawn', 'phase5-v1')$$,
  'Nutzer kann die Fotoeinwilligung widerrufen'
);
select is(public.has_active_consent('photo_storage'), false, 'Widerruf sperrt weitere Fotoverarbeitung');
select throws_ok(
  $$insert into public.project_photos (project_id, user_id, storage_path, original_name) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333/cccccccc-cccc-4ccc-8ccc-cccccccccccc/blocked.png', 'blocked.png')$$,
  '42501', null,
  'Nach Widerruf werden neue Fotometadaten abgelehnt'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id) values ('room-photos', '33333333-3333-4333-8333-333333333333/cccccccc-cccc-4ccc-8ccc-cccccccccccc/blocked-storage.png', '33333333-3333-4333-8333-333333333333')$$,
  '42501', null,
  'Nach Widerruf werden neue Dateien im privaten Speicher abgelehnt'
);
select throws_ok(
  $$insert into public.account_profiles (user_id, account_number) values ('33333333-3333-4333-8333-333333333333', '12345678')$$,
  '42501', null,
  'Nutzer können Kontonummern nicht selbst verändern'
);
select throws_ok(
  $$insert into public.consent_events (user_id, consent_kind, action, policy_version) values ('33333333-3333-4333-8333-333333333333', 'photo_storage', 'granted', 'manipuliert')$$,
  '42501', null,
  'Einwilligungsnachweise können nicht direkt manipuliert werden'
);

set local request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';

select results_eq('select count(*) from public.consent_events', array[0::bigint], 'Anderer Nutzer sieht keine fremden Einwilligungsnachweise');
select is(public.has_active_consent('photo_storage'), false, 'Einwilligung gilt niemals für ein anderes Konto');
select throws_ok(
  $$insert into public.project_photos (project_id, user_id, storage_path, original_name) values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '44444444-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444/dddddddd-dddd-4ddd-8ddd-dddddddddddd/no-consent.png', 'no-consent.png')$$,
  '42501', null,
  'Ohne eigene Einwilligung bleiben Fotometadaten gesperrt'
);

reset role;
select * from finish();
rollback;
