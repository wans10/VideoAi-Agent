import assert from 'node:assert/strict';
import test from 'node:test';

import { CATALOG_BY_SLUG, PRICING_ENGINES } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-config.ts';
import { formatSpeedChip } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-engine-formatting.ts';
import {
  computePricingScore,
  resolvePricingDisplay,
} from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-pricing.ts';
import { CNY_BUILD } from './helpers/customer-currency-expectations.ts';

test('Seedance 2.0 comparison pricing exposes 1080p but scores the comparable 720p tier', async () => {
  const standard = CATALOG_BY_SLUG.get('seedance-2-0');
  const fast = CATALOG_BY_SLUG.get('seedance-2-0-fast');

  assert.ok(standard);
  assert.ok(fast);

  const standardPricing = await resolvePricingDisplay(
    standard,
    'en',
    PRICING_ENGINES.get('seedance-2-0')
  );
  const fastPricing = await resolvePricingDisplay(
    fast,
    'en',
    PRICING_ENGINES.get('seedance-2-0-fast')
  );

  assert.equal(standardPricing.headline, CNY_BUILD ? '720p: ¥3.02/s' : '720p: $0.38/s');
  assert.deepEqual(standardPricing.secondaryLines, CNY_BUILD ? ['1080p: ¥7.49/s', '4K: ¥15.55/s'] : ['1080p: $0.94/s', '4K: $1.94/s']);
  assert.equal(standardPricing.scoreLine, standardPricing.headline);
  assert.deepEqual(standardPricing.scorePrices, [0.38]);
  assert.equal(computePricingScore(standardPricing.scorePrices ?? standardPricing.prices), 6.4);

  assert.equal(fastPricing.headline, CNY_BUILD ? '480p: ¥1.09/s' : '480p: $0.14/s');
  assert.deepEqual(fastPricing.secondaryLines, CNY_BUILD ? ['720p: ¥2.43/s'] : ['720p: $0.30/s']);
  assert.equal(fastPricing.scoreLine, CNY_BUILD ? '720p: ¥2.43/s' : '720p: $0.30/s');
  assert.deepEqual(fastPricing.scorePrices, [0.3]);
  assert.equal(computePricingScore(fastPricing.scorePrices ?? fastPricing.prices), 7.2);
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
