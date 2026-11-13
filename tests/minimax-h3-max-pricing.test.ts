import assert from 'node:assert/strict';
import test from 'node:test';
import { h3MaxCustomerCents } from './helpers/minimax-h3-max-customer-price';

import { MINIMAX_H3_MAX_ENGINE } from '../frontend/src/config/fal-engines/minimax-h3-max';
import {
  calculateMinimaxH3MaxOfficialCost,
  calculateMinimaxH3MaxProviderCost,
  calculateMinimaxH3MaxProviderCostCents,
  MINIMAX_H3_MAX_OFFICIAL_PRICING_SOURCE,
} from '../frontend/src/lib/minimax-h3-max-pricing';
import { computeCanonicalPublicSnapshot } from '../frontend/server/pricing/quote-public';
import type { PricingContext } from '../frontend/src/lib/pricing-context';
import { buildBillingPricingFacts } from '../frontend/src/lib/pricing-billing-facts';
import { buildPublicPricingFacts } from '../frontend/src/lib/pricing-public-facts';

test('MiniMax H3 Max uses durable post-promotion output rates for normal modes', () => {
  assert.equal(calculateMinimaxH3MaxProviderCostCents({
    mode: 't2v', durationSec: 5, resolution: '480P',
  }), 25);
  assert.equal(calculateMinimaxH3MaxProviderCostCents({
    mode: 'i2v', durationSec: 15, resolution: '768P',
  }), 120);
});

test('MiniMax H3 Max reference pricing includes 4096 pooled tokens before charging excess tokens', () => {
  assert.equal(calculateMinimaxH3MaxProviderCostCents({
    mode: 'ref2v', durationSec: 5, resolution: '480P', verifiedReferenceTokenCount: 4_096,
  }), 25);

  const fractional = calculateMinimaxH3MaxProviderCost({
    mode: 'ref2v',
    durationSec: 5,
    resolution: '768P',
    verifiedReferenceTokenCount: 4_597,
  });
  assert.deepEqual(fractional, {
    mode: 'ref2v',
    durationSec: 5,
    resolution: '768P',
    referencePricingBasis: 'verified-provider-tokens',
    ratePerSecondUsd: 0.08,
    outputSubtotalUsd: 0.4,
    verifiedReferenceTokenCount: 4_597,
    includedReferenceTokenCount: 4_096,
    excessReferenceTokenCount: 501,
    referenceTokenSubtotalUsd: 0.01002,
    providerCostUsd: 0.41002,
    providerCostExactCents: 41.002,
    providerCostCents: 41,
  });
});

test('MiniMax H3 Max rejects fractional trusted reference-token counts', () => {
  assert.throws(() => calculateMinimaxH3MaxProviderCost({
    mode: 'ref2v',
    durationSec: 5,
    resolution: '768P',
    verifiedReferenceTokenCount: 4_096.5,
  }), /trusted reference token count/i);
});

// Keyvo runs H3-Max on MiniMax's own API: billing and public facts use the PROVISIONAL official CNY cost, not the
// Fal output + reference-token functions above (kept for the upstream catalogue and its reference budget).
test('MiniMax H3 Max billing and public facts use the same PROVISIONAL official CNY cost', () => {
  const context = {
    engine: MINIMAX_H3_MAX_ENGINE,
    durationSec: 5,
    resolution: '768P',
    mode: 'ref2v' as const,
    inputVideoDurationSec: 2.4,
    referenceImageCount: 4,
    verifiedReferenceTokenCount: 4_597,
  };
  const billing = buildBillingPricingFacts(context, MINIMAX_H3_MAX_ENGINE.pricingDetails, 'USD');
  const publicFacts = buildPublicPricingFacts(context);

  assert.equal(billing.facts.vendorSubtotalExactCents, 80.125);
  assert.equal(publicFacts.facts.vendorSubtotalExactCents, 80.125);
  assert.deepEqual(billing.addons, publicFacts.addons);
  for (const key of ['output_cny', 'input_video_seconds', 'input_video_cny', 'reference_image_count', 'paid_reference_image_count', 'reference_image_cny']) {
    assert.deepEqual(billing.meta[key], publicFacts.meta[key], key);
  }
  assert.equal(billing.meta.provider_cost_source, MINIMAX_H3_MAX_OFFICIAL_PRICING_SOURCE);
  assert.equal(billing.meta.public_provider, 'MiniMax');
  assert.equal(publicFacts.meta.public_family, 'Hailuo');
});

