import './helpers/keyvo-unfiltered-catalog';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { ManualTariffCell } from '@maxvideoai/pricing';
import document from '../frontend/config/customer-tariffs.json';
import { getFalEngineById } from '../frontend/src/config/falEngines';
import { buildBillingPricingFacts } from '../frontend/src/lib/pricing-billing-facts';
import { buildPublicPricingFacts } from '../frontend/src/lib/pricing-public-facts';
import { buildManualTariffScenario } from '../frontend/src/lib/pricing-manual-scenario';
import { computeCanonicalBillingSnapshot } from '../frontend/server/pricing/quote-billing';
import { quoteSeedreamListCost } from '../frontend/server/byteplus-list-tariff';
import { normalBytePlusSupplierCost } from '../frontend/server/byteplus-normal-cost';
import { signedBytePlusContractCost } from '../frontend/server/byteplus-account-contract';
import type { PricingContext } from '../frontend/src/lib/pricing-context';
import { collectSellableManualTariffCoverage } from '../frontend/lib/pricing-audit/manual-tariff-coverage';
import { resolvePublicModelScenario } from '../frontend/server/pricing/quote-public-model-scenario';

const at = '2026-11-13T12:00:00Z';
function context(id: 'seedream-5-5' | 'seedream-5-0-flash', extra: Partial<PricingContext> = {}): PricingContext {
  const existing = getFalEngineById(id)?.engine ?? getFalEngineById('seedream-5-0-pro')!.engine;
  return { engine: { ...existing, id, providerMeta: { provider: 'byteplus_modelark' } },
    mode: 't2i', durationSec: 1, resolution: '2K', aspectRatio: '1:1', ...extra };
}

// Keyvo quotes the Volcengine CNY list (seedream-pricing.ts): output CNY 0.13 up to 2.61 MP and CNY 0.23 above it,
// every input image CNY 0.05, at 8 CNY/USD.
test('Seedream 5.5 LIST charges every input and uses its exact published pixel boundary', () => {
  for (const [pixels, outputUsd] of [[2_610_000, 0.01625], [2_610_001, 0.02875], [4_194_304, 0.02875]] as const) {
    const quote = quoteSeedreamListCost({ model: '5.5', outputPixels: [pixels], inputImages: 3 });
    assert.equal(quote.outputUsd, outputUsd);
    assert.equal(quote.inputUsd, 0.01875);
    assert.equal(quote.totalUsd, Number((outputUsd + 0.01875).toFixed(6)));
    assert.equal(quote.effectiveUsd, null);
    assert.equal(quote.source.checkedAt, '2026-11-22');
  }
  assert.equal(quoteSeedreamListCost({ model: '5.5', outputPixels: [], inputImages: 3 }).totalUsd, 0);
});

// Keyvo converts the Volcengine list price (0.12 CNY per image) at 8 CNY/USD: 0.015 USD (fal-engines/seedream-5-0-flash.ts).
test('Seedream Flash LIST stays flat across the supported pixels and free input references', () => {
  for (const pixels of [1_048_576, 2_359_296, 4_194_304]) {
    const quote = quoteSeedreamListCost({ model: 'flash', outputPixels: [pixels], inputImages: 10 });
    assert.equal(quote.outputUsd, 0.015);
    assert.equal(quote.inputUsd, 0);
    assert.equal(quote.totalUsd, 0.015);
  }
});

test('new Seedream supplier facts and public facts include all 5.5 sources without a family discount', () => {
  const selected = context('seedream-5-5', { mode: 'i2i', resolution: '1.5K', inputImageCount: 1, referenceImageCount: 9 });
  const billing = buildBillingPricingFacts(selected, selected.engine.pricingDetails, 'USD');
  const publicFacts = buildPublicPricingFacts(selected);
  // 1.5K 1:1 output (0.13 CNY list) plus ten input images at 0.05 CNY each, converted at 8 CNY/USD.
  assert.equal(billing.facts.vendorSubtotalExactCents, 7.875);
  assert.equal(publicFacts.facts.vendorSubtotalExactCents, 7.875);
  const cost = normalBytePlusSupplierCost(selected, at);
  assert.equal(cost?.listAmountUsd, 0.07875);
  assert.equal(cost?.amountUsd, 0.07875);
  assert.equal(cost?.kind, 'published_list_estimate');
  assert.equal(cost?.usage.inputImages, 10);
  assert.equal(cost?.contract, undefined);
  assert.equal(signedBytePlusContractCost({ engineId: selected.engine.id, executionProvider: 'byteplus_modelark',
    resolution: '2K', step: 'normal', accountContractRegion: 'ap-southeast-1', inputImages: 10, outputPixels: [4_194_304] },
  { status: 'published_list', amountUsd: 0.115, unitPriceUsdPer1kTokens: null }, at), null);
});

