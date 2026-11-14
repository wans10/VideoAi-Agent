import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isKeyvoHiddenModel } from '../frontend/config/keyvo-model-visibility.ts';

import {
  quoteCanonicalPricing,
  validatePricingPolicyDocument,
  PricingPolicyValidationError,
  type PricingPolicyRule,
} from '../packages/pricing/src/index.ts';
import { listFalEngines } from '../frontend/src/config/falEngines';
import {
  isOfficialListPricedAudio,
  OFFICIAL_LIST_CUSTOMER_PRICE_FACTOR,
  OFFICIAL_LIST_PRICE_PROFILE_ID,
  OFFICIAL_LIST_PRICED_ENGINE_IDS,
  resolveOfficialListCompatibilityProfile,
} from '../frontend/src/lib/official-list-pricing';
import { getVersionedPricingPolicy } from '../frontend/src/lib/pricing-policy-defaults';
import { buildPublicPricingFacts } from '../frontend/src/lib/pricing-public-facts';
import { quotePublicPricing } from '../frontend/src/lib/pricing-public-quote';
import type { PricingContext } from '../frontend/src/lib/pricing-context';
import {
  computeCanonicalAudioBillingSnapshot,
  computeCanonicalBillingSnapshot,
} from '../frontend/server/pricing/quote-billing';

const registry = JSON.parse(readFileSync('frontend/config/model-registry.json', 'utf8')) as {
  models: Array<{ id: string; family: string; publication: { app: { published: boolean } } }>;
};
const visibleFamilies = new Set(JSON.parse(readFileSync('frontend/config/keyvo-visible-families.json', 'utf8')) as string[]);
// Owner allowlist (2026-11-14) offers these Google Vertex and OpenAI engines, but the repo has no official mainland CNY
// list price for them yet, so they are not in OFFICIAL_LIST_PRICED_ENGINE_IDS. Their prices stay on their existing rules
// (no price was guessed or changed here). Owner to supply the CNY list prices; then move them to the official-list set.
const PENDING_OFFICIAL_LIST_ENGINE_IDS = new Set<string>([
  'nano-banana-2-1', 'nano-banana-2', 'nano-banana-lite', 'gemini-omni-flash',
  'gpt-image-2-6-sunburst', 'gpt-image-2-6-flare', 'gpt-image-2-5-sunburst', 'gpt-image-2-5-flare',
]);

// A seeded database-wide margin (ensureBillingCoreSchema inserts `default`) must not change the official-list price.
const GLOBAL_DATABASE_MARGIN: PricingPolicyRule = {
  id: 'default', marginPercent: 0.2, marginFlatCents: 0, surchargeAudioPercent: 0.2, surchargeUpscalePercent: 0.5, currency: 'USD',
};
const pricingPolicy = {
  loadOverrides: async () => ({ status: 'loaded' as const, rules: [GLOBAL_DATABASE_MARGIN], routingRules: [] }),
  warn: () => undefined,
};

function engine(id: string) {
  const entry = listFalEngines().find((candidate) => candidate.id === id);
  assert.ok(entry, `missing engine ${id}`);
  return entry.engine;
}

async function billingTotal(context: Omit<PricingContext, 'membershipTier'>) {
  return computeCanonicalBillingSnapshot({ membershipTier: 'member', ...context } as PricingContext, { pricingPolicy });
}

test('the official-list profile is an explicit 0.8 price factor and stays a versioned-only below-cost path', () => {
  const policy = getVersionedPricingPolicy();
  const profile = policy.compatibilityProfiles.find((candidate) => candidate.id === OFFICIAL_LIST_PRICE_PROFILE_ID);
  assert.ok(profile);
  assert.equal(1 + profile.marginPercentOverride!, OFFICIAL_LIST_CUSTOMER_PRICE_FACTOR);
  assert.equal(profile.subtotalRounding, 'nearest');
  assert.equal(profile.marginFlatCentsOverride, 0);
  assert.equal(profile.surchargeAudioPercentOverride, 0);
  assert.equal(profile.surchargeUpscalePercentOverride, 0);
  assert.equal(profile.minimumSubtotalCents, 1);
  // The global default rule keeps the 30% margin for every model that is not re-priced.
  assert.equal(policy.rules.find((rule) => rule.id === 'default')?.marginPercent, 0.3);

  const base = { version: 1, supportedCurrencies: ['USD'], rules: [{ ...GLOBAL_DATABASE_MARGIN, marginPercent: 0.3 }] };
  const negative = { id: 'p', vendorSubtotalRounding: 'preserve', marginRounding: 'nearest', surchargeRounding: 'nearest',
    discountRounding: 'nearest', totalRounding: 'nearest', marginPercentOverride: -0.2 };
  for (const invalid of [
    negative, // no subtotal rounding: the clamped margin would silently sell at cost
    { ...negative, subtotalRounding: 'nearest' }, // a flat override must be explicit zero
    { ...negative, subtotalRounding: 'nearest', marginFlatCentsOverride: 0, marginPercentOverride: -1 },
  ]) {
    assert.throws(() => validatePricingPolicyDocument({ ...base, compatibilityProfiles: [invalid] }), PricingPolicyValidationError);
  }
  assert.doesNotThrow(() => validatePricingPolicyDocument({ ...base,
    compatibilityProfiles: [{ ...negative, subtotalRounding: 'nearest', marginFlatCentsOverride: 0 }] }));
  // Rules (including database overrides validated by the same function) can never carry a negative margin.
  assert.throws(() => validatePricingPolicyDocument({ ...base, compatibilityProfiles: [],
    rules: [{ ...GLOBAL_DATABASE_MARGIN, marginPercent: -0.2 }] }), PricingPolicyValidationError);
});

