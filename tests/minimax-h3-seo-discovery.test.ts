import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import scores from '../data/benchmarks/engine-scores.v1.json' with { type: 'json' };
import compareHubConfig from '../frontend/config/compare-hub.json' with { type: 'json' };
import {
  getComparePageOverride,
} from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-overrides.ts';
import { BEST_FOR_PAGES } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/best-for/[usecase]/_lib/best-for-detail-config.ts';
import { MARKETING_NAV_COMPARE, MARKETING_NAV_MODELS } from '../frontend/config/navigation.ts';
import {
  getHubComparisonSlugsForSitemap,
  getPopularComparisons,
  getUseCaseBuckets,
  isPublishedComparisonSlug,
} from '../frontend/lib/compare-hub/data.ts';
import { getIndexableComparisonLocales } from '../frontend/lib/compare-hub/indexation.ts';
import { buildSeoMetadata } from '../frontend/lib/seo/metadata.ts';
import { computeBenchmarkOverall } from '../frontend/server/benchmark-lab-data.ts';

const LOCALES = ['en', 'fr', 'es'] as const;
const COMPARISONS = [
  'minimax-h3-vs-seedance-2-5',
  'kling-o3-pro-vs-minimax-h3',
] as const;
// Veo is hidden on Keyvo, so its pair with H3 is not published there.
const HIDDEN_COMPARISONS = ['minimax-h3-vs-veo-3-1'] as const;
const REQUIRED_BEST_FOR = [
  'cinematic-realism',
  'character-reference',
  'reference-to-video',
  'multi-shot-video',
  '4k-video',
  'lipsync-dialogue',
] as const;
const COMPARISON_PREFIX = {
  en: '/ai-video-engines',
  fr: '/fr/comparatif',
  es: '/es/comparativa',
} as const;
const REPO_ROOT = existsSync(path.join(process.cwd(), 'content', 'comparisons'))
  ? process.cwd()
  : path.resolve(process.cwd(), '..');

function scoreFor(slug: string): number | null {
  const entry = scores.scores.find((candidate) => candidate.modelSlug === slug);
  assert.ok(entry, `missing benchmark score for ${slug}`);
  return computeBenchmarkOverall(entry);
}

test('H3 comparison pages are enriched, localized, canonical, and indexable', () => {
  const sitemapSlugs = getHubComparisonSlugsForSitemap();

  for (const slug of HIDDEN_COMPARISONS) {
    assert.equal(isPublishedComparisonSlug(slug), false, `${slug} is hidden`);
    assert.equal(sitemapSlugs.includes(slug), false, `${slug} is absent from the comparison sitemap`);
  }

  for (const slug of COMPARISONS) {
    assert.equal(isPublishedComparisonSlug(slug), true, `${slug} published pair`);
    assert.ok(sitemapSlugs.includes(slug), `${slug} comparison sitemap membership`);
    assert.deepEqual(getIndexableComparisonLocales(slug), [...LOCALES, 'zh'], `${slug} locale indexation`);

    const raw = readFileSync(path.join(REPO_ROOT, 'content', 'comparisons', `${slug}.json`), 'utf8');
    assert.doesNotMatch(raw, /provisional|estimated|sample|disclaimer|scorecard-only/i);
    assert.doesNotMatch(raw, /\$|\bUSD\b|\bcredits?\b/i, `${slug} must not own mutable pricing totals`);

    for (const locale of LOCALES) {
      const page = getComparePageOverride(locale, slug);
      assert.ok(page?.meta?.title, `${locale} ${slug} title`);
      assert.ok(page.meta.description, `${locale} ${slug} description`);
      assert.ok(page.heroIntro, `${locale} ${slug} hero`);
      assert.ok(page.quickVerdict?.body, `${locale} ${slug} verdict`);
      assert.ok((page.topCards?.length ?? 0) >= 3, `${locale} ${slug} decision cards`);
      assert.ok((page.primaryLinks?.length ?? 0) >= 4, `${locale} ${slug} primary links`);
      assert.ok((page.faq?.items.length ?? 0) >= 4, `${locale} ${slug} FAQs`);

      const metadata = buildSeoMetadata({
        locale,
        title: page.meta.title,
        description: page.meta.description,
        englishPath: `/ai-video-engines/${slug}`,
        availableLocales: getIndexableComparisonLocales(slug),
      });
      assert.equal(
        metadata.alternates?.canonical,
        `https://app.keyvo.cn${COMPARISON_PREFIX[locale]}/${slug}`,
      );
      assert.deepEqual(metadata.alternates?.languages, {
        zh: `https://app.keyvo.cn/zh/ai-video-engines/${slug}`,
        'x-default': `https://app.keyvo.cn/zh/ai-video-engines/${slug}`,
      });
    }
  }
});

