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
const passedValidation = { raumlyValidation: { status: 'passed', version: 'structure-v3', reasons: [], edgeRetention: 1 } };
const finish = (n, image = 'AQ==', usage = passedValidation) => scalar('select public.image_test_finish($1,$2,$3,$4,$5,$6,$7)', [user, request(n), image, 'image/png', 20, 'fake-response', JSON.stringify(usage)]);
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
  const expiredArm = await readFile(new URL('../supabase/migrations/202609030001_expired_image_test_arm.sql', import.meta.url), 'utf8');
  await db.exec(expiredArm);
  const automaticFidelity = await readFile(new URL('../supabase/migrations/202609030002_automatic_room_structure_gate.sql', import.meta.url), 'utf8');
  await db.exec(automaticFidelity);
  const guestPreparation = await readFile(new URL('../supabase/migrations/202609070001_guest_image_test_preparation.sql', import.meta.url), 'utf8');
  await db.exec(guestPreparation);
  const automaticGuestArchitecture = await readFile(new URL('../supabase/migrations/202609070002_automatic_guest_architecture_profile.sql', import.meta.url), 'utf8');
  await db.exec(automaticGuestArchitecture);
  const guestDispatchAccounting = await readFile(new URL('../supabase/migrations/202609080001_guest_dispatch_accounting.sql', import.meta.url), 'utf8');
  await db.exec(guestDispatchAccounting);
  const guestCandidateReview = await readFile(new URL('../supabase/migrations/202609080002_guest_candidate_review.sql', import.meta.url), 'utf8');
  await db.exec(guestCandidateReview);
  const oneClickGuestGeneration = await readFile(new URL('../supabase/migrations/202609080003_one_click_guest_image_generation.sql', import.meta.url), 'utf8');
  await db.exec(oneClickGuestGeneration);
  const localhostImageTestPool = await readFile(new URL('../supabase/migrations/202609080004_localhost_image_test_pool.sql', import.meta.url), 'utf8');
  await db.exec(localhostImageTestPool);
  const durableVertexResultFinalization = await readFile(new URL('../supabase/migrations/202609080005_durable_vertex_result_finalization.sql', import.meta.url), 'utf8');
  await db.exec(durableVertexResultFinalization);
  const unresolvedLocalhostAttempt = await readFile(new URL('../supabase/migrations/202609090001_reconcile_unresolved_localhost_attempt.sql', import.meta.url), 'utf8');
  await db.exec(unresolvedLocalhostAttempt);
  const durableVertexReceipt = await readFile(new URL('../supabase/migrations/202609090002_durable_vertex_receipt.sql', import.meta.url), 'utf8');
  await db.exec(durableVertexReceipt);
  const imageTestProgress = await readFile(new URL('../supabase/migrations/202609090003_image_test_progress.sql', import.meta.url), 'utf8');
  await db.exec(imageTestProgress);
  const ledgerStatus = await readFile(new URL('../supabase/migrations/202609100001_localhost_image_test_ledger_status.sql', import.meta.url), 'utf8');
  await db.exec(ledgerStatus);
  const ledgerStatusDetail = await readFile(new URL('../supabase/migrations/202609100002_localhost_image_test_ledger_status_detail.sql', import.meta.url), 'utf8');
  await db.exec(ledgerStatusDetail);
  const reconcileDanglingLock = await readFile(new URL('../supabase/migrations/202609100003_reconcile_dangling_localhost_image_test_lock.sql', import.meta.url), 'utf8');
  await db.exec(reconcileDanglingLock);
  await db.exec(await readFile(new URL('../supabase/migrations/202609100004_guest_failure_diagnostics.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609130001_preserve_unresolved_guest_attempt_audit.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609130002_localhost_rejection_diagnostics.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609130003_require_billing_reconciliation_between_localhost_tests.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609160001_localhost_pending_billing_diagnostics.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609160002_preserve_pending_billing_audit.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609160003_reconcile_unknown_localhost_attempt.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609160004_provisional_unknown_attempt_release.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609160005_fix_provisional_release_function_name.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609160006_local_rejected_candidate_preview.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609160007_local_latest_rejected_candidate_preview.sql', import.meta.url), 'utf8'));
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