test('the canonical kernel quotes round(0.8 x official cost) with the true vendor cost and no platform fee', () => {
  const policy = getVersionedPricingPolicy();
  const profile = policy.compatibilityProfiles.find((candidate) => candidate.id === OFFICIAL_LIST_PRICE_PROFILE_ID)!;
  const quote = quoteCanonicalPricing({
    // Wan 3 Prime 480P, 5 s: CNY 0.45/s -> 5.625 US cents/s -> 28.125 cents.
    facts: { engineId: 'wan-3-prime', currency: 'USD', vendorSubtotalExactCents: 28.125, unit: 'sec', quantity: 5 },
    scenario: { id: 'official', engineId: 'wan-3-prime', membershipTier: 'member', discountPercent: 0 },
    policy: { rule: { ...GLOBAL_DATABASE_MARGIN, marginPercent: 0.3 }, source: 'versioned', matchedBy: 'global', sourceRuleId: 'default' },
    compatibilityProfile: profile,
  });
  assert.equal(quote.vendorSubtotalCents, 28);
  assert.equal(quote.customerTotalCents, 23); // 22.5 rounded half up; CNY 1.84 against the ideal 1.80
  assert.equal(quote.marginCents, 0);
  assert.equal(quote.platformFeeCents, 0);
  assert.equal(quote.vendorShareCents, 23);
  assert.equal(quote.breakdown.marginPercent, -0.2);
  assert.equal(quote.breakdown.vendorSubtotalExactCents, 28.125);
});

test('every Keyvo-visible app model is priced by the official-list rule', () => {
  // Keyvo-visible = app-published and on the owner allowlist (keyvo-model-allowlist.json), not merely in a visible family.
  const visible = registry.models.filter((model) => model.publication.app.published && visibleFamilies.has(model.family)
    && !isKeyvoHiddenModel(model.id)).map((model) => model.id);
  for (const id of visible) {
    assert.ok(OFFICIAL_LIST_PRICED_ENGINE_IDS.has(id) || PENDING_OFFICIAL_LIST_ENGINE_IDS.has(id), `${id} lacks an official-list price`);
  }
  // Priced by the official-list rule but not offered (owner allowlist 2026-11-14). Their price rule stays so that a
  // future decision can offer them again without a price change; an id drifting between the two sets fails here.
  const PRICED_NOT_OFFERED = [
    'minimax-hailuo-02-text', 'minimax-hailuo-2-3', 'minimax-hailuo-2-3-fast',
    'seedance-2-0', 'seedance-2-0-fast', 'seedance-2-0-mini',
  ];
  for (const id of OFFICIAL_LIST_PRICED_ENGINE_IDS) {
    if (PRICED_NOT_OFFERED.includes(id)) assert.equal(visible.includes(id), false, `${id} is offered but listed as not offered`);
    else assert.ok(visible.includes(id), `${id} is official-list priced but not a Keyvo app model`);
  }
  // Retired models without a mainland route are not sold.
  for (const id of ['wan-2-6', 'kling-2-5-turbo', 'kling-2-6-pro']) assert.equal(visible.includes(id), false, id);
  // Only supplier-fact rounding profiles are replaced; authored offers, fixed products and audio keep theirs.
  assert.equal(resolveOfficialListCompatibilityProfile('wan-3', 'public-rounded-vendor-current'), OFFICIAL_LIST_PRICE_PROFILE_ID);
  assert.equal(resolveOfficialListCompatibilityProfile('seedance-2-0', 'provider-reference-current'), OFFICIAL_LIST_PRICE_PROFILE_ID);
  assert.equal(resolveOfficialListCompatibilityProfile('wan-3', 'schema-current'), 'schema-current');
  assert.equal(resolveOfficialListCompatibilityProfile('veo-3-1', 'standard'), 'standard');
  assert.equal(isOfficialListPricedAudio({ pack: 'voice_only', voiceModel: 'minimax' }), true);
  assert.equal(isOfficialListPricedAudio({ pack: 'voice_only', voiceModel: 'eleven-v4' }), false);
  assert.equal(isOfficialListPricedAudio({ pack: 'music_only' }), false);
});

