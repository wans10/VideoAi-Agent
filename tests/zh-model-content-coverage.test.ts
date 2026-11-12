import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { isKeyvoHiddenModel, isKeyvoVisibleFamily } from '../frontend/config/keyvo-model-visibility';

type RegistryModel = {
  id: string;
  slug?: string;
  family?: string;
  publication?: { model?: { published?: boolean } };
};

const registry = JSON.parse(readFileSync('frontend/config/model-registry.json', 'utf8')) as { models: RegistryModel[] };

// Keyvo renders Simplified Chinese only: a published, Keyvo-visible model without a zh file returns HTTP 500.
test('every published Keyvo-visible model has zh model content with a non-empty decision section', () => {
  const targets = registry.models
    .filter((model) => model.publication?.model?.published === true)
    .filter((model) => isKeyvoVisibleFamily(model.family) && !isKeyvoHiddenModel(model.id))
    .map((model) => model.slug ?? model.id)
    .sort();
  assert.ok(targets.length > 0, 'expected at least one Keyvo-visible published model');
  for (const slug of targets) {
    const file = `content/models/zh/${slug}.json`;
    assert.ok(existsSync(file), `missing ${file}`);
    const document = JSON.parse(readFileSync(file, 'utf8'));
    const decision = document.decision;
    assert.ok(
      decision && typeof decision === 'object' && Object.keys(decision).length > 0,
      `${file} has no non-empty decision section`,
    );
    assert.equal(decision.modelSlug, slug, `${file} decision.modelSlug`);
  }
});
