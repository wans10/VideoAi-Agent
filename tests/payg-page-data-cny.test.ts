import './_setup-cny-env';
import assert from 'node:assert/strict';
import test from 'node:test';
import { CUSTOMER_CURRENCY } from '../frontend/src/lib/customer-currency';
import { getPayAsYouGoContent } from '../frontend/app/(localized)/[locale]/(marketing)/pay-as-you-go-ai-video-generator/_content/index.ts';
import { buildPayAsYouGoPageData } from '../frontend/app/(localized)/[locale]/(marketing)/pay-as-you-go-ai-video-generator/_lib/payg-page-data.ts';
import { buildPricingHubData } from '../frontend/app/(localized)/[locale]/(marketing)/pricing/_lib/pricingHubData.ts';

// Kept in its own process: CUSTOMER_CURRENCY is fixed when the customer-currency module loads.
test('PAYG budget is labelled in the CNY customer currency, never as USD', () => {
  assert.equal(CUSTOMER_CURRENCY, 'CNY');
  const content = getPayAsYouGoContent('en');
  const pricingHub = structuredClone(buildPricingHubData('en'));
  const row = pricingHub.video.rows.find((candidate) => candidate.id === 'wan-3-prime')!;
  row.quotes['5s-720p'] = { status: 'exact', amountCents: 157, display: '¥1.57', note: 'Audio included.' };
  const data = buildPayAsYouGoPageData({ locale: 'en', content, pricingHub });
  const cny = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CNY' }).format(amount);
  const budget = data.exampleCosts.budget ?? '';
  assert.ok(budget.includes(cny(1.57)), `unit price must be ${cny(1.57)} in: ${budget}`);
  assert.ok(budget.includes(cny(4.71)), `three-attempt total must be ${cny(4.71)} in: ${budget}`);
  assert.doesNotMatch(budget, /\$/, 'no USD label may survive in a CNY build');
});