test('MiniMax H3 Max official cost follows the CNY list: output, reference-video seconds and images beyond two', () => {
  const cost = (input: Parameters<typeof calculateMinimaxH3MaxOfficialCost>[0]) => calculateMinimaxH3MaxOfficialCost(input);
  assert.equal(cost({ mode: 't2v', durationSec: 5, resolution: '480P' }).totalCny, 1.65);
  assert.equal(cost({ mode: 't2v', durationSec: 5, resolution: '768P' }).subtotalUsdCents, 31.25);
  assert.equal(cost({ mode: 'i2v', durationSec: 15, resolution: '768p' }).totalCny, 7.5);
  // Frames never exceed the two free images, and inputs outside reference mode are ignored.
  assert.equal(cost({ mode: 'i2v', durationSec: 5, resolution: '480P', referenceImageCount: 2, inputVideoDurationSec: 5 }).totalCny, 1.65);
  const reference = cost({ mode: 'ref2v', durationSec: 10, resolution: '480P', inputVideoDurationSec: 14.2, referenceImageCount: 9 });
  assert.deepEqual([reference.outputCny, reference.inputVideoSeconds, reference.inputVideoCny, reference.paidImageCount, reference.imageCny, reference.totalCny],
    [3.3, 15, 5.55, 7, 3.5, 12.35]);
  assert.equal(cost({ mode: 'ref2v', durationSec: 5, resolution: '768P', referenceImageCount: 2 }).imageCny, 0);
  for (const invalid of [
    { mode: 'v2v', durationSec: 5, resolution: '768P' },
    { mode: 't2v', durationSec: 4, resolution: '768P' },
    { mode: 't2v', durationSec: 5, resolution: '1080P' },
    { mode: 't2v', durationSec: 5, resolution: '2K' },
    { mode: 'ref2v', durationSec: 5, resolution: '768P', inputVideoDurationSec: 15.2 },
    { mode: 'ref2v', durationSec: 5, resolution: '768P', referenceImageCount: 10 },
  ]) assert.throws(() => cost(invalid), JSON.stringify(invalid));
});

test('MiniMax H3 Max customer quotes apply the existing margin rule to the official cost', async () => {
  const quote = async (context: Omit<PricingContext, 'engine'>) =>
    (await computeCanonicalPublicSnapshot({ engine: MINIMAX_H3_MAX_ENGINE, ...context } as PricingContext)).totalCents;
  // USD cents (the CNY build shows x8) from the exact official cost: the default 30% margin rounded up gives
  // 27/41/82/81/122/105 (5 s 480P CNY 2.16, 5 s 768P CNY 3.28); the 2026-11-13 official-list rule gives 80% of list.
  assert.deepEqual(await Promise.all([
    quote({ mode: 't2v', durationSec: 5, resolution: '480P' }),
    quote({ mode: 't2v', durationSec: 5, resolution: '768P' }),
    quote({ mode: 'i2v', durationSec: 10, resolution: '768P' }),
    quote({ mode: 't2v', durationSec: 15, resolution: '480P' }),
    quote({ mode: 't2v', durationSec: 15, resolution: '768P' }),
    quote({ mode: 'ref2v', durationSec: 5, resolution: '768P', inputVideoDurationSec: 2.4, referenceImageCount: 4 }),
  ]), [20.625, 31.25, 62.5, 61.875, 93.75, 80.125].map(h3MaxCustomerCents));
});
