begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'raumly-user-1@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'raumly-user-2@example.test');

insert into public.projects (id, user_id, name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Projekt Nutzer 1'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Projekt Nutzer 2');

insert into public.project_photos (project_id, user_id, storage_path, original_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/one.png', 'one.png'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/two.png', 'two.png');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  'select count(*) from public.projects',
  array[1::bigint],
  'Nutzer 1 sieht ausschließlich das eigene Projekt'
);

select results_eq(
  'select count(*) from public.project_photos',
  array[1::bigint],
  'Nutzer 1 sieht ausschließlich eigene Fotodaten'
);

select results_eq(
  $$update public.projects set name = 'Fremdzugriff' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning 1$$,
  array[]::integer[],
  'Nutzer 1 kann das Projekt von Nutzer 2 nicht verändern'
);

select throws_ok(
  $$delete from public.projects where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501',
  null,
  'Nutzer können Projekte nicht direkt endgültig löschen'
);

select lives_ok(
  $$update public.projects set deleted_at = now() where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'Das eigene Projekt kann in den Papierkorb verschoben werden'
);

select results_eq(
  $$select count(*) from public.projects where deleted_at is not null$$,
  array[1::bigint],
  'Das Papierkorbprojekt bleibt für die Wiederherstellung sichtbar'
);

select results_eq(
  'select count(*) from public.project_photos',
  array[0::bigint],
  'Fotos eines Papierkorbprojekts sind nicht mehr abrufbar'
);

select lives_ok(
  $$update public.projects set deleted_at = null where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'Das eigene Projekt kann wiederhergestellt werden'
);

select lives_ok(
  'select public.request_account_deletion()',
  'Der eigene Kontolöschantrag kann erstellt werden'
);

select results_eq(
  'select count(*) from public.projects',
  array[0::bigint],
  'Nach dem Löschantrag sind normale Projektdaten gesperrt'
);

select lives_ok(
  'select public.cancel_account_deletion()',
  'Der Löschantrag kann innerhalb der Frist widerrufen werden'
);

select results_eq(
  'select count(*) from public.projects',
  array[1::bigint],
  'Nach dem Widerruf ist das eigene Projekt wieder verfügbar'
);

select * from finish();
rollback;