test('billing quotes 80% of the official list price despite a database-wide margin', async () => {
  const cases: Array<[Omit<PricingContext, 'membershipTier'>, number]> = [
    // Wan 3 480P 5 s: CNY 0.3/s -> 18.75 cents -> 15 cents (CNY 1.20 = 0.24 x 5).
    [{ engine: engine('wan-3'), mode: 't2v', durationSec: 5, resolution: '480p' }, 15],
    // Wan 3 720P 5 s with a verified 10 s input video: 15 billable s x 7.5 = 112.5 -> 90 cents (CNY 7.20).
    [{ engine: engine('wan-3'), mode: 'ref2v', durationSec: 5, resolution: '720p', hasVideoInput: true, inputVideoDurationSec: 10 }, 90],
    // Kling 3 Standard 5 s audio on: CNY 0.9/s -> 56.25 -> 45 cents (CNY 3.60).
    [{ engine: engine('kling-3-standard'), mode: 't2v', durationSec: 5, resolution: '720p' }, 45],
    // Kling 3 Standard 5 s audio off: CNY 0.6/s -> 37.5 -> 30 cents (CNY 2.40).
    [{ engine: engine('kling-3-standard'), mode: 't2v', durationSec: 5, resolution: '720p', addons: { audio_off: true } }, 30],
    // Kling 3 Turbo Pro 5 s: CNY 1.0/s -> 62.5 -> 50 cents (CNY 4.00).
    [{ engine: engine('kling-3-turbo-pro'), mode: 't2v', durationSec: 5, resolution: '1080p' }, 50],
    // Hailuo 02 768P 6 s: CNY 2.00 per clip -> 25 -> 20 cents (CNY 1.60).
    [{ engine: engine('minimax-hailuo-02-text'), mode: 't2v', durationSec: 6, resolution: '768P' }, 20],
    // Seedream 5.0 Pro 2K image: CNY 0.60 -> 7.5 -> 6 cents (CNY 0.48).
    [{ engine: engine('seedream-5-0-pro'), mode: 't2i', durationSec: 1, resolution: '2K' }, 6],
  ];
  for (const [context, cents] of cases) {
    const snapshot = await billingTotal(context);
    assert.equal(snapshot.totalCents, cents, `${context.engine.id} ${context.resolution}`);
    assert.equal(snapshot.platformFeeCents, 0, context.engine.id);
    assert.equal(snapshot.vendorShareCents, cents, context.engine.id);
    assert.equal((snapshot.meta?.pricingPolicy as { compatibilityProfile?: string }).compatibilityProfile, OFFICIAL_LIST_PRICE_PROFILE_ID);
  }
});

test('an engine-specific database rule from the admin editor returns the engine to the margin path', async () => {
  const engineRule: PricingPolicyRule = { ...GLOBAL_DATABASE_MARGIN, id: 'rule-wan-3', engineId: 'wan-3', marginPercent: 0.3 };
  const snapshot = await computeCanonicalBillingSnapshot({ engine: engine('wan-3'), mode: 't2v', durationSec: 5, resolution: '480p',
    membershipTier: 'member' } as PricingContext, { pricingPolicy: {
    loadOverrides: async () => ({ status: 'loaded' as const, rules: [GLOBAL_DATABASE_MARGIN, engineRule], routingRules: [] }),
    warn: () => undefined } });
  // 18.75 cents official cost + ceil(30% = 5.625) = 24.75 -> 25 cents, standard profile.
  assert.equal(snapshot.totalCents, 25);
  assert.notEqual((snapshot.meta?.pricingPolicy as { compatibilityProfile?: string }).compatibilityProfile, OFFICIAL_LIST_PRICE_PROFILE_ID);
});

