import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { NextRequest } from 'next/server';
import allowlist from '../frontend/config/keyvo-model-allowlist.json' with { type: 'json' };
import { listFalEngines } from '../frontend/src/config/falEngines.ts';
import { resolveMediaAwarePreflight } from '../frontend/app/api/preflight/_lib/media-aware-preflight.ts';
import { createPreflightPostHandler } from '../frontend/app/api/preflight/_lib/preflight-handler.ts';
import type { EngineCaps, PreflightRequest } from '../frontend/types/engines.ts';

// Production bug: an admin selecting an admin-tier video engine (gemini-omni-flash, veo-3-1...) got "Unknown engine" and
// "price unavailable" because /api/preflight resolved the engine from the public catalogue only. The preflight path now
// follows the generate route: the admin session is read only for admin-tier ids, admins resolve the hidden engine, and
// everyone else keeps ENGINE_NOT_FOUND.
const tiers = allowlist.engineTiers as Record<string, string>;
const videoEntries = listFalEngines().filter((entry) => (entry.category ?? 'video') === 'video');
const adminVideoIds = videoEntries.map((entry) => entry.id).filter((id) => tiers[id] === 'admin');
const engineFor = (id: string): EngineCaps => {
  const engine = videoEntries.find((entry) => entry.id === id)?.engine;
  assert.ok(engine, id);
  return engine;
};
const requestFor = (engine: EngineCaps): PreflightRequest => {
  const mode = engine.modes.includes('t2v') ? 't2v' : engine.modes[0]!;
  return { engine: engine.id, mode, durationSec: 6, resolution: '720p', aspectRatio: '16:9', fps: 24, user: { memberTier: 'Member' } } as PreflightRequest;
};
const publicCatalogue = async () => undefined; // admin-tier engines are not in the public catalogue

function withEnv<T>(value: string | undefined, run: () => Promise<T>): Promise<T> {
  const previous = process.env.KEYVO_ADMIN_TIER_OPEN;
  if (value === undefined) delete process.env.KEYVO_ADMIN_TIER_OPEN;
  else process.env.KEYVO_ADMIN_TIER_OPEN = value;
  return run().finally(() => {
    if (previous === undefined) delete process.env.KEYVO_ADMIN_TIER_OPEN;
    else process.env.KEYVO_ADMIN_TIER_OPEN = previous;
  });
}

test('the allowlist holds admin-tier video engines (premise)', () => {
  assert.ok(adminVideoIds.includes('gemini-omni-flash'));
  assert.ok(adminVideoIds.includes('veo-3-1'));
});

test('an admin viewer prices every admin-tier video engine', async () => {
  await withEnv(undefined, async () => {
    for (const id of adminVideoIds) {
      const engine = engineFor(id);
      const result = await resolveMediaAwarePreflight(
        { request: requestFor(engine) as never, userId: 'admin-user', viewerIsAdmin: true },
        { getConfiguredEngineFn: publicCatalogue, getConfiguredEngineIncludingHiddenFn: async (engineId) => (engineId === id ? engine : undefined) },
      );
      assert.equal(result.ok, true, `${id}: ${JSON.stringify(result.error)}`);
      // The snapshot is quoted in the engine currency (USD cents); the Keyvo workspace converts it to CNY for display.
      assert.equal(typeof result.currency, 'string', id);
      assert.ok((result.total ?? 0) > 0, id);
    }
  });
});

test('non-admin and logged-out viewers keep ENGINE_NOT_FOUND for the same ids', async () => {
  await withEnv(undefined, async () => {
    for (const id of adminVideoIds) {
      const engine = engineFor(id);
      for (const viewerIsAdmin of [false, undefined]) {
        let hiddenLookups = 0;
        const result = await resolveMediaAwarePreflight(
          { request: requestFor(engine) as never, userId: 'user', ...(viewerIsAdmin === undefined ? {} : { viewerIsAdmin }) },
          { getConfiguredEngineFn: publicCatalogue, getConfiguredEngineIncludingHiddenFn: async () => { hiddenLookups += 1; return engine; } },
        );
        assert.equal(result.ok, false, id);
        assert.equal(result.error?.code, 'ENGINE_NOT_FOUND', id);
        assert.equal(hiddenLookups, 0, id);
      }
    }
  });
});

