import './_setup-cny-env';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { CanonicalPricingQuote, PricingSnapshot } from '@maxvideoai/pricing';
import { CUSTOMER_CURRENCY, customerQuote, customerSnapshot, providerUsdSnapshot } from '../frontend/src/lib/customer-currency';
import { TOPUP_TIERS } from '../frontend/src/config/topupTiers';
import { quoteLlmhubPayTopup } from '../frontend/server/llmhub-pay/quote';
import { quotePublicPricing, projectPublicPricingSnapshot } from '../frontend/src/lib/pricing-public-quote';
import { buildCanonicalFixedProductSnapshot } from '../frontend/src/lib/billing-products';
import { buildPricingHubData } from '../frontend/app/(localized)/[locale]/(marketing)/pricing/_lib/pricingHubData';
import { reserveWalletChargeInExecutor } from '../frontend/src/lib/wallet';
import { listFalEngines } from '../frontend/src/config/falEngines';
import { computeCanonicalAudioBillingSnapshot, computeCanonicalBillingSnapshot } from '../frontend/server/pricing/quote-billing';
import { quotePublicAudioPricingSnapshot } from '../frontend/src/lib/pricing-public-quote';

test('CNY launch converts one USD quote and every customer-facing monetary component at the fixed rate', () => {
  assert.equal(CUSTOMER_CURRENCY, 'CNY');
  const source: CanonicalPricingQuote = {
    engineId: 'fixture', scenarioId: 'fixture', membershipTier: 'member', currency: 'USD',
    vendorSubtotalCents: 5, marginCents: 5, surchargeCents: 0, discountCents: 0,
    subtotalBeforeDiscountCents: 10, customerTotalCents: 10, platformFeeCents: 5, vendorShareCents: 5,
    unit: 'run', quantity: 1,
    breakdown: { vendorSubtotalExactCents: 5, marginPercent: 1, marginFlatCents: 0, surchargePercent: 0, discountPercent: 0 },
    policyProvenance: { source: 'versioned', matchedBy: 'global', sourceRuleId: 'fixture', compatibilityProfile: 'standard' },
  };
  const quote = customerQuote(source);
  assert.equal(quote.currency, 'CNY');
  assert.equal(quote.customerTotalCents, 80);
  assert.equal(quote.platformFeeCents + quote.vendorShareCents, quote.customerTotalCents);

  const snapshot: PricingSnapshot = {
    currency: 'USD', totalCents: 10, subtotalBeforeDiscountCents: 10,
    base: { seconds: 1, rate: 0.05, unit: 'run', amountCents: 5 }, addons: [],
    margin: { amountCents: 5, flatCents: 0 }, platformFeeCents: 5, vendorShareCents: 5,
  };
  const converted = customerSnapshot(snapshot);
  assert.equal(converted.currency, 'CNY');
  assert.equal(converted.totalCents, 80);
  assert.equal(converted.base.amountCents + converted.margin.amountCents, 80);
  assert.deepEqual(providerUsdSnapshot(converted), { ...snapshot, meta: converted.meta });
});

test('CNY top-up preset is paid and credited in the same fen amount', async () => {
  assert.deepEqual(TOPUP_TIERS.map(({ amountCents }) => amountCents), [8000, 20000, 40000, 80000]);
  const quote = await quoteLlmhubPayTopup(TOPUP_TIERS[0].amountCents);
  assert.equal(quote.currency, 'CNY');
  assert.equal(quote.amountMinor, TOPUP_TIERS[0].amountCents);
  assert.equal(quote.rate, 1);
});

test('public and fixed-product customer quotes use CNY while source facts remain USD', () => {
  const quote = quotePublicPricing({
    facts: { engineId: 'fixture', currency: 'USD', vendorSubtotalExactCents: 10, unit: 'run', quantity: 1 },
    scenario: { id: 'fixture:public', engineId: 'fixture', membershipTier: 'member' },
  });
  assert.equal(quote.currency, 'CNY');
  const publicSnapshot = projectPublicPricingSnapshot({
    quote,
    base: { seconds: 1, rate: 0.1, unit: 'run', amountCents: 10 },
    addons: [],
  });
  assert.equal(publicSnapshot.currency, 'CNY');
  assert.equal(publicSnapshot.base.amountCents, 80);
  assert.equal(publicSnapshot.totalCents, quote.customerTotalCents);

  const fixed = buildCanonicalFixedProductSnapshot({
    engineId: 'fixture', currency: 'USD', amountCents: 100, quantity: 1,
    unit: 'run', unitRate: 1, memberTier: 'member', discountPercent: 0, meta: {},
  });
  assert.equal(fixed.currency, 'CNY');
  assert.equal(fixed.totalCents, 800);
});

test('the Chinese pricing page highlights display renminbi quotes', () => {
  const featured = buildPricingHubData('zh').video.highlights.filter((item) => item.featured);
  assert.equal(featured.length, 3);
  for (const item of featured) {
    assert.match(item.featured!.price, /¥/);
    assert.doesNotMatch(item.featured!.price, /\$/);
  }
});

test('CNY wallet rejects a stale USD charge before touching the ledger', async () => {
  let queried = false;
  const result = await reserveWalletChargeInExecutor({
    async query<T>() { queried = true; return [] as T[]; },
  }, {
    userId: 'fixture', amountCents: 100, currency: 'USD', description: 'stale quote',
    jobId: 'fixture-job', pricingSnapshotJson: '{}', applicationFeeCents: null, vendorAccountId: null,
  });
  assert.deepEqual(result, { ok: false, balanceCents: 0, errorCode: 'currency_mismatch', preferredCurrency: 'cny' });
  assert.equal(queried, false);
});

test('video, image and audio server charges use the same CNY units as customer quotes', async () => {
  const engines = new Map(listFalEngines().map((entry) => [entry.id, entry.engine]));
  const pricingPolicy = { loadOverrides: async () => ({ status: 'loaded' as const, rules: [], routingRules: [] }) };
  for (const [id, resolution, mode] of [
    ['happy-horse-1-1', '1080p', 't2v'],
    ['gpt-image-2', '1024x1024', 't2i'],
  ] as const) {
    const engine = engines.get(id);
    assert.ok(engine);
    const snapshot = await computeCanonicalBillingSnapshot({ engine, durationSec: id === 'gpt-image-2' ? 1 : 5, resolution, mode }, { pricingPolicy });
    assert.equal(snapshot.currency, 'CNY');
    assert.equal(snapshot.totalCents, snapshot.meta?.customerCurrencyConversion?.sourceTotalCents * 8);
  }

  const audioInput = { pack: 'sfx_only' as const, durationSec: 10 };
  const audioQuote = quotePublicAudioPricingSnapshot(audioInput);
  const audioCharge = await computeCanonicalAudioBillingSnapshot(audioInput, { pricingPolicy });
  assert.equal(audioQuote.currency, 'CNY');
  assert.equal(audioCharge.currency, 'CNY');
  assert.equal(audioCharge.totalCents, audioQuote.totalCents);
});
