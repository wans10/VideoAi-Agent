import './helpers/keyvo-unfiltered-catalog';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { listRuntimeModels } from '../frontend/config/model-runtime';
import { buildMarketingModelMenu, buildMarketingCompareMenu } from '../frontend/config/navigation';
import { FOOTER_MODELS, FOOTER_COMPARISONS } from '../frontend/config/marketing-footer';
import { buildModelFamilyDefinitions } from '../frontend/config/model-families';
import { buildPublicBestForEntries } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/best-for/[usecase]/_lib/best-for-detail-config';
import { getLocalizedModelData } from '../frontend/lib/examples/modelLandingData';
import { getPublishedComparisonSlugs, getHubComparisonSlugsForSitemap } from '../frontend/lib/compare-hub/data';
import { getIndexableComparisonLocales } from '../frontend/lib/compare-hub/indexation';
import { buildLlmsModelDiscoveryProjection } from '../frontend/lib/seo/llms-text';
import { loadBenchmarkLabStaticData } from '../frontend/server/benchmark-lab-data';
import { buildBenchmarkPageData } from '../frontend/app/(localized)/[locale]/(marketing)/benchmarks/_lib/benchmark-page-data';
import { buildComparisonMetrics } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-scorecard';
import { parseComparePageContentDocument } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-overrides';
import { BEST_FOR_PAGES } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/best-for/[usecase]/_lib/best-for-detail-config';
import { getModelGuidance } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/best-for/[usecase]/_lib/best-for-model-guidance';
import { DEFAULT_PAYG_DISCOVERY_CONFIGS } from '../frontend/app/(localized)/[locale]/(marketing)/pay-as-you-go-ai-video-generator/_lib/payg-discovery-config';
import compareConfig from '../frontend/config/compare-config.json';
import trainingPolicy from '../frontend/config/ai-training-public-policy.json';

const flash = 'seedance-2-5-flash';
const pairs = [
  'seedance-2-5-vs-seedance-2-5-flash',
  'seedance-2-0-fast-vs-seedance-2-5-flash',
  'kling-v4-flash-vs-seedance-2-5-flash',
  'seedance-2-5-flash-vs-veo-3-1-fast',
  'ltx-2-5-fast-vs-seedance-2-5-flash',
  'minimax-h3-vs-seedance-2-5-flash',
];
// Keyvo offers Flash but keeps its model page unpublished; the public projections below gate on that page. These
// helpers supply the page-published view so the editorial and rendering contracts stay exercised.
function withFlashPagePublished(): ReturnType<typeof listRuntimeModels> {
  return listRuntimeModels().map(model => model.slug === flash
    ? { ...model, publication: { ...model.publication, model: { ...model.publication.model, published: true, indexable: true } } } : model);
}
const uses = ['fast-drafts', 'image-to-video', 'character-reference', 'reference-to-video', 'multi-shot-video', 'ads', 'ugc-ads', 'product-videos'];

