import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { startDisposablePostgres, type DisposablePostgres } from './helpers/disposable-postgres';
import { getDb } from '../frontend/src/lib/db';
import { runAccountPurge, type PurgeDependencies } from '../frontend/server/account-purge';
import { ACCOUNT_PURGE_RETAINED_TABLES, ACCOUNT_PURGE_STEPS } from '../frontend/server/account-purge-plan';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-12-01T00:00:00.000Z');
const OLD = '11111111-1111-4111-8111-111111111111';
const FRESH = '22222222-2222-4222-8222-222222222222';
const UNMARKED = '33333333-3333-4333-8333-333333333333';
const RICH = '44444444-4444-4444-8444-444444444444';
const ADMIN = '55555555-5555-4555-8555-555555555555';
const JOBS = '66666666-6666-4666-8666-666666666666';

async function setupSchema(database: DisposablePostgres) {
  process.env.DATABASE_URL = database.databaseUrl;
  const schema = await import('../frontend/src/lib/schema');
  for (const ensure of [
    schema.ensureBillingSchema, schema.ensureAssetSchema, schema.ensureMediaLibrarySchema,
    schema.ensureMediaLibraryOrganizationSchema, schema.ensureEmailSchema, schema.ensureMcpSchema,
  ]) await ensure();
  const files = readdirSync('neon/migrations').filter((f) => f.endsWith('.sql'))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b));
  for (const file of files) await database.pool.query(readFileSync(`neon/migrations/${file}`, 'utf8'));
}

async function seedUser(pool: DisposablePostgres['pool'], id: string, markedDaysAgo: number | null, extras = true) {
  await pool.query(
    `INSERT INTO profiles (id, marketing_opt_in, stripe_customer_id, marked_for_deletion_at)
     VALUES ($1, TRUE, 'cus_' || $3::text, $2)`,
    [id, markedDaysAgo === null ? null : new Date(NOW.getTime() - markedDaysAgo * DAY), String(id)],
  );
  await pool.query(`INSERT INTO user_preferences (user_id) VALUES ($1)`, [id]);
  await pool.query(
    `INSERT INTO user_consents (user_id, doc_key, doc_version, accepted, ip, user_agent) VALUES ($1,'tos','v1',TRUE,'203.0.113.9','UA/1.0')`,
    [id],
  );
  if (!extras) return;
  await pool.query(
    `INSERT INTO app_receipts (user_id, type, amount_cents, currency, description, metadata, stripe_receipt_url, stripe_customer_id)
     VALUES ($1,'topup',1000,'CNY','top-up','{"email":"a@b.cn","orderNote":"keep"}','https://r.example/x','cus_secret'),
            ($1,'charge',1000,'CNY','render',NULL,NULL,NULL)`,
    [id],
  );
  await pool.query(
    `INSERT INTO app_jobs (job_id, user_id, engine_id, engine_label, duration_sec, prompt, video_url, thumb_url, status, final_price_cents, currency, visibility, indexable)
     VALUES ($2, $1, 'e1', 'Engine', 5, 'secret prompt', 'https://cdn.example/renders/a.mp4', 'https://cdn.example/renders/a.jpg', 'completed', 1000, 'CNY', 'public', TRUE)`,
    [id, `job_${id}`],
  );
  await pool.query(`INSERT INTO media_assets (id, user_id, kind, url, source, status) VALUES ($2,$1,'image','https://cdn.example/media/${id}/a.png','upload','ready')`, [id, `ma_${id}`]);
  await pool.query(`INSERT INTO user_assets (asset_id, user_id, url) VALUES ($2,$1,'https://cdn.example/media/${id}/b.png')`, [id, `ua_${id}`]);
  await pool.query(`INSERT INTO library_collections (id, user_id, name) VALUES ($2,$1,'my collection')`, [id, `lc_${id}`]);
}

