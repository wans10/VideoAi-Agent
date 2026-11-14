import './helpers/keyvo-unfiltered-catalog';
import { CNY_BUILD } from './helpers/customer-currency-expectations';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { h3MaxCustomerCents } from './helpers/minimax-h3-max-customer-price';
import { KEYVO_OFFICIAL_LIST_RETIRED_ENGINE_IDS, officialListOfferCents } from './helpers/keyvo-official-list-offer';
import { listFalEngines } from '../frontend/src/config/falEngines';
import { isKeyvoHiddenModel } from '../frontend/config/keyvo-model-visibility';
import { getImagePresetQuote, getPresetQuote } from '../frontend/app/(localized)/[locale]/(marketing)/pricing/_lib/pricingHubData';
import { buildProductSchema, resolveModelOfferAmountCents } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-schema';

const matrix = JSON.parse(readFileSync('tests/fixtures/product-schema-customer-price-fix-2026-09-21.json', 'utf8'));
const engines = listFalEngines();

test('repaired model Product offers match exact public customer quotes in all locales', () => {
  for (const row of matrix.rows) {
    const engine = engines.find((entry) => entry.id === row.engineId)!;
    assert.ok(engine, row.engineId);
    // The frozen repair matrix predates these retirements; archived models cannot sell an offer.
    // Keyvo retired HappyHorse 1.0 and Seedream 5.0 Lite on 2026-11-11.
    // Keyvo retired Wan 2.6, Kling 2.5 Turbo and Kling 2.6 Pro on 2026-11-13 (no mainland route).
    if (['sora-2', 'sora-2-pro', 'seedance-1-5-pro', 'happy-horse-1-0', 'seedream', ...KEYVO_OFFICIAL_LIST_RETIRED_ENGINE_IDS].includes(engine.id)) {
      assert.equal(engine.surfaces.app.enabled, false);
      assert.equal(buildProductSchema({ engine, pricingEngine: engine.engine,
        canonical: `https://maxvideoai.com/models/${engine.modelSlug}`,
        description: 'Archived model', heroTitle: engine.marketingName, heroPosterAbsolute: null }), null);
      continue;
    }
    // Keyvo-hidden models (KEYVO_HIDDEN_MODEL_IDS, empty since MiniMax-H3-Max returned) sell no Product offer.
    if (isKeyvoHiddenModel(engine.id)) {
      assert.equal(engine.surfaces.app.enabled, false);
      assert.equal(buildProductSchema({ engine, pricingEngine: engine.engine,
        canonical: `https://maxvideoai.com/models/${engine.modelSlug}`,
        description: 'Hidden model', heroTitle: engine.marketingName, heroPosterAbsolute: null }), null);
      continue;
    }
    // The September repair fixture remains immutable; 1.2 updates only the inactive-policy projection. Keyvo prices
    // MiniMax-H3-Max at MiniMax's official PROVISIONAL cost (5 s 768P: 41 cents with the 30% margin instead of Fal's 52), recorded in
    // tests/fixtures/keyvo-h3-max-official-public-pricing-2026-11-12.json.
    // Keyvo official list price rule (2026-11-13): re-priced engines sell their offer at 80% of the list price, as
    // recorded in tests/fixtures/keyvo-official-list-public-pricing-2026-11-13.json.
    const currentTotalCents = officialListOfferCents(row.engineId)
      ?? (row.engineId === 'gemini-omni-flash' ? 91 : row.engineId === 'minimax-h3-max' ? h3MaxCustomerCents(31.25) : row.totalCents);
    assert.equal(resolveModelOfferAmountCents(engine, engine.engine), currentTotalCents * (CNY_BUILD ? 8 : 1), row.engineId);
    for (const locale of ['en', 'fr', 'es', 'zh'] as const) {
      const quote = row.mode === 't2i'
        ? getImagePresetQuote(engine, {
            id: 'controlled-schema-image', quantity: 1, resolution: row.resolution,
            quality: row.quality, mode: 't2i', referenceImageCount: 0,
          }, locale)
        : getPresetQuote(engine, {
            id: 'controlled-schema-video', label: 'Same scenario', subLabel: '',
            durationSec: row.durationSec, resolution: row.resolution, mode: row.mode, audio: row.audio,
            referenceImageCount: 0,
          }, locale);
      assert.equal(quote.status, 'exact', row.id);
      assert.equal(quote.amountCents, currentTotalCents * (CNY_BUILD ? 8 : 1), row.id);
      const prefix = locale === 'en' ? '/models' : locale === 'fr' ? '/fr/modeles' : '/es/modelos';
      const product = buildProductSchema({ engine, pricingEngine: engine.engine,
        canonical: `https://maxvideoai.com${prefix}/${engine.modelSlug}`,
        description: 'Same model and customer scenario.', heroTitle: engine.marketingName, heroPosterAbsolute: null,
      });
      assert.equal(product?.offers?.price, (quote.amountCents! / 100).toFixed(2));
    }
  }
});

test('Seedance 2.5 keeps its already-correct customer offer', () => {
  const engine = engines.find((entry) => entry.id === 'seedance-2-5')!;
  const quote = getPresetQuote(engine, { id: 'control', label: '', subLabel: '', durationSec: 4, resolution: '480p', mode: 't2v', audio: true }, 'en');
  assert.equal(quote.status, 'exact');
  assert.equal(resolveModelOfferAmountCents(engine, engine.engine), quote.amountCents);
  // Keyvo 2026-11-13: 80% of the Ark list (38,430 tokens x CNY 70/M = 33.626 cents -> 27).
  assert.equal(quote.amountCents, CNY_BUILD ? 216 : 27);
});
