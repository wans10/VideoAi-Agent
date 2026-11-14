import './helpers/keyvo-unfiltered-catalog';
import { CNY_BUILD } from './helpers/customer-currency-expectations';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { h3MaxCustomerCents } from './helpers/minimax-h3-max-customer-price';
import { KEYVO_OFFICIAL_LIST_RETIRED_ENGINE_IDS, officialListOfferCents } from './helpers/keyvo-official-list-offer';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { listFalEngines } from '../frontend/src/config/falEngines';
import { buildProductSchema, resolveModelOfferAmountCents, resolveModelPublicOffer } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-schema';
import { formatModelPublicOffer } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-offer-display';
import { ModelPublicOfferLine } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_components/ModelPublicOfferLine';

const engines = listFalEngines();
const matrix = JSON.parse(readFileSync('tests/fixtures/product-schema-customer-price-fix-2026-09-21.json', 'utf8'));

test('visible offer and Product consume the same price and selected scenario for every repaired model', () => {
  for (const row of matrix.rows) {
    const engine = engines.find((entry) => entry.id === row.engineId)!;
    // The frozen repair matrix predates these retirements; archived models cannot sell an offer. Keyvo also
    // took Happy Horse 1.0 and Seedream 5.0 Lite offline.
    // Keyvo retired Wan 2.6, Kling 2.5 Turbo and Kling 2.6 Pro on 2026-11-13 (no mainland route).
    if (['sora-2', 'sora-2-pro', 'seedance-1-5-pro', 'happy-horse-1-0', 'seedream', ...KEYVO_OFFICIAL_LIST_RETIRED_ENGINE_IDS].includes(engine.id)) {
      assert.equal(engine.surfaces.app.enabled, false);
      assert.equal(buildProductSchema({ engine, pricingEngine: engine.engine,
        canonical: `https://maxvideoai.com/models/${engine.modelSlug}`,
        description: 'Archived model', heroTitle: engine.marketingName, heroPosterAbsolute: null }), null);
      continue;
    }
    // The September repair fixture remains immutable; 1.2 updates only the inactive-policy projection. Keyvo prices
    // MiniMax-H3-Max at MiniMax's official PROVISIONAL cost (41 cents instead of Fal's 52).
    // Keyvo official list price rule (2026-11-13): re-priced engines sell their offer at 80% of the list price, as
    // recorded in tests/fixtures/keyvo-official-list-public-pricing-2026-11-13.json.
    const currentTotalCents = officialListOfferCents(row.engineId)
      ?? (row.engineId === 'gemini-omni-flash' ? 91 : row.engineId === 'minimax-h3-max' ? h3MaxCustomerCents(31.25) : row.totalCents);
    const offer = resolveModelPublicOffer(engine, engine.engine)!;
    assert.ok(offer, row.id);
    assert.equal(offer.currency, CNY_BUILD ? 'CNY' : 'USD');
    assert.equal(offer.amountCents, currentTotalCents * (CNY_BUILD ? 8 : 1), row.id);
    assert.equal(resolveModelOfferAmountCents(engine, engine.engine), currentTotalCents * (CNY_BUILD ? 8 : 1), row.id);
    assert.equal(offer.scenario.mode, row.mode, row.id);
    assert.equal(offer.scenario.resolution, row.resolution, row.id);
    if (row.mode === 't2v') {
      assert.equal(offer.scenario.durationSeconds, row.durationSec, row.id);
      assert.equal(offer.scenario.audio, row.audio, row.id);
    } else {
      assert.equal(offer.scenario.quantity, 1, row.id);
      if (engine.id.startsWith('gpt-image')) assert.equal(offer.scenario.quality, row.quality, row.id);
    }
    for (const locale of ['en', 'fr', 'es', 'zh'] as const) {
      const display = formatModelPublicOffer(offer, locale);
      const product = buildProductSchema({ engine, pricingEngine: engine.engine, publicOffer: offer, locale,
        canonical: `https://maxvideoai.com/models/${engine.modelSlug}`, description: 'Model', heroTitle: engine.marketingName, heroPosterAbsolute: null });
      assert.equal(product?.offers?.name, display.name, row.id);
      assert.equal(product?.offers?.price, (offer.amountCents / 100).toFixed(2), row.id);
      const html = renderToStaticMarkup(React.createElement(ModelPublicOfferLine, { offer, locale }));
      assert.ok(html.includes(display.name), `${row.id}: ${locale} visible scenario`);
      assert.ok(html.includes(display.price), `${row.id}: ${locale} visible price`);
      assert.doesNotMatch(html, /JSON|schema|SEO|starting at|à partir|desde/i);
    }
  }
});