test('six Flash comparison documents stay localized and out of discovery while the Flash compare is unpublished on Keyvo', () => {
  const published = getPublishedComparisonSlugs();
  const sitemap = getHubComparisonSlugsForSitemap();
  const assistant = buildLlmsModelDiscoveryProjection();
  // Keyvo: assistant featured models come from published model pages, and the Flash page is unpublished.
  assert.equal(assistant.currentModels.some(model => model.id === flash), false);
  for (const pair of pairs) {
    const file = `content/comparisons/${pair}.json`;
    const document = parseComparePageContentDocument(readFileSync(file, 'utf8'), pair, file);
    // Keyvo unpublished the Flash compare (no registry pairs), so no pair is published or in the sitemap.
    assert.equal(published.includes(pair), false, pair);
    assert.equal(sitemap.includes(pair), false, pair);
    // Keyvo keeps comparison pages out of assistant discovery (compare hub hidden), so the pair is not a primary comparison.
    assert.equal(assistant.primaryComparisons.some(item => item.slug === pair), false);
    assert.ok(compareConfig.scoreboardOnlyComparisons.includes(pair));
    // Keyvo also indexes the Chinese comparison document, so require the upstream locales rather than an exact set.
    const indexable = getIndexableComparisonLocales(pair);
    for (const locale of ['en', 'fr', 'es']) assert.ok(indexable.includes(locale as 'en'), locale);
    for (const [locale, prefix] of [['en', '/ai-video-engines/'], ['fr', '/fr/comparatif/'], ['es', '/es/comparativa/']] as const) {
      const content = document[locale];
      assert.ok(content.meta?.title && content.meta.description && content.heroIntro && content.quickVerdict);
      assert.equal(content.topCards?.length, 4);
      assert.equal(content.faq?.items.length, 5);
      assert.ok(content.primaryLinks!.some(link => link.href.endsWith(`/models/${flash}`) || link.href.endsWith(`/modeles/${flash}`) || link.href.endsWith(`/modelos/${flash}`)));
      const examplesPrefix = locale === 'en' ? '/examples' : locale === 'fr' ? '/fr/galerie' : '/es/galeria';
      assert.ok(content.primaryLinks!.some(link => link.href === `${examplesPrefix}/seedance`));
      assert.ok(trainingPolicy.pageTargets.includes(prefix + pair));
      assert.doesNotMatch(JSON.stringify(content), /\$\s*\d|\d+(?:\.\d+)?\s*(?:USD|EUR)|\.mp4|\.webm/);
    }
  }
});

test('menus and footer omit the unpublished Flash comparisons while PAYG and standard Seedance stay intact', () => {
  const menu = buildMarketingModelMenu(listRuntimeModels());
  // The marketing model menu lists published model pages only; Flash's page is unpublished on Keyvo.
  assert.equal(menu.some(item => item.slug === flash), false);
  assert.ok(menu.some(item => item.slug === 'seedance-2-5'));
  assert.equal(buildMarketingCompareMenu(listRuntimeModels()).some(item => item.slug === pairs[0]), false);
  // The footer model list is selected from the marketing navigation, so the unpublished Flash page is absent there.
  assert.equal(FOOTER_MODELS.some(item => item.key === flash), false);
  assert.equal(FOOTER_COMPARISONS.some(item => item.key === pairs[0]), false);
  for (const [name, group] of Object.entries(DEFAULT_PAYG_DISCOVERY_CONFIGS)) {
    // Keyvo offers Flash but its PAYG supported-model list omits it while the model page is unpublished.
    assert.equal(group.some(item => item.id === flash), name !== 'supportedModels');
    assert.ok(group.some(item => item.id === 'seedance-2-5'));
  }
});

test('Best for adds a workflow option to eight uses without a 4K or measured-quality recommendation', () => {
  // Keyvo's public Best for lists only published model pages, so Flash is absent until its page is published.
  assert.equal(BEST_FOR_PAGES.some(entry => entry.topPicks?.includes(flash)), false);
  const bestFor = buildPublicBestForEntries(compareConfig.bestForPages as Parameters<typeof buildPublicBestForEntries>[0], withFlashPagePublished());
  assert.deepEqual(bestFor.filter(entry => entry.topPicks?.includes(flash)).map(entry => entry.slug).sort(), [...uses].sort());
  for (const use of uses) {
    const entry = bestFor.find(entry => entry.slug === use)!;
    assert.equal(entry.topPicks!.at(-1), flash, 'keep established editorial order');
    assert.ok(entry.relatedComparisons?.some(pair => pairs.includes(pair)));
    for (const locale of ['en', 'fr', 'es'] as const) {
      const guidance = getModelGuidance(flash, locale, use)!;
      assert.match(guidance.reason, /480p|720p/);
      assert.match(guidance.limit, /4K/);
      assert.ok(guidance.tag && guidance.limit);
    }
  }
});

