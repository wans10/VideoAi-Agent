// Mechanism test: runs on the unfiltered upstream catalog (the Keyvo model allowlist hides this fixture engine).
import './helpers/keyvo-unfiltered-catalog';
import assert from 'node:assert/strict';
import test from 'node:test';
import { computeMarketingPricePoints } from '../frontend/src/lib/pricing-marketing';

import { CATALOG_BY_SLUG, PRICING_ENGINES } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-config.ts';
import { formatSpeedChip } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-engine-formatting.ts';
import { resolvePricingDisplay } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-pricing.ts';
import { CNY_BUILD } from './helpers/customer-currency-expectations.ts';

test('Seedance 2.0 comparison pricing exposes exact quotes without an arbitrary price score', async () => {
  const standard = CATALOG_BY_SLUG.get('seedance-2-0');
  const fast = CATALOG_BY_SLUG.get('seedance-2-0-fast');

  assert.ok(standard);
  assert.ok(fast);

  const standardPricing = await resolvePricingDisplay(
    standard,
    'en',
    PRICING_ENGINES.get('seedance-2-0'),
    (engine) => computeMarketingPricePoints(engine, { durationSec: 5, memberTier: 'member' }),
  );
  const fastPricing = await resolvePricingDisplay(
    fast,
    'en',
    PRICING_ENGINES.get('seedance-2-0-fast'),
    (engine) => computeMarketingPricePoints(engine, { durationSec: 5, memberTier: 'member' }),
  );

  // Keyvo 2026-11-13: 80% of the Volcengine Ark list (5 s, 16:9): 720p 50, 1080p 124, 4K 253 cents; Fast 18 / 40.
  assert.equal(standardPricing.headline, '720p: $0.10/s');
  assert.deepEqual(standardPricing.secondaryLines, ['1080p: $0.248/s', '4K: $0.506/s']);
  assert.deepEqual(standardPricing.prices.map(value => Number(value.toFixed(3))), [0.1, 0.248, 0.506]);

  assert.equal(fastPricing.headline, '480p: $0.036/s');
  assert.deepEqual(fastPricing.secondaryLines, ['720p: $0.08/s']);
  assert.deepEqual(fastPricing.prices.map(value => Number(value.toFixed(3))), [0.036, 0.08]);
});

test('a failed current comparison quote never falls back to catalogue amounts', async () => {
  const result = await resolvePricingDisplay(CATALOG_BY_SLUG.get('seedance-2-0')!, 'en', PRICING_ENGINES.get('seedance-2-0'), async () => []);
  assert.equal(result.headline, 'Current price unavailable');
  assert.equal(result.quoteUnavailable, true);
  assert.deepEqual(result.prices, []);
});

test('comparison without a current pricing engine cannot display catalogue margin prices', async () => {
  for (const slug of ['seedance-2-0', 'kling-3-pro', 'minimax-h3']) {
    const entry = CATALOG_BY_SLUG.get(slug)!;
    assert.ok(entry, slug);
    const result = await resolvePricingDisplay(entry, 'en', undefined);
    assert.equal(result.headline, 'Current price unavailable', slug);
    assert.equal(result.quoteUnavailable, true);
    assert.deepEqual(result.prices, []);
  }
});

test('comparison speed chips hide implausible multi-hour averages from SEO specs', () => {
  assert.equal(
    formatSpeedChip({ engine: { avgDurationMs: 9_611_000 } } as never),
    'Data pending'
  );
  assert.equal(
    formatSpeedChip({ engine: { avgDurationMs: 125_000 } } as never),
    '125s avg'
  );
});
