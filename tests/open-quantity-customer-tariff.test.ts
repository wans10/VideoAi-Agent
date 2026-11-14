// Upstream mechanism test over hidden (non-allowlisted) engines: run on the unfiltered catalog (see keyvo-unfiltered-catalog).
import './helpers/keyvo-unfiltered-catalog.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { h3MaxCustomerCents } from './helpers/minimax-h3-max-customer-price';
import { getFalEngineById } from '../frontend/src/config/falEngines';
import { buildManualTariffCoverageScenario } from '../frontend/lib/pricing-audit/manual-tariff-coverage';
import { compileCurrentContinuousTariffPrice, validateCurrentContinuousTariffDomain } from '../frontend/server/pricing/compile-current-continuous-tariff';
import { buildBillingPricingFacts } from '../frontend/src/lib/pricing-billing-facts';
import { buildManualTariffScenario, continuousInputTariffSelector } from '../frontend/src/lib/pricing-manual-scenario';
import { resolveCustomerTariffQuote } from '../frontend/server/pricing/resolve-customer-tariff';
import { computeCanonicalBillingSnapshot } from '../frontend/server/pricing/quote-billing';
import { evaluateManualTariffPrice, isValidManualTariffPrice } from '../packages/pricing/src/manual-tariff-price';
import { prepareContinuousInputTariffChange, continuousInputTariffDetail } from '../frontend/server/pricing-admin/continuous-input-tariff';
import { chooseCustomerTariffScenario } from '../frontend/server/pricing-admin/customer-tariff-service';
import { collectSellableManualTariffCoverage } from '../frontend/lib/pricing-audit/manual-tariff-coverage';
import { isKeyvoHiddenModel, isKeyvoVisibleFamily } from '../frontend/config/keyvo-model-visibility';
import { resolvePublicModelScenario } from '../frontend/server/pricing/quote-public-model-scenario';

const policy = { status: 'loaded' as const, rules: [{ id: 'default', currency: 'USD', marginPercent: .3,
  marginFlatCents: 0, surchargeAudioPercent: .2, surchargeUpscalePercent: .5 }] };

// Keyvo (2026-11-12): MiniMax-H3-Max runs on MiniMax's own API, which bills whole reference-video seconds and images
// beyond two. Its reference tariff is therefore no longer Fal's open reference-token class (isOpenQuantityTariff); the
// open-quantity contracts below keep running for Luma Modify, and the last test pins the new exact H3-Max identity.
test('admin and public current quotes accept unseen supported output seconds and reference budgets', () => {
  const scenarios = collectSellableManualTariffCoverage().scenarios;
  for (const modelId of ['lumaRay2']) {
    const tokens = false;
    const mode = tokens ? 'ref2v' : 'v2v';
    const requested = { mode, resolution: tokens ? '768P' : '720p', ...(tokens ? { referenceTokenBudget: '9096' } : { durationSec: '131' }) };
    const hidden = isKeyvoHiddenModel(modelId);
    const candidates = scenarios.filter(row => row.modelId === modelId);
    const selected = chooseCustomerTariffScenario(candidates, requested);
    assert.equal(selected.scenario.selector[tokens ? 'referenceTokenBudget' : 'durationSec'], tokens ? '9096' : '131');
    const publicScenario = resolvePublicModelScenario({ modelId, mode, resolution: requested.resolution,
      durationSec: tokens ? 5 : 131, ...(tokens ? { referenceTokenBudget: 9096 } : {}) });
    if (hidden || !isKeyvoVisibleFamily(getFalEngineById(modelId)!.family)) {
      // Keyvo hides this model's page, so its public quote does not resolve; the admin tariff above still does.
      assert.equal(publicScenario ?? null, null, modelId);
      continue;
    }
    assert.ok(publicScenario);
    assert.equal(publicScenario.selector[tokens ? 'referenceTokenBudget' : 'durationSec'], tokens ? '9096' : '131');
  }
});

test('open Luma modify seconds resolve the same literal retail curve at unseen durations', async () => {
  for (const modelId of ['lumaRay2', 'lumaRay2_flash']) {
    const context = { engine: getFalEngineById(modelId)!.engine, mode: 'v2v' as const, durationSec: 5, resolution: '720p' };
    const scenario = buildManualTariffCoverageScenario(context, 'open');
    const price = await compileCurrentContinuousTariffPrice(scenario, policy);
    const selector = continuousInputTariffSelector(scenario.selector)!;
    assert.equal(selector.durationSec, 'continuous');
    assert.ok(isValidManualTariffPrice(price));
    assert.equal(evaluateManualTariffPrice(price, { output_seconds: 7 }).customerTotalCents, 110);
    assert.ok(validateCurrentContinuousTariffDomain({ context, price }).minimumGrossCents >= 0);
    const values = [1, 7, 31, 1000, 562949953421263];
    for (const seconds of values) {
      const selected = { ...context, durationSec: seconds };
      const facts = buildBillingPricingFacts(selected, context.engine.pricingDetails, 'USD').facts;
      const current = await computeCanonicalBillingSnapshot(selected, { pricingPolicy: { loadOverrides: async () => policy } });
      const manual = resolveCustomerTariffQuote({ context: selected, facts, at: '2026-10-01T00:00:00Z', state: {
        status: 'loaded', active: true, revision: 4, versionedCells: [], databaseCells: [{ id: modelId, selector,
          currency: 'USD', source: 'database', version: 1, effectiveFrom: '2026-09-30T00:00:00Z', price }],
      } });
      assert.equal(manual!.quote.customerTotalCents, current.totalCents, `${modelId}/${seconds}`);
    }
  }
});