test('Kling 4.0 and 4.0 Flash quote on the rule path without an active customer tariff', async () => {
  const inactive = async () => ({ status: 'loaded' as const, active: false, revision: 0, databaseCells: [], versionedCells: [] });
  // Kling 4.0 720P 5 s without video: CNY 1.0/s -> 62.5 -> 50 cents (CNY 4.00).
  const v4 = await computeCanonicalBillingSnapshot({ engine: engine('kling-v4'), mode: 't2v', durationSec: 5, resolution: '720p',
    membershipTier: 'member' } as PricingContext, { pricingPolicy, loadCustomerTariffQuoteState: inactive as never });
  assert.equal(v4.totalCents, 50);
  // Kling 4.0 1080P ref2v, 5 s output + 4 s video: billed 2 x 5 = 10 s at CNY 0.9 -> 112.5 -> 90 cents (CNY 7.20).
  const v4Video = await billingTotal({ engine: engine('kling-v4'), mode: 'ref2v', durationSec: 5, resolution: '1080p',
    hasVideoInput: true, inputVideoDurationSec: 4 });
  assert.equal(v4Video.totalCents, 90);
  // Kling 4.0 Flash 720P 5 s: CNY 0.6/s -> 37.5 -> 30 cents (CNY 2.40).
  const flash = await billingTotal({ engine: engine('kling-v4-flash'), mode: 't2v', durationSec: 5, resolution: '720p' });
  assert.equal(flash.totalCents, 30);
});

test('MiniMax-H3 bills reference-video seconds and images beyond five at 80% of the list price', async () => {
  // 768P 5 s output (31.25) + 7 started input-video seconds (43.75) + 2 extra images (5) = 80 cents -> 64 (CNY 5.12).
  const snapshot = await billingTotal({ engine: engine('minimax-h3'), mode: 'ref2v', durationSec: 5, resolution: '768P',
    referenceImageCount: 7, hasVideoInput: true, inputVideoDurationSec: 6.2 });
  assert.equal(snapshot.totalCents, 64);
  assert.deepEqual(snapshot.addons, [
    { type: 'reference_images_above_five', amountCents: 5 },
    { type: 'reference_video_seconds', amountCents: 43.75 },
  ]);
  const publicFacts = buildPublicPricingFacts({ engine: engine('minimax-h3'), mode: 'ref2v', durationSec: 5, resolution: '768P',
    referenceImageCount: 7, inputVideoDurationSec: 6.2 });
  assert.equal(publicFacts.facts.vendorSubtotalExactCents, 80);
  assert.equal(quotePublicPricing({ facts: publicFacts.facts, compatibilityProfileId: publicFacts.compatibilityProfileId,
    scenario: { id: 'h3', engineId: 'minimax-h3', resolution: '768P' } }).customerTotalCents, 64);
});

test('MiniMax-H3-Max is priced at 80% of MiniMax\'s list, including reference video and images beyond two', async () => {
  // 768P 5 s (CNY 2.50) + 3 started video seconds x 0.97 (2.91) + 2 paid images x 0.50 (1.00) = CNY 6.41
  // = 80.125 cents -> 64.1 -> 64 cents (CNY 5.12; ideal 0.8 x 6.41 = 5.128).
  const snapshot = await billingTotal({ engine: engine('minimax-h3-max'), mode: 'ref2v', durationSec: 5, resolution: '768P',
    referenceImageCount: 4, hasVideoInput: true, inputVideoDurationSec: 2.4 });
  assert.equal(snapshot.totalCents, 64);
  // 480P 5 s: CNY 1.65 = 20.625 cents -> 16.5 -> 17 cents (CNY 1.36; ideal 1.32).
  assert.equal((await billingTotal({ engine: engine('minimax-h3-max'), mode: 't2v', durationSec: 5, resolution: '480P' })).totalCents, 17);
});

test('mainland voice over is priced at 80% of the official list price', async () => {
  // speech-2.8-hd, 1,000 CJK characters = 2,000 billing characters x CNY 3.50 / 10k = CNY 0.70 -> 8.75 -> 7 cents.
  const minimax = await computeCanonicalAudioBillingSnapshot({ pack: 'voice_only', voiceModel: 'minimax',
    minimaxSpeechModel: 'speech-2.8-hd', durationSec: 60, script: '语'.repeat(1000) }, { pricingPolicy });
  assert.equal(minimax.totalCents, 7);
  // Seed Audio 1.0, 60 s at CNY 1.00/min -> 12.5 -> 10 cents (CNY 0.80).
  const seed = await computeCanonicalAudioBillingSnapshot({ pack: 'voice_only', voiceModel: 'seed', durationSec: 60,
    script: 'A short line.' }, { pricingPolicy });
  assert.equal(seed.totalCents, 10);
  // A tiny script (one Latin character = CNY 0.00035) never rounds a sale to zero: the profile floors at 1 cent.
  const tiny = await computeCanonicalAudioBillingSnapshot({ pack: 'voice_only', voiceModel: 'minimax', durationSec: 3, script: 'a' },
    { pricingPolicy });
  assert.equal(tiny.totalCents, 1);
});
