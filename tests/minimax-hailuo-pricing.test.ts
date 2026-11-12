import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateMinimaxHailuoCost } from '../frontend/src/lib/minimax-hailuo-pricing';
import { getMinimaxFailureMessage } from '../frontend/lib/minimax-failure-messages';
import { MINIMAX_MESSAGES } from '../frontend/src/server/video-providers/minimax-official/client';
import { isMinimaxLegacyVideoCombination } from '../frontend/src/lib/minimax-video-limits';

test('Hailuo 2.3 provisional cost follows the official per-video CNY list', () => {
  const cost = (engineId: string, mode: string, resolution: string, durationSec: number) =>
    calculateMinimaxHailuoCost({ engineId, mode, resolution, durationSec });
  // CNY 2.00 / 4.00 / 3.50 per video at the accounting rate of 8 CNY per USD.
  assert.equal(cost('minimax-hailuo-2-3', 't2v', '768P', 6).subtotalUsdCents, 25);
  assert.equal(cost('minimax-hailuo-2-3', 'i2v', '768P', 10).subtotalUsdCents, 50);
  assert.equal(cost('minimax-hailuo-2-3', 't2v', '1080P', 6).subtotalUsdCents, 43.75);
  assert.equal(cost('minimax-hailuo-2-3-fast', 'i2v', '768P', 6).outputCny, 1.35);
  assert.equal(cost('minimax-hailuo-2-3-fast', 'i2v', '768P', 10).outputCny, 2.25);
  assert.equal(cost('minimax-hailuo-2-3-fast', 'i2v', '1080P', 6).outputCny, 2.31);
  assert.throws(() => cost('minimax-hailuo-2-3', 't2v', '1080P', 10), /1080P is 6 s only/);
  assert.throws(() => cost('minimax-hailuo-2-3-fast', 't2v', '768P', 6));
  assert.throws(() => cost('minimax-hailuo-02-text', 't2v', '768P', 6));
});

test('the legacy matrix matches the docs tables', () => {
  assert.equal(isMinimaxLegacyVideoCombination({ model: 'MiniMax-Hailuo-02', task: 'i2v', resolution: '512p', durationSec: 10 }), true);
  assert.equal(isMinimaxLegacyVideoCombination({ model: 'MiniMax-Hailuo-02', task: 'fl2v', resolution: '512P', durationSec: 6 }), false);
  assert.equal(isMinimaxLegacyVideoCombination({ model: 'MiniMax-Hailuo-02', task: 'fl2v', resolution: '1080P', durationSec: 6 }), true);
  assert.equal(isMinimaxLegacyVideoCombination({ model: 'MiniMax-Hailuo-2.3-Fast', task: 't2v', resolution: '768P', durationSec: 6 }), false);
  assert.equal(isMinimaxLegacyVideoCombination({ model: 'MiniMax-Hailuo-2.3', task: 'fl2v', resolution: '768P', durationSec: 6 }), false);
});

test('every canonical MiniMax reason has zh copy', () => {
  for (const message of Object.values(MINIMAX_MESSAGES)) {
    const zh = getMinimaxFailureMessage(message, 'zh-CN');
    assert.ok(zh && /[一-鿿]/.test(zh), message);
  }
  assert.match(getMinimaxFailureMessage(MINIMAX_MESSAGES.rateLimited, 'zh')!, /请约一分钟后重试/);
  assert.equal(getMinimaxFailureMessage('Something else.', 'zh'), null);
});
