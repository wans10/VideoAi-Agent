import assert from 'node:assert/strict';
import test from 'node:test';

import { listFalEngines } from '../frontend/src/config/falEngines.ts';
import {
  expectedBytePlusTokens,
  getBytePlusUnitPriceUsdPer1kTokens,
} from '../frontend/server/byteplus-accounting';
import { computeCanonicalPublicSnapshot as computePricingSnapshot } from '../frontend/server/pricing/quote-public.ts';
import { buildPublicPricingFacts } from '../frontend/src/lib/pricing-public-facts.ts';
import {
  projectPublicPricingSnapshot,
  quotePublicPricing,
} from '../frontend/src/lib/pricing-public-quote.ts';
import { computeSeedance2TokenQuote, isSeedance2TokenPricing } from '../frontend/src/lib/seedance-2-pricing.ts';
import { reviewedLasPricingState } from './helpers/seedance-las-pricing-fixture';

function getEngine(engineId: string) {
  const engine = listFalEngines().find((entry) => entry.id === engineId)?.engine;
  assert.ok(engine, `Missing engine ${engineId}`);
  return engine;
}

function getEngineEntry(engineId: string) {
  const entry = listFalEngines().find((candidate) => candidate.id === engineId);
  assert.ok(entry, `Missing engine entry ${engineId}`);
  return entry;
}

// Keyvo 2026-11-13: Seedance supplier facts are the Volcengine Ark cn-beijing list price (CNY per million tokens / 8),
// sold at 80% of it (official-list-80). These replace the former BytePlus-international x 2.5 public targets.
const ARK_SOURCE = 'volcengine_ark_cn_beijing_list_2026_11_13';
const arkUsdPer1k = (cnyPerMillion: number) => cnyPerMillion / 8 / 1000;
const basisUsd = (tokens: number, cnyPerMillion: number) => Number((tokens * arkUsdPer1k(cnyPerMillion) / 1000 + 1e-9).toFixed(6));

test('Seedance 2.5 uses its own factual ModelArk input rates', () => {
  assert.equal(
    getBytePlusUnitPriceUsdPer1kTokens('seedance-2-5', 'no_video_input', '480p'),
    0.0107
  );
  assert.equal(
    getBytePlusUnitPriceUsdPer1kTokens('seedance-2-5', 'video_input', '720p'),
    0.0064
  );
});

test('BytePlus list-cost rates distinguish 1080p and video input', () => {
  assert.equal(getBytePlusUnitPriceUsdPer1kTokens('seedance-2-5', 'no_video_input', '1080p'), 0.0117);
  assert.equal(getBytePlusUnitPriceUsdPer1kTokens('seedance-2-5', 'video_input', '1080p'), 0.007);
  assert.equal(getBytePlusUnitPriceUsdPer1kTokens('seedance-2-0', 'no_video_input', '1080p'), 0.0077);
  assert.equal(getBytePlusUnitPriceUsdPer1kTokens('seedance-2-0', 'video_input', '1080p'), 0.0047);
  assert.equal(getBytePlusUnitPriceUsdPer1kTokens('seedance-2-0', 'video_input', '720p'), 0.0043);
  assert.equal(getBytePlusUnitPriceUsdPer1kTokens('seedance-2-0-fast', 'video_input', '720p'), 0.0033);
});

test('BytePlus pricing still fails closed for an unknown Seedance engine', () => {
  assert.throws(
    () => getBytePlusUnitPriceUsdPer1kTokens('seedance-9-9', 'no_video_input', '720p'),
    (error: unknown) =>
      error instanceof Error &&
      (error as Error & { code?: string }).code === 'BYTEPLUS_ENGINE_PROFILE_MISSING'
  );
});