test('anonymous preparation is private, short-lived and reserves one localhost attempt', () => scenario(async () => {
  const guestSession = 'cccccccc-cccc-4ccc-8ccc-000000000001';
  const guestSecret = 'd'.repeat(64);
  const guestHash = 'e'.repeat(64);
  assert.equal(await scalar("select has_table_privilege('anon','public.guest_image_test_sessions','select')"), false);
  assert.equal(await scalar("select has_function_privilege('authenticated','public.guest_image_test_prepare(uuid,text,text,integer,jsonb,text,text,text)','execute')"), false);
  await db.exec('set role service_role');
  await scalar('select public.guest_image_test_prepare($1,$2,$3,$4,$5,$6,$7,$8)', [guestSession, guestSecret, 'Japandi', 1500, null, guestHash, 'AQ==', 'image/png']);
  const state = await scalar('select public.guest_image_test_state($1,$2)', [guestSession, guestSecret]);
  assert.equal(state.prepared, true);
  assert.equal((await scalar('select public.guest_image_test_reserve($1,$2,$3)', [guestSession, guestSecret, request(91)])).reservedCents, 30);
  await scalar('select public.guest_image_test_revoke($1,$2)', [guestSession, guestSecret]);
  await db.exec('reset role');
  assert.equal(await scalar('select source_base64 is null from public.guest_image_test_sessions where id=$1', [guestSession]), true);
}));

test('localhost ledger report is server-only and contains no test photo data', () => scenario(async () => {
  assert.equal(await scalar("select has_function_privilege('anon','public.localhost_image_test_ledger_status()','execute')"), false);
  assert.equal(await scalar("select has_function_privilege('authenticated','public.localhost_image_test_ledger_status()','execute')"), false);
  await db.exec('set role service_role');
  const status = await scalar('select public.localhost_image_test_ledger_status()');
  await db.exec('reset role');
  assert.equal(status.maximumTotalCents, 300);
  assert.equal(status.activeAttempt, false);
  assert.equal(status.activeAttemptInGuestFlow, false);
  assert.equal(status.activeAttemptInLegacyFlow, false);
  assert.equal('source_base64' in status, false);
  assert.equal('sessionSecret' in status, false);
}));

test('only a dangling localhost lock can be reconciled after a billing check', () => scenario(async () => {
  await db.query('update public.localhost_image_test_pool set active_attempt=$1', [request(999)]);
  await db.exec('set role service_role');
  const status = await scalar('select public.localhost_image_test_reconcile_dangling_lock()');
  await db.exec('reset role');
  assert.equal(status.activeAttempt, false);
  assert.equal(await scalar('select active_attempt is null from public.localhost_image_test_pool'), true);

  await db.exec('set role service_role');
  const session = 'cccccccc-cccc-4ccc-8ccc-000000000009';
  await scalar('select public.guest_image_test_prepare($1,$2,$3,$4,$5,$6,$7,$8)', [session, 'c'.repeat(64), 'Japandi', 1500, null, 'a'.repeat(64), 'AQ==', 'image/png']);
  await scalar('select public.guest_image_test_reserve($1,$2,$3)', [session, 'c'.repeat(64), request(999)]);
  await assert.rejects(scalar('select public.localhost_image_test_reconcile_dangling_lock()'), /requires provider and billing reconciliation/);
  await db.exec('reset role');
}));

