import assert from 'node:assert/strict';
import test from 'node:test';
import { getBaseEngines, getBaseEngineIncludingHidden } from '../frontend/src/lib/engines';
import { getRuntimeModelById, resolveRuntimeEngineInput } from '../frontend/config/model-runtime';
import { isArchivedGenerationModel } from '../frontend/lib/model-generation-policy';
import { resolveMediaAwarePreflight } from '../frontend/app/api/preflight/_lib/media-aware-preflight';
import { resolveTrustedPaidGenerateRouteContext } from '../frontend/app/api/generate/_lib/route-context';
import { WORKSPACE_MODEL_CERTIFICATIONS } from '../frontend/app/(core)/(workspace)/app/studio/_shared/_lib/models/workspace-model-certification';

const id = 'seedance-1-5-pro';

test('Seedance 1.5 is retired: no page, examples, comparison, sitemap, app or pricing', () => {
  // Keyvo owner decision (2026-11-11): mainland Ark shut doubao-seedance-1-5-pro down on
  // 2026-09-21 without migration, so the model is offline everywhere and 301s to Seedance 2.0 Mini.
  const model = getRuntimeModelById(id)!;
  assert.equal(model.lifecycle, 'retired');
  assert.equal(model.successorId, null);
  assert.equal(model.publicTargetId, 'seedance-2-0-mini');
  assert.equal(model.label, 'Seedance 1.5 Pro');
  assert.equal(model.publication.app.published, false);
  assert.equal(model.publication.pricing.published, false);
  assert.equal(model.publication.examples.current, false);
  assert.equal(model.publication.model.published, false);
  assert.equal(model.publication.model.indexable, false);
  assert.equal(model.publication.examples.published, false);
  assert.equal(model.publication.compare.published, false);
  assert.equal(model.publication.sitemap.published, false);
  assert.equal(getBaseEngines().some(engine => engine.id === id), false);
  assert.ok(getBaseEngineIncludingHidden(id), 'historical jobs keep their original engine identity');
  assert.equal(resolveRuntimeEngineInput('seedance-v1.5-pro')?.id, id);
  assert.equal(isArchivedGenerationModel('seedance-v1.5-pro'), true);
  assert.equal(WORKSPACE_MODEL_CERTIFICATIONS.some(item => item.modelId === id), false);
});

test('Seedance 1.5 preflight and paid generation stop before quote or charge', async () => {
  const engine = getBaseEngineIncludingHidden(id)!;
  const response = await resolveMediaAwarePreflight({
    request: {
      engine: id, mode: 't2v', durationSec: 5, resolution: '720p',
      aspectRatio: '16:9', fps: 24, user: { memberTier: 'Member' },
    },
  }, {
    getConfiguredEngineFn: async () => { throw new Error('Retired model must stop before pricing'); },
    computeConfiguredPreflightFn: async () => { throw new Error('Retired model must stop before quote'); },
  });
  assert.equal(response.ok, false);
  assert.equal(response.error?.code, 'ENGINE_RETIRED');

  const paid = resolveTrustedPaidGenerateRouteContext({ body: {}, engine, jobId: 'new-job', mode: 't2v' });
  assert.deepEqual(paid, { ok: false, status: 410, body: { ok: false, error: 'ENGINE_RETIRED' } });
});

test('comparison URLs and the hub no longer publish Seedance 1.5', async () => {
  const hub = await import('../frontend/lib/compare-hub/data');
  assert.equal(hub.isPublishedComparisonSlug('seedance-1-5-pro-vs-seedance-2-0'), false);
  assert.ok(hub.getHubEngines().every(engine => engine.modelSlug !== id));
  assert.ok(hub.getPublishedComparisonSlugs().every(slug => !slug.includes(id)));
});
