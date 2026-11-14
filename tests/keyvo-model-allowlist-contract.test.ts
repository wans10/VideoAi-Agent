import assert from 'node:assert/strict';
import test from 'node:test';
import allowlist from '../frontend/config/keyvo-model-allowlist.json' with { type: 'json' };
import registryDocument from '../frontend/config/model-registry.json' with { type: 'json' };
import engineCatalog from '../frontend/config/engine-catalog.json' with { type: 'json' };
import visibleEngineCatalog from '../frontend/config/engine-catalog-visible.ts';
import {
  filterKeyvoVisibleEntries,
  isKeyvoHiddenModel,
  isKeyvoOfferedEngine,
} from '../frontend/config/keyvo-model-visibility.ts';
import { getRuntimeModelById, listPublishedRuntimeModels } from '../frontend/config/model-runtime.ts';
import { MODEL_FAMILIES } from '../frontend/config/model-families.ts';
import { getBaseEnginesByCategory } from '../frontend/src/lib/engines.ts';
import { DEFAULT_IMAGE_WORKSPACE_ENGINE_ID } from '../frontend/app/(core)/(workspace)/app/image/_lib/image-workspace-engine-options.ts';
import { DEFAULT_WORKSPACE_SHOT_MODEL_ID } from '../frontend/app/(core)/(workspace)/app/studio/_shared/_state/workspace-state.ts';
import { IMAGE_STORYBOARD_PRESET } from '../frontend/app/(core)/(workspace)/app/image/_lib/image-workspace-storyboard.ts';
import { MCP_TRIAL_PRESET } from '../frontend/src/server/agent-api/trial-preset.ts';

// The owner's decision (2026-11-14). Changing this list is a commercial decision, not a refactor.
const OWNER_OFFERED_ENGINE_IDS = [
  'kling-v4', 'kling-v4-flash',
  'kling-3-turbo-standard', 'kling-3-turbo-pro',
  'kling-3-standard', 'kling-3-pro',
  'kling-o3-standard', 'kling-o3-pro',
  'wan-3', 'wan-3-prime', 'happy-horse-1-1',
  'minimax-h3', 'minimax-h3-max',
  'qwen-image-3-0', 'qwen-image-3-0-pro',
  'seedance-2-5', 'seedream-5-0-pro', 'seedream-5-0-flash',
  'nano-banana-2-1', 'nano-banana-2', 'nano-banana-lite', 'gemini-omni-flash',
  'gpt-image-2-6-sunburst', 'gpt-image-2-6-flare', 'gpt-image-2-5-sunburst', 'gpt-image-2-5-flare',
].sort();

const registryIds = registryDocument.models.map((model) => model.id);
const allowlistIds = [...allowlist.offeredEngineIds].sort();
const hiddenRegistryIds = registryIds.filter((id) => !allowlist.offeredEngineIds.includes(id));

test('the allowlist is the owner decision, every entry is a registry model, and no entry is duplicated', () => {
  assert.deepEqual(allowlistIds, OWNER_OFFERED_ENGINE_IDS);
  assert.equal(new Set(allowlist.offeredEngineIds).size, allowlist.offeredEngineIds.length);
  for (const id of allowlist.offeredEngineIds) {
    assert.ok(registryIds.includes(id), `allowlist id must be a registry model: ${id}`);
    assert.equal(isKeyvoOfferedEngine(id), true, id);
    assert.equal(isKeyvoHiddenModel(id), false, id);
  }
});

test('every offered engine that the registry makes executable is in the allowlist, and every allowlisted engine is offered', () => {
  // Video and image engines are listed by category; both are customer surfaces.
  const offeredWorkspaceIds = getBaseEnginesByCategory('all').map((engine) => engine.id);
  for (const id of offeredWorkspaceIds) {
    assert.ok(allowlist.offeredEngineIds.includes(id), `workspace offers a non-allowlisted engine: ${id}`);
  }
  for (const id of allowlist.offeredEngineIds) {
    assert.ok(offeredWorkspaceIds.includes(id), `allowlisted engine is missing from the workspace: ${id}`);
    assert.ok(engineCatalog.some((row) => row.engineId === id), `allowlisted engine has no catalogue row: ${id}`);
  }
});

test('hidden models are absent from the workspace, the runtime publication, the engine catalogue and the sitemap roster', () => {
  assert.ok(hiddenRegistryIds.length > 0);
  const workspaceIds = new Set(getBaseEnginesByCategory('all').map((engine) => engine.id));
  const publishedRuntimeIds = new Set(listPublishedRuntimeModels().map((model) => model.id));
  const catalogueIds = new Set(visibleEngineCatalog.map((row) => row.engineId));
  for (const id of hiddenRegistryIds) {
    assert.equal(isKeyvoHiddenModel(id), true, id);
    assert.equal(workspaceIds.has(id), false, `hidden engine reaches the workspace: ${id}`);
    assert.equal(publishedRuntimeIds.has(id), false, `hidden model is published: ${id}`);
    assert.equal(catalogueIds.has(id), false, `hidden engine reaches the catalogue: ${id}`);
    const runtime = getRuntimeModelById(id);
    assert.ok(runtime, id);
    assert.equal(runtime.publication.model.published, false, `model page open: ${id}`);
    assert.equal(runtime.publication.model.indexable, false, `model page indexable: ${id}`);
    assert.equal(runtime.publication.sitemap.published, false, `sitemap lists: ${id}`);
    assert.equal(runtime.publication.app.published, false, `app open: ${id}`);
    assert.equal(runtime.publication.pricing.published, false, `pricing open: ${id}`);
  }
  const roster = filterKeyvoVisibleEntries(engineCatalog);
  for (const row of roster) assert.ok(allowlist.offeredEngineIds.includes(row.engineId), `roster lists ${row.engineId}`);
});

test('no customer surface defaults to a hidden engine', () => {
  const defaults = {
    'workspace image default': DEFAULT_IMAGE_WORKSPACE_ENGINE_ID,
    'studio shot default': DEFAULT_WORKSPACE_SHOT_MODEL_ID,
    'storyboard image preset': IMAGE_STORYBOARD_PRESET.engineId,
    'MCP trial preset': MCP_TRIAL_PRESET.engineId,
  };
  for (const [surface, id] of Object.entries(defaults)) {
    assert.equal(isKeyvoOfferedEngine(id), true, `${surface} defaults to a hidden engine: ${id}`);
  }
  // A family with at least one offered engine must default to an offered engine.
  const offeredFamilies = new Set(
    registryDocument.models.filter((model) => allowlist.offeredEngineIds.includes(model.id)).map((model) => model.family),
  );
  for (const family of MODEL_FAMILIES) {
    if (!family.defaultModelId) continue;
    if (!offeredFamilies.has(family.id)) continue;
    assert.equal(isKeyvoOfferedEngine(family.defaultModelId), true,
      `family ${family.id} defaults to a hidden engine: ${family.defaultModelId}`);
  }
});