test('5.5 tariffs distinguish the exact source total while free Flash references share a price', () => {
  const selectors = [1, 2, 10].map(inputImageCount => {
    const selected = context('seedream-5-5', { mode: 'i2i', inputImageCount, referenceImageCount: 0 });
    return buildManualTariffScenario(selected, buildBillingPricingFacts(selected, undefined, 'USD').facts).selector;
  });
  assert.deepEqual(selectors.map(selector => selector.inputImageCount), ['1', '2', '10']);
  const flash = [1, 10].map(inputImageCount => {
    const selected = context('seedream-5-0-flash', { mode: 'i2i', inputImageCount });
    return buildManualTariffScenario(selected, buildBillingPricingFacts(selected, undefined, 'USD').facts).selector;
  });
  assert.deepEqual(flash[0], flash[1]);
});

test('new Seedream scenarios reject unsupported batch, resolution, mode and source counts before pricing', () => {
  for (const extra of [{ durationSec: 2 }, { resolution: '4K' }, { mode: 't2v' },
    { mode: 'i2i', inputImageCount: 11 }, { mode: 't2i', referenceImageCount: 1 }]) {
    const selected = context('seedream-5-5', extra as Partial<PricingContext>);
    assert.throws(() => buildBillingPricingFacts(selected, undefined, 'USD'), /Seedream|image|reference|resolution|output/i);
  }
});

test('new Seedream models price on the official list without a USD tariff, and an unavailable tariff store still fails closed', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(at) });
  // Keyvo prices Seedream 5.0 Flash and 5.5 on the Volcengine CNY list (official-list-pricing.ts), so no reviewed USD
  // tariff is required: an inactive or empty tariff state falls through to the official-list rule.
  for (const id of ['seedream-5-5'] as const) {
    for (const state of [
      { status: 'loaded' as const, active: false, revision: 0, versionedCells: [], databaseCells: [] },
    ]) {
      const snapshot = await computeCanonicalBillingSnapshot(context(id), {
        pricingPolicy: { loadOverrides: async () => ({ status: 'loaded', rules: [] }) },
        loadCustomerTariffState: async () => state,
      });
      assert.ok(snapshot.totalCents > 0);
      assert.notEqual(snapshot.meta?.pricingMode, 'manual_tariff');
    }
    await assert.rejects(computeCanonicalBillingSnapshot(context(id), {
      pricingPolicy: { loadOverrides: async () => ({ status: 'loaded', rules: [] }) },
      loadCustomerTariffState: async () => ({ status: 'unavailable' }),
    }), /database unavailable/i);
  }
});

