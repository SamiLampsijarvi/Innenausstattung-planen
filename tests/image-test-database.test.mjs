import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';

// PostgreSQL execution against minimal existing-schema fixtures. Real Supabase
// integration and pg_cron scheduling must additionally pass before activation.
let db;
let baseline;
const user = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const photo = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, '0')}`;
const request = (n) => `bbbbbbbb-bbbb-4bbb-8bbb-${String(n).padStart(12, '0')}`;
const hash = (n) => String(n).padStart(64, 'a');
const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
const approve = (n, owner = user) => scalar('select public.image_test_approve($1,$2,$3,$4,$5)', [owner, photo(n), hash(n), 'Japandi', 1500]);
const setFidelity = (id, owner = user, profile = { doors: 1, windows: 2, openings: 0, protectedArchitecture: true }) => scalar('select public.image_test_set_room_fidelity($1,$2,$3)', [owner, id, JSON.stringify(profile)]);
const reserve = async (id, n, h = hash(1), owner = user) => {
  if (await scalar('select room_fidelity_profile is null from public.image_test_photos where id=$1', [id])) await setFidelity(id, owner);
  return scalar('select public.image_test_reserve($1,$2,$3,$4)', [owner, id, request(n), h]);
};
const arm = () => db.exec("update public.image_test_campaign set enabled=true, approved_until=now()+interval '1 hour', price_review='offline fixture only', reservation_cents=30, billing_checked_at=clock_timestamp()");
const finish = (n, image = 'AQ==') => scalar('select public.image_test_finish($1,$2,$3,$4,$5,$6,$7)', [user, request(n), image, 'image/png', 20, 'fake-response', {}]);
async function scenario(body) {
  await db.close(); db = new PGlite({ loadDataDir: baseline });
  await body();
}

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    create table public.projects(id uuid primary key, user_id uuid references auth.users on delete cascade, deleted_at timestamptz);
    create table public.project_photos(id uuid primary key, project_id uuid references public.projects on delete cascade,
      user_id uuid references auth.users on delete cascade);
    create table public.account_deletion_requests(user_id uuid references auth.users on delete cascade);
    create schema cron;
    create table cron.job(jobname text, schedule text, command text);
    create function cron.schedule(text,text,text) returns bigint language sql as $$
      insert into cron.job values($1,$2,$3); select 1::bigint; $$;
  `);
  const phase5 = await readFile(new URL('../supabase/migrations/202608300001_phase5_completion.sql', import.meta.url), 'utf8');
  // Execute the real existing consent implementation, not a reimplementation.
  await db.exec(phase5.slice(phase5.indexOf('create table if not exists public.consent_events'), phase5.indexOf('drop policy if exists "Users create own photo metadata"')));
  const migration = await readFile(new URL('../supabase/migrations/202608310001_controlled_image_test.sql', import.meta.url), 'utf8');
  await db.exec(migration.replace('create extension if not exists pg_cron;', '-- pg_cron scheduler stubbed in this offline harness'));
  const operatorArm = await readFile(new URL('../supabase/migrations/202609010001_image_test_operator_arm.sql', import.meta.url), 'utf8');
  await db.exec(operatorArm);
  const roomFidelity = await readFile(new URL('../supabase/migrations/202609010002_room_fidelity_gate.sql', import.meta.url), 'utf8');
  await db.exec(roomFidelity);
  await db.exec(`insert into auth.users values('${user}'),('${other}');
    insert into public.projects values('${user}','${user}',null),('${other}','${other}',null);
    insert into public.image_test_members values('${user}'),('${other}');
    insert into public.consent_events(user_id,consent_kind,action,policy_version) values
      ('${user}','photo_storage','granted','photo-storage-v1'),('${user}','ai_processing','granted','vertex-test-v1'),
      ('${other}','photo_storage','granted','photo-storage-v1'),('${other}','ai_processing','granted','vertex-test-v1');`);
  for (let n = 1; n <= 7; n++) await db.query('insert into public.project_photos values($1,$2,$3)', [photo(n), user, user]);
  baseline = await db.dumpDataDir();
});
after(async () => { await db?.close(); });

