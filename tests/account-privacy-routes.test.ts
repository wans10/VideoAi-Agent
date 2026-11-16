import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import { loadWithMocks } from './helpers/route-bundle';
import { ACCOUNT_DELETION_METADATA_KEY, isPurgeDue, purgeDateFor, readDeletionScheduledAt } from '../frontend/lib/account-deletion-flag';

const g = globalThis as typeof globalThis & { __priv?: any };

test('cooling-off helpers: 15 days, tolerant metadata reader', () => {
  assert.equal(purgeDateFor('2026-12-01T00:00:00.000Z').toISOString(), '2026-12-16T00:00:00.000Z');
  assert.equal(isPurgeDue('2026-12-01T00:00:00.000Z', new Date('2026-12-15T23:59:59.000Z')), false);
  assert.equal(isPurgeDue('2026-12-01T00:00:00.000Z', new Date('2026-12-16T00:00:00.000Z')), true);
  assert.equal(isPurgeDue(null), false);
  assert.equal(readDeletionScheduledAt({ app_metadata: { [ACCOUNT_DELETION_METADATA_KEY]: '2026-12-01T00:00:00.000Z' } }), '2026-12-01T00:00:00.000Z');
  for (const bad of [null, undefined, {}, { app_metadata: null }, { app_metadata: { [ACCOUNT_DELETION_METADATA_KEY]: 'nope' } }, { app_metadata: { [ACCOUNT_DELETION_METADATA_KEY]: 5 } }]) {
    assert.equal(readDeletionScheduledAt(bad as never), null);
  }
});

test('the route auth context fails closed for accounts in the cooling-off, with no extra Auth round trip', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://auth.example.test';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  const mod = await loadWithMocks<{ getRouteAuthContext(req?: Request, options?: { allowScheduledDeletion?: boolean }): Promise<{ userId: string | null; deletionScheduledAt: string | null }> }>(
    'frontend/src/lib/supabase-ssr.ts',
    {
      'next/headers': `export const cookies = async () => ({ getAll: () => [], set() {} });`,
      '@supabase/ssr': `export const createServerClient = () => ({ auth: {
        getSession: async () => ({ data: { session: { access_token: 'cookie-token' } }, error: null }),
        getUser: async (token) => { globalThis.__priv.getUserCalls++; return { data: { user: globalThis.__priv.user }, error: null }; },
        signOut: async () => ({}) } });`,
    },
  );
  const flagged = { id: 'u1', app_metadata: { [ACCOUNT_DELETION_METADATA_KEY]: '2026-12-01T00:00:00.000Z' } };
  const normal = { id: 'u1', app_metadata: {} };

  g.__priv = { user: normal, getUserCalls: 0 };
  assert.equal((await mod.getRouteAuthContext()).userId, 'u1');

  g.__priv = { user: flagged, getUserCalls: 0 };
  const blocked = await mod.getRouteAuthContext();
  assert.equal(blocked.userId, null, 'paid and ordinary APIs see a signed-out caller');
  assert.equal(blocked.deletionScheduledAt, '2026-12-01T00:00:00.000Z');
  assert.equal(g.__priv.getUserCalls, 1, 'the flag rides on the existing Auth validation');

  const allowed = await mod.getRouteAuthContext(undefined, { allowScheduledDeletion: true });
  assert.equal(allowed.userId, 'u1', 'status, cancel, export and sign-out remain available');

  const bearer = new Request('https://keyvo.test/api/x', { headers: { authorization: 'Bearer t', 'x-maxvideoai-auth-mode': 'bearer' } });
  assert.equal((await mod.getRouteAuthContext(bearer)).userId, null, 'bearer callers are blocked as well');
  assert.equal((await mod.getRouteAuthContext(bearer, { allowScheduledDeletion: true })).userId, 'u1');
  delete g.__priv;
});