test('Seedance 2.5 public quotes cover no-video and video-input generation', async () => {
  const engine = getEngine('seedance-2-5');
  const scenarios = [
    {
      id: 't2v-4s-480p-audio-off',
      mode: 't2v' as const,
      durationSec: 4,
      resolution: '480p',
      audio: false,
      hasVideoInput: false,
      expectedInputType: 'no_video_input',
    },
    {
      id: 't2v-15s-720p-audio-on',
      mode: 't2v' as const,
      durationSec: 15,
      resolution: '720p',
      audio: true,
      hasVideoInput: false,
      expectedInputType: 'no_video_input',
    },
    {
      id: 't2v-10s-1080p-audio-on',
      mode: 't2v' as const,
      durationSec: 10,
      resolution: '1080p',
      audio: true,
      hasVideoInput: false,
      expectedInputType: 'no_video_input',
    },
    {
      id: 'i2v-24s-720p-audio-off',
      mode: 'i2v' as const,
      durationSec: 24,
      resolution: '720p',
      audio: false,
      hasVideoInput: false,
      expectedInputType: 'no_video_input',
    },
    {
      id: 'extend-15s-720p-audio-on',
      mode: 'extend' as const,
      durationSec: 15,
      resolution: '720p',
      audio: true,
      hasVideoInput: true,
      expectedInputType: 'video_input',
    },
  ];
  const quotes = new Map<string, Awaited<ReturnType<typeof computePricingSnapshot>>>();

  for (const scenario of scenarios) {
    const facts = buildPublicPricingFacts({
      engine,
      mode: scenario.mode,
      durationSec: scenario.durationSec,
      resolution: scenario.resolution,
      aspectRatio: '16:9',
      hasVideoInput: scenario.hasVideoInput,
      addons: { audio: scenario.audio },
    });
    const publicQuote = quotePublicPricing({
      facts: facts.facts,
      scenario: {
        id: `public:seedance-2-5:${scenario.id}`,
        engineId: engine.id,
        mode: scenario.mode,
        resolution: scenario.resolution,
        membershipTier: 'member',
      },
      compatibilityProfileId: facts.compatibilityProfileId,
    });
    const publicSnapshot = projectPublicPricingSnapshot({
      quote: publicQuote,
      base: facts.base,
      addons: facts.addons,
      meta: facts.meta,
    });
    const snapshot = await computePricingSnapshot({
      engine,
      mode: scenario.mode,
      durationSec: scenario.durationSec,
      resolution: scenario.resolution,
      aspectRatio: '16:9',
      membershipTier: 'member',
      hasVideoInput: scenario.hasVideoInput,
      addons: { audio: scenario.audio },
    });

    assert.ok(snapshot.totalCents > 0, `${scenario.id} should have a positive customer total`);
    assert.equal(publicSnapshot.totalCents, snapshot.totalCents);
    assert.equal(snapshot.meta?.pricing_source, ARK_SOURCE, `${scenario.id} should carry the Ark list source`);
    assert.equal(
      (publicSnapshot.meta?.cost_breakdown_usd as { pricingSource?: string } | undefined)
        ?.pricingSource,
      ARK_SOURCE
    );
    assert.equal(snapshot.meta?.byteplus_billing_input_type, scenario.expectedInputType);
    assert.equal(
      (publicSnapshot.meta?.cost_breakdown_usd as { billingInputType?: string } | undefined)
        ?.billingInputType,
      scenario.expectedInputType
    );
    assert.equal(publicQuote.policyProvenance.compatibilityProfile, 'official-list-80');
    assert.deepEqual(snapshot.meta?.pricingPolicy, {
      source: 'versioned',
      matchedBy: 'global',
      sourceRuleId: 'default',
      compatibilityProfile: 'official-list-80',
    });
    quotes.set(scenario.id, snapshot);
  }

  // 4 s 480p: 38,430 tokens x CNY 70/M = 33.626 cents -> 27; 15 s 720p: 324,000 tokens -> 283.5 cents -> 227.
  assert.equal(quotes.get('t2v-4s-480p-audio-off')?.totalCents, 27);
  assert.equal(quotes.get('t2v-15s-720p-audio-on')?.totalCents, 227);
  assert.ok(
    Number(quotes.get('t2v-10s-1080p-audio-on')?.totalCents) >
      Number(quotes.get('t2v-15s-720p-audio-on')?.totalCents),
    'a 10-second 1080p render should cost more than a 15-second 720p render at the same input rate'
  );
  assert.ok(
    Number(quotes.get('extend-15s-720p-audio-on')?.totalCents) <
      Number(quotes.get('t2v-15s-720p-audio-on')?.totalCents),
    'ModelArk extension should use the lower factual video-input token rate'
  );
});

