import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import {
  isKeyvoHiddenModel,
  isKeyvoHiddenModelForViewer,
  keyvoEngineTier,
} from '../frontend/config/keyvo-model-visibility.ts';
import { isKeyvoEngineRefusedForRequest } from '../frontend/src/server/keyvo-engine-access.ts';

// KEYVO_ADMIN_TIER_OPEN is read per call on the server, so tests can flip it inside one process.
const ADMIN_TIER_ENGINE_IDS = [
  'nano-banana-2-1', 'nano-banana-2', 'nano-banana-lite', 'gemini-omni-flash',
  'gpt-image-2-6-sunburst', 'gpt-image-2-6-flare', 'gpt-image-2-5-sunburst', 'gpt-image-2-5-flare',
  'veo-3-1', 'veo-3-1-fast', 'veo-3-1-lite',
];

function withEnv(value: string | undefined, run: () => void) {
  const previous = process.env.KEYVO_ADMIN_TIER_OPEN;
  if (value === undefined) delete process.env.KEYVO_ADMIN_TIER_OPEN;
  else process.env.KEYVO_ADMIN_TIER_OPEN = value;
  try {
    run();
  } finally {
    if (previous === undefined) delete process.env.KEYVO_ADMIN_TIER_OPEN;
    else process.env.KEYVO_ADMIN_TIER_OPEN = previous;
  }
}

test('default (unset) keeps every admin-tier engine admin-only on every surface', () => {
  withEnv(undefined, () => {
    for (const id of ADMIN_TIER_ENGINE_IDS) {
      assert.equal(keyvoEngineTier(id), 'admin', id);
      assert.equal(isKeyvoHiddenModel(id), true, `public view must hide ${id}`);
      assert.equal(isKeyvoHiddenModelForViewer(id, { isAdmin: false }), true, id);
      assert.equal(isKeyvoHiddenModelForViewer(id, { isAdmin: true }), false, `admin keeps ${id}`);
    }
  });
});

test('values other than true or 1 leave the admin tier closed', () => {
  for (const value of ['', '0', 'false', 'no', 'off', 'yes']) {
    withEnv(value, () => {
      assert.equal(keyvoEngineTier('veo-3-1'), 'admin', value);
      assert.equal(isKeyvoHiddenModel('veo-3-1'), true, value);
    });
  }
});

test('KEYVO_ADMIN_TIER_OPEN=true or 1 opens every admin-tier engine for all viewers', () => {
  for (const value of ['true', '1', ' TRUE ']) {
    withEnv(value, () => {
      for (const id of ADMIN_TIER_ENGINE_IDS) {
        assert.equal(keyvoEngineTier(id), 'public', `${value} ${id}`);
        assert.equal(isKeyvoHiddenModel(id), false, `${value} public view opens ${id}`);
        assert.equal(isKeyvoHiddenModelForViewer(id, { isAdmin: false }), false, id);
      }
    });
  }
});

test('the override does not open engines that are not offered or are hidden ids', () => {
  withEnv('true', () => {
    assert.equal(isKeyvoHiddenModel('seedance-2-0'), true, 'unlisted upstream engine stays hidden');
    assert.equal(isKeyvoHiddenModel('does-not-exist'), true);
    assert.equal(keyvoEngineTier('seedance-2-0'), undefined);
  });
});

test('direct API refusal does not look up a session once the override is on', async () => {
  withEnv('true', () => {
    // Without a request, an admin-tier lookup would throw or fail; with the override the tier is public, so no lookup runs.
    return isKeyvoEngineRefusedForRequest('nano-banana-2-1').then((refused) => {
      assert.equal(refused, false);
    });
  });
});

test('runtime model projection honours the override when the process starts', () => {
  const repo = process.cwd();
  const dir = mkdtempSync(join(tmpdir(), 'keyvo-admin-tier-'));
  const script = join(dir, 'probe.mts');
  writeFileSync(script, `
    const { isKeyvoHiddenModel } = await import(${JSON.stringify(resolve(repo, 'frontend/config/keyvo-model-visibility.ts'))});
    const { getRuntimeModelById } = await import(${JSON.stringify(resolve(repo, 'frontend/config/model-runtime.ts'))});
    const model = getRuntimeModelById('nano-banana-2-1');
    process.stdout.write(JSON.stringify({
      hidden: isKeyvoHiddenModel('nano-banana-2-1'),
      modelPublished: model?.publication?.model?.published ?? null,
    }));
  `);
  const run = (value: string | undefined) => {
    const env = { ...process.env };
    if (value === undefined) delete env.KEYVO_ADMIN_TIER_OPEN;
    else env.KEYVO_ADMIN_TIER_OPEN = value;
    const result = spawnSync('pnpm', ['exec', 'tsx', '--tsconfig', 'frontend/tsconfig.json', script], {
      cwd: repo,
      env,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout.trim().split('\n').at(-1) ?? '{}') as { hidden: boolean; modelPublished: boolean | null };
  };
  const closed = run(undefined);
  const open = run('true');
  assert.deepEqual({ closed, open }, {
    closed: { hidden: true, modelPublished: false },
    open: { hidden: false, modelPublished: true },
  });
});
