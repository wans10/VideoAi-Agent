import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  buildPricingHubData,
  buildVideoPricingRowsFromEntries,
} from '../frontend/app/(localized)/[locale]/(marketing)/pricing/_lib/pricingHubData.ts';
import { buildPayAsYouGoPageData } from '../frontend/app/(localized)/[locale]/(marketing)/pay-as-you-go-ai-video-generator/_lib/payg-page-data.ts';
import { enPayAsYouGoContent } from '../frontend/app/(localized)/[locale]/(marketing)/pay-as-you-go-ai-video-generator/_content/en.ts';
import { frPayAsYouGoContent } from '../frontend/app/(localized)/[locale]/(marketing)/pay-as-you-go-ai-video-generator/_content/fr.ts';
import { esPayAsYouGoContent } from '../frontend/app/(localized)/[locale]/(marketing)/pay-as-you-go-ai-video-generator/_content/es.ts';
import type { AppLocale } from '../frontend/i18n/locales.ts';
import { listFalEngines } from '../frontend/src/config/falEngines.ts';

const root = process.cwd();
const videoMatrixPath = join(
  root,
  'frontend/app/(localized)/[locale]/(marketing)/pricing/_components/PricingVideoMatrixSection.tsx'
);
const otherSurfacesPath = join(
  root,
  'frontend/app/(localized)/[locale]/(marketing)/pricing/_components/PricingOtherSurfacesSection.tsx'
);

function getRow(locale: AppLocale, anchorId: string) {
  return buildPricingHubData(locale).video.rows.find((row) => row.anchorId === anchorId);
}

test('pay-as-you-go current model choices retain the localized Seedance 2.5 profile', () => {
  const matrix = [
    ['en', enPayAsYouGoContent, '/models/seedance-2-5'],
    ['fr', frPayAsYouGoContent, '/fr/modeles/seedance-2-5'],
    ['es', esPayAsYouGoContent, '/es/modelos/seedance-2-5'],
  ] as const;

  for (const [locale, content, target] of matrix) {
    const data = buildPayAsYouGoPageData({ locale, content });
    // Keyvo presents only Chinese-vendor families, so FLUX 3 Max is not a model-testing choice here.
    assert.equal(data.modelTesting.items.some((item) => item.id === 'flux-3-max'), false);
    assert.equal(data.modelTesting.items.find((item) => item.id === 'seedance-2-5')?.href, target);
    assert.ok(data.modelTesting.items.some((item) => item.id === 'seedance-2-0'));
  }
});

test('pricing video engine rows expose localized model hrefs for clickable engine names', () => {
  const seedance = getRow('en', 'seedance-2-0-pricing');
  const seedanceMini = getRow('en', 'dreamina-seedance-2-0-mini-pricing');
  const klingFr = getRow('fr', 'kling-3-pro-pricing');
  // Veo and GPT Image are outside Keyvo's visible families, so their rows are not built.
  const veoEs = getRow('es', 'veo-3-1-pricing');
  const gptImage = buildPricingHubData('en').otherSurfaces.imageRows.find((row) => row.anchorId === 'gpt-image-2-pricing');

  assert.equal(seedance?.modelHref, '/models/seedance-2-0');
  assert.equal(seedanceMini?.modelHref, '/models/dreamina-seedance-2-0-mini');
  assert.ok(seedanceMini?.links.some((link) => link.href === '/app?engine=seedance-2-0-mini'));
  assert.equal(klingFr?.modelHref, '/fr/modeles/kling-3-pro');
  assert.equal(veoEs, undefined);
  assert.equal(gptImage, undefined);
});

test('pricing model links follow pricing publication and exclude deep legacy history', () => {
  // Keyvo's visible P0 families are Wan only; LTX, Grok and FLUX stay upstream-only.
  const p0Ids = new Set(['wan-3-prime', 'wan-3']);
  const deepLegacyIds = new Set(['ltx-2', 'ltx-2-fast', 'wan-2-5']);
  const liveRows = buildPricingHubData('en').video.rows;
  assert.deepEqual(
    liveRows.filter((row) => p0Ids.has(row.id)).map((row) => row.id).sort(),
    [...p0Ids].sort(),
  );
  assert.deepEqual(liveRows.filter((row) => deepLegacyIds.has(row.id)), []);

  const visibleEntries = listFalEngines().map((entry) => p0Ids.has(entry.id) ? {
    ...structuredClone(entry),
    surfaces: {
      ...structuredClone(entry.surfaces),
      modelPage: { ...entry.surfaces.modelPage, indexable: true },
      pricing: { ...entry.surfaces.pricing, includeInEstimator: true },
    },
  } : entry);
  const visibleRows = buildVideoPricingRowsFromEntries(visibleEntries, 'fr');
  for (const id of p0Ids) {
    const row = visibleRows.find((candidate) => candidate.id === id);
    assert.equal(row?.anchorId, `${id}-pricing`);
    assert.equal(row?.modelHref, `/fr/modeles/${id}`);
  }
  assert.deepEqual(visibleRows.filter((row) => deepLegacyIds.has(row.id)), []);
});

test('pricing video matrix links the rendered engine identity to its model page', () => {
  const source = readFileSync(videoMatrixPath, 'utf8');

  assert.match(source, /row\.modelHref \?/);
  assert.match(source, /href=\{row\.modelHref\}/);
});

test('pricing image matrix links the rendered engine identity to its model page', () => {
  const source = readFileSync(otherSurfacesPath, 'utf8');

  assert.match(source, /row\.modelHref \?/);
  assert.match(source, /href=\{row\.modelHref\}/);
});

test('every exposed video pricing row has an exact price or an explicit current-quote placeholder', () => {
  const rows = buildPricingHubData('en').video.rows;
  const missingExactPrice = rows
    .filter((row) => !Object.values(row.quotes).some((quote) => quote.status === 'exact' || quote.status === 'live_quote'))
    .map((row) => row.anchorId);

  assert.deepEqual(missingExactPrice, []);
  const kling = rows.find((row) => row.id === 'kling-v4');
  assert.ok(kling);
  // Keyvo 2026-11-13: Kling 4.0 quotes on the official-list rule (80% of Kling's list) instead of awaiting a tariff.
  assert.ok(Object.values(kling.quotes).some((quote) => quote.status === 'exact'));
});
