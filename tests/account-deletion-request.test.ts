import assert from 'node:assert/strict';
import test from 'node:test';
import { loadWithMocks } from './helpers/route-bundle';

type Fixture = {
  configured: boolean;
  userId: string | null;
  hasSession: boolean;
  identity: { id: string; email: string | null; phone: string | null; fullName: string | null } | null;
  passwordOk: boolean;
  balances: Array<{ currency: string; balanceCents: number }>;
  schedule: { ok: boolean; markedAt?: string; purgeAt?: string; status?: number; code?: string };
  calls: string[];
  authOptions: unknown[];
};
const globals = globalThis as typeof globalThis & { __deletionFixture?: Fixture };
const f = () => globals.__deletionFixture!;

const mocks = {
  '@/lib/db': `export const isDatabaseConfigured = () => globalThis.__deletionFixture.configured;`,
  '@/lib/supabase-ssr': `export const getRouteAuthContext = async (_req, options) => {
    const f = globalThis.__deletionFixture; f.authOptions.push(options);
    return { userId: f.userId, session: f.hasSession ? { access_token: 'tok' } : null,
      supabase: { auth: { signOut: async () => { f.calls.push('local-signout'); } } } };
  };`,
  '@/server/supabase-admin': `export const getUserIdentity = async () => globalThis.__deletionFixture.identity;
    export const getSupabaseAdmin = () => ({ auth: { admin: { signOut: async (token, scope) => { globalThis.__deletionFixture.calls.push('global-signout:' + token + ':' + scope); return {}; } } } });`,
  '@/server/account-privacy': `export const verifyAccountPassword = async (identity, password) => { globalThis.__deletionFixture.calls.push('verify:' + password); return globalThis.__deletionFixture.passwordOk; };
    export const getPositiveWalletBalances = async () => globalThis.__deletionFixture.balances.filter(b => b.balanceCents > 0);
    export const scheduleAccountDeletion = async () => { globalThis.__deletionFixture.calls.push('schedule'); return globalThis.__deletionFixture.schedule; };`,
};

const post = (body: unknown) => new Request('https://keyvo.test/api/account/delete', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});

test('account deletion request: re-authentication, wallet rule, cooling-off date and session revocation', async (t) => {
  const { POST } = await loadWithMocks<{ POST(request: Request): Promise<Response> }>('frontend/app/api/account/delete/route.ts', mocks);
  const fresh = (): Fixture => ({
    configured: true, userId: 'owner-a', hasSession: true,
    identity: { id: 'owner-a', email: null, phone: '8613800000000', fullName: null },
    passwordOk: true, balances: [{ currency: 'CNY', balanceCents: 0 }],
    schedule: { ok: true, markedAt: '2026-12-01T00:00:00.000Z', purgeAt: '2026-12-16T00:00:00.000Z' },
    calls: [], authOptions: [],
  });
  globals.__deletionFixture = fresh();
  t.after(() => { delete globals.__deletionFixture; });
  const valid = { confirm: '注销', password: 'pw' };

  await t.test('success: phone-only account, schedules, revokes sessions, returns the 15-day purge date', async () => {
    const response = await POST(post(valid));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, {
      ok: true, status: 'scheduled', markedAt: '2026-12-01T00:00:00.000Z', purgeAt: '2026-12-16T00:00:00.000Z',
      coolingOffDays: 15, deletionCompleted: false,
    });
    assert.deepEqual(f().calls, ['verify:pw', 'schedule', 'global-signout:tok:global', 'local-signout']);
    assert.deepEqual(f().authOptions, [{ allowScheduledDeletion: true }], 'repeat requests by a flagged account stay possible');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  });
  await t.test('unauthenticated callers cannot write', async () => {
    globals.__deletionFixture = { ...fresh(), userId: null };
    assert.equal((await POST(post(valid))).status, 401);
    assert.deepEqual(f().calls, []);
  });
  await t.test('unavailable database cannot acknowledge a request', async () => {
    globals.__deletionFixture = { ...fresh(), configured: false };
    assert.equal((await POST(post(valid))).status, 503);
  });
  await t.test('requires the typed word and the password before anything is checked or written', async () => {
    globals.__deletionFixture = fresh();
    for (const [body, code] of [[{ password: 'pw' }, 'confirmation_required'], [{ confirm: 'delete', password: 'pw' }, 'confirmation_required'], [{ confirm: '注销' }, 'password_required']] as const) {
      const response = await POST(post(body));
      assert.equal(response.status, 400);
      assert.equal((await response.json()).code, code);
    }
    assert.deepEqual(f().calls, []);
  });
  await t.test('a wrong password is refused without scheduling', async () => {
    globals.__deletionFixture = { ...fresh(), passwordOk: false };
    const response = await POST(post(valid));
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, 'invalid_password');
    assert.ok(!f().calls.includes('schedule'));
  });
  await t.test('a positive wallet balance is refused with a clear zh message and nothing is scheduled', async () => {
    globals.__deletionFixture = { ...fresh(), balances: [{ currency: 'CNY', balanceCents: 1 }] };
    const response = await POST(post(valid));
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.equal(body.code, 'wallet_not_empty');
    assert.match(body.error, /余额大于 0/);
    assert.match(body.error, /退款/);
    assert.ok(!f().calls.includes('schedule') && !f().calls.some((c) => c.startsWith('global-signout')));
  });
  await t.test('a failed scheduling write is reported and never revokes the session', async () => {
    globals.__deletionFixture = { ...fresh(), schedule: { ok: false, status: 503, code: 'auth_unavailable' } };
    const response = await POST(post(valid));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).ok, false);
    assert.ok(!f().calls.some((c) => c.includes('signout')));
  });
});