test('Seedance 2.5 Edit public snapshots use reviewed LAS input-plus-output tariffs', async () => {
  const engine = getEngine('seedance-2-5');
  const context = { engine, mode: 'v2v' as const, durationSec: 4, resolution: '480p', aspectRatio: '16:9',
    hasVideoInput: true, inputVideoDurationSec: 4 };
  const state = reviewedLasPricingState(context);
  const snapshot = await computePricingSnapshot(context, {
    pricingPolicy: { loadOverrides: async () => ({ status: 'loaded', rules: [] }) },
    loadCustomerTariffState: async () => state,
  });
  assert.equal(snapshot.totalCents,247);
  assert.equal(snapshot.meta?.pricingMode,'manual_tariff');
  assert.equal(snapshot.meta?.providerCostListUsd,.984144);
  assert.equal(snapshot.meta?.providerCostSource,'BytePlus LAS Enhanced published LIST');
});

test('Seedance 2.5 presents pricing in customer-facing language', () => {
  const entry = getEngineEntry('seedance-2-5');
  const customerCopy = [entry.engine.pricing?.notes ?? '', entry.billingNote ?? ''];

  for (const copy of customerCopy) {
    assert.match(copy, /price is calculated before generation/i);
    assert.doesNotMatch(copy, /provider costs?|internal multipliers?|markup|output usage tokens?|2\.5x/i);
  }
  assert.equal(entry.pricingHint?.label, 'Price calculated before generation');
});

test('hidden direct Fast keeps the current Fast unit rate', () => {
  assert.equal(
    getBytePlusUnitPriceUsdPer1kTokens('seedance-2-0-fast-byteplus', 'no_video_input', '720p'),
    getBytePlusUnitPriceUsdPer1kTokens('seedance-2-0-fast', 'no_video_input', '720p')
  );
});

