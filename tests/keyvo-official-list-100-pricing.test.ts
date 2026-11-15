import './helpers/keyvo-unfiltered-catalog';
import assert from 'node:assert/strict';
import test from 'node:test';
import policyDocument from '../frontend/config/pricing-policy.json' with { type: 'json' };
import { getFalEngineById, listFalEngines } from '../frontend/src/config/falEngines';
import type { PricingPolicyRule } from '../packages/pricing/src/index.ts';
import type { PricingContext } from '../frontend/src/lib/pricing-context';
import { computeCanonicalBillingSnapshot } from '../frontend/server/pricing/quote-billing';
import { computeCanonicalPublicSnapshot } from '../frontend/server/pricing/quote-public';
import { buildPublicPricingFacts } from '../frontend/src/lib/pricing-public-facts';
import { quotePublicPricing } from '../frontend/src/lib/pricing-public-quote';
import {
  isOfficialList100PricedEngine,
  OFFICIAL_LIST_100_PRICE_PROFILE_ID,
  OFFICIAL_LIST_100_PRICED_ENGINE_IDS,
  OFFICIAL_LIST_PRICE_PROFILE_ID,
  resolveOfficialListCompatibilityProfile,
} from '../frontend/src/lib/official-list-pricing.ts';
import { calculateNano21ListImageComponents } from '../frontend/src/lib/nano-banana-2-1-pricing.ts';

// Owner decision 2026-11-14: Google Nano Banana engines sell at 100% of the official USD list (aistudio.google.com/docs/pricing,
// read 2026-11-14), converted at 8 CNY/USD. No discount, no margin.
test('official-list-100 is a zero-margin copy of official-list-80 and is selected only for the Nano Banana and the admin-tier Veo / Omni / GPT Image 2.5 engines', () => {
  const profiles = policyDocument.compatibilityProfiles as Array<Record<string, unknown>>;
  const list80 = profiles.find((profile) => profile.id === OFFICIAL_LIST_PRICE_PROFILE_ID)!;
  const list100 = profiles.find((profile) => profile.id === OFFICIAL_LIST_100_PRICE_PROFILE_ID)!;
  assert.ok(list100, 'official-list-100 must be a versioned compatibility profile');
  assert.equal(list100.marginPercentOverride, 0);
  assert.equal(list100.marginFlatCentsOverride, 0);
  assert.equal(list100.subtotalRounding, list80.subtotalRounding);
  assert.deepEqual([...OFFICIAL_LIST_100_PRICED_ENGINE_IDS].sort(), [
    'gemini-omni-flash', 'gpt-image-2-5-flare', 'gpt-image-2-5-sunburst', 'nano-banana-2', 'nano-banana-2-1', 'nano-banana-lite',
    'veo-3-1', 'veo-3-1-fast', 'veo-3-1-lite',
  ]);
  for (const engineId of OFFICIAL_LIST_100_PRICED_ENGINE_IDS) {
    assert.equal(isOfficialList100PricedEngine(engineId), true, engineId);
    assert.equal(resolveOfficialListCompatibilityProfile(engineId, 'provider-reference-current'), OFFICIAL_LIST_100_PRICE_PROFILE_ID, engineId);
    assert.equal(resolveOfficialListCompatibilityProfile(engineId, 'standard'), OFFICIAL_LIST_100_PRICE_PROFILE_ID, engineId);
  }
  // The database policy editor keeps its explicit engine rule for these engines too.
  assert.equal(resolveOfficialListCompatibilityProfile('nano-banana-2', 'standard', { source: 'database', matchedBy: 'engine' }), 'standard');
  // Other official-list engines keep the 80 profile, and the 100 engines never fall back to it.
  assert.equal(resolveOfficialListCompatibilityProfile('wan-3', 'standard'), OFFICIAL_LIST_PRICE_PROFILE_ID);
  // GPT Image 2.6 stays out of both sets: its supplier facts are output-token only (see keyvo-upstream-deviations.md).
  assert.equal(resolveOfficialListCompatibilityProfile('gpt-image-2-6-flare', 'standard'), 'standard');
  assert.equal(resolveOfficialListCompatibilityProfile('gpt-image-2-6-sunburst', 'standard'), 'standard');
});