test('cancel and status routes work for flagged accounts only through the explicit allowance', async (t) => {
  const mocks = {
    '@/lib/db': `export const isDatabaseConfigured = () => globalThis.__priv.configured;`,
    '@/lib/supabase-ssr': `export const getRouteAuthContext = async (_r, options) => { globalThis.__priv.options.push(options); return { userId: globalThis.__priv.userId, deletionScheduledAt: globalThis.__priv.marked }; };`,
    '@/server/account-privacy': `export const cancelAccountDeletion = async (id) => { globalThis.__priv.cancelled.push(id); return { ok: true, wasScheduled: true }; };`,
  };
  const cancel = await loadWithMocks<{ POST(r: Request): Promise<Response> }>('frontend/app/api/account/delete/cancel/route.ts', mocks);
  const status = await loadWithMocks<{ GET(r: Request): Promise<Response> }>('frontend/app/api/account/delete/status/route.ts', mocks);
  g.__priv = { configured: true, userId: 'u1', marked: '2026-12-01T00:00:00.000Z', options: [], cancelled: [] };
  t.after(() => { delete g.__priv; });

  const cancelled = await cancel.POST(new Request('https://keyvo.test/x', { method: 'POST' }));
  assert.equal(cancelled.status, 200);
  assert.deepEqual(g.__priv.cancelled, ['u1']);
  const state = await (await status.GET(new Request('https://keyvo.test/x'))).json();
  assert.deepEqual(state, { ok: true, scheduled: true, markedAt: '2026-12-01T00:00:00.000Z', purgeAt: '2026-12-16T00:00:00.000Z' });
  assert.ok(g.__priv.options.every((o: unknown) => JSON.stringify(o) === '{"allowScheduledDeletion":true}'));

  g.__priv.userId = null;
  assert.equal((await cancel.POST(new Request('https://keyvo.test/x', { method: 'POST' }))).status, 401);
  assert.equal((await status.GET(new Request('https://keyvo.test/x'))).status, 401);
  assert.deepEqual(g.__priv.cancelled, ['u1'], 'no cancellation without a session');
  g.__priv.userId = 'u1'; g.__priv.configured = false;
  assert.equal((await cancel.POST(new Request('https://keyvo.test/x', { method: 'POST' }))).status, 503);
});

test('the purge cron needs CRON_SECRET and only erases when ACCOUNT_PURGE_ENABLED=true', async () => {
  const { handleAccountPurgeCron } = await loadWithMocks<{ handleAccountPurgeCron(r: Request, d: unknown): Promise<Response> }>(
    'frontend/app/api/cron/_lib/account-purge-handler.ts',
    { '@/server/account-purge': `export const runAccountPurge = async () => { throw Error('must be injected'); };` },
  );
  const runs: Array<{ dryRun: boolean; limit?: number }> = [];
  const run = async (options: { dryRun: boolean; limit?: number }) => {
    runs.push(options);
    return { dryRun: options.dryRun, candidates: 1, users: [{ userId: 'u', outcome: options.dryRun ? 'dry_run' : 'purged', counts: {}, objects: 0 }] };
  };
  const call = (headers: Record<string, string>, query = '', env: Record<string, string> = {}) =>
    handleAccountPurgeCron(new Request(`https://keyvo.test/api/cron/account-purge${query}`, { method: 'POST', headers }), { env: { CRON_SECRET: 's3cret', ...env }, run });

  assert.equal((await call({})).status, 401);
  assert.equal((await call({ authorization: 'Bearer wrong' })).status, 401);
  assert.equal((await call({ authorization: 'Bearer s3cret' }, '', { CRON_SECRET: '' })).status, 401, 'no secret configured: closed');
  assert.deepEqual(runs, []);

  const disabled = await (await call({ authorization: 'Bearer s3cret' })).json();
  assert.equal(disabled.dryRun, true, 'not enabled: always a dry run');
  const forced = await (await call({ authorization: 'Bearer s3cret' }, '?dryRun=1', { ACCOUNT_PURGE_ENABLED: 'true' })).json();
  assert.equal(forced.dryRun, true);
  const real = await (await call({ authorization: 'Bearer s3cret' }, '?limit=3', { ACCOUNT_PURGE_ENABLED: 'true' })).json();
  assert.equal(real.dryRun, false);
  assert.equal(real.purged, 1);
  assert.deepEqual(runs.map((r) => r.dryRun), [true, true, false]);
  assert.equal(runs[2].limit, 3);
});

