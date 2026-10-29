import assert from 'node:assert/strict';
import test from 'node:test';
import { getPayAsYouGoContent } from '../frontend/app/(localized)/[locale]/(marketing)/pay-as-you-go-ai-video-generator/_content/index.ts';
import { buildPayAsYouGoPageData } from '../frontend/app/(localized)/[locale]/(marketing)/pay-as-you-go-ai-video-generator/_lib/payg-page-data.ts';
import { isKeyvoVisibleFamily } from '../frontend/config/keyvo-model-visibility.ts';
import { getFalEngineById } from '../frontend/src/config/falEngines.ts';
import { buildPricingHubData } from '../frontend/app/(localized)/[locale]/(marketing)/pricing/_lib/pricingHubData.ts';

const allP0Ids = [
  'wan-3-prime', 'ltx-2-5-fast', 'wan-3-prime', 'wan-3',
  'grok-imagine-video-1-5', 'flux-3', 'flux-3-draft',
];
// Keyvo's public pricing pages only expose visible (Chinese-vendor) families.
const p0Ids = new Set(allP0Ids.filter((id) => isKeyvoVisibleFamily(getFalEngineById(id)?.family)));
const hiddenP0Ids = allP0Ids.filter((id) => !p0Ids.has(id));

test('Pay-as-you-go data is render-ready and does not mutate content or pricing input', () => {
  const content = structuredClone(getPayAsYouGoContent('en'));
  const pricingHub = structuredClone(buildPricingHubData('en'));
  const contentBefore = structuredClone(content);
  const pricingBefore = structuredClone(pricingHub);
  const data = buildPayAsYouGoPageData({ locale: 'en', content, pricingHub });

  assert.deepEqual(content, contentBefore);
  assert.deepEqual(pricingHub, pricingBefore);
  assert.equal(data.hero.title, content.hero.title);
  assert.equal(data.workflow.items[0].icon, 'engine');
  assert.ok(data.hero.quote.previewRows.length <= 4);
  assert.ok(data.pricing.rows.every((row) => row.priceCells.every((cell) => cell.displayValue.trim())));
});

test('published P0 models are discoverable through PAYG rows, lookups, examples, and model links', () => {
  for (const locale of ['en', 'fr', 'es'] as const) {
    const data = buildPayAsYouGoPageData({ locale, content: getPayAsYouGoContent(locale) });
    const exposedIds = new Set([
      ...data.pricing.rows,
      ...data.hero.quote.previewRows,
      ...data.modelTesting.items,
      ...data.priceLookups.items,
      ...data.exampleCosts.items,
    ].map((item) => item.id).filter((id) => p0Ids.has(id)));
    assert.deepEqual([...exposedIds].sort(), [...p0Ids].sort());
    const hiddenExposed = [
      ...data.pricing.rows, ...data.hero.quote.previewRows, ...data.modelTesting.items,
      ...data.priceLookups.items, ...data.exampleCosts.items,
    ].filter((item) => hiddenP0Ids.includes(item.id));
    assert.deepEqual(hiddenExposed, [], `${locale}: hidden models must not appear in PAYG`);
    for (const id of p0Ids) {
      assert.ok(data.modelTesting.items.some((item) => item.id === id && item.href.includes(id)), `${locale}:${id}`);
      assert.ok(data.priceLookups.items.some((item) => item.id === id && item.modelHref?.includes(id)), `${locale}:${id}:lookup`);
    }
  }
});

test('displayed pricing remains a live projection of the pricing hub', () => {
  const content = getPayAsYouGoContent('en');
  const pricingHub = structuredClone(buildPricingHubData('en'));
  const sourceId = 'wan-3-prime';
  const sourceRow = pricingHub.video.rows.find((row) => row.id === sourceId);
  assert.ok(sourceRow);
  sourceRow.quotes['5s-720p'] = { status: 'exact', display: '$987.65' };
    const sampleSourceRow = pricingHub.video.rows.find((row) => row.id === 'kling-3-turbo-pro');
  assert.ok(sampleSourceRow);
  sampleSourceRow.quotes['8s-1080p'] = { status: 'exact', display: '$876.54' };

  const data = buildPayAsYouGoPageData({ locale: 'en', content, pricingHub });
  const cell = data.pricing.rows
    .find((row) => row.id === sourceId)
    ?.priceCells.find((item) => item.presetId === '5s-720p');

  assert.equal(cell?.value, '$987.65');
  assert.equal(cell?.displayValue, 'Example : $987.65');
  assert.equal(cell?.renderReady, true);
  assert.equal(
    data.hero.quote.previewRows.find((row) => row.id === sourceId)?.quoteLabel,
    '$987.65',
  );
  assert.equal(
    data.priceLookups.items.find((item) => item.id === sourceId)?.price,
    '$987.65',
  );
  assert.equal(
    data.exampleCosts.items.find((item) => item.id === sourceId)?.price,
    '$987.65',
  );
  assert.equal(data.hero.quote.sampleCost?.price, '$876.54');
  assert.doesNotMatch(JSON.stringify(content), /987\.65|876\.54/);
});