test('Nano Banana supplier facts equal the official USD list per size (Google AI Studio, read 2026-11-14)', () => {
  const nano2 = getFalEngineById('nano-banana-2')!.engine;
  assert.deepEqual(nano2.pricing?.byResolution, { '0.5k': 0.045, '1k': 0.067, '2k': 0.101, '4k': 0.151 });
  assert.deepEqual(nano2.pricingDetails?.flatCents?.byResolution, { '0.5k': 4.5, '1k': 6.7, '2k': 10.1, '4k': 15.1 });
  const lite = getFalEngineById('nano-banana-lite')!.engine;
  assert.deepEqual(lite.pricing?.byResolution, { '1k': 0.0336 });
  assert.deepEqual(lite.pricingDetails?.flatCents?.byResolution, { '1k': 3.36 });
});

test('Nano Banana 2.1 partial list uses the official per-size output price plus reference input tokens', () => {
  const at = (resolution: string, referenceImageCount = 0) => calculateNano21ListImageComponents({
    resolution, durationSec: 1, mode: referenceImageCount ? 'i2i' : 't2i', referenceImageCount,
  }, 'USD').partialListUsd;
  assert.equal(at('1k'), 0.0336);
  assert.equal(at('2k'), 0.0504);
  assert.equal(at('4k'), 0.113);
  // One reference image = 1,120 input image tokens at $1.50 per million.
  assert.ok(Math.abs(at('1k', 1) - (0.0336 + 0.00168)) < 1e-12);
});

// Owner decision 2026-11-15: Veo 3.1 / Fast / Lite, Gemini Omni Flash 1.2 and GPT Image 2.5 sell at the repo's existing provider USD
// cost facts x 8 CNY/USD, no margin, no discount. The facts are not verified against Google / OpenAI official list pages.
const DEFAULT_MARGIN: PricingPolicyRule = {
  id: 'default', marginPercent: 0.2, marginFlatCents: 0, surchargeAudioPercent: 0.2, surchargeUpscalePercent: 0.5, currency: 'USD',
};
const pricingPolicy = {
  loadOverrides: async () => ({ status: 'loaded' as const, rules: [DEFAULT_MARGIN], routingRules: [] }),
  warn: () => undefined,
};
const engineOf = (id: string) => listFalEngines().find((entry) => entry.id === id)!.engine;

test('admin-tier Veo, Omni and GPT Image 2.5 bill the provider USD facts x 8 with no margin (exact amounts)', async () => {
  const cases: Array<[Omit<PricingContext, 'membershipTier'>, number]> = [
    // Veo 3.1: $0.40/s with audio at 720p/1080p, $0.60/s at 4K, audio off is $0.20/s cheaper (cents, CNY = cents x 8 / 100).
    [{ engine: engineOf('veo-3-1'), mode: 't2v', durationSec: 4, resolution: '720p' }, 160], // CNY 12.80
    [{ engine: engineOf('veo-3-1'), mode: 't2v', durationSec: 4, resolution: '720p', addons: { audio_off: true } }, 80], // CNY 6.40
    [{ engine: engineOf('veo-3-1'), mode: 't2v', durationSec: 8, resolution: '1080p' }, 320], // CNY 25.60
    [{ engine: engineOf('veo-3-1'), mode: 't2v', durationSec: 6, resolution: '4k' }, 360], // CNY 28.80
    // Veo 3.1 Fast: $0.10/s 720p, $0.12/s 1080p, $0.30/s 4K; audio off -2 / -2 / -5 cents per second.
    [{ engine: engineOf('veo-3-1-fast'), mode: 't2v', durationSec: 4, resolution: '720p' }, 40], // CNY 3.20
    [{ engine: engineOf('veo-3-1-fast'), mode: 't2v', durationSec: 8, resolution: '1080p' }, 96], // CNY 7.68
    [{ engine: engineOf('veo-3-1-fast'), mode: 't2v', durationSec: 4, resolution: '4k', addons: { audio_off: true } }, 100], // CNY 8.00
    // Veo 3.1 Lite: $0.05/s 720p, $0.08/s 1080p; audio off -2 / -3 cents per second.
    [{ engine: engineOf('veo-3-1-lite'), mode: 't2v', durationSec: 4, resolution: '720p' }, 20], // CNY 1.60
    [{ engine: engineOf('veo-3-1-lite'), mode: 't2v', durationSec: 8, resolution: '1080p', addons: { audio_off: true } }, 40], // CNY 3.20
    // Gemini Omni Flash 1.2: output tokens per second x $12 per million (plus input tokens for references).
    [{ engine: engineOf('gemini-omni-flash'), mode: 't2v', durationSec: 4, resolution: '360p' }, 9], // 9.27 cents, CNY 0.72
    [{ engine: engineOf('gemini-omni-flash'), mode: 't2v', durationSec: 4, resolution: '720p' }, 28], // 27.80 cents, CNY 2.24
    [{ engine: engineOf('gemini-omni-flash'), mode: 't2v', durationSec: 6, resolution: '1080p' }, 63], // 62.55 cents, CNY 5.04
    // GPT Image 2.5 (default quality high): output total rounded once.
    [{ engine: engineOf('gpt-image-2-5-flare'), mode: 't2i', durationSec: 1, resolution: '1024x768' }, 4], // CNY 0.32
    [{ engine: engineOf('gpt-image-2-5-flare'), mode: 't2i', durationSec: 4, resolution: '1024x768' }, 14], // CNY 1.12
    [{ engine: engineOf('gpt-image-2-5-sunburst'), mode: 't2i', durationSec: 1, resolution: '3840x2160' }, 10], // CNY 0.80
  ];
  for (const [context, cents] of cases) {
    const label = `${context.engine.id} ${context.mode} ${context.durationSec} ${context.resolution} ${JSON.stringify(context.addons ?? {})}`;
    const snapshot = await computeCanonicalBillingSnapshot({ membershipTier: 'member', ...context } as PricingContext, { pricingPolicy });
    assert.equal(snapshot.totalCents, cents, label);
    assert.equal(snapshot.margin.amountCents, 0, `${label} margin`);
    assert.equal(snapshot.platformFeeCents, 0, label);
    assert.equal(snapshot.vendorShareCents, cents, label);
    assert.equal((snapshot.meta?.pricingPolicy as { compatibilityProfile?: string }).compatibilityProfile, OFFICIAL_LIST_100_PRICE_PROFILE_ID, label);
    // The public estimate path charges exactly what billing charges.
    const publicSnapshot = await computeCanonicalPublicSnapshot({ membershipTier: 'member', ...context } as PricingContext, { pricingPolicy });
    assert.equal(publicSnapshot.totalCents, snapshot.totalCents, `${label} public`);
  }
});