test('database defaults remain disabled with no price authorization', () => scenario(async () => {
  const id = await approve(1);
  await assert.rejects(reserve(id, 1), /disabled/);
  assert.equal(await scalar('select reserved_cents from public.image_test_campaign'), 0);
}));
test('room fidelity profile is validated and required before reservation', () => scenario(async () => {
  const id = await approve(1); await arm();
  await assert.rejects(scalar('select public.image_test_reserve($1,$2,$3,$4)', [user, id, request(1), hash(1)]), /room fidelity profile required/);
  await assert.rejects(setFidelity(id, user, { doors: -1, windows: 2, openings: 0, protectedArchitecture: true }), /invalid room fidelity profile/);
  await setFidelity(id);
  const reservation = await scalar('select public.image_test_reserve($1,$2,$3,$4)', [user, id, request(1), hash(1)]);
  assert.deepEqual(reservation.roomFidelityProfile, { doors: 1, windows: 2, openings: 0, protectedArchitecture: true });
}));
test('successful result remains pending until accepted and rejection removes it', () => scenario(async () => {
  const id = await approve(1); await arm(); await reserve(id, 1); await finish(1);
  assert.equal(await scalar('select room_fidelity_status from public.image_test_attempts where id=$1', [request(1)]), 'pending');
  await scalar('select public.image_test_review_room_fidelity($1,$2,true)', [user, request(1)]);
  assert.equal(await scalar('select room_fidelity_status from public.image_test_attempts where id=$1', [request(1)]), 'accepted');
  await db.exec("update public.image_test_campaign set enabled=true, billing_checked_at=clock_timestamp()");
  await reserve(id, 2); await finish(2);
  await scalar('select public.image_test_review_room_fidelity($1,$2,false)', [user, request(2)]);
  assert.equal(await scalar('select status from public.image_test_attempts where id=$1', [request(2)]), 'discarded');
  assert.equal(await scalar('select count(*) from public.image_test_results where attempt_id=$1', [request(2)]), 0);
  assert.equal(await scalar('select reserved_cents from public.image_test_campaign'), 60);
}));
test('only server role can read state or mutate accounting', () => scenario(async () => {
  assert.equal(await scalar("select has_function_privilege('authenticated','public.image_test_reserve(uuid,uuid,uuid,text)','execute')"), false);
  assert.equal(await scalar("select has_function_privilege('anon','public.image_test_state(uuid)','execute')"), false);
  assert.equal(await scalar("select has_table_privilege('authenticated','public.image_test_results','select')"), false);
  assert.equal(await scalar("select has_function_privilege('authenticated','public.image_test_arm(text,integer,integer)','execute')"), false);
  await db.exec('set role service_role');
  assert.equal((await scalar('select public.image_test_state($1)', [user])).consent, true);
  assert.equal((await scalar("select public.image_test_arm('offline test only',30,60)")).reservationCents, 30);
  await db.exec('reset role');
  assert.equal(await scalar('select enabled from public.image_test_campaign'), true);
}));
test('foreign photo and changed contents cannot be dispatched', () => scenario(async () => {
  await assert.rejects(approve(1, other), /unavailable/);
  const id = await approve(1); await arm();
  await assert.rejects(reserve(id, 1, hash(2)), /changed/);
  await assert.rejects(reserve(id, 1, hash(1), other), /changed/);
  assert.equal(await scalar('select reserved_cents from public.image_test_campaign'), 0);
}));
test('five photos remain exhausted after deletion', () => scenario(async () => {
  for (let n = 1; n <= 5; n++) await approve(n);
  await assert.rejects(approve(6), /five photos/);
  await db.query('delete from public.project_photos where id=$1', [photo(1)]);
  await assert.rejects(approve(6), /five photos|test closed/);
  assert.equal(await scalar('select photo_count from public.image_test_campaign'), 5);
  assert.equal(await scalar('select count(*) from public.image_test_photos where content_hash is null'), 1);
}));
test('duplicate approval does not consume an extra slot', () => scenario(async () => {
  assert.equal(await approve(1), await approve(1));
  assert.equal(await scalar('select photo_count from public.image_test_campaign'), 1);
}));
test('two attempts and duplicate requests remain blocked after completion', () => scenario(async () => {
  const id = await approve(1);
  for (let n = 1; n <= 2; n++) { await arm(); await reserve(id, n); await finish(n); }
  await arm();
  await assert.rejects(reserve(id, 1), /duplicate/);
  await assert.rejects(reserve(id, 3), /two attempts/);
  assert.equal(await scalar('select reserved_cents from public.image_test_campaign'), 60);
}));
test('submitted overlapping reservations permit exactly one attempt', () => scenario(async () => {
  const id = await approve(1); await arm();
  const outcomes = await Promise.allSettled([reserve(id, 1), reserve(id, 2)]);
  assert.equal(outcomes.filter((x) => x.status === 'fulfilled').length, 1);
  assert.equal(await scalar('select reserved_cents from public.image_test_campaign'), 30);
  assert.equal(await scalar('select enabled from public.image_test_campaign'), false);
}));
test('unknown outcome retains active lock and reservations', () => scenario(async () => {
  const id = await approve(1); await arm(); await reserve(id, 1); await finish(1, null); await arm();
  await assert.rejects(reserve(id, 2), /unresolved/);
  assert.equal(await scalar('select reserved_cents from public.image_test_campaign'), 30);
}));
test('withdrawal invalidates approval and removes images without refunding budget', () => scenario(async () => {
  const id = await approve(1); await arm(); await reserve(id, 1); await finish(1);
  await db.query("insert into public.consent_events(user_id,consent_kind,action,policy_version) values($1,'ai_processing','withdrawn','vertex-test-v1')", [user]);
  assert.equal(await scalar('select count(*) from public.image_test_results'), 0);
  assert.equal(await scalar('select reserved_cents from public.image_test_campaign'), 30);
  await db.query("insert into public.consent_events(user_id,consent_kind,action,policy_version) values($1,'ai_processing','granted','vertex-test-v1')", [user]);
  await arm(); await assert.rejects(reserve(id, 2), /changed/);
  assert.equal(await approve(1), id);
  await reserve(id, 2);
}));
test('late response after withdrawal is discarded', () => scenario(async () => {
  const id = await approve(1); await arm(); await reserve(id, 1);
  await db.query("insert into public.consent_events(user_id,consent_kind,action,policy_version) values($1,'ai_processing','withdrawn','vertex-test-v1')", [user]);
  assert.equal(await finish(1), 'discarded');
  assert.equal(await scalar('select count(*) from public.image_test_results'), 0);
}));
test('three euro ceiling prevents any additional reservation', () => scenario(async () => {
  const id = await approve(1); await arm();
  await db.exec('update public.image_test_campaign set reserved_cents=280');
  await assert.rejects(reserve(id, 1), /three euro/);
  assert.equal(await scalar('select count(*) from public.image_test_attempts'), 0);
}));
test('a further attempt requires a later billing reconciliation', () => scenario(async () => {
  const id = await approve(1); await arm(); await reserve(id, 1); await finish(1);
  await db.exec('update public.image_test_campaign set enabled=true');
  await assert.rejects(reserve(id, 2), /billing reconciliation/);
}));
test('expiry physically purges results while accounting remains', () => scenario(async () => {
  const id = await approve(1); await arm(); await reserve(id, 1); await finish(1);
  await db.exec("update public.image_test_results set expires_at=now()-interval '1 second'");
  assert.equal(await scalar('select public.image_test_read_result($1,$2)', [user, request(1)]), null);
  await db.exec('select public.image_test_purge_results()');
  assert.equal(await scalar('select count(*) from public.image_test_results'), 0);
  assert.equal(await scalar('select count(*) from public.image_test_attempts'), 1);
}));
test('other accounts never receive results', () => scenario(async () => {
  const id = await approve(1); await arm(); await reserve(id, 1); await finish(1);
  assert.equal(await scalar('select public.image_test_read_result($1,$2)', [other, request(1)]), null);
  assert.equal((await scalar('select public.image_test_read_result($1,$2)', [user, request(1)])).mime, 'image/png');
}));
test('account deletion removes personal data but preserves totals', () => scenario(async () => {
  const id = await approve(1); await arm(); await reserve(id, 1); await finish(1);
  await db.query('delete from auth.users where id=$1', [user]);
  assert.equal(await scalar('select count(*) from public.image_test_results'), 0);
  assert.equal(await scalar('select count(*) from public.image_test_attempts where user_id is not null'), 0);
  assert.equal(await scalar('select reserved_cents from public.image_test_campaign'), 30);
}));
test('database restart preserves consumed attempts and global lock', () => scenario(async () => {
  const id = await approve(1); await arm(); await reserve(id, 1);
  const snapshot = await db.dumpDataDir(); await db.close();
  db = new PGlite({ loadDataDir: snapshot });
  assert.equal(await scalar('select reserved_cents from public.image_test_campaign'), 30);
  assert.equal(await scalar('select attempts from public.image_test_photos where id=$1', [id]), 1);
  await arm(); await assert.rejects(reserve(id, 2), /unresolved/);
}));
