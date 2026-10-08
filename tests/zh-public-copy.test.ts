import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { handleMarketingSlug } from '../frontend/lib/middleware/routing-marketing';
import { LOCALE_STRIPPABLE_PREFIXES } from '../frontend/lib/middleware/routing-locale';
import { buildCompareFaqItems } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-faq';
import { buildRelatedComparisonLinks } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-related-links';
import { CATALOG_BY_SLUG } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-config';
import { buildSpecValues } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-spec-values';

const zh = JSON.parse(readFileSync('frontend/messages/zh.json', 'utf8'));

test('Chinese return policy survives the real marketing routing and locale stripping boundaries', () => {
  const req = new NextRequest('https://videoai.omninodetech.com/zh/return-policy');
  assert.equal(handleMarketingSlug(req, req.nextUrl.pathname), null);
  assert.ok(!LOCALE_STRIPPABLE_PREFIXES.includes('/return-policy'));
});

for (const native4k of [false, true]) {
  test(`Chinese scoreboard FAQ remains localized with native 4K = ${native4k}`, () => {
    const left = CATALOG_BY_SLUG.get('minimax-h3')!;
    const right = CATALOG_BY_SLUG.get('seedance-2-5')!;
    const items = buildCompareFaqItems({
      activeLocale: 'zh', compareCopy: zh.comparePage,
      labels: { supported: '支持', notSupported: '不支持', pending: '待验证' },
      left, right,
      leftPricingDisplay: { headline: '价格待验证', subline: null, prices: [] },
      rightPricingDisplay: { headline: '价格待验证', subline: null, prices: [] },
      leftSpecs: buildSpecValues(left), rightSpecs: buildSpecValues(right),
      pairHasKling3Native4k: native4k, pairHasNativeAudio: true,
      specLabels: zh.comparePage.specLabels, hasShowdownSlots: false,
    });
    assert.ok(items.length >= 10);
    for (const item of items) {
      assert.match(item.question, /[\u3400-\u9fff]/);
      assert.doesNotMatch([item.question, item.answer].flat().join(' '), /It depends on your workflow|Why can results differ|Models interpret instructions/);
    }
  });
}

test('Chinese related comparisons and metadata localize prose while retaining model names', () => {
  const links = buildRelatedComparisonLinks('minimax-h3-vs-seedance-2-5', 'zh');
  assert.ok(links.length > 0);
  links.forEach((link) => assert.match(link.label, / 对比 /));
  for (const entry of [zh.comparePage.meta, ...Object.values(zh.comparePage.meta.slugOverrides)] as Array<{ title: string; description: string }>) {
    assert.match(entry.title, /[\u3400-\u9fff]/);
    assert.match(entry.description, /[\u3400-\u9fff]/);
    assert.doesNotMatch(`${entry.title} ${entry.description}`, /Compare |Specs & Pricing|Speed 对比 Quality|AI Video Model Comparison/);
  }
});
