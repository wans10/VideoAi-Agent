import assert from 'node:assert/strict';
import test from 'node:test';
import { listFalEngines } from '../frontend/src/config/falEngines';
import { getRuntimeModelById } from '../frontend/config/model-runtime';
import { isKeyvoHiddenModel, keyvoEngineTier } from '../frontend/config/keyvo-model-visibility';
import allowlist from '../frontend/config/keyvo-model-allowlist.json' with { type: 'json' };

// Customer view (no unfiltered-catalog override). Model pages, sitemap and pricing read the runtime publication, so an
// engine outside the customer view must be unpublished there. Admin-tier engines keep their workspace publication only.
const engines = listFalEngines();

test('engines outside the customer view are unpublished on model, sitemap and pricing surfaces', () => {
  const hidden = engines.filter((engine) => isKeyvoHiddenModel(engine.id));
  assert.ok(hidden.length > 0);
  for (const engine of hidden) {
    const runtime = getRuntimeModelById(engine.id);
    assert.ok(runtime, engine.id);
    assert.equal(runtime.publication.model.published, false, `model page open: ${engine.id}`);
    assert.equal(runtime.publication.sitemap.published, false, `sitemap lists: ${engine.id}`);
    assert.equal(runtime.publication.pricing.published, false, `pricing open: ${engine.id}`);
    if (keyvoEngineTier(engine.id) !== 'admin') {
      assert.equal(runtime.publication.app.published, false, `workspace open: ${engine.id}`);
    }
  }
});

test('admin-tier engines are the only offered engines hidden from the customer view, and each is in the allowlist', () => {
  const tiers = allowlist.engineTiers as Record<string, string>;
  for (const [id, tier] of Object.entries(tiers)) {
    assert.ok(allowlist.offeredEngineIds.includes(id), id);
    assert.equal(isKeyvoHiddenModel(id), tier === 'admin', id);
  }
});
