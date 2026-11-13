import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateKling3TurboProviderCost } from '../frontend/src/lib/kling-3-turbo';

// Keyvo 2026-11-13: the supplier cost is the Bailian / Kling list price (CNY 0.8 / 1.0 per second at 8 CNY/USD),
// replacing the former fal-derived ceiling (11.2 / 14 cents).
test('Kling 3 Turbo uses the official Standard list cost at every supported duration', () => {
  assert.deepEqual(
    [3, 5, 10, 15].map((durationSec) => calculateKling3TurboProviderCost({
      engineId: 'kling-3-turbo-standard',
      durationSec,
    })),
    [
      { rateCentsPerSecond: 10, providerCostExactCents: 30 },
      { rateCentsPerSecond: 10, providerCostExactCents: 50 },
      { rateCentsPerSecond: 10, providerCostExactCents: 100 },
      { rateCentsPerSecond: 10, providerCostExactCents: 150 },
    ],
  );
});

test('Kling 3 Turbo uses the official Pro list cost at every supported duration', () => {
  assert.deepEqual(
    [3, 5, 10, 15].map((durationSec) => calculateKling3TurboProviderCost({
      engineId: 'kling-3-turbo-pro',
      durationSec,
    })),
    [
      { rateCentsPerSecond: 12.5, providerCostExactCents: 37.5 },
      { rateCentsPerSecond: 12.5, providerCostExactCents: 62.5 },
      { rateCentsPerSecond: 12.5, providerCostExactCents: 125 },
      { rateCentsPerSecond: 12.5, providerCostExactCents: 187.5 },
    ],
  );
});
