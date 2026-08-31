import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

// Deliberately unavailable against linked/cloud projects or an ordinary dev DB.
assert.equal(process.env.RAUMLY_ISOLATED_SUPABASE, '1', 'Use the disposable integration workflow only');
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Disposable GitHub runner required');
const config = Object.fromEntries(execFileSync('supabase', ['status', '-o', 'env'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  .split(/\r?\n/).map((line) => line.match(/^([A-Z_]+)="(.*)"$/)).filter(Boolean).map((m) => [m[1], m[2]]));
for (const key of ['API_URL', 'DB_URL']) {
  const url = new URL(config[key]);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'Only loopback destinations allowed');
  assert.equal(url.port, key === 'API_URL' ? '54321' : '54322', 'Isolated default ports required');
}
assert.ok(config.SERVICE_ROLE_KEY && config.ANON_KEY, 'Local stack credentials missing');
// Mask even ephemeral local credentials; never persist them or attach server logs.
for (const value of [config.SERVICE_ROLE_KEY, config.ANON_KEY, config.DB_URL]) console.log(`::add-mask::${value}`);
const require = createRequire(import.meta.url);
const authOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(config.API_URL, config.SERVICE_ROLE_KEY, authOptions);
const db = new pg.Pool({ connectionString: config.DB_URL, max: 5 });
const origin = 'http://127.0.0.1:3102';
const endpoint = `${origin}/api/internal/image-test`;
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
let server, owner, stranger, projectId, photoId, testPhotoId;
const q = async (sql, values = []) => (await db.query(sql, values)).rows;
const rpc = async (name, args) => {
  const { data, error } = await admin.rpc(name, args);
  if (error) throw new Error(`Local RPC ${name} failed (${error.code})`);
  return data;
};
async function waitFor(fn, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await fn()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Local test condition timed out');
}
async function startServer() {
  server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '-p', '3102'], {
    detached: true, stdio: 'ignore', env: { ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: config.API_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: config.ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: config.SERVICE_ROLE_KEY, RAUMLY_IMAGE_TEST_ENABLED: 'true',
      RAUMLY_IMAGE_TEST_ORIGIN: origin,
      RAUMLY_IMAGE_AI_ENABLED: 'false', GOOGLE_CLOUD_PROJECT: '',
    },
  });
  await waitFor(async () => { try { return (await fetch(endpoint)).status === 403; } catch { return false; } }, 60000);
}
async function stopServer() {
  if (!server || server.exitCode !== null) return;
  const exited = new Promise((resolve) => server.once('exit', resolve));
  process.kill(-server.pid, 'SIGTERM');
  await exited;
}
async function newUser() {
  const email = `isolated-${randomUUID()}@example.test`;
  const password = randomUUID();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(created.error, null, 'Local test user creation failed');
  const client = createClient(config.API_URL, config.ANON_KEY, authOptions);
  const signed = await client.auth.signInWithPassword({ email, password });
  assert.equal(signed.error, null, 'Local sign-in failed');
  console.log(`::add-mask::${signed.data.session.access_token}`);
  return { id: created.data.user.id, client, token: signed.data.session.access_token };
}
async function call(body, user = owner, requestOrigin = origin) {
  return fetch(endpoint, { method: body ? 'POST' : 'GET', headers: {
    Authorization: `Bearer ${user.token}`, Origin: requestOrigin, 'Content-Type': 'application/json',
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
async function consent(action = 'granted') {
  const { error } = await owner.client.rpc('record_own_consent', {
    target_kind: 'ai_processing', target_action: action, target_policy_version: 'vertex-test-v1',
  });
  assert.equal(error, null, 'Local consent failed');
}
async function resetCase() {
  // This destructive reset is confined by CI + loopback checks to a fresh test DB.
  await q('truncate public.image_test_results, public.image_test_attempts, public.image_test_photos');
  await q('update public.image_test_campaign set enabled=false, reserved_cents=0, photo_count=0, active_attempt=null, closed_at=null, actual_cents=null, billing_checked_at=null');
  await consent();
  // Prepare fixtures independently so an HTTP regression cannot hide SQL failures.
  testPhotoId = await rpc('image_test_approve', { target_user: owner.id, target_photo: photoId,
    photo_hash: createHash('sha256').update(image).digest('hex'), target_style: 'Japandi', target_budget: 1500 });
}
async function arm() {
  await q("update public.image_test_campaign set enabled=true, approved_until=now()+interval '10 minutes', price_review='isolated test only; Google disabled', reservation_cents=30, billing_checked_at=clock_timestamp()");
}
async function reserve(id = randomUUID()) {
  const rows = await q('select content_hash from public.image_test_photos where id=$1', [testPhotoId]);
  await rpc('image_test_reserve', { target_user: owner.id, target_test_photo: testPhotoId, request_id: id, photo_hash: rows[0].content_hash });
  return id;
}
async function finish(id) {
  return rpc('image_test_finish', { target_user: owner.id, request_id: id, result_image: image.toString('base64'), result_mime: 'image/png', elapsed_ms: 10, provider_id: 'offline-test', usage_data: {} });
}
async function assertLocked(connection) {
  const pid = connection.processID;
  await waitFor(async () => (await q('select wait_event_type from pg_stat_activity where pid=$1', [pid]))[0]?.wait_event_type === 'Lock');
}

before(async () => {
  assert.equal((await q('select photo_count from public.image_test_campaign'))[0].photo_count, 0, 'Fresh database required');
  owner = await newUser(); stranger = await newUser();
  await q('insert into public.image_test_members(user_id) values($1)', [owner.id]);
  projectId = randomUUID(); photoId = randomUUID();
  const project = await owner.client.from('projects').insert({ id: projectId, user_id: owner.id, name: 'Isolierter Test', living_room: { style: 'Japandi', budget: 1500 } });
  assert.equal(project.error, null, 'Own project creation failed');
  const grant = await owner.client.rpc('record_own_consent', { target_kind: 'photo_storage', target_action: 'granted', target_policy_version: 'photo-storage-v1' });
  assert.equal(grant.error, null);
  const path = `${owner.id}/${projectId}/${photoId}.png`;
  const upload = await owner.client.storage.from('room-photos').upload(path, image, { contentType: 'image/png' });
  assert.equal(upload.error, null, 'Own private storage upload failed');
  const metadata = await owner.client.from('project_photos').insert({ id: photoId, project_id: projectId, user_id: owner.id, storage_path: path, original_name: 'isolated.png' });
  assert.equal(metadata.error, null);
  await startServer();
});
after(async () => {
  await stopServer();
  // Test users only; the entire isolated runner is discarded afterwards.
  for (const user of [owner, stranger].filter(Boolean)) await admin.auth.admin.deleteUser(user.id);
  await db.end();
});

test('real authentication, ownership and private storage deny foreign access', async () => {
  assert.equal((await call(undefined, stranger)).status, 403);
  const path = `${owner.id}/${projectId}/${photoId}.png`;
  assert.ok((await stranger.client.storage.from('room-photos').download(path)).error);
  const foreignMetadata = await stranger.client.from('project_photos').select('id').eq('id', photoId);
  assert.deepEqual(foreignMetadata.data, []);
  assert.ok((await stranger.client.rpc('image_test_state', { target_user: owner.id })).error);
  assert.equal((await call({ action: 'grant' }, owner, 'https://untrusted.example')).status, 403);
});

test('real HTTP consent and approval do not activate Google', async () => {
  assert.equal((await call({ action: 'approve', photoId })).status, 403);
  assert.equal((await call({ action: 'grant' })).status, 200);
  await resetCase();
  const approval = await call({ action: 'approve', photoId });
  const approvalBody = await approval.json();
  assert.equal(approval.status, 200, `Own photo approval through HTTP failed: ${approvalBody.error ?? 'no error message'}`);
  await arm();
  const response = await call({ action: 'generate', testPhotoId, requestId: randomUUID() });
  assert.equal(response.status, 403);
  assert.equal((await q('select reserved_cents from public.image_test_campaign'))[0].reserved_cents, 0);
  assert.equal((await q('select count(*)::int as count from public.image_test_attempts'))[0].count, 0);
});

test('two actual PostgreSQL sessions cannot reserve concurrently', async () => {
  await resetCase(); await arm();
  const a = await db.connect(), b = await db.connect();
  assert.notEqual(a.processID, b.processID);
  try {
    const hash = (await q('select content_hash from public.image_test_photos where id=$1', [testPhotoId]))[0].content_hash;
    const sql = 'select public.image_test_reserve($1,$2,$3,$4)';
    await a.query('begin');
    await a.query(sql, [owner.id, testPhotoId, randomUUID(), hash]);
    const second = b.query(sql, [owner.id, testPhotoId, randomUUID(), hash]).then(() => 'unexpected success', () => 'blocked');
    await assertLocked(b);
    await a.query('commit');
    assert.equal(await second, 'blocked');
    assert.equal((await q('select reserved_cents from public.image_test_campaign'))[0].reserved_cents, 30);
    assert.equal((await q('select attempts from public.image_test_photos'))[0].attempts, 1);
  } finally { await a.query('rollback'); a.release(); b.release(); }
});

test('withdrawal racing a late result prevents storage after commit', async () => {
  await resetCase(); await arm(); const id = await reserve();
  const a = await db.connect(), b = await db.connect();
  try {
    await a.query('begin');
    await a.query("insert into public.consent_events(user_id,consent_kind,action,policy_version) values($1,'ai_processing','withdrawn','vertex-test-v1')", [owner.id]);
    const pending = b.query('select public.image_test_finish($1,$2,$3,$4)', [owner.id, id, image.toString('base64'), 'image/png']);
    await assertLocked(b); await a.query('commit');
    assert.equal((await pending).rows[0].image_test_finish, 'discarded');
    assert.equal((await q('select count(*)::int as count from public.image_test_results'))[0].count, 0);
    assert.equal((await q('select reserved_cents from public.image_test_campaign'))[0].reserved_cents, 30);
  } finally { await a.query('rollback'); a.release(); b.release(); }
});

test('withdrawal racing an earlier result physically removes it', async () => {
  await resetCase(); await arm(); const id = await reserve();
  const a = await db.connect(), b = await db.connect();
  try {
    await a.query('begin');
    await a.query('select public.image_test_finish($1,$2,$3,$4)', [owner.id, id, image.toString('base64'), 'image/png']);
    const pending = b.query("insert into public.consent_events(user_id,consent_kind,action,policy_version) values($1,'ai_processing','withdrawn','vertex-test-v1')", [owner.id]);
    await assertLocked(b); await a.query('commit'); await pending;
    assert.equal((await q('select count(*)::int as count from public.image_test_results'))[0].count, 0);
  } finally { await a.query('rollback'); a.release(); b.release(); }
});

test('restart, unknown outcomes and HTTP withdrawal preserve the reservation', async () => {
  await resetCase(); await arm(); await reserve();
  await stopServer(); await startServer();
  const state = await (await call()).json();
  assert.equal(state.campaign.reserved_cents, 30);
  assert.equal(state.attempts[0].status, 'reserved');
  assert.equal((await call({ action: 'withdraw' })).status, 200);
  assert.equal((await q('select reserved_cents from public.image_test_campaign'))[0].reserved_cents, 30);
});

test('real private result retrieval and deletion never refund attempts', async () => {
  await resetCase(); await arm(); const id = await reserve();
  assert.equal(await finish(id), 'succeeded');
  const result = await fetch(`${endpoint}?result=${id}`, { headers: { Authorization: `Bearer ${owner.token}` } });
  assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.deepEqual(Buffer.from(await result.arrayBuffer()), image);
  assert.equal((await call({ action: 'delete', requestId: id })).status, 200);
  assert.equal((await q('select count(*)::int as count from public.image_test_results'))[0].count, 0);
  assert.equal((await q('select attempts from public.image_test_photos'))[0].attempts, 1);
});

test('pg_cron actually executes expiry cleanup', { timeout: 90000 }, async () => {
  await resetCase(); await arm(); const id = await reserve(); await finish(id);
  const job = (await q("select jobid, schedule from cron.job where jobname='image-test-result-retention'"))[0];
  assert.equal(job.schedule, '17 * * * *');
  const started = new Date();
  try {
    await q("update public.image_test_results set expires_at=now()-interval '1 second'");
    await q("select cron.alter_job($1, schedule := '* * * * *')", [job.jobid]);
    await waitFor(async () => (await q('select count(*)::int as count from public.image_test_results'))[0].count === 0, 75000);
    await waitFor(async () => (await q("select 1 from cron.job_run_details where jobid=$1 and start_time >= $2 and status='succeeded'", [job.jobid, started])).length > 0);
    assert.equal((await q('select reserved_cents from public.image_test_campaign'))[0].reserved_cents, 30);
  } finally { await q('select cron.alter_job($1, schedule := $2)', [job.jobid, job.schedule]); }
});
