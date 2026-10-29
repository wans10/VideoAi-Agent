import assert from 'node:assert/strict';
import test from 'node:test';
import { CATALOG_BY_SLUG, PRICING_ENGINES } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-config';
import { computeComparePricingPoints, getCompareReferenceDuration } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-pricing-scenarios';
import { resolvePublicModelScenario } from '../frontend/server/pricing/quote-public-model-scenario';
import type { PublicModelQuoteInput } from '../frontend/lib/pricing-public-model-contract';

test('Veo and Omni engines are hidden from comparison pricing under the Keyvo visibility policy', () => {
  for (const hidden of ['veo-3-1', 'veo-3-1-fast', 'veo-3-1-lite', 'gemini-omni-flash']) {
    assert.equal(CATALOG_BY_SLUG.get(hidden), undefined, hidden);
  }
  assert.equal(getCompareReferenceDuration(undefined, PRICING_ENGINES.get('seedance-2-0')), undefined);
});

test('unavailable quotes remain absent and a missing engine cannot invent a reference duration', async () => {
  assert.equal(getCompareReferenceDuration(undefined, PRICING_ENGINES.get('seedance-2-0')), undefined);
  const points = await computeComparePricingPoints(PRICING_ENGINES.get('seedance-2-0-fast')!, 5, async () => ({ status: 'unavailable' }));
  assert.deepEqual(points, []);
});
