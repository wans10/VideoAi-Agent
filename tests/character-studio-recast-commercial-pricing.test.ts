import assert from 'node:assert/strict';
import test from 'node:test';
import type { PricingPolicyRule } from '@maxvideoai/pricing';
import { getFalEngineById } from '../frontend/src/config/falEngines';
import type { PricingContext } from '../frontend/src/lib/pricing-context';
import { computeCanonicalBillingSnapshot } from '../frontend/server/pricing/quote-billing';
import { computeCanonicalRecastBillingSnapshot } from '../frontend/server/pricing/quote-recast';
import type { ResolveServerPricingPolicyDependencies } from '../frontend/server/pricing/resolve-pricing-policy';
import { readRecastPublicPrice } from '../frontend/server/character-studio/recast-public-price';

const productRule: PricingPolicyRule = {
  id: 'reviewed-recast-rule', engineId: 'character-recast', mode: 'recast', resolution: 'video',
  // Keyvo 2026-11-13 owner decision: Recast = 2 x the ordinary Wan 3 Prime customer price (80% of the official list),
  // i.e. the scoped coefficient x1.6 (was x2 = 2 x list).
  marginPercent: 0.6, marginFlatCents: 0, surchargeAudioPercent: 0, surchargeUpscalePercent: 0,
  currency: 'USD', compatibilityProfile: 'standard',
};
const noTariff = async () => ({ status: 'loaded' as const, active: false, revision: 0, databaseCells: [], versionedCells: [] });
const modelRule: PricingPolicyRule = {
  id: 'unrelated-model-rule', engineId: 'wan-3-prime', marginPercent: 4,
  marginFlatCents: 55, surchargeAudioPercent: 0.9, surchargeUpscalePercent: 0.9, currency: 'USD',
};
const pricingPolicy = (rules: PricingPolicyRule[] = [productRule, modelRule]): ResolveServerPricingPolicyDependencies => ({
  loadOverrides: async () => ({ status: 'loaded', rules, routingRules: [{ ...modelRule, vendorAccountId: 'acct_existing_wan_vendor' }] }),
});
function context(changes: Partial<PricingContext> = {}): PricingContext {
  return { engine: getFalEngineById('wan-3-prime')!.engine, mode: 'v2v', durationSec: 8,
    inputVideoDurationSec: 7.5, resolution: '720p', aspectRatio: '9:16', membershipTier: 'member', ...changes };
}

test('Recast applies the database product multiplier once to exact input plus output provider cost', async () => {
  // Independently authored supplier facts and expected settlement cents, including the existing two-stage rounding.
  // Keyvo 2026-11-13: Wan 3 Prime facts are the Bailian list (CNY 0.45 / 0.9 / 1.8 per second = 5.625 / 11.25 / 22.5
  // cents). Recast x1.6 rounds once to even cents = exactly 2 x the ordinary customer price round(0.8 x list)
  // (former x2 / standard rounding: 23, 90, 175, 175, 176, 349, 698, 1350).
  for (const [resolution, output, source, providerCents, customerCents] of [
    ['480p', 2, 0, 11.25, 18],
    ['480p', 8, 0, 45, 72],
    ['480p', 8, 7.5, 87.188, 140],
    ['480p', 8, 7.501, 87.193, 140],
    ['480p', 8, 7.6, 87.75, 140],
    ['720p', 8, 7.5, 174.375, 280],
    ['1080p', 8, 7.5, 348.75, 558],
    ['1080p', 15, 15, 675, 1080],
  ] as const) {
    const quote = await computeCanonicalRecastBillingSnapshot(context({ resolution, durationSec: output,
      inputVideoDurationSec: source, mode: source ? 'v2v' : 'i2v' }), { pricingPolicy: pricingPolicy() });
    assert.equal(quote.totalCents, customerCents, `${resolution}/${source}+${output}s`);
    // Owner rule: exactly twice the ordinary Wan 3 Prime customer quote for the same inputs (no model DB rule).
    const ordinary = await computeCanonicalBillingSnapshot(context({ resolution, durationSec: output,
      inputVideoDurationSec: source, mode: source ? 'v2v' : 'i2v' }), { pricingPolicy: pricingPolicy([productRule]),
      loadCustomerTariffState: noTariff });
    assert.equal(ordinary.meta?.pricingPolicy && (ordinary.meta.pricingPolicy as { compatibilityProfile?: string }).compatibilityProfile,
      'official-list-80');
    assert.equal(quote.totalCents, 2 * ordinary.totalCents, `2 x video ${resolution}/${source}+${output}s`);
    assert.equal(quote.currency, 'USD');
    assert.equal(quote.margin.percentApplied, 0.6);
    assert.equal(quote.margin.flatCents, 0);
    assert.equal(quote.meta?.customerProduct, 'character-recast');
    assert.equal(quote.meta?.providerCostExactCents, providerCents);
    assert.equal(quote.meta?.providerCostMultiplier, 1.6);
    assert.equal(quote.meta?.input_video_duration_sec, source);
    assert.equal(quote.meta?.output_duration_sec, output);
    assert.equal(quote.meta?.billable_duration_sec, source + output);
    assert.equal(quote.vendorAccountId, 'acct_existing_wan_vendor');
    assert.equal(quote.vendorShareCents! + quote.platformFeeCents!, customerCents);
    assert.equal(quote.meta?.customerTariffRevision, undefined);
    assert.equal(quote.margin.ruleId, productRule.id);
    assert.deepEqual(quote.meta?.pricingPolicy, { source: 'database', matchedBy: 'precise',
      sourceRuleId: productRule.id, compatibilityProfile: 'recast-even-cents' });
  }
});

