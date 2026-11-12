import assert from 'node:assert/strict';
import test from 'node:test';

import { getRuntimeModelById, getUpstreamRuntimeModelById } from '../frontend/config/model-runtime';
import { filterKeyvoVisibleEntries, isKeyvoHiddenModel } from '../frontend/config/keyvo-model-visibility';

test('Keyvo hides MiniMax H3 Max on every surface while the registry keeps upstream publication', () => {
  assert.equal(isKeyvoHiddenModel('minimax-h3-max'), true);
  assert.equal(isKeyvoHiddenModel('minimax-h3'), false);
  const keyvo = getRuntimeModelById('minimax-h3-max');
  assert.ok(keyvo);
  for (const surface of ['model', 'examples', 'compare', 'app', 'pricing', 'sitemap'] as const) {
    assert.equal(keyvo.publication[surface].published, false, surface);
  }
  assert.equal(getUpstreamRuntimeModelById('minimax-h3-max')?.publication.app.published, true);
  assert.equal(getRuntimeModelById('minimax-h3')?.publication.app.published, true);
  assert.deepEqual(
    filterKeyvoVisibleEntries([{ engineId: 'minimax-h3-max', family: 'hailuo' }, { engineId: 'minimax-h3', family: 'hailuo' }]).map((entry) => entry.engineId),
    ['minimax-h3'],
  );
});
