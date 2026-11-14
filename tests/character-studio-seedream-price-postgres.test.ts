import assert from 'node:assert/strict';
import test from 'node:test';
import { recastHarness } from './helpers/character-recast-harness';
import { getFalEngineById } from '../frontend/src/config/falEngines';
import { query, withDbTransaction } from '../frontend/src/lib/db';
import { estimateImageGeneration } from '../frontend/src/server/images/estimate-image-generation';
import { resolveImageGenerationPricingSnapshot } from '../frontend/src/server/images/image-generation-pricing';
import { createInitialImageJobInExecutor } from '../frontend/src/server/images/image-initial-job';
import { buildCurrentOtherPricing } from '../frontend/app/(localized)/[locale]/(marketing)/pricing/_lib/current-other-pricing';
import { buildPricingHubData } from '../frontend/app/(localized)/[locale]/(marketing)/pricing/_lib/pricingHubData';
import { formatCurrencyForLocale } from '../frontend/app/(localized)/[locale]/(marketing)/pricing/_lib/pricingPageContent';

// The Character Builder quotes Seedream 5.0 Flash (Standard) and Seedream 5.0 Pro (Pro) on the official-list rule path.
// No customer tariff is needed, so the estimate, the reserved receipt and the public hub row must agree.
const characterEngines = [
  { engineId: 'seedream-5-0-flash', hubRow: 'character-builder-draft', label: 'Seedream 5.0 Flash' },
  { engineId: 'seedream-5-0-pro', hubRow: 'character-builder-final', label: 'Seedream 5.0 Pro' },
] as const;

test('Character Studio images price through Seedream with the same estimate, receipt and hub row', async (t) => {
  const f = await recastHarness(t);
  // Keyvo keeps the customer tariff state inactive (keyvo-upstream-deviations.md). The harness activates it for the model
  // grid, so switch it off here: Seedream must price through the official-list rule alone, exactly as in production.
  await query('UPDATE app_customer_tariff_state SET active = FALSE');
  for (const { engineId, hubRow, label } of characterEngines) {
    const engine = getFalEngineById(engineId)!.engine;
    for (const [mode, referenceImageCount] of [['t2i', 0], ['i2i', 1], ['i2i', 3]] as const)
      await t.test(`${engineId} ${mode}/${referenceImageCount} references`, async () => {
        const estimate = await estimateImageGeneration({
          engineId, mode, resolution: '2k', numImages: 1, aspectRatio: '3:4', referenceImageCount,
        });
        assert.notEqual(estimate.pricing.meta?.pricingMode, 'manual_tariff', 'Seedream must not depend on a customer tariff');
        const { pricing } = await resolveImageGenerationPricingSnapshot({
          engine,
          mode,
          durationSec: 1,
          resolution: '2k',
          customImageSize: null,
          quality: null,
          combinedImageCount: referenceImageCount,
          enableWebSearch: false,
          numImages: 1,
          billingProductKey: null,
          billingQuantityMultiplier: 1,
          jobSurface: 'character',
          source: undefined,
          metadata: null,
          includedKlingFirstFrameParentJobId: null,
          resolvedAspectRatio: '3:4',
          trustedQuotedBilling: undefined,
        });
        assert.equal(estimate.pricing.totalCents, pricing.totalCents);
        assert.equal(estimate.pricing.meta?.customerTariffRevision, pricing.meta?.customerTariffRevision);
        const jobId = `character-${engineId}-${mode}-${referenceImageCount}`;
        const params = {
          userId: f.actor.userId,
          mode,
          jobId,
          surface: 'character' as const,
          billingProductKey: null,
          description: 'Character Studio',
          amountCents: pricing.totalCents,
          currency: 'USD',
          pricingSnapshotJson: JSON.stringify(pricing),
          auditPricingSnapshot: pricing,
          applicationFeeCents: null,
          vendorAccountId: null,
          engineId: engine.id,
          engineLabel: engine.label,
          durationSec: 0,
          prompt: 'Full dressed character',
          aspectRatio: '3:4',
          canUpscale: false,
          finalPriceCents: pricing.totalCents,
          costBreakdownJson: null,
          settingsSnapshotJson: JSON.stringify({ numImages: 1, resolution: '2k' }),
          visibility: 'private' as const,
          indexable: false,
          preferredCurrency: 'usd',
          walletReservation: 'reserve' as const,
        };
        assert.equal((await withDbTransaction((tx) => createInitialImageJobInExecutor(tx, params))).kind, 'created');
        assert.equal((await withDbTransaction((tx) => createInitialImageJobInExecutor(tx, params))).kind, 'existing_job');
        const receipts = await f.receipts(jobId);
        assert.equal(receipts.length, 1);
        assert.equal(receipts[0].amount_cents, pricing.totalCents);
        // The receipt is stored as JSON, which drops undefined optional fields such as durationSteps.default.
        assert.deepEqual(receipts[0].pricing_snapshot, JSON.parse(JSON.stringify(pricing)));
        assert.equal(estimate.normalized.numImages, 1);
        if (mode === 't2i') {
          // The public hub quotes the same single text-to-image output for each character mode.
          for (const locale of ['en', 'fr', 'es'] as const) {
            const publicRows = await buildCurrentOtherPricing(buildPricingHubData(locale).otherSurfaces, locale);
            const amount = formatCurrencyForLocale(locale, pricing.currency, pricing.totalCents / 100);
            assert.equal(publicRows.toolRows.find((row) => row.id === hubRow)!.standardOutput, `${label}: ${amount}`);
          }
        }
      });
  }
});