test('examples name their real options without pretending to be the lowest price', () => {
  // H3 Max is served on Keyvo again and names its own featured options (5 s, 768P, the official tier).
  const max = engines.find((entry) => entry.id === 'minimax-h3-max')!;
  const maxOffer = resolveModelPublicOffer(max, max.engine)!;
  assert.deepEqual(maxOffer.scenario, { mode: 't2v', resolution: '768P', durationSeconds: 5, audio: true, quantity: 1, referenceImageCount: 0 });
  assert.equal(maxOffer.amountCents, h3MaxCustomerCents(31.25) * (CNY_BUILD ? 8 : 1));
  assert.equal(formatModelPublicOffer(maxOffer, 'en').name, 'Generation example: 5 s · 768P · Text to video · Audio included');
  const engine = engines.find((entry) => entry.id === 'minimax-h3')!;
  const offer = resolveModelPublicOffer(engine, engine.engine)!;
  assert.deepEqual(offer.scenario, { mode: 't2v', resolution: '2K', durationSeconds: 10, audio: true, quantity: 1, referenceImageCount: 0 });
  for (const [locale, expected] of [
    ['en', 'Generation example: 10 s · 2K · Text to video · Audio included'],
    ['fr', 'Exemple de génération: 10 s · 2K · Texte vers vidéo · Audio inclus'],
    ['es', 'Ejemplo de generación: 10 s · 2K · Texto a vídeo · Audio incluido'],
  ] as const) assert.equal(formatModelPublicOffer(offer, locale).name, expected);
  const luma = engines.find((entry) => entry.id === 'luma-ray-3-2')!;
  const lumaOffer = resolveModelPublicOffer(luma, luma.engine)!;
  assert.equal(lumaOffer.scenario.resolution, '540p');
  assert.equal(lumaOffer.scenario.durationSeconds, 5);
  assert.equal(lumaOffer.amountCents, CNY_BUILD ? 520 : 65);
  assert.match(formatModelPublicOffer(lumaOffer, 'en').name, /Silent/);
  const seed = engines.find((entry) => entry.id === 'seedance-2-5')!;
  const seedOffer = resolveModelPublicOffer(seed, seed.engine)!;
  // Keyvo 2026-11-13: 80% of the Ark list (4 s 480p Seedance 2.5 = 33.626 cents -> 27).
  assert.equal(seedOffer.amountCents, CNY_BUILD ? 216 : 27);
  assert.match(formatModelPublicOffer(seedOffer, 'en').name, /16:9/);
});

test('disabled app models have neither a purchasable Product nor a visible offer line', () => {
  for (const engine of engines.filter((entry) => !entry.surfaces.app.enabled)) {
    const offer = resolveModelPublicOffer(engine, engine.engine);
    assert.equal(offer, null, engine.id);
    assert.equal(buildProductSchema({ engine, pricingEngine: engine.engine, publicOffer: offer,
      canonical: `https://maxvideoai.com/models/${engine.modelSlug}`, description: 'Historical model', heroTitle: engine.marketingName, heroPosterAbsolute: null }), null);
    for (const locale of ['en', 'fr', 'es', 'zh'] as const) {
      assert.equal(renderToStaticMarkup(React.createElement(ModelPublicOfferLine, { offer, locale })), '');
    }
  }
});

test('route passes one offer to both structured data and visible pricing, including legacy layouts', () => {
  const root = 'frontend/app/(localized)/[locale]/(marketing)/models/[slug]';
  const layout = readFileSync(`${root}/_components/MarketingModelPageLayout.tsx`, 'utf8');
  const commercial = readFileSync(`${root}/_lib/model-page-commercial-data.ts`, 'utf8');
  const slots = readFileSync(`${root}/_components/ModelCurrentDetails.tsx`, 'utf8');
  assert.equal((commercial.match(/resolveCurrentModelPublicOffer\(engine, pricingEngine, quoteModel\)/g) ?? []).length, 1);
  assert.match(slots, /pricingEngine, scenarios, publicOffer.*await Promise\.all\(\[pricing, commercial\]\)/);
  assert.match(slots, /buildModelSchemaPayloads\(\{ \.\.\.schema, pricingEngine, publicOffer \}\)/);
  assert.match(layout, /<ModelCurrentDetails pricing=\{pricing\} commercial=\{commercial\}/);
  assert.match(slots, /<ModelDecisionPricingCard.*offer=\{publicOffer\}/);
  assert.match(slots, /<ModelPublicOfferLine offer=\{publicOffer\} locale=\{locale\}/);
  const card = readFileSync(`${root}/_components/ModelDecisionPricingCard.tsx`, 'utf8');
  assert.match(card, /<ModelPublicOfferLine offer=\{offer\} locale=\{locale\}/);
});
