// Keyvo publishes no comparison routes (they 404), so no customer-visible link, card or button may point to one.
// The test-only reopen KEYVO_COMPARE_FULL_UI=1 is never set here: every assertion runs with the flag on.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { isCompareRouteHref, isKeyvoCompareHidden, KEYVO_COMPARE_HIDDEN } from '../frontend/config/keyvo-model-visibility';
import { getFalEngineBySlug } from '../frontend/src/config/falEngines';
import { applyCapabilityTokens, formatMaxResolution, formatZhResolutionList } from '../frontend/lib/models/content-capability-tokens';
import { isComparisonLinkable, isPublishedComparisonSlug } from '../frontend/lib/compare-hub/data';
import { buildModelDecisionData } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-decision-data';
import { buildDecisionTocItems } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-decision-toc';
import { ModelDecisionHeroSection } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_components/ModelDecisionHeroSection';
import { ModelCinematicAlternatives } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_components/ModelCinematicAlternatives';
import { buildExamplesNextStepLinks } from '../frontend/app/(localized)/[locale]/(marketing)/examples/_lib/examples-page-copy';
import { buildPricingHubData } from '../frontend/app/(localized)/[locale]/(marketing)/pricing/_lib/pricingHubData';
import { buildHomeComparisonLinks } from '../frontend/app/(localized)/[locale]/(marketing)/(home)/_lib/home-comparison-data';

const requireFrontend = createRequire(path.resolve('frontend/package.json'));
const React = requireFrontend('react');
const { renderToStaticMarkup } = requireFrontend('react-dom/server');
const { NextIntlClientProvider } = requireFrontend('next-intl');
(globalThis as typeof globalThis & { React: typeof React }).React = React;

const offered: string[] = JSON.parse(readFileSync('frontend/config/keyvo-model-allowlist.json', 'utf8')).offeredEngineIds;
const zhDoc = (slug: string) => {
  try { return JSON.parse(readFileSync(`content/models/zh/${slug}.json`, 'utf8')) as Record<string, any>; } catch { return null; }
};
const isCompareHref = (href: string) => isCompareRouteHref(href) || /compare|-vs-/.test(href);

test('the comparison flag is on and routes stay as published by the registry', () => {
  assert.equal(KEYVO_COMPARE_HIDDEN, true);
  assert.equal(isKeyvoCompareHidden(), true);
  assert.equal(isComparisonLinkable('seedance-2-0-vs-seedance-2-5'), false);
  // The registry publication itself is unchanged: only customer links are withheld.
  assert.equal(typeof isPublishedComparisonSlug('seedance-2-0-vs-seedance-2-5'), 'boolean');
  assert.equal(isCompareRouteHref('/zh/ai-video-engines/seedance-2-0-vs-seedance-2-5?order=seedance-2-5'), true);
  assert.equal(isCompareRouteHref('/zh/benchmarks#review-x'), true);
  assert.equal(isCompareRouteHref('/zh/models/seedance-2-5'), false);
  assert.equal(isCompareRouteHref('/zh/pricing#seedance-2-5-pricing'), false);
});

test('no zh model page decision data links to a comparison route', () => {
  let checked = 0;
  for (const slug of offered) {
    const doc = zhDoc(slug);
    const engine = getFalEngineBySlug(slug);
    if (!doc?.decision || !engine) continue;
    // Pretend every pair is published: the flag, not publication, must withhold the link.
    const data = buildModelDecisionData({
      engine, locale: 'zh', decisionContent: applyCapabilityTokens(doc.decision, engine.engine.resolutions as string[]),
      isComparisonPublished: () => true,
    });
    if (!data) continue;
    checked += 1;
    const hrefs = [
      data.hero.primaryCta.href, data.hero.secondaryCta.href, data.pricing.cta.href,
      ...data.hero.quickLinks.map((link) => link.href), ...data.decisionCards.map((card) => card.cta.href),
    ];
    for (const href of hrefs) assert.ok(!isCompareHref(href), `${slug}: ${href}`);
  }
  assert.ok(checked >= 5, 'the zh decision content of the offered models was checked');
});

test('the seedance-2-5 hero action row keeps price and prompt links without the compare action', () => {
  const engine = getFalEngineBySlug('seedance-2-5')!;
  const doc = zhDoc('seedance-2-5')!;
  assert.ok(doc.decision.hero.quickLinks.some((link: { href: string }) => isCompareHref(link.href)), 'the authored content still lists the comparison link');
  const decision = buildModelDecisionData({
    engine, locale: 'zh', decisionContent: applyCapabilityTokens(doc.decision, engine.engine.resolutions as string[]),
  })!;
  const html = renderToStaticMarkup(React.createElement(NextIntlClientProvider, { locale: 'zh', messages: {}, timeZone: 'UTC' },
    React.createElement(ModelDecisionHeroSection, {
      decision, localizeModelsPath: (slug?: string) => `/zh/models${slug ? `/${slug}` : ''}`,
      resolvedBreadcrumb: { models: '模型' }, breadcrumbModelLabel: 'Seedance 2.5',
      heroMedia: { id: null, prompt: null, videoUrl: null, posterUrl: null }, locale: 'zh', audioBadgeLabel: '音频', mediaAltContext: '',
    })));
  const row = new JSDOM(html).window.document.querySelector('.model-story-quicklinks');
  assert.ok(row, 'the action row still renders');
  const links = [...row!.querySelectorAll('a')];
  assert.deepEqual(links.map((a) => a.textContent?.trim()), ['查看价格', '提示词示例']);
  assert.ok(links.every((a) => !isCompareHref(a.getAttribute('href') ?? '')));
  assert.ok(!html.includes('ai-video-engines'));
  assert.ok(!html.includes('对比'));
  // Icons follow the target, so the price link does not inherit the removed compare icon.
  assert.equal(row!.querySelectorAll('svg').length, 4);
  assert.ok(row!.querySelector('svg.lucide-tag'), 'price link keeps the tag icon');
  assert.equal(row!.querySelector('svg.lucide-arrow-right-left'), null);
});