test('audio references never add video seconds; no-video reference mode charges output alone', async () => {
  for (const source of [0, 7.5]) {
    const withoutAudio = await computeCanonicalRecastBillingSnapshot(context({ mode: 'ref2v', inputVideoDurationSec: source,
      inputAudioDurationSec: 0, addons: { audio: false } }), { pricingPolicy: pricingPolicy() });
    const withAudio = await computeCanonicalRecastBillingSnapshot(context({ mode: 'ref2v', inputVideoDurationSec: source,
      inputAudioDurationSec: 15, addons: { audio: true } }), { pricingPolicy: pricingPolicy() });
    assert.equal(withAudio.totalCents, source ? 280 : 144);
    assert.equal(withAudio.totalCents, withoutAudio.totalCents);
    assert.equal(withAudio.meta?.providerCostExactCents, source ? 174.375 : 90);
    assert.equal(withAudio.meta?.billable_duration_sec, source + 8);
  }
});

test('model retail policy and existing source facts remain independent from the scoped Recast rate', async () => {
  const input = context();
  const unchanged = structuredClone(input);
  const dependencies = { pricingPolicy: pricingPolicy(), loadCustomerTariffState: noTariff };
  const ordinaryBefore = await computeCanonicalBillingSnapshot(input, dependencies);
  const recast = await computeCanonicalRecastBillingSnapshot(input, { pricingPolicy: pricingPolicy() });
  const changed = await computeCanonicalRecastBillingSnapshot(input, {
    pricingPolicy: pricingPolicy([{ ...productRule, marginPercent: 1.5 }, modelRule]),
  });
  assert.equal(recast.totalCents, 280);
  // x2.5 on 174.375 supplier cents = 435.94, rounded to even cents.
  assert.equal(changed.totalCents, 436);
  assert.equal(changed.meta?.providerCostMultiplier, 2.5);
  assert.notEqual(ordinaryBefore.totalCents, recast.totalCents);
  assert.equal(ordinaryBefore.meta?.customerProduct, undefined);
  assert.deepEqual(await computeCanonicalBillingSnapshot(input, dependencies), ordinaryBefore);
  assert.deepEqual(input, unchanged);
  assert.deepEqual(recast.base, ordinaryBefore.base);
  assert.deepEqual(recast.addons, ordinaryBefore.addons);
});

test('Recast fails closed without a valid exact database product rule', async () => {
  const invalidRules: PricingPolicyRule[][] = [
    [], [modelRule],
    [{ ...productRule, mode: undefined }],
    [{ ...productRule, resolution: undefined }],
    [{ ...productRule, currency: 'EUR' }],
    [{ ...productRule, marginFlatCents: 1 }],
    [{ ...productRule, surchargeAudioPercent: 0.2 }],
    [{ ...productRule, surchargeUpscalePercent: 0.5 }],
    [{ ...productRule, compatibilityProfile: 'audio-current' }],
  ];
  for (const rules of invalidRules) {
    await assert.rejects(computeCanonicalRecastBillingSnapshot(context(), { pricingPolicy: pricingPolicy(rules) }));
  }
  await assert.rejects(computeCanonicalRecastBillingSnapshot(context(), { pricingPolicy: {
    loadOverrides: async () => ({ status: 'unavailable', rules: [], errorCode: 'pricing_rules_query_failed' }),
    warn: () => undefined,
  } }));
  await assert.rejects(computeCanonicalRecastBillingSnapshot(context({ engine: getFalEngineById('wan-3')!.engine }),
    { pricingPolicy: pricingPolicy() }));
});

test('public Recast estimates use the same scoped policy even with the retired preview proxy flag', async (t) => {
  const previous = process.env.CHARACTER_STUDIO_PREVIEW_PUBLIC_PRICING;
  process.env.CHARACTER_STUDIO_PREVIEW_PUBLIC_PRICING = '1';
  const network = t.mock.method(globalThis, 'fetch', async () => { throw new Error('A Recast estimate must not proxy model retail pricing'); });
  try {
    const input = { modelId: 'wan-3-prime', mode: 'v2v' as const, resolution: '720p',
      durationSec: 8, inputVideoDurationSec: 7.5, aspectRatio: '9:16' };
    const estimate = await readRecastPublicPrice(input, { pricingPolicy: pricingPolicy() });
    assert.equal(estimate.status, 'exact');
    if (estimate.status !== 'exact') throw new Error('Missing Recast estimate');
    assert.equal(estimate.amountCents, 280);
    const changed = await readRecastPublicPrice(input, { pricingPolicy: pricingPolicy([{ ...productRule, marginPercent: 1.5 }]) });
    assert.equal(changed.status, 'exact');
    if (changed.status !== 'exact') throw new Error('Missing changed Recast estimate');
    assert.equal(changed.amountCents, 436);
    assert.equal((await readRecastPublicPrice(input, { pricingPolicy: pricingPolicy([modelRule]) })).status, 'unavailable');
    assert.equal(network.mock.callCount(), 0);
  } finally {
    network.mock.restore();
    if (previous === undefined) delete process.env.CHARACTER_STUDIO_PREVIEW_PUBLIC_PRICING;
    else process.env.CHARACTER_STUDIO_PREVIEW_PUBLIC_PRICING = previous;
  }
});
