import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectCanonicalPricingOutputs } from '../frontend/src/lib/pricing-audit/canonical-collectors';
import { collectPublicPricingProjectionRows } from '../frontend/scripts/pricing-public-baseline-collector';

test('publishing Kling 4 pricing does not invent a historical percentage-policy baseline', () => {
  const baseline = ['pricing-parity.v1.json', 'pricing-shadow-additions.v1.json']
    .flatMap((name) => JSON.parse(readFileSync(`tests/fixtures/${name}`, 'utf8')).rows);
  const rows = collectCanonicalPricingOutputs(baseline);
  assert.ok(rows.length > 0);
  assert.ok(rows.every((row) => row.engineId !== 'kling-v4'));
});

// Keyvo (2026-11-13): Kling 4 public projections quote Kling's official list price x 0.8 on the rule path. The
// per-second browser estimator and the 4K preset (no 4K tier) stay unavailable; no row invents a historical baseline.
test('Kling 4 public projections quote the official-list rule and keep the estimator unavailable', async () => {
  const rows = (await collectPublicPricingProjectionRows()).filter((row) => row.engineId === 'kling-v4');
  assert.equal(rows.length, 12);
  const estimator = rows.filter((row) => row.surface === 'estimator');
  assert.equal(estimator.length, 3);
  assert.ok(estimator.every((row) => row.status === 'unavailable' && Object.keys(row).sort().join(',') === 'engineId,id,status,surface'));
  const hub = new Map(rows.filter((row) => row.surface === 'pricing-hub-video').map((row) => [row.id.split(':')[2], row]));
  assert.equal(hub.size, 7);
  assert.equal(hub.get('4k-route')?.status, 'unavailable');
  // 5 s 720p: CNY 1.0/s -> 62.5 cents -> 50; 10 s 1080p: CNY 1.5/s -> 187.5 -> 150.
  assert.equal(hub.get('5s-720p')?.customerTotalCents, 50);
  assert.equal(hub.get('10s-1080p')?.customerTotalCents, 150);
  assert.equal(rows.find((row) => row.surface === 'model-page')?.customerTotalCents, 75);
});