test('the page table of contents has no compare entry when the compare section is not rendered', () => {
  const labels = { specs: '规格', examples: '案例', prompting: '提示词', tips: '技巧', compare: '价格与对比', safety: '安全', faq: '常见问题' };
  const items = buildDecisionTocItems({
    locale: 'zh', sectionLabels: labels, textAnchorId: 'examples', imageAnchorId: 'prompting', compareAnchorId: 'compare',
    hasExamples: true, hasSpecs: true, hasTextSection: true, hasTipsSection: true, hasCompareSection: false, hasSafetySection: true, hasFaqSection: true,
  });
  assert.ok(items.every((item) => item.id !== 'compare'));
  assert.ok(items.some((item) => item.id === 'decision-pricing' && item.label === '定价'));
});

test('cinematic alternatives render no compare buttons or comparison directory link', () => {
  const html = renderToStaticMarkup(React.createElement(NextIntlClientProvider, { locale: 'zh', messages: {}, timeZone: 'UTC' },
    React.createElement(ModelCinematicAlternatives, {
      content: { title: '对比你的选择。', models: [{ slug: 'seedance-2-5-flash', reason: '更快的草稿' }, { slug: 'seedance-2-0', reason: '稳定的成片' }] },
      slug: 'seedance-2-5', family: [], quickLinks: [], locale: 'zh',
    })));
  const doc = new JSDOM(html).window.document;
  const hrefs = [...doc.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');
  assert.ok(hrefs.length > 0);
  assert.ok(hrefs.every((href) => !isCompareHref(href)), hrefs.join(', '));
  assert.equal(doc.querySelector('.cinema-choice-vs'), null);
});

test('examples, pricing hub and home expose no comparison link in zh', () => {
  for (const familySlug of [undefined, 'seedance', 'kling', 'veo', 'ltx', 'wan', 'minimax']) {
    const links = buildExamplesNextStepLinks({
      appLocale: 'zh', familySlug, isKlingLanding: familySlug === 'kling', isLtxLanding: familySlug === 'ltx',
      isSeedanceLanding: familySlug === 'seedance', isVeoLanding: familySlug === 'veo', locale: 'zh', pricingPath: '/zh/pricing',
    });
    for (const link of links) assert.ok(!isCompareHref(link.href), `examples ${familySlug}: ${link.href}`);
  }
  const hub = buildPricingHubData('zh');
  const hrefs: string[] = [];
  const collect = (value: unknown) => {
    if (typeof value === 'string' && value.startsWith('/')) hrefs.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(hub.video.rows.map((row) => row.links));
  for (const href of hrefs) assert.ok(!isCompareHref(href), `pricing hub: ${href}`);
  assert.deepEqual(buildHomeComparisonLinks(), []);
});

test('the seedance 2.5 zh copy lists the engine resolutions and the flash engine does not offer 4K', () => {
  const full = getFalEngineBySlug('seedance-2-5')!.engine.resolutions as string[];
  const flash = getFalEngineBySlug('seedance-2-5-flash')!.engine.resolutions as string[];
  assert.equal(formatZhResolutionList(full), '480p、720p、1080p 或 4K');
  assert.equal(formatMaxResolution(full), '4K');
  assert.equal(formatZhResolutionList(flash), '480p 或 720p');
  assert.equal(formatMaxResolution(flash), '720p');
  const raw = zhDoc('seedance-2-5')!;
  assert.doesNotMatch(JSON.stringify(raw), /1080p/, 'no hand-written resolution is left in the authored copy');
  const rendered = JSON.stringify(applyCapabilityTokens(raw, full));
  assert.match(rendered, /在 480p、720p、1080p 或 4K、24 FPS 下创建 4–30 秒视频/);
  assert.match(rendered, /最高 4K/);
  assert.doesNotMatch(rendered, /\{\{/);
  assert.doesNotMatch(JSON.stringify(applyCapabilityTokens(raw, flash)), /4K/);
  // Without capability data the token stays visible instead of being replaced by a guess.
  assert.match(JSON.stringify(applyCapabilityTokens(raw, [])), /\{\{maxResolution\}\}/);
});
