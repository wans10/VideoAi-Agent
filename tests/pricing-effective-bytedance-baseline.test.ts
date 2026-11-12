import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { PricingPolicyRule } from '@maxvideoai/pricing';

import {
  assertVersionedByteDanceParity,
  quoteByteDanceBaselineRows,
  type ByteDanceBaselineScenario,
} from '../frontend/scripts/pricing-effective-bytedance-baseline';
import { isOfficialListPricedEngine } from '../frontend/src/lib/official-list-pricing';

const fixture = JSON.parse(readFileSync(
  new URL('./fixtures/bytedance-versioned-price-baseline-2026-09-28.json', import.meta.url),
  'utf8',
)) as { rows: ByteDanceBaselineScenario[] };

// Keyvo 2026-11-13: every ByteDance (Seedance) engine is re-priced at 80% of the Volcengine Ark list, a reviewed
// commercial change (docs/engineering/pricing-engine.md "Keyvo official list price rule"). The 2026-09-28 fixture stays
// immutable evidence; the parity guard now reports that reviewed drift, and every current quote is lower.
test('the 202 frozen ByteDance scenarios are re-priced only downward by the reviewed Keyvo official list rule', async () => {
  const quotes = await quoteByteDanceBaselineRows(fixture.rows, []);
  assert.equal(quotes.length, 202);
  assert.throws(() => assertVersionedByteDanceParity(fixture.rows, quotes), /Frozen versioned baseline drift/);
  const frozen = new Map(fixture.rows.map((row) => [row.scenarioId, row]));
  for (const quote of quotes) {
    const row = frozen.get(quote.scenarioId);
    assert.ok(row, quote.scenarioId);
    const frozenCents = (row as unknown as { customerTotalCents: number }).customerTotalCents;
    // Only the Keyvo official-list engines move; a retired ByteDance engine outside that set (Seedance 1.5 Pro) keeps
    // its frozen customer amount exactly.
    if (isOfficialListPricedEngine(row.engineId)) assert.ok(quote.customerTotalCents < frozenCents, quote.scenarioId);
    else assert.equal(quote.customerTotalCents, frozenCents, quote.scenarioId);
  }
  assert.ok(quotes.some((quote) => isOfficialListPricedEngine(frozen.get(quote.scenarioId)!.engineId)));
  assert.ok(quotes.every((quote) => quote.policySource === 'versioned'));
  assert.ok(quotes.every((quote) => Number.isSafeInteger(quote.customerTotalCents)));
});

test('effective database rules are recorded separately from versioned customer amounts', async () => {
  const rows = fixture.rows.filter((row) => row.engineId === 'seedance-2-5').slice(0, 2);
  assert.equal(rows.length, 2);
  const versioned = await quoteByteDanceBaselineRows(rows, []);
  const changedRule: PricingPolicyRule = {
    id: 'local-override', engineId: 'seedance-2-5', marginPercent: 0.5,
    marginFlatCents: 0, surchargeAudioPercent: 0, surchargeUpscalePercent: 0, currency: 'USD',
  };
  const effective = await quoteByteDanceBaselineRows(rows, [changedRule]);
  assert.deepEqual(effective.map((row) => row.policySource), ['database', 'database']);
  assert.deepEqual(effective.map((row) => row.ruleId), ['local-override', 'local-override']);
  assert.ok(effective.every((row, index) => row.customerTotalCents > versioned[index]!.customerTotalCents));
  assert.throws(() => assertVersionedByteDanceParity(rows, effective), /Frozen versioned baseline drift/);
});

test('the parity guard rejects incomplete or duplicated source scenarios', async () => {
  const rows = fixture.rows.slice(0, 1);
  const quotes = await quoteByteDanceBaselineRows(rows, []);
  assert.throws(() => assertVersionedByteDanceParity(rows, []), /missing quote/);
  assert.throws(() => assertVersionedByteDanceParity([rows[0]!, rows[0]!], quotes), /duplicate scenario/);
});
