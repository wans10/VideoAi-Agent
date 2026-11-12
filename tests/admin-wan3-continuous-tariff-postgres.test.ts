import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { loadCustomerTariffScenarioDetail, previewCustomerTariffChange, confirmCustomerTariffChange,
  loadCustomerTariffHistory } from '../frontend/server/pricing-admin/customer-tariff-service';
import { computeCanonicalBillingSnapshot } from '../frontend/server/pricing/quote-billing';
import { computeCanonicalPublicSnapshot } from '../frontend/server/pricing/quote-public';
import { resolvePublicModelScenario, quotePublicModelScenario } from '../frontend/server/pricing/quote-public-model-scenario';
import { getDb } from '../frontend/src/lib/db';
import { startDisposablePostgres } from './helpers/disposable-postgres';

test('continuous Wan price edits cover the full source range, refresh public quotes and append rollback history', async () => {
  const db = await startDisposablePostgres('wan-continuous-tariff');
  const previous = { DATABASE_URL: process.env.DATABASE_URL, NODE_ENV: process.env.NODE_ENV, PRICING_SANDBOX: process.env.PRICING_SANDBOX };
  Object.assign(process.env, { DATABASE_URL: db.databaseUrl, NODE_ENV: 'development', PRICING_SANDBOX: '1' });
  const actor = '11111111-1111-4111-8111-111111111111';
  try {
    await db.pool.query(`
      CREATE TABLE app_pricing_rules (id TEXT PRIMARY KEY, engine_id TEXT, resolution TEXT, mode TEXT,
        margin_percent NUMERIC, margin_flat_cents INTEGER, surcharge_audio_percent NUMERIC,
        surcharge_upscale_percent NUMERIC, currency TEXT, compatibility_profile TEXT, vendor_account_id TEXT,
        effective_from TIMESTAMPTZ, updated_at TIMESTAMPTZ, updated_by UUID);
      INSERT INTO app_pricing_rules (id, margin_percent, margin_flat_cents, surcharge_audio_percent,
        surcharge_upscale_percent, currency) VALUES ('default', 0.3, 0, 0.2, 0.5, 'USD');
      CREATE TABLE app_pricing_change_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain TEXT NOT NULL CHECK (domain IN ('policy_rule', 'membership', 'billing_product')),
        operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete', 'rollback')),
        target_id TEXT NOT NULL, actor_id UUID NOT NULL, previous_state JSONB, next_state JSONB,
        preview_summary JSONB NOT NULL, affected_scenario_ids JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    `);
    await db.pool.query(readFileSync('neon/migrations/54_customer_tariff_cells.sql', 'utf8'));
    await db.pool.query(readFileSync('neon/migrations/55_customer_tariff_versions.sql', 'utf8'));
    const selected = await loadCustomerTariffScenarioDetail('wan-3', { mode: 'v2v', resolution: '720p',
      durationSec: '5', aspectRatio: '16:9', inputVideoDurationSec: '3.25' });
    const preserve = { operation: 'create' as const, scenarioId: selected.scenarioId,
      scope: 'continuous_input' as const, price: { kind: 'preserve_current' as const } };
    // Keyvo 2026-11-13: under the database-wide rule Wan 3 sells at 80% of the Bailian list (8.25 s x 7.5 cents x 0.8
    // = 49.5 -> 50, below cost); preserving that price as a tariff is refused instead of approximated.
    assert.equal(selected.currentCents, 50);
    assert.equal(selected.continuousInputTariff, undefined, 'no continuous tariff can preserve the official-list price');
    await assert.rejects(previewCustomerTariffChange(preserve), /Unsupported Wan continuous tariff profile/);
    // The tariff editor mechanics are exercised on the margin path, which an engine-specific admin rule selects.
    await db.pool.query(`INSERT INTO app_pricing_rules (id, engine_id, margin_percent, margin_flat_cents,
      surcharge_audio_percent, surcharge_upscale_percent, currency) VALUES ('margin-wan-3', 'wan-3', 0.3, 0, 0.2, 0.5, 'USD')`);
    const marginPath = await loadCustomerTariffScenarioDetail('wan-3', selected.selector);
    assert.ok(marginPath.continuousInputTariff);
    assert.equal(marginPath.continuousInputTariff.maxInputSeconds, 15);
    const preview = await previewCustomerTariffChange(preserve);
    // 61.875 cents of Bailian list cost with the 30% margin (formerly 108 on the $0.10/s cost).
    assert.equal(preview.proposedCents, 81);
    assert.equal(preview.selector.inputVideoDurationSec, 'continuous');
    // Every supplier-cent jump of the 37.5 + 7.5 x source cents cost is checked: 39..150 plus both endpoints (was > 150).
    assert.equal(preview.continuousInputRange!.checkedBoundaries, 114);
    const staged = await confirmCustomerTariffChange(preserve, preview.fingerprint, actor);
    assert.equal((await loadCustomerTariffScenarioDetail('wan-3', selected.selector)).currentCents, 81);
    await db.pool.query('UPDATE app_customer_tariff_state SET active = TRUE');
    const input = { modelId: 'wan-3', mode: 'v2v', durationSec: 5, resolution: '720p', aspectRatio: '16:9', inputVideoDurationSec: 3.25 };
    for (const seconds of [0.000016, 0.00005, 3.25, 3.2501, 15]) {
      const scenario = resolvePublicModelScenario({ ...input, inputVideoDurationSec: seconds })!;
      const billed = await computeCanonicalBillingSnapshot(scenario.context);
      const publicPrice = await computeCanonicalPublicSnapshot(scenario.context);
      assert.equal(publicPrice.totalCents, billed.totalCents);
      assert.equal(publicPrice.meta?.customerTariffRevision, 1);
    }
    const update = { operation: 'update' as const, scenarioId: selected.scenarioId,
      scope: 'continuous_input' as const, price: { kind: 'linear_input' as const, outputCents: 80, inputCentsPerSecond: 15 } };
    const next = await previewCustomerTariffChange(update);
    assert.equal(next.proposedCents, 129);
    await assert.rejects(confirmCustomerTariffChange({ ...update, scenarioId: selected.scenarioId.replace('3.25', '3.5') }, next.fingerprint, actor), /preview changed/i);
    assert.equal((await loadCustomerTariffHistory()).length, 1);
    const updated = await confirmCustomerTariffChange(update, next.fingerprint, actor, () => {});
    const scenario = resolvePublicModelScenario(input)!;
    const paid = await computeCanonicalBillingSnapshot(scenario.context);
    assert.equal(paid.totalCents, 129);
    const neighbor = resolvePublicModelScenario({ ...input, inputVideoDurationSec: 3.5 })!;
    assert.equal((await computeCanonicalPublicSnapshot(neighbor.context)).totalCents, 133);
    const rollback = { operation: 'rollback' as const, scope: 'continuous_input' as const,
      scenarioId: neighbor.id, eventId: updated.event.id };
    const rollbackPreview = await previewCustomerTariffChange(rollback);
    assert.equal(rollbackPreview.proposedCents, 84); // 8.5 s x 7.5 cents on the margin path (formerly 111)
    await confirmCustomerTariffChange(rollback, rollbackPreview.fingerprint, actor, () => {});
    assert.equal((await computeCanonicalPublicSnapshot(scenario.context)).totalCents, 81);
    assert.equal(paid.totalCents, 129);
    assert.equal((await loadCustomerTariffHistory(staged.event.targetId)).length, 3);
    assert.equal((await db.pool.query('SELECT count(*)::integer AS n FROM app_customer_tariff_cell_versions')).rows[0].n, 2);
    // Below the 37.5 + 7.5 x source cents list cost from the first source second (formerly 50 + 10/s at $0.10/s).
    const unsafe = { ...update, price: { kind: 'linear_input' as const, outputCents: 37, inputCentsPerSecond: 7 } };
    await assert.rejects(previewCustomerTariffChange(unsafe), /below.cost/i);
    await assert.rejects(previewCustomerTariffChange({ ...update, price: { kind: 'linear_input' as const, outputCents: 80, inputCentsPerSecond: -1 } }), /invalid/i);
  } finally {
    await getDb().end().catch(() => undefined);
    await db.cleanup();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