test('guest receipt survives failure while polling excludes original image and private reports', () => scenario(async () => {
  const session = 'cccccccc-cccc-4ccc-8ccc-000000000019';
  const secret = 'c'.repeat(64);
  await db.exec('set role service_role');
  await scalar('select public.guest_image_test_prepare($1,$2,$3,$4,$5,$6,$7,$8)', [session, secret, 'Japandi', 1500, null, 'a'.repeat(64), 'AQ==', 'image/png']);
  await scalar('select public.guest_image_test_reserve($1,$2,$3)', [session, secret, request(919)]);
  await scalar('select public.guest_image_test_record_provider_image($1,$2,$3,$4,$5,$6,$7,$8)', [session,secret,request(919),'AQ==','image/png',20,'fake-provider','{}']);
  await scalar('select public.guest_image_test_record_failure($1,$2,$3,$4,$5)', [session,secret,request(919),'Raumtreue-Prüfung','UNCLASSIFIED']);
  await scalar('select public.guest_image_test_finish($1,$2,$3)', [session,secret,request(919)]);
  const state = await scalar('select public.guest_image_test_state($1,$2)', [session,secret]);
  assert.equal(state.attempts[0].failure_stage,'Raumtreue-Prüfung');
  assert.equal(state.attempts[0].imageReady,false);
  assert.equal('provider_image_base64' in state.attempts[0],false);
  assert.equal('automatic_fidelity_report' in state.attempts[0],false);
  await assert.rejects(scalar('select public.guest_image_test_record_failure($1,$2,$3,$4,$5)', [session,secret,request(919),'secret','secret']), /invalid diagnostic/);
  await db.exec('reset role');
  assert.equal(await scalar('select provider_image_base64 from public.guest_image_test_attempts where id=$1',[request(919)]),'AQ==');
  assert.equal(await scalar('select active_attempt is not null from public.localhost_image_test_pool'),true);
  assert.equal(await scalar("select has_function_privilege('anon','public.guest_image_test_record_failure(uuid,text,uuid,text,text)','execute')"),false);
}));

test('retention removes expired photos but retains an active unresolved audit lock', () => scenario(async () => {
  const session = 'cccccccc-cccc-4ccc-8ccc-000000000029';
  const secret = 'd'.repeat(64);
  await db.exec('set role service_role');
  await scalar('select public.guest_image_test_prepare($1,$2,$3,$4,$5,$6,$7,$8)', [session, secret, 'Japandi', 1500, null, 'a'.repeat(64), 'AQ==', 'image/png']);
  await scalar('select public.guest_image_test_reserve($1,$2,$3)', [session, secret, request(929)]);
  await db.exec('reset role');
  await db.exec("update public.guest_image_test_sessions set expires_at=now()-interval '1 second' where id='cccccccc-cccc-4ccc-8ccc-000000000029'");
  await db.exec('set role service_role');
  await scalar('select public.guest_image_test_purge()');
  await db.exec('reset role');
  const row = (await db.query('select source_base64,source_hash,room_fidelity_profile,revoked_at,redacted_at from public.guest_image_test_sessions where id=$1',[session])).rows[0];
  assert.equal(row.source_base64,null);
  assert.equal(row.source_hash,'0'.repeat(64));
  assert.equal(row.room_fidelity_profile,null);
  assert.ok(row.revoked_at && row.redacted_at);
  assert.equal(await scalar('select status from public.guest_image_test_attempts where id=$1',[request(929)]),'unknown');
  assert.equal(await scalar('select active_attempt=$1 from public.localhost_image_test_pool',[request(929)]),true);
}));

test('retention redacts a completed attempt until its billing check', () => scenario(async () => {
  const session = 'cccccccc-cccc-4ccc-8ccc-000000000031';
  const secret = 'e'.repeat(64);
  const rejection = { raumlyValidation: { status: 'rejected', version: 'structure-v3', reasons: ['perspective changed'] } };
  await db.exec('set role service_role');
  await scalar('select public.guest_image_test_prepare($1,$2,$3,$4,$5,$6,$7,$8)', [session, secret, 'Japandi', 1500, null, 'a'.repeat(64), 'AQ==', 'image/png']);
  await scalar('select public.guest_image_test_reserve($1,$2,$3)', [session, secret, request(931)]);
  await scalar('select public.guest_image_test_finish($1,$2,$3,$4,$5,$6,$7,$8)', [session, secret, request(931), null, null, 20, 'provider-test', JSON.stringify(rejection)]);
  await db.exec('reset role');
  await db.exec("update public.guest_image_test_sessions set expires_at=now()-interval '1 second' where id='cccccccc-cccc-4ccc-8ccc-000000000031'");
  await db.exec('set role service_role');
  await scalar('select public.guest_image_test_purge()');
  await db.exec('reset role');
  assert.equal(await scalar('select source_base64 is null from public.guest_image_test_sessions where id=$1',[session]),true);
  assert.equal(await scalar('select status from public.guest_image_test_attempts where id=$1',[request(931)]),'discarded');
}));