test('score order keeps H3 just below Kling O3 Pro and below Seedance 2.5', () => {
  assert.equal(scoreFor('seedance-2-5'), 9.1);
  assert.equal(scoreFor('kling-o3-pro'), 8.6);
  assert.equal(scoreFor('minimax-h3'), 8.5);
});

test('bounded discovery surfaces retain both H3 variants and Seedance 2.5 after the Max launch', () => {
  assert.deepEqual(
    MARKETING_NAV_MODELS.slice(0, 5).map(({ key, badge }) => ({ key, badge })),
    [
      { key: 'kling-v4-flash', badge: 'new' },
      { key: 'kling-v4', badge: 'new' },
      { key: 'minimax-h3', badge: 'new' },
      { key: 'minimax-h3-max', badge: 'new' },
      { key: 'seedance-2-5', badge: 'new' },
    ],
  );
  // H3 Max is served on Keyvo again (MiniMax's own API), so it and its H3 pair return to the menus.
  assert.ok(MARKETING_NAV_COMPARE.some(({ key }) => key === 'minimax-h3-vs-minimax-h3-max'));
  // FLUX 3 Max (and the FLUX pair) is hidden as a non-mainland family. Keyvo shows only keyvo-visible-families (no LTX or Veo pairs); the kling-v4 pairs lead the menu.
  assert.equal(MARKETING_NAV_COMPARE.length, 8, 'the LTX and Veo-led menu entries are hidden on Keyvo');
  assert.equal(MARKETING_NAV_COMPARE[0]?.key, 'kling-v4-vs-kling-v4-flash');
  assert.equal(MARKETING_NAV_COMPARE[3]?.key, 'minimax-h3-vs-seedance-2-5');
  assert.ok(MARKETING_NAV_COMPARE.some(({ key }) => key === 'minimax-h3-vs-seedance-2-5'));

  const popular = getPopularComparisons();
  assert.equal(compareHubConfig.popularComparisons.length, 45, 'planned comparison inventory includes P0, P1, trend and Max scoreboards');
  assert.deepEqual(popular.slice(0, 1).map(({ slug }) => slug), ['minimax-h3-vs-seedance-2-5'], 'the FLUX 3 Max pair that leads upstream is hidden on Keyvo');

  const buckets = new Map(getUseCaseBuckets().map((bucket) => [bucket.id, bucket.pairs]));
  // The image-to-video bucket only surfaced the H3 vs Veo pair, which is hidden on Keyvo.
  for (const bucketId of ['cinematic', 'audio', 'best-value', 'best-quality', 'text-to-video']) {
    assert.ok(
      buckets.get(bucketId)?.some((pair) => COMPARISONS.includes(pair.slug as (typeof COMPARISONS)[number])),
      `${bucketId} should surface an H3 comparison`,
    );
  }
});

test('H3 is fully linked from the six required Best For decision pages', () => {
  const pages = new Map(BEST_FOR_PAGES.map((page) => [page.slug, page]));

  for (const slug of REQUIRED_BEST_FOR) {
    const page = pages.get(slug);
    assert.ok(page, `${slug} Best For page`);
    assert.ok(page.topPicks?.includes('minimax-h3'), `${slug} should rank H3`);
    // The authored 4K list is upstream's and links H3 only through its Veo pair, which Keyvo hides at read time.
    const authoredH3Pairs = [...COMPARISONS, ...HIDDEN_COMPARISONS] as readonly string[];
    assert.ok(
      page.relatedComparisons?.some((comparison) => authoredH3Pairs.includes(comparison)),
      `${slug} should link an H3 comparison`,
    );
  }
});