test('the export payload and route: phone-only accounts, bounded lists, no provider internals, rate limit', async (t) => {
  const queries: string[] = [];
  const dsar = await loadWithMocks<{ buildDsarPayload(id: string): Promise<any>; DSAR_MAX_ROWS: number }>('frontend/server/dsar.ts', {
    '@/lib/db': `export const query = async (sql, params) => { globalThis.__priv.queries.push(sql); if (params[0] !== 'u1') throw Error('other user'); return globalThis.__priv.rows(sql); };`,
    '@/lib/wallet': `export const getWalletBalancesByCurrency = async () => [{ currency: 'CNY', balanceCents: 250 }];`,
    '@/server/profile': `export const getProfileSnapshot = async () => ({ marketingOptIn: false, marketingOptInAt: null, tosVersion: 'v1', privacyVersion: 'v1', cookiesVersion: 'c1', ageVerified: true, markedForDeletionAt: null });`,
    '@/server/supabase-admin': `export const getUserIdentity = async () => ({ id: 'u1', email: null, phone: '8613800000000', fullName: null });`,
  });
  g.__priv = { queries, rows: (sql: string) => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => ({ job_id: `j${i}`, id: String(i) }));
    if (sql.includes('FROM app_jobs')) return many(dsar.DSAR_MAX_ROWS + 1);
    return [];
  } };
  t.after(() => { delete g.__priv; });
  const payload = await dsar.buildDsarPayload('u1');
  assert.equal(payload.user.email, null);
  assert.equal(payload.user.phone, '8613800000000');
  assert.equal(payload.user.profile.cookiesVersion, 'c1');
  assert.equal(payload.user.profile.ageVerified, true);
  assert.deepEqual(payload.wallet.balances, [{ currency: 'CNY', balanceCents: 250 }]);
  assert.equal(payload.jobs.length, dsar.DSAR_MAX_ROWS);
  assert.deepEqual(payload.limits.truncated, ['jobs']);
  const sql = queries.join('\n');
  assert.match(sql, /FROM app_jobs/);
  assert.match(sql, /FROM media_assets/);
  assert.doesNotMatch(sql, /provider_job_id|cost_breakdown|pricing_snapshot|vendor_account_id|application_fee|settings_snapshot/);
  assert.ok(queries.every((q) => /WHERE (user_id|id) = \$1|WHERE user_id = \$1/.test(q)), 'every dataset is scoped to the caller');

  const route = await loadWithMocks<{ POST(r: Request): Promise<Response> }>('frontend/app/api/account/export/route.ts', {
    '@/lib/db': `export const isDatabaseConfigured = () => true;`,
    '@/server/dsar': `export const buildDsarPayload = async () => ({ ok: 1 });`,
    '@/server/storage': `export const isStorageConfigured = () => globalThis.__priv.storage;
      export const uploadFileBuffer = async () => ({ key: 'exports/u1/x.gz' });
      export const createSignedDownloadUrl = async () => 'https://files.example/x?sig=1';`,
    '@/lib/supabase-ssr': `export const getRouteAuthContext = async (_r, options) => { globalThis.__priv.options = options; return { userId: globalThis.__priv.userId }; };`,
    '@/server/account-privacy': `export const exportRetryAfterSeconds = async () => globalThis.__priv.retry;
      export const markExportGenerated = () => { globalThis.__priv.marked = true; };
      export const recordPrivacyEvent = async () => true;`,
  });
  g.__priv = { storage: true, userId: 'u1', retry: 0 };
  const req = () => new Request('https://keyvo.test/api/account/export', { method: 'POST' });
  const ok = await route.POST(req());
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.url, 'https://files.example/x?sig=1');
  assert.match(body.fileName, /^keyvo-data-export-/);
  assert.deepEqual(g.__priv.options, { allowScheduledDeletion: true });
  g.__priv.retry = 540;
  const limited = await route.POST(req());
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '540');
  g.__priv.retry = 0; g.__priv.storage = false;
  const missing = await route.POST(req());
  assert.equal(missing.status, 503);
  assert.equal((await missing.json()).code, 'storage_unavailable');
  g.__priv.storage = true; g.__priv.userId = null;
  assert.equal((await route.POST(req())).status, 401);
});

test('middleware sends cooling-off accounts to the scheduled-deletion screen and nobody else', async () => {
  const { NextRequest, NextResponse } = createRequire(resolve('frontend/package.json'))('next/server');
  const { accountDeletionRedirect } = await loadWithMocks<{ accountDeletionRedirect: (...args: unknown[]) => Response | null }>(
    'frontend/lib/middleware/routing-response.ts', {},
  );
  const at = (path: string) => new NextRequest(`https://keyvo.test${path}?x=1`);
  const base = NextResponse.next();
  const flagged = '2026-12-01T00:00:00.000Z';
  const redirect = accountDeletionRedirect(at('/app'), base, 'u1', flagged) as Response;
  assert.equal(redirect.status, 307);
  assert.equal(new URL(redirect.headers.get('location')!).pathname, '/account/deletion');
  assert.equal(new URL(redirect.headers.get('location')!).search, '');
  assert.match(redirect.headers.get('cache-control')!, /no-store/);
  assert.equal(accountDeletionRedirect(at('/account/deletion'), base, 'u1', flagged), null, 'no redirect loop');
  assert.equal(accountDeletionRedirect(at('/app'), base, 'u1', null), null, 'ordinary accounts are untouched');
  assert.equal(accountDeletionRedirect(at('/app'), base, null, flagged), null, 'signed-out visitors follow the login flow');
});