test('Seedance family copy keeps canonical identity, earlier explanations and exact media attribution', () => {
  // Family copy adds Flash only when its examples are published (Keyvo keeps them unpublished), so the registry view
  // keeps the earlier copy, and the addition mechanism is exercised on a view where Flash's examples are published.
  const keyvoModels = listRuntimeModels();
  const mechanism = keyvoModels.map(model => structuredClone(model));
  const flashEntry = mechanism.find(model => model.id === flash)!;
  Object.assign(flashEntry.publication.model, { published: true, indexable: true });
  Object.assign(flashEntry.publication.examples, { published: true, current: true, includeInFamilyCopy: true });
  const closed = structuredClone(mechanism);
  closed.find(model => model.id === flash)!.publication.examples.includeInFamilyCopy = false;
  const families = buildModelFamilyDefinitions(mechanism);
  // Keyvo's Seedance family default is its own mainland-first choice (config/model-families.ts), not upstream's 2.0.
  assert.equal(families.find(family => family.id === 'seedance')!.defaultModelSlug, 'seedance-2-5');
  assert.equal(families.find(family => family.id === 'seedance')!.navLabel, 'Seedance');
  for (const locale of ['en', 'fr', 'es'] as const) {
    const keyvo = getLocalizedModelData(locale, buildModelFamilyDefinitions(keyvoModels), keyvoModels).seedance!;
    const baseline = getLocalizedModelData(locale, families, closed).seedance!;
    assert.equal(keyvo.summary, baseline.summary, `${locale}: unpublished Flash examples add no family copy on Keyvo`);
    const current = getLocalizedModelData(locale, families, mechanism).seedance!;
    assert.match(current.summary!, /Seedance 2\.5 Flash/);
    assert.match(current.strengthsLimits!, /MP4.*MOV/);
    assert.doesNotMatch(current.strengthsLimits!, /visual input required|entrée visuelle nécessaire|entrada visual necesaria/);
    assert.equal(current.metaTitle, baseline.metaTitle);
    assert.deepEqual(current.faq.slice(0, baseline.faq.length), baseline.faq);
    assert.equal(current.faq.length, baseline.faq.length + 1);
  }
});

test('benchmark exposes Flash estimates and factual specs, keeps missing metrics empty and respects registry removal', async () => {
  const data = await loadBenchmarkLabStaticData();
  const latency = { status: 'unavailable', windowDays: 30, asOf: null, rows: [] } as const;
  // Keyvo's default public table excludes Flash while its model page is unpublished.
  const publicPage = buildBenchmarkPageData(data, { ...latency, rows: [] });
  assert.equal(publicPage.scores.some(score => score.modelSlug === flash), false);
  const page = buildBenchmarkPageData(data, { ...latency, rows: [] }, withFlashPagePublished());
  const score = page.scores.find(score => score.modelSlug === flash)!;
  assert.ok(score);
  assert.equal(score.overall, 8.0);
  assert.equal(score.review?.status, 'editorial-estimated');
  const spec = page.specs.find(spec => spec.modelSlug === flash)!;
  assert.ok(spec);
  assert.equal(spec.maxResolution, '480p / 720p');
  assert.equal(spec.maxDuration, '4–30s');
  assert.equal(spec.references, 'Up to 10 image references');
  const metrics = buildComparisonMetrics({ compareCopy: {}, leftScore: null, rightScore: null, pairHasNativeAudio: true, speedScores: { leftScore: null, rightScore: null } });
  assert.equal(metrics.length, 10);
  assert.ok(metrics.every(metric => metric.leftValue === null && metric.rightValue === null));
  const models = withFlashPagePublished().map(model => structuredClone(model));
  models.find(model => model.id === flash)!.publication.model.published = false;
  const removed = buildBenchmarkPageData(data, { ...latency, rows: [] }, models);
  assert.equal(removed.specs.some(spec => spec.modelSlug === flash), false);
  assert.equal(removed.scores.some(score => score.modelSlug === flash), false);
});
