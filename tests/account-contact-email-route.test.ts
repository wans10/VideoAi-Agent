import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import { build } from 'esbuild';

type Fixture = {
  configured: boolean;
  userId: string | null;
  stored: string | null;
  calls: Array<{ sql: string; values: unknown[] }>;
  fail?: boolean;
};
const globals = globalThis as typeof globalThis & { __contactEmailFixture?: Fixture };

/** Bundles the route with the database and session boundaries replaced by fixtures. */
async function loadRoute() {
  const mocks: Record<string, string> = {
    '@/lib/db': `export const isDatabaseConfigured = () => globalThis.__contactEmailFixture.configured;
      export async function query(sql, values) {
        const f = globalThis.__contactEmailFixture; f.calls.push({ sql, values });
        if (f.fail) throw Error('private database detail');
        if (/RETURNING contact_email/.test(sql)) { f.stored = values[1]; return [{ contact_email: values[1] }]; }
        return [{ contact_email: f.stored }];
      }`,
    '@/lib/supabase-ssr': `export const getRouteAuthContext = async () => ({ userId: globalThis.__contactEmailFixture.userId });`,
  };
  const result = await build({
    entryPoints: ['frontend/app/api/account/contact-email/route.ts'], bundle: true, write: false,
    platform: 'node', format: 'cjs', packages: 'external', tsconfig: 'frontend/tsconfig.json',
    plugins: [{ name: 'contact-email-boundaries', setup(builder) {
      builder.onResolve({ filter: /.*/ }, (args) => (Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: 'fixture' } : undefined));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({ contents: mocks[args.path], loader: 'js' }));
    } }],
  });
  const module = { exports: {} as { GET(r: Request): Promise<Response>; POST(r: Request): Promise<Response> } };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, createRequire(resolve('frontend/package.json')));
  return module.exports;
}

const URL_ = 'https://maxvideoai.test/api/account/contact-email';
const post = (body: unknown) => new Request(URL_, { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('contact email route: the owner comes from the session, never from the body, and the value is normalised', async (t) => {
  const { POST, GET } = await loadRoute();
  const fixture: Fixture = { configured: true, userId: 'owner-a', stored: null, calls: [] };
  globals.__contactEmailFixture = fixture;
  t.after(() => { delete globals.__contactEmailFixture; });

  await t.test('a body userId is ignored and the write is keyed by the session user', async () => {
    fixture.calls = [];
    const response = await POST(post({ userId: 'someone-else', email: '  Member.One@Example.COM ' }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, contactEmail: 'member.one@example.com' });
    assert.equal(fixture.calls.length, 1);
    assert.deepEqual(fixture.calls[0].values, ['owner-a', 'member.one@example.com']);
    assert.match(fixture.calls[0].sql, /INSERT INTO profiles \(id, contact_email, contact_email_at, synced_from_supabase\)/);
    assert.match(fixture.calls[0].sql, /ON CONFLICT \(id\)/);
  });

  await t.test('re-sending the same address is an idempotent update', async () => {
    fixture.calls = [];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await POST(post({ email: 'member.one@example.com' }));
      assert.equal(response.status, 200);
    }
    assert.equal(fixture.calls.length, 2);
    for (const call of fixture.calls) assert.deepEqual(call.values, ['owner-a', 'member.one@example.com']);
    assert.equal(fixture.stored, 'member.one@example.com');
  });

  await t.test('obviously invalid or missing addresses are rejected before any write', async () => {
    for (const body of [{ email: 'not-an-email' }, { email: '' }, { email: 42 }, {}, { email: `${'a'.repeat(250)}@example.com` }, null, 'x']) {
      fixture.calls = [];
      const response = await POST(post(body));
      assert.equal(response.status, 400, `rejects ${JSON.stringify(body)}`);
      assert.equal((await response.json()).ok, false);
      assert.equal(fixture.calls.length, 0);
    }
    fixture.calls = [];
    const malformed = await POST(post('{not json'));
    assert.equal(malformed.status, 400);
    assert.equal(fixture.calls.length, 0);
  });

  await t.test('unauthenticated callers cannot read or write', async () => {
    fixture.userId = null; fixture.calls = [];
    assert.equal((await POST(post({ email: 'member.one@example.com' }))).status, 401);
    assert.equal((await GET(new Request(URL_))).status, 401);
    assert.equal(fixture.calls.length, 0);
    fixture.userId = 'owner-a';
  });

  await t.test('GET returns only the caller’s own contact email', async () => {
    fixture.stored = 'member.one@example.com'; fixture.calls = [];
    const response = await GET(new Request(URL_));
    assert.deepEqual(await response.json(), { ok: true, contactEmail: 'member.one@example.com' });
    assert.deepEqual(fixture.calls[0].values, ['owner-a']);
    fixture.stored = null;
    assert.deepEqual(await (await GET(new Request(URL_))).json(), { ok: true, contactEmail: null });
  });

  await t.test('an unavailable database is reported as such, and failures reveal no detail', async () => {
    fixture.configured = false;
    assert.equal((await POST(post({ email: 'member.one@example.com' }))).status, 503);
    fixture.configured = true; fixture.fail = true;
    const response = await POST(post({ email: 'member.one@example.com' }));
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { ok: false, error: 'save_failed' });
    fixture.fail = false;
  });
});