test('BytePlus token estimation also fails closed for an unknown profile', () => {
  assert.throws(
    () =>
      expectedBytePlusTokens({
        engine_id: 'seedance-9-9',
        duration_sec: 5,
        settings_snapshot: {
          core: { resolution: '720p', aspectRatio: '16:9' },
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      (error as Error & { code?: string }).code ===
        'BYTEPLUS_ENGINE_PROFILE_MISSING'
  );
});

test('Seedance 2 token quote follows dimensions and the Ark no-video list price', () => {
  const engine = getEngine('seedance-2-0');
  assert.ok(isSeedance2TokenPricing(engine.pricingDetails));

  const quote = computeSeedance2TokenQuote({
    details: engine.pricingDetails,
    durationSec: 1,
    resolution: '720p',
    aspectRatio: '16:9',
  });

  assert.equal(quote.width, 1280);
  assert.equal(quote.height, 720);
  assert.equal(quote.frameRate, 24);
  assert.equal(quote.tokenCount, 21600);
  assert.equal(quote.legacyRetailUnitPriceUsdPer1kTokens, arkUsdPer1k(46));
  assert.equal(quote.legacyRetailBasisUsd, basisUsd(21600, 46));
  assert.equal(quote.legacyRetailBasisUsd, 0.1242);
});

test('Seedance 2 pricing snapshot sells at 80% of the Ark list price', async () => {
  const engine = getEngine('seedance-2-0');

  const snapshot = await computePricingSnapshot({
    engine,
    durationSec: 10,
    resolution: '720p',
    aspectRatio: '16:9',
    membershipTier: 'member',
  });

  // 216,000 tokens x CNY 46/M = 124.2 cents of supplier cost -> 99.36 -> 99 cents (no platform fee).
  assert.equal(snapshot.totalCents, 99);
  assert.equal(snapshot.base.amountCents, 125);
  assert.equal(snapshot.platformFeeCents, 0);
  assert.equal(snapshot.vendorShareCents, 99);
  assert.equal(snapshot.meta?.legacy_retail_basis_usd, 1.242);
  assert.equal('provider_cost_usd_estimated' in (snapshot.meta ?? {}), false);
  assert.equal('vendor_cost_usd' in (snapshot.meta ?? {}), false);
  assert.equal(snapshot.meta?.pricing_model, 'byteplus_tokens');
  assert.equal(snapshot.meta?.legacy_retail_basis_source, 'byteplus_modelark_pricing_config');
  assert.equal(snapshot.meta?.output_width, 1280);
  assert.equal(snapshot.meta?.output_height, 720);
  assert.equal(snapshot.meta?.token_count, 216000);
  assert.equal(snapshot.meta?.legacy_retail_unit_price_usd_per_1k_tokens, arkUsdPer1k(46));
});

test('Seedance 2 Fast uses the lower Ark Fast list price', async () => {
  const standard = getEngine('seedance-2-0');
  const fast = getEngine('seedance-2-0-fast');

  const standardSnapshot = await computePricingSnapshot({
    engine: standard,
    durationSec: 5,
    resolution: '720p',
    aspectRatio: '16:9',
    membershipTier: 'member',
  });
  const fastSnapshot = await computePricingSnapshot({
    engine: fast,
    durationSec: 5,
    resolution: '720p',
    aspectRatio: '16:9',
    membershipTier: 'member',
  });

  // 108,000 tokens: CNY 46/M -> 62.1 cents -> 50; Fast CNY 37/M -> 49.95 cents -> 40.
  assert.equal(standardSnapshot.totalCents, 50);
  assert.equal(fastSnapshot.totalCents, 40);
  assert.ok(fastSnapshot.totalCents < standardSnapshot.totalCents);
  assert.equal(fastSnapshot.meta?.legacy_retail_unit_price_usd_per_1k_tokens, arkUsdPer1k(37));
});

test('Seedance 2 Standard uses the Ark no-video and lower video-input list rates by resolution', async () => {
  const engine = getEngine('seedance-2-0');
  assert.ok(isSeedance2TokenPricing(engine.pricingDetails));

  const noVideoQuote = computeSeedance2TokenQuote({
    details: engine.pricingDetails,
    durationSec: 1,
    resolution: '4k',
    aspectRatio: '16:9',
    billingInputType: 'no_video_input',
  });
  const videoQuote = computeSeedance2TokenQuote({
    details: engine.pricingDetails,
    durationSec: 1,
    resolution: '4k',
    aspectRatio: '16:9',
    billingInputType: 'video_input',
  });
  const hdQuote = computeSeedance2TokenQuote({
    details: engine.pricingDetails,
    durationSec: 1,
    resolution: '1080p',
    aspectRatio: '16:9',
    billingInputType: 'no_video_input',
  });

  assert.equal(noVideoQuote.width, 3840);
  assert.equal(noVideoQuote.height, 2160);
  assert.equal(noVideoQuote.tokenCount, 194400);
  assert.equal(noVideoQuote.legacyRetailBasisUsd, basisUsd(194400, 26));
  assert.equal(videoQuote.legacyRetailBasisUsd, basisUsd(194400, 16));
  assert.equal(hdQuote.legacyRetailBasisUsd, basisUsd(48600, 51));
  assert.equal(noVideoQuote.legacyRetailUnitPriceUsdPer1kTokens, arkUsdPer1k(26));
  assert.equal(videoQuote.legacyRetailUnitPriceUsdPer1kTokens, arkUsdPer1k(16));
  assert.equal(hdQuote.legacyRetailUnitPriceUsdPer1kTokens, arkUsdPer1k(51));

  const noVideoSnapshot = await computePricingSnapshot({
    engine,
    durationSec: 1,
    resolution: '4k',
    aspectRatio: '16:9',
    membershipTier: 'member',
    hasVideoInput: false,
  });
  const videoSnapshot = await computePricingSnapshot({
    engine,
    durationSec: 1,
    resolution: '4k',
    aspectRatio: '16:9',
    membershipTier: 'member',
    hasVideoInput: true,
  });

  // 1 s 4K: 63.18 cents (CNY 26/M) -> 51; with video input 38.88 cents (CNY 16/M, no input seconds supplied) -> 31.
  assert.equal(noVideoSnapshot.totalCents, 51);
  assert.equal(noVideoSnapshot.base.amountCents, 64);
  assert.equal(noVideoSnapshot.meta?.legacy_retail_unit_price_usd_per_1k_tokens, arkUsdPer1k(26));
  assert.equal(noVideoSnapshot.meta?.output_width, 3840);
  assert.equal(noVideoSnapshot.meta?.output_height, 2160);
  assert.equal(videoSnapshot.totalCents, 31);
  assert.equal(videoSnapshot.base.amountCents, 39);
  assert.equal(videoSnapshot.meta?.legacy_retail_unit_price_usd_per_1k_tokens, arkUsdPer1k(16));
});

test('Seedance 2 Standard 4K uses BytePlus canonical dimensions for non-16:9 ratios', () => {
  const engine = getEngine('seedance-2-0');
  assert.ok(isSeedance2TokenPricing(engine.pricingDetails));

  assert.deepEqual(
    computeSeedance2TokenQuote({
      details: engine.pricingDetails,
      durationSec: 1,
      resolution: '4k',
      aspectRatio: '4:3',
      billingInputType: 'no_video_input',
    }),
    {
      aspectRatio: '4:3',
      width: 3326,
      height: 2494,
      frameRate: 24,
      tokenCount: 194415.09375,
      legacyRetailUnitPriceUsdPer1kTokens: arkUsdPer1k(26),
      legacyRetailBasisUsd: basisUsd(194415.09375, 26),
      legacyRetailBasisPerSecondUsd: basisUsd(194415.09375, 26),
      billingInputType: 'no_video_input',
      pricingSource: ARK_SOURCE,
    }
  );

  const ultrawide = computeSeedance2TokenQuote({
    details: engine.pricingDetails,
    durationSec: 1,
    resolution: '4k',
    aspectRatio: '21:9',
    billingInputType: 'video_input',
  });
  assert.equal(ultrawide.width, 4398);
  assert.equal(ultrawide.height, 1886);
  assert.equal(ultrawide.legacyRetailUnitPriceUsdPer1kTokens, arkUsdPer1k(16));
});

test('Seedance 2 Mini uses the Ark Mini list rates for no-video and video input', async () => {
  const engine = getEngine('seedance-2-0-mini');
  assert.ok(isSeedance2TokenPricing(engine.pricingDetails));

  const noVideoQuote = computeSeedance2TokenQuote({
    details: engine.pricingDetails,
    durationSec: 1,
    resolution: '720p',
    aspectRatio: '16:9',
    billingInputType: 'no_video_input',
  });
  const videoQuote = computeSeedance2TokenQuote({
    details: engine.pricingDetails,
    durationSec: 1,
    resolution: '720p',
    aspectRatio: '16:9',
    billingInputType: 'video_input',
  });

  assert.equal(noVideoQuote.tokenCount, 21600);
  assert.equal(noVideoQuote.legacyRetailBasisUsd, basisUsd(21600, 23));
  assert.equal(videoQuote.legacyRetailBasisUsd, basisUsd(21600, 14));
  assert.equal(noVideoQuote.legacyRetailUnitPriceUsdPer1kTokens, arkUsdPer1k(23));
  assert.equal(videoQuote.legacyRetailUnitPriceUsdPer1kTokens, arkUsdPer1k(14));

  const noVideoSnapshot = await computePricingSnapshot({
    engine,
    durationSec: 10,
    resolution: '720p',
    aspectRatio: '16:9',
    membershipTier: 'member',
    hasVideoInput: false,
  });
  const videoSnapshot = await computePricingSnapshot({
    engine,
    durationSec: 10,
    resolution: '720p',
    aspectRatio: '16:9',
    membershipTier: 'member',
    hasVideoInput: true,
  });

  // 10 s 720p: 62.1 cents (CNY 23/M) -> 50; with video input 37.8 cents (CNY 14/M) -> 30.
  assert.equal(noVideoSnapshot.totalCents, 50);
  assert.equal(noVideoSnapshot.base.amountCents, 63);
  assert.equal(noVideoSnapshot.meta?.byteplus_billing_input_type, 'no_video_input');
  assert.equal(noVideoSnapshot.meta?.legacy_retail_unit_price_usd_per_1k_tokens, arkUsdPer1k(23));
  assert.equal(videoSnapshot.totalCents, 30);
  assert.equal(videoSnapshot.base.amountCents, 38);
  assert.equal(videoSnapshot.meta?.byteplus_billing_input_type, 'video_input');
  assert.equal(videoSnapshot.meta?.legacy_retail_unit_price_usd_per_1k_tokens, arkUsdPer1k(14));
});

test('Seedance 2 pricing changes with aspect ratio because BytePlus pricing follows output pixels', async () => {
  const engine = getEngine('seedance-2-0');

  const landscape = await computePricingSnapshot({
    engine,
    durationSec: 5,
    resolution: '720p',
    aspectRatio: '16:9',
    membershipTier: 'member',
  });
  const square = await computePricingSnapshot({
    engine,
    durationSec: 5,
    resolution: '720p',
    aspectRatio: '1:1',
    membershipTier: 'member',
  });

  // 60,750 tokens x CNY 46/M = 34.93 cents -> 28.
  assert.equal(square.totalCents, 28);
  assert.ok(square.totalCents < landscape.totalCents);
});