test('admin edits literal output and excess-token rates and rejects below-cost curves across the open domain', async () => {
  const state = { status: 'loaded' as const, active: false, revision: 0, versionedCells: [], databaseCells: [] };
  // H3-Max has no open token tariff on Keyvo (see the last test); Luma keeps the open output-second contract.
  for (const modelId of ['lumaRay2']) {
    const tokens = modelId === 'minimax-h3-max';
    const context = { engine: getFalEngineById(modelId)!.engine, mode: tokens ? 'ref2v' as const : 'v2v' as const,
      durationSec: 5, resolution: tokens ? '768P' : '720p', ...(tokens ? { referenceTokenBudget: 9096 } : {}) };
    const scenario = buildManualTariffCoverageScenario(context, 'edit');
    const detail = await continuousInputTariffDetail(scenario, state, policy);
    assert.equal(detail!.kind, tokens ? 'tokens' : 'output');
    assert.equal(detail!.unbounded, true);
    const proposal = { operation: 'create' as const, scenarioId: scenario.id, scope: 'continuous_input' as const,
      price: { kind: 'linear_open' as const, outputCents: tokens ? 55 : 0, unitCents: tokens ? .003 : 17 } };
    const prepared = await prepareContinuousInputTariffChange({ proposal, scenario, state, policy });
    assert.equal(prepared.proposedCents, tokens ? 70 : 85);
    assert.ok(prepared.continuousInputRange!.minimumGrossCents >= 0);
    await assert.rejects(prepareContinuousInputTariffChange({ proposal: { ...proposal,
      price: { ...proposal.price, unitCents: 0 } }, scenario, state, policy }), /below.cost/i);
    const malformed = structuredClone(detail!.price);
    assert.equal(malformed.kind, 'unit_components');
    if (malformed.kind === 'unit_components') {
      const altered = { ...malformed, components: malformed.components.map(c => ({ ...c, precision: 0 })) };
      assert.throws(() => validateCurrentContinuousTariffDomain({ context, price: altered }), /rounding/i);
    }
  }
});

test('Keyvo MiniMax-H3-Max reference cells match exact official quantities instead of an open token budget', async () => {
  const state = { status: 'loaded' as const, active: false, revision: 0, versionedCells: [], databaseCells: [] };
  const engine = getFalEngineById('minimax-h3-max')!.engine;
  const context = { engine, mode: 'ref2v' as const, durationSec: 5, resolution: '768P',
    referenceTokenBudget: 9096, referenceImageCount: 4, inputVideoDurationSec: 2.4 };
  const scenario = buildManualTariffCoverageScenario(context, 'official');
  assert.equal(scenario.selector.referenceTokenBudget, undefined, 'the Fal token budget is not a price identity');
  assert.equal(scenario.selector.referenceImageCount, '4');
  assert.equal(scenario.selector.inputVideoDurationSec, '3', 'whole billed reference-video seconds');
  assert.deepEqual([scenario.quantities.reference_images, scenario.quantities.input_video_seconds], [4, 3]);
  assert.equal(continuousInputTariffSelector(scenario.selector), null);
  await assert.rejects(continuousInputTariffDetail(scenario, state, policy).then((detail) => {
    if (!detail) throw new Error('no continuous detail');
    return detail;
  }));
  const facts = buildBillingPricingFacts(context, engine.pricingDetails, 'USD').facts;
  assert.deepEqual(buildManualTariffScenario(context, facts).selector, scenario.selector);
  // An authored exact cell (at or above the official cost) for this identity is quoted as authored.
  const current = await computeCanonicalBillingSnapshot(context, { pricingPolicy: { loadOverrides: async () => policy } });
  assert.equal(current.totalCents, h3MaxCustomerCents(80.125));
  const manual = resolveCustomerTariffQuote({ context, facts, at: '2026-10-01T00:00:00Z', state: {
    status: 'loaded', active: true, revision: 4, versionedCells: [], databaseCells: [{ id: 'h3-max-official', selector: scenario.selector,
      currency: 'USD', source: 'database', version: 1, effectiveFrom: '2026-09-30T00:00:00Z',
      price: { kind: 'fixed', customerCents: 105 } }],
  } });
  assert.equal(manual!.quote.customerTotalCents, 105);
});