test('an admin flag never opens an engine Keyvo does not offer', async () => {
  const engine = engineFor('veo-3-1');
  const notOffered = videoEntries.map((entry) => entry.id).filter((id) => !(id in tiers));
  assert.ok(notOffered.length > 0);
  for (const id of notOffered) {
    let hiddenLookups = 0;
    const result = await resolveMediaAwarePreflight(
      { request: { ...requestFor(engine), engine: id } as never, userId: 'admin-user', viewerIsAdmin: true },
      { getConfiguredEngineFn: publicCatalogue, getConfiguredEngineIncludingHiddenFn: async () => { hiddenLookups += 1; return engine; } },
    );
    assert.equal(result.ok, false, id);
    assert.equal(hiddenLookups, 0, id);
  }
});

function post(body: unknown) {
  return new NextRequest('https://keyvo.example/api/preflight', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

test('the handler reads the session only for admin-tier ids and fails closed', async () => {
  await withEnv(undefined, async () => {
    const seen: Array<boolean | undefined> = [];
    let adminChecks = 0;
    const make = (isAdmin: () => Promise<boolean>) => createPreflightPostHandler({
      resolveViewerIsAdminFn: async () => { adminChecks += 1; return isAdmin(); },
      resolveMediaAwarePreflightFn: async (input) => { seen.push(input.viewerIsAdmin); return { ok: true, total: 1 } as never; },
    });
    const body = (id: string) => ({ engine: id, mode: 't2v', durationSec: 6, resolution: '720p', aspectRatio: '16:9' });
    await make(async () => true)(post(body('seedance-2-5')));
    await make(async () => true)(post(body('kling-3-pro')));
    assert.equal(adminChecks, 0, 'ordinary engines add no session lookup');
    assert.deepEqual(seen, [false, false]);
    seen.length = 0;
    await make(async () => true)(post(body('gemini-omni-flash')));
    await make(async () => false)(post(body('gemini-omni-flash')));
    await make(async () => { throw new Error('auth down'); })(post(body('veo-3-1')));
    assert.equal(adminChecks, 3);
    assert.deepEqual(seen, [true, false, false]);
  });
});

test('KEYVO_ADMIN_TIER_OPEN opens admin-tier ids for every viewer without a session lookup', async () => {
  await withEnv('1', async () => {
    let adminChecks = 0;
    const handler = createPreflightPostHandler({
      resolveViewerIsAdminFn: async () => { adminChecks += 1; return false; },
      resolveMediaAwarePreflightFn: async () => ({ ok: true, total: 1 } as never),
    });
    const response = await handler(post({ engine: 'gemini-omni-flash', mode: 't2v', durationSec: 6, resolution: '720p', aspectRatio: '16:9' }));
    assert.equal(response.status, 200);
    assert.equal(adminChecks, 0);
  });
  await withEnv('true', async () => {
    const engine = engineFor('gemini-omni-flash');
    const result = await resolveMediaAwarePreflight(
      { request: requestFor(engine) as never, userId: 'anyone' },
      { getConfiguredEngineFn: async () => engine },
    );
    assert.equal(result.ok, true);
  });
});

// Discovery guard: every server file that resolves an engine for a price check must either live on the reviewed list
// below (viewer-aware or intentionally public) or the build fails, so a new route cannot bypass the viewer rule.
const REVIEWED_PRICE_CHECK_OWNERS: Record<string, string> = {
  'app/api/preflight/_lib/preflight-handler.ts': 'resolves the admin viewer for admin-tier ids and passes viewerIsAdmin',
  'app/api/preflight/_lib/media-aware-preflight.ts': 'admin-tier lookup only when viewerIsAdmin is true',
  'src/server/engines.ts': 'computeConfiguredPreflight owner; receives the already resolved engine',
  'src/server/agent-api/generation-pricing.ts': 'MCP and agent pricing; deliberately never admin-tier',
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

test('every route that runs the video price check is on the reviewed viewer-rule list', () => {
  const root = fileURLToPath(new URL('../frontend', import.meta.url));
  const owners = [...walk(join(root, 'app')), ...walk(join(root, 'src'))]
    .filter((file) => /\b(computeConfiguredPreflight|resolveMediaAwarePreflight|resolveAdmittedMediaAwarePreflight)\b/.test(readFileSync(file, 'utf8')))
    .map((file) => relative(root, file));
  const unreviewed = owners.filter((file) => !(file in REVIEWED_PRICE_CHECK_OWNERS));
  assert.deepEqual(unreviewed, [], 'new price-check owner: apply the Keyvo viewer rule, then list it here');
  const handler = readFileSync(join(root, 'app/api/preflight/_lib/preflight-handler.ts'), 'utf8');
  assert.match(handler, /keyvoEngineTier\([^)]*\) === 'admin'/);
});