test('operator diagnostics reveal only the rejected structural report', () => scenario(async () => {
  const session = 'cccccccc-cccc-4ccc-8ccc-000000000039';
  const secret = 'e'.repeat(64);
  const rejection = { raumlyValidation: { status: 'rejected', version: 'structure-v3', reasons: ['perspective changed'], edgeRetention: 0.2 } };
  await db.exec('set role service_role');
  await scalar('select public.guest_image_test_prepare($1,$2,$3,$4,$5,$6,$7,$8)', [session, secret, 'Japandi', 1500, null, 'a'.repeat(64), 'AQ==', 'image/png']);
  await scalar('select public.guest_image_test_reserve($1,$2,$3)', [session, secret, request(939)]);
  await scalar('select public.guest_image_test_finish($1,$2,$3,$4,$5,$6,$7,$8)', [session, secret, request(939), null, null, 20, 'provider-test', JSON.stringify(rejection)]);
  const report = await scalar('select public.localhost_image_test_latest_rejection_diagnostics()');
  assert.equal(report.status, 'discarded');
  assert.deepEqual(report.validation, rejection.raumlyValidation);
  assert.equal('source_base64' in report, false);
  await db.exec('reset role');
  assert.equal(await scalar("select has_function_privilege('anon','public.localhost_image_test_latest_rejection_diagnostics()','execute')"), false);
}));

test('a completed localhost attempt blocks the next reservation until billing is reconciled', () => scenario(async () => {
  const firstSession = 'cccccccc-cccc-4ccc-8ccc-000000000049';
  const secondSession = 'cccccccc-cccc-4ccc-8ccc-000000000050';
  const secret = 'f'.repeat(64);
  const rejection = { raumlyValidation: { status: 'rejected', version: 'structure-v3', reasons: ['perspective changed'] } };
  await db.exec('set role service_role');
  await scalar('select public.guest_image_test_prepare($1,$2,$3,$4,$5,$6,$7,$8)', [firstSession, secret, 'Japandi', 1500, null, 'a'.repeat(64), 'AQ==', 'image/png']);
  await scalar('select public.guest_image_test_reserve($1,$2,$3)', [firstSession, secret, request(949)]);
  await scalar('select public.guest_image_test_finish($1,$2,$3,$4,$5,$6,$7,$8)', [firstSession, secret, request(949), null, null, 20, 'provider-test', JSON.stringify(rejection)]);
  await scalar('select public.guest_image_test_prepare($1,$2,$3,$4,$5,$6,$7,$8)', [secondSession, secret, 'Japandi', 1500, null, 'b'.repeat(64), 'AQ==', 'image/png']);
  await assert.rejects(scalar('select public.guest_image_test_reserve($1,$2,$3)', [secondSession, secret, request(950)]), /billing reconciliation required/);
  const ledger = await scalar('select public.localhost_image_test_reconcile_completed_attempt($1)', [0]);
  assert.equal(ledger.activeAttempt, false);
  await db.exec('reset role');
  assert.equal(await scalar('select actual_cents from public.localhost_image_test_pool'), 0);
  await db.exec('set role service_role');
  await scalar('select public.guest_image_test_reserve($1,$2,$3)', [secondSession, secret, request(950)]);
  await db.exec('reset role');
}));

test('a zero-cost billing check can close a legacy case with no retained attempt', () => scenario(async () => {
  await db.exec('set role service_role');
  const ledger = await scalar('select public.localhost_image_test_reconcile_completed_attempt($1)', [0]);
  assert.equal(ledger.activeAttempt, false);
  await assert.rejects(scalar('select public.localhost_image_test_reconcile_completed_attempt($1)', [1]), /no retained attempt/);
  await db.exec('reset role');
}));

test('an unknown localhost attempt requires and accepts explicit billing reconciliation', () => scenario(async () => {
  const session = 'cccccccc-cccc-4ccc-8ccc-000000000069';
  const secret = 'b'.repeat(64);
  await db.exec('set role service_role');
  await scalar('select public.guest_image_test_prepare($1,$2,$3,$4,$5,$6,$7,$8)', [session, secret, 'Japandi', 1500, null, 'c'.repeat(64), 'AQ==', 'image/png']);
  await scalar('select public.guest_image_test_reserve($1,$2,$3)', [session, secret, request(969)]);
  assert.equal(await scalar('select public.guest_image_test_finish($1,$2,$3)', [session, secret, request(969)]), 'unknown');
  const ledger = await scalar('select public.localhost_image_test_reconcile_unknown_attempt($1)', [0]);
  assert.equal(ledger.activeAttempt, false);
  assert.equal(ledger.actualCents, 0);
  await assert.rejects(scalar('select public.localhost_image_test_reconcile_unknown_attempt($1)', [0]), /no active unknown attempt/);
  await db.exec('reset role');
}));

