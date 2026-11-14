import assert from 'node:assert/strict';
import test from 'node:test';
import policyDocument from '../frontend/config/pricing-policy.json' with { type: 'json' };
import { getFalEngineById } from '../frontend/src/config/falEngines';
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
test('official-list-100 is a zero-margin copy of official-list-80 and is selected only for the three Nano Banana engines', () => {
  const profiles = policyDocument.compatibilityProfiles as Array<Record<string, unknown>>;
  const list80 = profiles.find((profile) => profile.id === OFFICIAL_LIST_PRICE_PROFILE_ID)!;
  const list100 = profiles.find((profile) => profile.id === OFFICIAL_LIST_100_PRICE_PROFILE_ID)!;
  assert.ok(list100, 'official-list-100 must be a versioned compatibility profile');
  assert.equal(list100.marginPercentOverride, 0);
  assert.equal(list100.marginFlatCentsOverride, 0);
  assert.equal(list100.subtotalRounding, list80.subtotalRounding);
  assert.deepEqual([...OFFICIAL_LIST_100_PRICED_ENGINE_IDS].sort(), ['nano-banana-2', 'nano-banana-2-1', 'nano-banana-lite']);
  for (const engineId of OFFICIAL_LIST_100_PRICED_ENGINE_IDS) {
    assert.equal(isOfficialList100PricedEngine(engineId), true, engineId);
    assert.equal(resolveOfficialListCompatibilityProfile(engineId, 'provider-reference-current'), OFFICIAL_LIST_100_PRICE_PROFILE_ID, engineId);
    assert.equal(resolveOfficialListCompatibilityProfile(engineId, 'standard'), OFFICIAL_LIST_100_PRICE_PROFILE_ID, engineId);
  }
  // The database policy editor keeps its explicit engine rule for these engines too.
  assert.equal(resolveOfficialListCompatibilityProfile('nano-banana-2', 'standard', { source: 'database', matchedBy: 'engine' }), 'standard');
  // Other official-list engines keep the 80 profile, and the 100 engines never fall back to it.
  assert.equal(resolveOfficialListCompatibilityProfile('wan-3', 'standard'), OFFICIAL_LIST_PRICE_PROFILE_ID);
  assert.equal(resolveOfficialListCompatibilityProfile('gpt-image-2-6-flare', 'standard'), 'standard');
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
