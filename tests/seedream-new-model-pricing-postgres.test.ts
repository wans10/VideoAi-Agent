// seedream-5-5 is offered on Keyvo and official-list priced (no USD tariff cell); this parity contract prices it on the unfiltered upstream catalog.
import './helpers/keyvo-unfiltered-catalog';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getFalEngineById } from '../frontend/src/config/falEngines';
import { getDb, withDbTransaction } from '../frontend/src/lib/db';
import { resolveImageGenerationPricingSnapshot } from '../frontend/src/server/images/image-generation-pricing';
import { estimateImageGeneration } from '../frontend/src/server/images/estimate-image-generation';
import { priceCanonicalGenerationInExecutor } from '../frontend/src/server/agent-api/generation-pricing';
import { quotePublicModelScenario } from '../frontend/server/pricing/quote-public-model-scenario';
import { collectSellableManualTariffCoverage } from '../frontend/lib/pricing-audit/manual-tariff-coverage';
import { previewCustomerTariffChange } from '../frontend/server/pricing-admin/customer-tariff-service';
import { startDisposablePostgres, createPaidGenerationTestSchema } from './helpers/disposable-postgres';

test('new Seedream web billing, image estimates, MCP settlement and current public quotes agree on PostgreSQL', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-13T12:00:00Z') });
  const db = await startDisposablePostgres('srnew');
  const original = { DATABASE_URL: process.env.DATABASE_URL, NODE_ENV: process.env.NODE_ENV,
    PRICING_SANDBOX: process.env.PRICING_SANDBOX };
  Object.assign(process.env, { DATABASE_URL: db.databaseUrl, NODE_ENV: 'development', PRICING_SANDBOX: '1' });
  try {
    await createPaidGenerationTestSchema(db.pool);
    for (const migration of ['27_pricing_admin_cockpit.sql', '54_customer_tariff_cells.sql', '55_customer_tariff_versions.sql']) {
      await db.pool.query(readFileSync(`neon/migrations/${migration}`, 'utf8'));
    }
    await db.pool.query('UPDATE app_customer_tariff_state SET active = TRUE, revision = 1');
    // Keyvo's Seedream 5.0 Flash renders 2K only (the 1K and 1.5K sizes are not offered). Its active-tariff cell keeps
    // the upstream 3-cent manual price; with the tariff inactive (Keyvo's production state) it uses the official-list
    // rule instead (see the final block). Seedream 5.5 is registry-only on Keyvo.
    for (const id of ['seedream-5-5', 'seedream-5-0-flash'] as const) {
      const flash = id === 'seedream-5-0-flash';
      const engine = getFalEngineById(id)!.engine;
      for (const resolution of flash ? ['2K'] : ['1K', '1.5K', '2K']) for (const count of [1, 10]) {
        const expected = flash ? 3 : resolution === '2K' ? count === 1 ? 6 : 16 : count === 1 ? 4 : 13;
        const estimated = await estimateImageGeneration({ engineId: id, mode: 'i2i', numImages: 1,
          resolution, aspectRatio: '16:9', referenceImageCount: count });
        const generated = await resolveImageGenerationPricingSnapshot({ engine, mode: 'i2i', durationSec: 1, resolution,
          customImageSize: null, quality: null, combinedImageCount: count, enableWebSearch: false, numImages: 1,
          billingProductKey: null, billingQuantityMultiplier: 1, jobSurface: 'image', source: undefined, metadata: null,
          includedKlingFirstFrameParentJobId: null, resolvedAspectRatio: '16:9', trustedQuotedBilling: undefined,
          customerTariffRevision: String(estimated.pricing.meta?.customerTariffRevision) });
        const settled = await withDbTransaction(executor => priceCanonicalGenerationInExecutor({ schemaVersion: 1,
          surface: 'image', engineId: id, mode: 'i2i', prompt: 'Disposable source-count parity check', outputCount: 1,
          settings: { resolution, aspectRatio: '16:9' }, references: Array.from({ length: count }, (_, slot) => ({
            kind: 'asset' as const, assetId: `local-${slot}`, role: 'reference' as const, slot,
          })) }, 'member', { executor, candidate: { engine, surface: 'image' } as never }));
        const publicQuote = await quotePublicModelScenario({ modelId: id, mode: 'i2i', durationSec: 1,
          resolution, aspectRatio: '16:9',
          // Flash is priced per image on the generic path, which has no reference-count dimension (Keyvo keeps it off the
          // USD new-Seedream branch); only 5.5 prices each source image.
          referenceImageCount: flash ? undefined : count - 1 });
        assert.equal(publicQuote.status, 'exact');
        assert.equal(publicQuote.status === 'exact' ? publicQuote.amountCents : null, expected);
        for (const snapshot of [generated.pricing, estimated.pricing, settled.pricingSnapshot]) {
          assert.equal(snapshot.totalCents, expected, `${id}:${resolution}:${count}`);
          assert.equal(snapshot.meta?.providerCostKind, 'published_list_estimate');
          assert.equal(snapshot.meta?.providerCostContract, undefined);
          assert.equal((snapshot.meta?.providerCostUsage as { inputImages: number }).inputImages, count);
          assert.equal(snapshot.meta?.customerTariffRevision, 1);
          // Keyvo's supplier facts are the Volcengine CNY list at 8 CNY/USD: Flash output CNY 0.12; Seedream 5.5 output
          // CNY 0.13 up to 2.61 MP (1K and 1.5K 16:9) or CNY 0.23 above it (2K 16:9 = 2816x1584), plus CNY 0.05 per input image.
          const sourceUsd = flash ? 0.015
            : Number((((resolution === '2K' ? 0.23 : 0.13) + count * 0.05) / 8).toFixed(6));
          assert.equal(snapshot.meta?.providerCostListUsd, sourceUsd);
        }
      }
    }
    const tenSourceScenario = collectSellableManualTariffCoverage({ modelId: 'seedream-5-5', mode: 'i2i' })
      .scenarios.find(row => row.selector.resolution === '2K' && row.selector.inputImageCount === '10')!;
    // Seedream 5.5 is official-list priced, so a manual 10-source cell is an optional override rather than a required floor.
    // Its 2K supplier cost is CNY 0.23 + 10 x 0.05 = 0.73 CNY = 9.125 cents, which 11 cents covers; the preview stays a preview.
    const tenSourcePreview = await previewCustomerTariffChange({ operation: 'create', scenarioId: tenSourceScenario.id,
      customerCents: 11 });
    assert.equal(tenSourcePreview.proposedCents, 11);
    assert.equal((await db.pool.query('SELECT count(*) FROM app_pricing_change_events')).rows[0].count, '0');
    assert.equal((await db.pool.query('SELECT count(*) FROM app_jobs')).rows[0].count, '0');

    await db.pool.query('UPDATE app_customer_tariff_state SET active = FALSE');
    // Seedream 5.5 and Flash are official-list priced (CNY list x0.8, no tariff cell), so both keep quoting while the tariff is
    // inactive; 5.5 2K output is CNY 0.23 (8 CNY/USD) before the 80% sale.
    const proEstimate = await estimateImageGeneration({ engineId: 'seedream-5-5', mode: 't2i', numImages: 1,
      resolution: '2K', aspectRatio: '1:1' });
    assert.ok(proEstimate.pricing.totalCents > 0);
    const proQuote = await quotePublicModelScenario({ modelId: 'seedream-5-5', mode: 't2i', durationSec: 1, resolution: '2K' });
    assert.equal(proQuote.status, 'exact');
    assert.equal(proQuote.status === 'exact' ? proQuote.amountCents : null, proEstimate.pricing.totalCents);
    // The official-list Flash rule needs no tariff, so it keeps quoting while the tariff is inactive.
    const flash = await estimateImageGeneration({ engineId: 'seedream-5-0-flash', mode: 't2i', numImages: 1,
      resolution: '2K', aspectRatio: '1:1' });
    assert.equal(flash.pricing.totalCents, 1);
    assert.equal((await quotePublicModelScenario({ modelId: 'seedream-5-0-flash', mode: 't2i', durationSec: 1, resolution: '2K' })).status,
      'exact');
  } finally {
    await getDb().end().catch(() => undefined);
    await db.cleanup();
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
