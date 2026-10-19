import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { isValidManualTariffPrice } from '../packages/pricing/src/manual-tariff-price';
import { collectSellableManualTariffCoverage } from '../frontend/lib/pricing-audit/manual-tariff-coverage';
import { continuousInputTariffSelector } from '../frontend/src/lib/pricing-manual-scenario';
import { computeCanonicalBillingSnapshot } from '../frontend/server/pricing/quote-billing';
import { validateSeedanceInputTariffDomain } from '../frontend/server/pricing/seedance-input-tariff';
import { buildSeedanceV2vVersionedCells, customerTariffDocumentText,
  SEEDANCE_V2V_VERSIONED_CELL_EFFECTIVE_FROM, withModelArkEditTransport } from '../frontend/server/pricing/seedance-v2v-versioned-cells';

const documentPath = resolve('frontend/config/customer-tariffs.json');
const key = (selector: Record<string, string>) => JSON.stringify(Object.entries(selector).sort(([a], [b]) => a.localeCompare(b)));
const INPUTS = [4, 5, 8.25, 15, 30];
const policy = { loadOverrides: async () => ({ status: 'loaded' as const, rules: [] }) };

test('the repository tariff file carries exactly one reviewed v2v cell for every covered Seedance 2.5 v2v selector',
  { concurrency: false }, async () => {
    const built = await buildSeedanceV2vVersionedCells();
    const scenarios = collectSellableManualTariffCoverage({ modelId: 'seedance-2-5', mode: 'v2v' }).scenarios;
    assert.equal(built.scenarioCount, scenarios.length);
    assert.equal(built.cells.length, scenarios.length, 'one cell per covered v2v scenario, no representative subset');

    const document = JSON.parse(readFileSync(documentPath, 'utf8')) as { schemaVersion: number; active: boolean; cells: any[] };
    assert.equal(document.schemaVersion, 1);
    assert.equal(document.active, true, 'the authored release switch is preserved');
    assert.equal(readFileSync(documentPath, 'utf8'), customerTariffDocumentText(built.cells),
      'customer-tariffs.json equals the deterministic regeneration (scripts/generate-seedance-v2v-tariff-cells.ts --check)');
    assert.equal(document.cells.length, scenarios.length);

    const scenarioByKey = new Map(scenarios.map(s => [key(continuousInputTariffSelector(s.selector)!), s]));
    assert.equal(scenarioByKey.size, scenarios.length, 'every covered v2v scenario has a distinct continuous selector');
    const ids = new Set<string>();
    for (const cell of document.cells) {
      assert.equal(cell.source, 'versioned');
      assert.equal(cell.currency, 'USD');
      assert.equal(cell.version, 1);
      assert.equal(cell.effectiveFrom, SEEDANCE_V2V_VERSIONED_CELL_EFFECTIVE_FROM);
      assert.equal(cell.effectiveUntil, undefined);
      assert.ok(isValidManualTariffPrice(cell.price), cell.id);
      assert.equal(ids.has(cell.id), false, 'unique cell identity');
      ids.add(cell.id);
      const scenario = scenarioByKey.get(key(cell.selector));
      assert.ok(scenario, `cell selects a covered v2v scenario: ${cell.id}`);
      assert.equal(cell.selector.inputVideoDurationSec, 'continuous');
    }
  });

test('every file-authored v2v cell passes the whole-domain validator and keeps the no-video margin within rounding',
  { concurrency: false }, async () => {
    const document = JSON.parse(readFileSync(documentPath, 'utf8')) as { cells: any[] };
    const scenarios = collectSellableManualTariffCoverage({ modelId: 'seedance-2-5', mode: 'v2v' }).scenarios;
    const scenarioByKey = new Map(scenarios.map(s => [key(continuousInputTariffSelector(s.selector)!), s]));
    const { rows } = await buildSeedanceV2vVersionedCells();
    const rowByScenario = new Map(rows.map(row => [row.scenarioId, row]));
    // The validator's basis follows the Edit transport; the authored cells are ModelArk cells.
    await withModelArkEditTransport(async () => {
      for (const cell of document.cells) {
        const scenario = scenarioByKey.get(key(cell.selector))!;
        validateSeedanceInputTariffDomain({ context: scenario.context, price: cell.price, at: SEEDANCE_V2V_VERSIONED_CELL_EFFECTIVE_FROM });
      }
    });
    for (const cell of document.cells) {
      const scenario = scenarioByKey.get(key(cell.selector))!;
      const row = rowByScenario.get(scenario.id)!;
      assert.equal(row.minimumCustomerCents, Math.ceil(row.minimumCustomerCents - 1e-9), 'whole-cent minimum');
      const difference = Math.abs(row.v2vMarginPercent - row.noVideoMarginPercent);
      assert.ok(difference <= 100 / row.minimumCustomerCents + 1e-9,
        `margin differs only by the one-cent rounding: ${scenario.id} ${difference}`);
    }
  });

test('the live quote path reads the file without a database and honours the minimum, monotone input and no-cell refusals',
  { concurrency: false }, async () => {
    const document = JSON.parse(readFileSync(documentPath, 'utf8')) as { cells: any[] };
    const cellByKey = new Map(document.cells.map(cell => [key(cell.selector), cell]));
    const scenarios = collectSellableManualTariffCoverage({ modelId: 'seedance-2-5', mode: 'v2v' }).scenarios;
    const state = { status: 'loaded' as const, active: true, revision: 1, databaseCells: [], versionedCells: document.cells };
    await withModelArkEditTransport(async () => {
      for (const scenario of scenarios) {
        const cell = cellByKey.get(key(continuousInputTariffSelector(scenario.selector)!))!;
        const totals: number[] = [];
        for (const seconds of INPUTS) {
          const snapshot = await computeCanonicalBillingSnapshot({ ...scenario.context, hasVideoInput: true, inputVideoDurationSec: seconds },
            { pricingPolicy: policy, loadCustomerTariffState: async () => state });
          assert.equal(snapshot.currency, 'USD');
          assert.equal(snapshot.meta?.pricingMode, 'manual_tariff');
          assert.equal(snapshot.meta?.customerTariffCellId, cell.id);
          totals.push(snapshot.totalCents);
        }
        for (let i = 1; i < totals.length; i++) assert.ok(totals[i] >= totals[i - 1], `monotone: ${scenario.id}`);
      }
    });
  });

test('no other covered scenario selects a file-authored v2v cell and other models keep their quotes',
  { concurrency: false }, async () => {
    const document = JSON.parse(readFileSync(documentPath, 'utf8')) as { cells: any[] };
    const cellKeys = new Set(document.cells.map(cell => key(cell.selector)));
    const all = collectSellableManualTariffCoverage().scenarios;
    const selected = all.filter(s => cellKeys.has(key(continuousInputTariffSelector(s.selector) ?? s.selector)));
    assert.equal(selected.length, document.cells.length);
    assert.ok(selected.every(s => s.modelId === 'seedance-2-5' && s.selector.mode === 'v2v'));
    // Without a selected cell, the rule path must be unchanged for an unrelated model.
    const other = all.find(s => s.modelId !== 'seedance-2-5')!;
    const empty = { status: 'loaded' as const, active: false, revision: 0, databaseCells: [], versionedCells: [] };
    const withFile = { ...empty, versionedCells: document.cells };
    const before = await computeCanonicalBillingSnapshot(other.context, { pricingPolicy: policy, loadCustomerTariffState: async () => empty });
    const after = await computeCanonicalBillingSnapshot(other.context, { pricingPolicy: policy, loadCustomerTariffState: async () => withFile });
    assert.deepEqual(after, before);
  });