test('Veo i2v and operations keep their reviewed tariff gate and GPT Image 2.6 stays gated', async () => {
  // Not expressible by the margin-free profile: the operation/i2v tariff requirements are unchanged and not weakened.
  const inactive = async () => ({ status: 'loaded' as const, active: false, revision: 0, databaseCells: [], versionedCells: [] });
  const dependencies = { pricingPolicy, loadCustomerTariffQuoteState: inactive as never };
  await assert.rejects(computeCanonicalBillingSnapshot({ engine: engineOf('veo-3-1'), mode: 'i2v', durationSec: 4, resolution: '720p',
    membershipTier: 'member' } as PricingContext, dependencies), /video operation tariff/);
  await assert.rejects(computeCanonicalBillingSnapshot({ engine: engineOf('gpt-image-2-6-flare'), mode: 't2i', durationSec: 1,
    resolution: '1024x1024', membershipTier: 'member' } as PricingContext, dependencies), /GPT Image 2\.6 customer tariff/);
});

test('pricing hub style public quotes equal the billed total for GPT Image 2.5 and Veo', async () => {
  const hubTotal = (engineId: string, input: { resolution: string; quantity: number; quality: string }) => {
    const engine = engineOf(engineId);
    const facts = buildPublicPricingFacts({ engine, durationSec: input.quantity, resolution: input.resolution, quality: input.quality,
      mode: 't2i', referenceImageCount: 0, useFlatImageUnitFacts: true });
    return quotePublicPricing({ facts: facts.facts, scenario: { id: `hub:${engineId}`, engineId, mode: 't2i', resolution: input.resolution,
      membershipTier: 'member' }, compatibilityProfileId: 'public-rounded-vendor-current' }).customerTotalCents;
  };
  for (const engineId of ['gpt-image-2-5-flare', 'gpt-image-2-5-sunburst']) {
    for (const quantity of [1, 4]) {
      const billed = await computeCanonicalBillingSnapshot({ engine: engineOf(engineId), mode: 't2i', durationSec: quantity,
        resolution: '1024x768', quality: 'medium', membershipTier: 'member' } as PricingContext, { pricingPolicy });
      assert.equal(hubTotal(engineId, { resolution: '1024x768', quantity, quality: 'medium' }), billed.totalCents, `${engineId} x${quantity}`);
    }
  }
});