function deps(overrides: Partial<PurgeDependencies> = {}) {
  const deleted: string[] = [];
  const authDeleted: string[] = [];
  const dependencies: PurgeDependencies = {
    now: () => NOW,
    deleteObject: async (key) => { deleted.push(key); },
    deleteExportObjects: async () => 0,
    ownedKeyForUrl: (url, userId) => (url.includes(`/${userId}/`) ? url.replace('https://cdn.example/', '') : null),
    getEmail: async (userId) => (userId === OLD ? 'old@example.cn' : null),
    deleteAuthUser: async (userId) => { authDeleted.push(userId); return true; },
    ...overrides,
  };
  return { dependencies, deleted, authDeleted };
}

test('account purge on a full-schema PostgreSQL database', { timeout: 240_000 }, async (t) => {
  const database = await startDisposablePostgres('account-purge');
  t.after(async () => { await getDb().end().catch(() => undefined); await database.cleanup(); });
  await setupSchema(database);
  const pool = database.pool;
  const count = async (sql: string, ...params: unknown[]) => Number((await pool.query(sql, params)).rows[0].count);

  await t.test('every user-keyed table is planned or deliberately retained', async () => {
    const rows = await pool.query(`
      SELECT DISTINCT table_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (column_name IN ('user_id','owner_id','target_user_id','recipient','email','ip','ip_address','user_agent')
             OR column_name LIKE '%\\_user\\_id')
        AND table_name IN (SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE')`);
    const planned = new Set(ACCOUNT_PURGE_STEPS.map((step) => step.table));
    const missing = rows.rows.map((r) => r.table_name as string)
      .filter((name) => !planned.has(name) && !(name in ACCOUNT_PURGE_RETAINED_TABLES));
    assert.deepEqual(missing, [], 'classify these tables in account-purge-plan.ts and docs/engineering/account-deletion.md');
  });

  await seedUser(pool, OLD, 16);
  await seedUser(pool, FRESH, 14);
  await seedUser(pool, UNMARKED, null);

  await t.test('dry run reports counts and changes nothing', async () => {
    const { dependencies, deleted, authDeleted } = deps();
    const report = await runAccountPurge({ dryRun: true }, dependencies);
    assert.equal(report.candidates, 1);
    assert.equal(report.users[0].userId, OLD);
    assert.equal(report.users[0].outcome, 'dry_run', JSON.stringify(report.users[0]));
    assert.equal(report.users[0].counts['media_assets:delete'], 1);
    assert.equal(report.users[0].objects, 2);
    assert.deepEqual(deleted, []);
    assert.deepEqual(authDeleted, []);
    assert.equal(await count(`SELECT count(*) FROM media_assets WHERE user_id = $1`, OLD), 1);
    assert.equal(await count(`SELECT count(*) FROM app_jobs WHERE prompt <> '' AND user_id = $1`, OLD), 1);
  });

  await t.test('purges the due account, anonymises retained records, leaves others untouched', async () => {
    const { dependencies, deleted, authDeleted } = deps();
    const report = await runAccountPurge({ dryRun: false }, dependencies);
    assert.equal(report.users.length, 1);
    assert.equal(report.users[0].outcome, 'purged', JSON.stringify(report));
    assert.deepEqual(authDeleted, [OLD]);
    assert.deepEqual(deleted.sort(), [`media/${OLD}/a.png`, `media/${OLD}/b.png`]);
    for (const table of ['media_assets', 'user_assets', 'library_collections', 'user_preferences']) {
      assert.equal(await count(`SELECT count(*) FROM ${table} WHERE user_id::text = $1`, OLD), 0, table);
    }
    assert.equal(await count(`SELECT count(*) FROM profiles WHERE id = $1`, OLD), 0);
    // Ledger and orders retained, anonymised.
    assert.equal(await count(`SELECT count(*) FROM app_receipts WHERE user_id = $1`, OLD), 2);
    const receipt = (await pool.query(`SELECT metadata, stripe_receipt_url, stripe_customer_id FROM app_receipts WHERE user_id = $1 AND type='topup'`, [OLD])).rows[0];
    assert.deepEqual(receipt.metadata, { orderNote: 'keep' });
    assert.equal(receipt.stripe_receipt_url, null);
    assert.equal(receipt.stripe_customer_id, null);
    const job = (await pool.query(`SELECT prompt, video_url, thumb_url, visibility, indexable, final_price_cents FROM app_jobs WHERE user_id = $1`, [OLD])).rows[0];
    assert.deepEqual(job, { prompt: '', video_url: null, thumb_url: '', visibility: 'private', indexable: false, final_price_cents: 1000 });
    // Consent evidence kept without identifiers.
    const consent = (await pool.query(`SELECT doc_key, doc_version, ip, user_agent FROM user_consents WHERE user_id = $1`, [OLD])).rows[0];
    assert.deepEqual(consent, { doc_key: 'tos', doc_version: 'v1', ip: null, user_agent: null });
    // Others untouched.
    for (const id of [FRESH, UNMARKED]) {
      assert.equal(await count(`SELECT count(*) FROM media_assets WHERE user_id = $1`, id), 1);
      assert.equal(await count(`SELECT count(*) FROM user_consents WHERE user_id = $1 AND ip IS NOT NULL`, id), 1);
      assert.equal(await count(`SELECT count(*) FROM profiles WHERE id = $1`, id), 1);
    }
    assert.equal(await count(`SELECT count(*) FROM account_privacy_events WHERE user_id = $1 AND event = 'purged'`, OLD), 1);
  });

  await t.test('is idempotent', async () => {
    const { dependencies, authDeleted } = deps();
    const report = await runAccountPurge({ dryRun: false }, dependencies);
    assert.equal(report.candidates, 0);
    assert.deepEqual(authDeleted, []);
  });

  await t.test('refuses a positive wallet balance, active jobs and operators', async () => {
    await seedUser(pool, RICH, 20, false);
    await pool.query(`INSERT INTO app_receipts (user_id, type, amount_cents, currency) VALUES ($1,'topup',500,'CNY')`, [RICH]);
    await seedUser(pool, ADMIN, 20, false);
    await pool.query(`INSERT INTO app_admins (user_id) VALUES ($1)`, [ADMIN]);
    await seedUser(pool, JOBS, 20, false);
    await pool.query(`INSERT INTO app_jobs (job_id, user_id, engine_id, engine_label, duration_sec, prompt, thumb_url, status, currency) VALUES ('running-1', $1, 'e1', 'E', 5, 'p', '', 'running', 'CNY')`, [JOBS]);
    const { dependencies, authDeleted } = deps();
    const report = await runAccountPurge({ dryRun: false }, dependencies);
    const reasons = Object.fromEntries(report.users.map((u) => [u.userId, u.reason]));
    assert.deepEqual(reasons, { [RICH]: 'wallet_balance', [ADMIN]: 'operator_account', [JOBS]: 'active_jobs' });
    assert.deepEqual(authDeleted, []);
    assert.equal(await count(`SELECT count(*) FROM profiles WHERE id = ANY($1::uuid[])`, [RICH, ADMIN, JOBS]), 3);
  });

  await t.test('keeps the account for retry when storage or Auth deletion fails', async () => {
    await pool.query(`DELETE FROM app_receipts WHERE user_id = $1`, [RICH]);
    await pool.query(`UPDATE profiles SET marked_for_deletion_at = NULL WHERE id = ANY($1::uuid[])`, [[ADMIN, JOBS]]);
    const failing = deps({ deleteAuthUser: async () => false });
    const first = await runAccountPurge({ dryRun: false }, failing.dependencies);
    assert.equal(first.users[0].outcome, 'failed');
    assert.equal(await count(`SELECT count(*) FROM profiles WHERE id = $1`, RICH), 1);
    const ok = deps();
    const second = await runAccountPurge({ dryRun: false }, ok.dependencies);
    assert.equal(second.users[0].outcome, 'purged');
    assert.deepEqual(ok.authDeleted, [RICH]);
  });
});
