import assert from 'node:assert/strict';
import test from 'node:test';
import { getFalEngineById } from '../frontend/src/config/falEngines';
import { validateWan3ContinuousTariffDomain } from '../frontend/server/pricing/wan3-continuous-tariff-domain';

const context = { engine: getFalEngineById('wan-3')!.engine, mode: 'v2v' as const, durationSec: 5,
  resolution: '720p', aspectRatio: '16:9', inputVideoDurationSec: 3.25 };
const price = (flatCents: number, centsPerUnit: number) => ({ kind: 'unit_components' as const, rounding: 'nearest' as const,
  components: [{ id: 'retail', flatCents, rounding: 'none' as const, terms: [{ unit: 'input_video_seconds', centsPerUnit }] }] });

// Keyvo 2026-11-13: Wan 3 720P supplier cost is the Bailian list, CNY 0.6/s = 7.5 cents per billable second (formerly
// 10 cents), so a 5 s output costs 37.5 + 7.5 x source seconds. The fixtures keep their roles at the new cost.
test('domain validation catches a loss between safe-looking endpoints instead of checking only the displayed source', () => {
  // Exactly the supplier rate with nearest rounding: safe at the near-zero and 15 s endpoints and at the displayed
  // 3.25 s source (61.875 -> 62), yet below the ceiling supplier cent between them (for example 0.1 s: 38 < 39).
  assert.throws(() => validateWan3ContinuousTariffDomain({ context, price: price(37.5, 7.5) }), /below.cost/i);
  const accepted = validateWan3ContinuousTariffDomain({ context, price: price(65, 13) });
  assert.equal(accepted.maxInputSeconds, 15);
  // Every supplier-cent jump is checked: cents 39..150 (112 boundaries) plus both endpoints (formerly > 150 at 10 cents/s).
  assert.equal(accepted.checkedBoundaries, 114);
  assert.ok(accepted.minimumGrossCents >= 0);
});

test('the range validator permits lower unit rates when the output price covers every source length', () => {
  // The 15 s source costs 20 s x 7.5 = 150 cents: 200 keeps a 50-cent gross everywhere, 140 loses 10 at the end.
  assert.ok(validateWan3ContinuousTariffDomain({ context, price: price(250, 0) }).minimumGrossCents >= 50);
  assert.equal(validateWan3ContinuousTariffDomain({ context, price: price(200, 0) }).minimumGrossCents, 50);
  assert.throws(() => validateWan3ContinuousTariffDomain({ context, price: price(140, 0) }), /below.cost/i);
  const maximum = validateWan3ContinuousTariffDomain({ context: { ...context, durationSec: 29, inputVideoDurationSec: 0.75 }, price: price(310, 0) }).maxInputSeconds;
  assert.ok(maximum >= 1 && maximum < 1.00000000000001);
  assert.equal(29 + maximum, 30, 'the guard includes the existing validator’s representable end point');
});

test('a constant or malformed price cannot claim continuous source coverage', () => {
  assert.throws(() => validateWan3ContinuousTariffDomain({ context, price: { kind: 'fixed', customerCents: 500 } }), /unit|continuous/i);
  assert.throws(() => validateWan3ContinuousTariffDomain({ context, price: price(100, -1) }), /invalid/i);
  assert.throws(() => validateWan3ContinuousTariffDomain({ context: { ...context, durationSec: 30 }, price: price(100, 1) }), /duration/i);
});
