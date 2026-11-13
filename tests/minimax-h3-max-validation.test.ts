import assert from 'node:assert/strict';
import test from 'node:test';

import { MINIMAX_H3_MAX_ENGINE } from '../frontend/src/config/fal-engines/minimax-h3-max';
import { buildMinimaxH3MaxFalRequest } from '../frontend/src/lib/minimax-h3-max';
import { buildBillingPricingFacts } from '../frontend/src/lib/pricing-billing-facts';
import { buildPublicPricingFacts } from '../frontend/src/lib/pricing-public-facts';

test('MiniMax H3 Max rejects image-to-video without either frame', () => {
  assert.throws(() => buildMinimaxH3MaxFalRequest({
    mode: 'i2v',
    prompt: 'The still life starts to move.',
    durationSec: 5,
  }), /start or end image/i);
});

test('MiniMax H3 Max rejects reference media outside image, video, and audio', () => {
  assert.throws(() => buildMinimaxH3MaxFalRequest({
    mode: 'ref2v',
    prompt: 'Use the references.',
    durationSec: 5,
    references: [
      { type: 'document', url: 'https://media.maxvideoai.com/notes.pdf' },
    ],
  }), /image, video, or audio/i);
});

test('MiniMax H3 Max rejects unsupported duration and resolution values', () => {
  assert.throws(() => buildMinimaxH3MaxFalRequest({
    mode: 't2v',
    prompt: 'A lighthouse rotates through fog.',
    durationSec: 16,
  }), /5 through 15 seconds/i);
  assert.throws(() => buildMinimaxH3MaxFalRequest({
    mode: 't2v',
    prompt: 'A lighthouse rotates through fog.',
    durationSec: 5,
    resolution: '2K',
  }), /480P or 768P/);
  assert.throws(() => buildMinimaxH3MaxFalRequest({
    mode: 't2v',
    prompt: 'A lighthouse rotates through fog.',
    durationSec: 5,
    resolution: '1080P',
  }), /480P or 768P/);
});

// Keyvo runs H3-Max on MiniMax's own API: reference pricing uses verified reference-video seconds and the reference
// image count (no Fal token budget). The billing preflight still refuses a reference quote without owned media.
test('MiniMax H3 Max reference quotes price verified reference-video seconds and images beyond two', () => {
  const context = {
    engine: MINIMAX_H3_MAX_ENGINE,
    durationSec: 5,
    resolution: '768P',
    mode: 'ref2v' as const,
    inputVideoDurationSec: 2.4,
    referenceImageCount: 4,
  };
  const billing = buildBillingPricingFacts(context, MINIMAX_H3_MAX_ENGINE.pricingDetails, 'USD');
  const publicFacts = buildPublicPricingFacts(context);
  // CNY: output 5 x 0.50 + 3 billed video seconds x 0.97 + 2 paid images x 0.50 = 6.41, at CNY 8 per USD.
  assert.equal(billing.facts.vendorSubtotalExactCents, 80.125);
  assert.equal(publicFacts.facts.vendorSubtotalExactCents, 80.125);
  assert.deepEqual(billing.addons, [
    { type: 'reference_video_seconds', amountCents: 37 },
    { type: 'reference_images_above_two', amountCents: 13 },
  ]);
  assert.equal(billing.meta.provider_currency, 'CNY');
  for (const invalid of [{ inputVideoDurationSec: 16 }, { referenceImageCount: 10 }, { resolution: '1080P' }, { durationSec: 4 }]) {
    assert.throws(() => buildBillingPricingFacts({ ...context, ...invalid }, MINIMAX_H3_MAX_ENGINE.pricingDetails, 'USD'));
  }
});
