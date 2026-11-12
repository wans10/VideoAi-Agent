import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getRuntimeModelById, getUpstreamRuntimeModelById } from '../frontend/config/model-runtime';
import { filterKeyvoVisibleEntries, isKeyvoHiddenModel } from '../frontend/config/keyvo-model-visibility';

// MiniMax-H3-Max was hidden (KEYVO_HIDDEN_MODEL_IDS) until 2026-11-12, when it moved to MiniMax's own V2 API.
// The hidden-id mechanism stays for future models without a mainland route.
test('Keyvo serves MiniMax H3 Max with its upstream publication; the hidden-id list is empty but kept', () => {
  assert.deepEqual(JSON.parse(readFileSync('frontend/config/keyvo-hidden-model-ids.json', 'utf8')), []);
  assert.equal(isKeyvoHiddenModel('minimax-h3-max'), false);
  assert.equal(isKeyvoHiddenModel('minimax-h3'), false);
  const keyvo = getRuntimeModelById('minimax-h3-max');
  const upstream = getUpstreamRuntimeModelById('minimax-h3-max');
  assert.ok(keyvo && upstream);
  for (const surface of ['model', 'examples', 'app', 'pricing', 'sitemap'] as const) {
    assert.equal(keyvo.publication[surface].published, upstream.publication[surface].published, surface);
  }
  assert.equal(keyvo.publication.app.published, true);
  assert.equal(keyvo.publication.pricing.published, true);
  assert.equal(getRuntimeModelById('minimax-h3')?.publication.app.published, true);
  assert.deepEqual(
    filterKeyvoVisibleEntries([{ engineId: 'minimax-h3-max', family: 'hailuo' }, { engineId: 'minimax-h3', family: 'hailuo' }]).map((entry) => entry.engineId),
    ['minimax-h3-max', 'minimax-h3'],
  );
});
