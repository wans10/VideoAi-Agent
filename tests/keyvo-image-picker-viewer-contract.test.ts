import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import test from 'node:test';
import allowlist from '../frontend/config/keyvo-model-allowlist.json' with { type: 'json' };
import { listFalEngines } from '../frontend/src/config/falEngines.ts';
import { getBaseEnginesByCategory } from '../frontend/src/lib/engines.ts';
import { isKeyvoHiddenModelForViewer } from '../frontend/config/keyvo-model-visibility.ts';
import {
  filterImageWorkspaceEntriesForViewer,
  sortImageWorkspaceEngineOptions,
} from '../frontend/app/(core)/(workspace)/app/image/_lib/image-workspace-engine-options.ts';

// The image workspace page builds its picker (Our selection and All models tabs) from the registry, not from
// /api/engines. The production leak: admin-tier image engines reached ordinary customers through that list.
const tiers = allowlist.engineTiers as Record<string, string>;
const registry = listFalEngines();
const imageEntries = registry.filter((entry) => (entry.category ?? 'video') === 'image' && entry.surfaces.app.enabled);
const adminTierImageIds = imageEntries.map((entry) => entry.id).filter((id) => tiers[id] === 'admin');
const PUBLIC_IMAGE_IDS = ['seedream-5-0-flash', 'seedream-5-0-pro', 'qwen-image-3-0', 'qwen-image-3-0-pro'];

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

const ids = (viewer: { isAdmin: boolean }) =>
  sortImageWorkspaceEngineOptions(filterImageWorkspaceEntriesForViewer(imageEntries, viewer)).map((entry) => entry.id);

test('the registry holds admin-tier image engines to protect (the premise of this contract)', () => {
  for (const id of ['nano-banana-2', 'nano-banana-2-1', 'nano-banana-lite', 'gpt-image-2-5-sunburst', 'gpt-image-2-6-sunburst', 'gpt-image-2-6-flare']) {
    assert.ok(adminTierImageIds.includes(id), id);
  }
});

test('a non-admin viewer gets no admin-tier or non-offered image engine, and every public one', () => {
  withEnv(undefined, () => {
    const list = ids({ isAdmin: false });
    for (const id of list) assert.equal(isKeyvoHiddenModelForViewer(id, { isAdmin: false }), false, id);
    for (const id of adminTierImageIds) assert.ok(!list.includes(id), `non-admin sees ${id}`);
    for (const id of ['nano-banana', 'nano-banana-pro', 'gpt-image-2']) assert.ok(!list.includes(id), id);
    for (const id of PUBLIC_IMAGE_IDS) assert.ok(list.includes(id), id);
    assert.equal(list[0], 'seedream-5-0-flash');
  });
});

test('an admin viewer keeps the admin-tier image engines (nano-banana-2 stays selectable)', () => {
  withEnv(undefined, () => {
    const list = ids({ isAdmin: true });
    for (const id of adminTierImageIds) assert.ok(list.includes(id), id);
    for (const id of PUBLIC_IMAGE_IDS) assert.ok(list.includes(id), id);
    assert.ok(list.includes('nano-banana-2'));
  });
});

test('KEYVO_ADMIN_TIER_OPEN opens the admin-tier image engines for non-admins', () => {
  for (const value of ['1', 'true']) {
    withEnv(value, () => {
      const list = ids({ isAdmin: false });
      for (const id of adminTierImageIds) assert.ok(list.includes(id), `${value}: ${id}`);
    });
  }
  withEnv('0', () => {
    for (const id of adminTierImageIds) assert.ok(!ids({ isAdmin: false }).includes(id), id);
  });
});

test('the viewer-aware image page list agrees with the /api/engines base list for both viewers', () => {
  withEnv(undefined, () => {
    for (const viewer of [{ isAdmin: false }, { isAdmin: true }]) {
      const api = getBaseEnginesByCategory('image', viewer).map((engine) => engine.id).sort();
      assert.deepEqual([...ids(viewer)].sort(), api, JSON.stringify(viewer));
    }
  });
});

test('estimator and pricing projections never include engines hidden from customers', () => {
  withEnv(undefined, () => {
    for (const entry of registry) {
      if (isKeyvoHiddenModelForViewer(entry.id, { isAdmin: false })) {
        assert.equal(entry.surfaces.pricing.includeInEstimator, false, entry.id);
      }
    }
  });
});

// Every file that builds a customer-facing engine list from the registry must name its viewer gate here. A new
// builder that is not listed fails the discovery test below, so it cannot silently bypass the choke point.
const root = resolve(process.cwd(), 'frontend');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const VIEWER_AWARE_BUILDERS: Record<string, RegExp> = {
  'src/lib/engines.ts': /isKeyvoHiddenModelForViewer\(entry\.id, viewer\)/,
  'src/server/engines.ts': /viewer\?: \{ isAdmin: boolean \}/,
  'src/server/agent-api/read-only-engine-catalog.ts': /getBaseEnginesByCategory\(category, viewer\)/,
  'app/api/engines/_lib/engines-get-handler.ts': /getBaseEnginesByCategory\(category, \{ isAdmin \}\)/,
  'app/(core)/(workspace)/app/image/page.tsx': /filterImageWorkspaceEntriesForViewer\([\s\S]*\{ isAdmin \}/,
  'app/(core)/(workspace)/app/image/_lib/image-workspace-engine-options.ts': /isKeyvoHiddenModelForViewer\(entry\.id, viewer\)/,
};
// Files that read the registry but never present a customer engine list: validators, metadata maps, display
// metadata keyed by an engine id the picker already received, and pages gated by runtime publication.
const NON_LIST_REGISTRY_READERS = new Set([
  'app/api/examples/route.ts',
  'app/api/generate/_lib/validate.ts',
  'app/api/generate/_lib/validate-media-inputs.ts',
  'components/admin/playlists/playlist-helpers.ts',
  'components/marketing/PriceChip.tsx',
  'components/marketing/PriceEstimator.tsx',
  'components/marketing/price-estimator/price-estimator-options.ts',
  'src/components/ui/engine-select/engine-select-helpers.ts',
  'src/server/agent-api/model-catalog.ts',
  'src/server/agent-api/model-prompting-sources.ts',
  'lib/api-engines.ts',
]);

test('every builder of a customer engine list applies the viewer-aware allowlist', () => {
  for (const [path, marker] of Object.entries(VIEWER_AWARE_BUILDERS)) {
    assert.match(read(path), marker, `${path} must use the viewer-aware choke point`);
  }
});

test('no new customer-facing registry list builder appears without being classified', () => {
  const out = execFileSync(
    'grep',
    ['-rlE', 'listFalEngines|getBaseEnginesByCategory|FAL_ENGINE_REGISTRY|getPublicConfiguredEnginesByCategory|getConfiguredEnginesByCategory',
      '--include=*.ts', '--include=*.tsx', 'app/(core)', 'app/api', 'components', 'src/components', 'src/server/agent-api', 'src/server/mcp', 'lib/api-engines.ts'],
    { cwd: root, encoding: 'utf8' },
  );
  const found = out.split('\n').filter(Boolean);
  const unknown = found.filter((path) => !(path in VIEWER_AWARE_BUILDERS) && !NON_LIST_REGISTRY_READERS.has(path));
  assert.deepEqual(unknown, [], 'classify new registry readers: viewer-aware builder or non-list reader');
});