test('a no-receipt unknown attempt can be conservatively released for one further test', () => scenario(async () => {
  const firstSession = 'cccccccc-cccc-4ccc-8ccc-000000000070';
  const secondSession = 'cccccccc-cccc-4ccc-8ccc-000000000071';
  const secret = 'c'.repeat(64);
  await db.exec('set role service_role');
  await scalar('select public.guest_image_test_prepare($1,$2,$3,$4,$5,$6,$7,$8)', [firstSession, secret, 'Japandi', 1500, null, 'd'.repeat(64), 'AQ==', 'image/png']);
  await scalar('select public.guest_image_test_reserve($1,$2,$3)', [firstSession, secret, request(970)]);
  assert.equal(await scalar('select public.guest_image_test_finish($1,$2,$3)', [firstSession, secret, request(970)]), 'unknown');
  const released = await scalar('select public.localhost_image_test_release_unknown_attempt_provisionally()');
  assert.equal(released.activeAttempt, false);
  await scalar('select public.guest_image_test_prepare($1,$2,$3,$4,$5,$6,$7,$8)', [secondSession, secret, 'Japandi', 1500, null, 'e'.repeat(64), 'AQ==', 'image/png']);
  await scalar('select public.guest_image_test_reserve($1,$2,$3)', [secondSession, secret, request(971)]);
  await db.exec('reset role');
}));

test('a provisional unknown attempt is reconciled as a bounded billing batch', () => scenario(async () => {
  const session = 'cccccccc-cccc-4ccc-8ccc-000000000072';
  const secret = 'd'.repeat(64);
  await db.exec('set role service_role');
  await scalar('select public.guest_image_test_prepare($1,$2,$3,$4,$5,$6,$7,$8)', [session, secret, 'Japandi', 1500, null, 'f'.repeat(64), 'AQ==', 'image/png']);
  await scalar('select public.guest_image_test_reserve($1,$2,$3)', [session, secret, request(972)]);
  assert.equal(await scalar('select public.guest_image_test_finish($1,$2,$3)', [session, secret, request(972)]), 'unknown');
  await scalar('select public.localhost_image_test_release_unknown_attempt_provisionally()');
  const ledger = await scalar('select public.localhost_image_test_reconcile_pending_batch($1)', [12]);
  assert.equal(ledger.activeAttempt, false);
  assert.equal(ledger.actualCents, 12);
  await assert.rejects(scalar('select public.localhost_image_test_reconcile_pending_batch($1)', [0]), /unexpected pending billing batch/);
  await db.exec('reset role');
}));

test('pending billing diagnostics omit all image data', () => scenario(async () => {
  const session = 'cccccccc-cccc-4ccc-8ccc-000000000059';
  const secret = 'a'.repeat(64);
  await db.exec('set role service_role');
  await scalar('select public.guest_image_test_prepare($1,$2,$3,$4,$5,$6,$7,$8)', [session, secret, 'Japandi', 1500, null, 'b'.repeat(64), 'AQ==', 'image/png']);
  await scalar('select public.guest_image_test_reserve($1,$2,$3)', [session, secret, request(959)]);
  const diagnostics = await scalar('select public.localhost_image_test_pending_billing_diagnostics()');
  assert.equal(diagnostics[0].status, 'reserved');
  assert.equal('source_base64' in diagnostics[0], false);
  assert.equal('provider_image_base64' in diagnostics[0], false);
  await db.exec('reset role');
  assert.equal(await scalar("select has_function_privilege('anon','public.localhost_image_test_pending_billing_diagnostics()','execute')"), false);
}));