test('versioned new-offer cells cover every supported Seedream size, ratio and source count', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(at) });
  const cells = document.cells as ManualTariffCell[];
  assert.equal(cells.filter(cell => ['seedream-5-5', 'seedream-5-0-flash'].includes(cell.selector.engineId)).length, 39);
  for (const id of ['seedream-5-5', 'seedream-5-0-flash'] as const) {
    // Keyvo's Flash engine outputs 2K only (fal-engines/seedream-5-0-flash.ts); the 1K/1.5K Flash cells are upstream-only.
    for (const resolution of id === 'seedream-5-5' ? ['1K', '1.5K', '2K'] : ['2K']) for (const aspectRatio of ['auto', '1:1', '16:9', '3:4', '21:9']) {
      for (const inputImageCount of Array.from({ length: 11 }, (_, index) => index)) {
        const selected = context(id, { mode: inputImageCount ? 'i2i' : 't2i', resolution, aspectRatio, inputImageCount });
        const quote = await computeCanonicalBillingSnapshot(selected, {
          pricingPolicy: { loadOverrides: async () => ({ status: 'loaded', rules: [] }) },
          loadCustomerTariffState: async () => ({ status: 'loaded', active: true, revision: 4,
            versionedCells: cells, databaseCells: [] }),
        });
        assert.equal(quote.meta?.pricingMode, 'manual_tariff');
        // Keyvo's Flash 'auto' ratio has no factual supplier-cost meta on the legacy image branch (pre-existing since
        // 1fafcedd8; only 5.5 and explicit ratios carry it), so the list-cost invariant is checked where it is produced.
        if (id === 'seedream-5-5' || aspectRatio !== 'auto') {
          assert.ok(quote.totalCents >= Math.ceil(Number(quote.meta?.providerCostListUsd) * 100));
          assert.equal(quote.meta?.providerCostKind, 'published_list_estimate');
          assert.equal(quote.meta?.providerCostContract, undefined);
        }
        if (id === 'seedream-5-0-flash') assert.equal(quote.totalCents, 3);
      }
    }
  }
});


test('new Seedream public scenarios retain the exact additional-source count and cover the authored cells', () => {
  for (const id of ['seedream-5-5', 'seedream-5-0-flash'] as const) {
    const coverage = collectSellableManualTariffCoverage({ modelId: id });
    assert.deepEqual(coverage.gaps, []);
    // Flash keeps its generic one-image rows (t2i and i2i at 2K), as before the upstream sync.
    assert.equal(coverage.scenarios.length, id === 'seedream-5-5' ? 33 : 2);
    // Flash's generic coverage has one i2i source selector (its i2i requires one source), so only 1 reference is offered.
    for (const resolution of id === 'seedream-5-5' ? ['1K', '1.5K', '2K'] : ['2K']) for (let references = id === 'seedream-5-5' ? 0 : 1; references < (id === 'seedream-5-5' ? 10 : 2); references += 1) {
      const scenario = resolvePublicModelScenario({ modelId: id, mode: 'i2i', durationSec: 1, resolution,
        aspectRatio: '16:9', referenceImageCount: references });
      assert.ok(scenario, `${id}:${resolution}:${references}`);
      // The generic Flash scenario carries no separate source count; only 5.5 uses the exact 1-source i2i selector.
      if (id === 'seedream-5-5') assert.equal(scenario.context.inputImageCount, 1);
      assert.equal(scenario.context.referenceImageCount, references);
      assert.ok(coverage.scenarios.some(row => JSON.stringify(row.selector) === JSON.stringify(scenario.selector)));
      if (id === 'seedream-5-5') assert.equal(scenario.selector.inputImageCount, String(references + 1));
    }
    assert.equal(resolvePublicModelScenario({ modelId: id, mode: 'i2i', durationSec: 1,
      resolution: '2K', referenceImageCount: 10 }), null);
    assert.equal(resolvePublicModelScenario({ modelId: id, mode: 't2i', durationSec: 4, resolution: '2K' }), null);
  }
});

test('new Seedream estimator options use fixed customer rates per image across all supported tiers', async () => {
  const { buildEngineOption, PER_IMAGE_ENGINE_IDS } = await import('../frontend/components/marketing/price-estimator/price-estimator-options');
  const { getPricingKernel } = await import('../frontend/src/lib/pricing-kernel');
  for (const id of ['seedream-5-5', 'seedream-5-0-flash'] as const) {
    const entry = getFalEngineById(id)!;
    const option = buildEngineOption(entry, entry.engine, entry.engine, getPricingKernel(), {});
    assert.ok(option);
    assert.equal(PER_IMAGE_ENGINE_IDS.has(id), true);
    assert.equal(option.rateUnit, '/image');
    // Flash is Keyvo official-list priced (0.015 USD list x 0.8, shown at cent precision) and 2K-only.
    assert.deepEqual(option.resolutions.map(row => [row.value, row.rate]), id === 'seedream-5-5'
      ? [['1K', 0.03], ['1.5K', 0.03], ['2K', 0.06]] : [['2K', 0.01]]);
  }
});