test('live-quote status stays invisible independently of localized display prose', () => {
  const content = getPayAsYouGoContent('fr');
  const pricingHub = structuredClone(buildPricingHubData('fr'));
  const sourceRow = pricingHub.video.rows.find((row) => row.id === 'wan-3-prime');
  assert.ok(sourceRow);
  sourceRow.quotes['5s-720p'] = { status: 'live_quote', display: 'Devis en direct' };
  sourceRow.quotes['8s-1080p'] = { status: 'closest', display: '$12.34' };
  sourceRow.quotes['10s-1080p'] = { status: 'unsupported', display: '—' };

  const data = buildPayAsYouGoPageData({ locale: 'fr', content, pricingHub });
  const row = data.pricing.rows.find((candidate) => candidate.id === 'wan-3-prime');
  const liveQuoteCell = row?.priceCells.find((cell) => cell.presetId === '5s-720p');
  const closestCell = row?.priceCells.find((cell) => cell.presetId === '8s-1080p');
  const unsupportedCell = row?.priceCells.find((cell) => cell.presetId === '10s-1080p');

  assert.equal(liveQuoteCell?.value, 'Devis en direct');
  assert.equal(liveQuoteCell?.displayValue, 'Devis en direct');
  assert.equal(liveQuoteCell?.renderReady, false);
  assert.doesNotMatch(liveQuoteCell?.displayValue ?? '', /Exemple\s*:/);
  assert.equal(closestCell?.displayValue, 'Exemple : $12.34');
  assert.equal(closestCell?.renderReady, true);
  assert.equal(unsupportedCell?.displayValue, '—');
  assert.equal(unsupportedCell?.renderReady, false);
  assert.equal(
    data.hero.quote.previewRows.find((candidate) => candidate.id === 'wan-3-prime')?.quoteLabel,
    '$12.34',
  );
});

test('missing quotes preserve the current exact-locale live-quote fallback', () => {
  for (const locale of ['en', 'fr', 'es'] as const) {
    const content = getPayAsYouGoContent(locale);
    const pricingHub = structuredClone(buildPricingHubData(locale));
    const sourceRow = pricingHub.video.rows.find((row) => row.id === 'seedance-2-0');
    assert.ok(sourceRow);
    delete (sourceRow.quotes as Partial<typeof sourceRow.quotes>)['5s-720p'];

    const data = buildPayAsYouGoPageData({ locale, content, pricingHub });
    const cell = data.pricing.rows
      .find((row) => row.id === 'seedance-2-0')
      ?.priceCells.find((item) => item.presetId === '5s-720p');

    assert.equal(cell?.value, content.common.liveQuote);
    assert.equal(cell?.displayValue, content.common.liveQuote);
    assert.equal(cell?.renderReady, false);
  }
});


test('Wan discovery uses a supported 5-second scenario and exact cents for three completed attempts', () => {
  const content = getPayAsYouGoContent('en');
  const pricingHub = structuredClone(buildPricingHubData('en'));
  const row = pricingHub.video.rows.find((candidate) => candidate.id === 'wan-3-prime')!;
  row.quotes['5s-720p'] = { status: 'exact', amountCents: 157, display: '$1.57', note: 'Audio included.' };
  const data = buildPayAsYouGoPageData({ locale: 'en', content, pricingHub });
  assert.equal(data.priceLookups.items.find((item) => item.id === row.id)?.price, '$1.57');
  const example = data.exampleCosts.items.find((item) => item.id === row.id)!;
  assert.equal(example.price, '$1.57');
  assert.match(example.context, /5s 720p/);
  assert.match(example.context, /Audio included/);
  assert.equal(example.href, '/app?engine=wan-3-prime');
  assert.match(data.exampleCosts.budget ?? '', /\$1\.57/);
  assert.match(data.exampleCosts.budget ?? '', /\$4\.71/);
});

test('unavailable or non-exact quotes cannot advertise a numeric shortcut or a repeated budget', () => {
  for (const status of ['unsupported', 'live_quote', 'closest'] as const) {
    for (const locale of ['en', 'fr', 'es'] as const) {
      const content = getPayAsYouGoContent(locale);
      const pricingHub = structuredClone(buildPricingHubData(locale));
      const row = pricingHub.video.rows.find((candidate) => candidate.id === 'wan-3-prime')!;
      row.quotes['5s-720p'] = { status, amountCents: 157, display: '$1.57' };
      const data = buildPayAsYouGoPageData({ locale, content, pricingHub });
      assert.equal(data.priceLookups.items.find((item) => item.id === row.id)?.price, content.common.liveQuote);
      assert.equal(data.exampleCosts.items.find((item) => item.id === row.id)?.price, content.common.liveQuote);
      assert.equal(data.exampleCosts.budget, undefined);
    }
  }
});