test('only the matching active test session can read a rejected provider receipt', () => scenario(async () => {
  const session = 'cccccccc-cccc-4ccc-8ccc-000000000073';
  const secret = 'e'.repeat(64);
  await db.exec('set role service_role');
  await scalar('select public.guest_image_test_prepare($1,$2,$3,$4,$5,$6,$7,$8)', [session, secret, 'Japandi', 1500, null, 'a'.repeat(64), 'AQ==', 'image/png']);
  await scalar('select public.guest_image_test_reserve($1,$2,$3)', [session, secret, request(973)]);
  await scalar('select public.guest_image_test_record_provider_image($1,$2,$3,$4,$5,$6,$7,$8)', [session, secret, request(973), 'AQ==', 'image/png', 20, 'provider-test', '{}']);
  const rejected = { raumlyValidation: { status: 'rejected', version: 'structure-v3', reasons: ['perspective changed'] } };
  assert.equal(await scalar('select public.guest_image_test_finish($1,$2,$3,$4,$5,$6,$7,$8)', [session, secret, request(973), null, null, 20, 'provider-test', JSON.stringify(rejected)]), 'discarded');
  assert.deepEqual(await scalar('select public.guest_image_test_read_rejected_candidate($1,$2,$3)', [session, secret, request(973)]), { data: 'AQ==', mime: 'image/png' });
  assert.deepEqual(await scalar('select public.guest_image_test_read_latest_rejected_candidate($1,$2)', [session, secret]), { data: 'AQ==', mime: 'image/png' });
  assert.equal(await scalar('select public.guest_image_test_read_rejected_candidate($1,$2,$3)', [session, 'f'.repeat(64), request(973)]), null);
  await db.exec('reset role');
}));

test('a guest preparation accepts no visible architecture counts for direct generation', () => scenario(async () => {
  const guestSession = 'cccccccc-cccc-4ccc-8ccc-000000000002';
  const guestSecret = 'f'.repeat(64);
  await db.exec('set role service_role');
  await scalar('select public.guest_image_test_prepare($1,$2,$3,$4,$5,$6,$7,$8)', [guestSession, guestSecret, 'Japandi', 1500, null, 'a'.repeat(64), 'AQ==', 'image/png']);
  await db.exec('reset role');
  await db.exec("update public.image_test_campaign set enabled=true, approved_until=now()+interval '1 hour', price_review='offline fixture only', reservation_cents=30, billing_checked_at=clock_timestamp()");
  await db.exec('set role service_role');
  await scalar('select public.guest_image_test_reserve($1,$2,$3)', [guestSession, guestSecret, request(92)]);
  await scalar('select public.guest_image_test_set_room_fidelity($1,$2,$3)', [guestSession, guestSecret, JSON.stringify({ doors: 1, windows: 2, openings: 0, protectedArchitecture: true })]);
  await db.exec('reset role');
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
test('automatic structure rejection stores no image and preserves accounting', () => scenario(async () => {
  const id = await approve(1); await arm(); await reserve(id, 1);
  const rejected = { raumlyValidation: { status: 'rejected', version: 'structure-v3', reasons: ['perspective changed'], edgeRetention: 0.2 } };
  assert.equal(await finish(1, null, rejected), 'discarded');
  const attempt = (await db.query('select status, room_fidelity_status, automatic_fidelity_status, automatic_fidelity_report from public.image_test_attempts where id=$1', [request(1)])).rows[0];
  assert.equal(attempt.status, 'discarded');
  assert.equal(attempt.room_fidelity_status, 'rejected');
  assert.equal(attempt.automatic_fidelity_status, 'rejected');
  assert.deepEqual(attempt.automatic_fidelity_report.reasons, ['perspective changed']);
  assert.equal(await scalar('select count(*) from public.image_test_results'), 0);
  assert.equal(await scalar('select reserved_cents from public.image_test_campaign'), 30);
  assert.equal(await scalar('select active_attempt is null from public.image_test_campaign'), true);
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
test('an expired empty approval is safely replaced by a new operator arm', () => scenario(async () => {
  await db.exec("update public.image_test_campaign set enabled=true, approved_until=now()-interval '1 second', price_review='expired fixture', reservation_cents=30, billing_checked_at=clock_timestamp()");
  await db.exec('set role service_role');
  const armed = await scalar("select public.image_test_arm('replacement fixture',30,60)");
  await db.exec('reset role');
  assert.equal(armed.reservationCents, 30);
  assert.equal(await scalar('select enabled from public.image_test_campaign'), true);
  assert.ok(new Date(await scalar('select approved_until from public.image_test_campaign')) > new Date());
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
