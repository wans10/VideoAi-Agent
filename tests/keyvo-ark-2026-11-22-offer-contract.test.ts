import assert from 'node:assert/strict';
import test from 'node:test';
import allowlist from '../frontend/config/keyvo-model-allowlist.json' with { type: 'json' };
import { isKeyvoHiddenModelForViewer, isKeyvoOfferedEngine, keyvoEngineTier } from '../frontend/config/keyvo-model-visibility.ts';
import { isOfficialListPricedEngine } from '../frontend/src/lib/official-list-pricing.ts';
import { SEEDANCE_ARK_LIST_CNY_PER_MILLION_TOKENS } from '../frontend/src/config/fal-engines/launch-config.ts';
import { quoteNewSeedreamListCost } from '../frontend/lib/image/seedream-pricing.ts';

// Owner decision 2026-11-22. Prices: https://ark.volcengine.com/region:cn-beijing/docs/model-pricing.md (fetched 2026-11-22).
test('Seedance 2.5 flash and Seedream 5.5 are public engines; hidden and admin-tier engines are unchanged', () => {
  for (const id of ['seedance-2-5-flash', 'seedream-5-5']) {
    assert.ok(allowlist.offeredEngineIds.includes(id), id);
    assert.equal(keyvoEngineTier(id), 'public');
    assert.equal(isKeyvoOfferedEngine(id), true);
    assert.equal(isKeyvoHiddenModelForViewer(id, { isAdmin: false }), false);
    assert.ok(isOfficialListPricedEngine(id), `${id} is priced by the official-list x0.8 rule, never a USD tariff`);
  }
  for (const id of ['veo-3-1', 'nano-banana-2-1', 'gpt-image-2-6-sunburst']) {
    assert.equal(keyvoEngineTier(id), 'admin');
    assert.equal(isKeyvoHiddenModelForViewer(id, { isAdmin: false }), true);
    assert.equal(isKeyvoHiddenModelForViewer(id, { isAdmin: true }), false);
  }
  for (const id of ['pika-text-to-video', 'flux-3-max', 'sora-2', 'seedance-1-5-pro']) {
    assert.equal(isKeyvoOfferedEngine(id), false, id);
    assert.equal(isKeyvoHiddenModelForViewer(id, { isAdmin: false }), true, id);
  }
});

test('Seedance 2.5 sells 4K; Seedance 2.5 flash is 480p and 720p only', async () => {
  const { SEEDANCE_2_5_FAL_ENGINE_REGISTRY } = await import('../frontend/src/config/fal-engines/seedance-2-5.ts');
  const { SEEDANCE_2_5_FLASH_FAL_ENGINE_REGISTRY } = await import('../frontend/src/config/fal-engines/seedance-2-5-flash.ts');
  assert.ok(SEEDANCE_2_5_FAL_ENGINE_REGISTRY[0].engine.resolutions.includes('4k'));
  assert.deepEqual([...SEEDANCE_2_5_FLASH_FAL_ENGINE_REGISTRY[0].engine.resolutions].sort(), ['480p', '720p']);
  assert.deepEqual(Object.keys(SEEDANCE_ARK_LIST_CNY_PER_MILLION_TOKENS.seedance25Flash), ['480p', '720p']);
});

test('official CNY list rates and the derived 4K example match the Volcengine page', () => {
  const t = SEEDANCE_ARK_LIST_CNY_PER_MILLION_TOKENS;
  assert.deepEqual(t.seedance25['4k'], { no_video_input: 31, video_input: 19 });
  assert.deepEqual(t.seedance25['1080p'], { no_video_input: 77, video_input: 46 });
  assert.deepEqual(t.seedance25Flash['720p'], { no_video_input: 46, video_input: 28 });
  const tokens = 5 * 3840 * 2160 * 24 / 1024; // 5 s 16:9 4K
  assert.equal(Number((tokens * 31 / 1e6).toFixed(2)), 30.13, 'the page example');
  assert.equal(Number((tokens * 31 / 1e6 * 0.8).toFixed(2)), 24.11, 'customer price (24.10 when starting from the rounded page figure)');
});

test('Seedream 5.5 list quote follows the CNY tiers at 8 CNY/USD', () => {
  const small = quoteNewSeedreamListCost({ model: '5.5', outputPixels: [2_359_296], inputImages: 2 });
  assert.equal(small.outputUsd, 0.13 / 8);
  assert.equal(small.inputUsd, 2 * 0.05 / 8);
  const large = quoteNewSeedreamListCost({ model: '5.5', outputPixels: [4_194_304], inputImages: 0 });
  assert.equal(large.outputUsd, 0.23 / 8);
});
