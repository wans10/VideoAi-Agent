import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

import { normalizeLegacyBrandDeep, normalizeLegacyBrandText } from '../frontend/lib/seo/brand-text.ts';
import { buildSeoMetadata } from '../frontend/lib/seo/metadata.ts';
import { buildSiteOrganizationSchema, buildSiteWebSiteSchema } from '../frontend/lib/seo/site-organization-schema.ts';
import { KEYVO_SITEMAP_ROUTE_TIMESTAMPS } from '../frontend/config/keyvo-sitemap-timestamps.ts';

const frontendRequire = createRequire(new URL('../frontend/package.json', import.meta.url));
const zhMessages = JSON.parse(readFileSync('frontend/messages/zh.json', 'utf8'));

// Baidu shows about 30 CJK characters of a title and about 78 of a description (latin letters count as half).
const width = (value: string) => [...value].reduce((sum, char) => sum + (/[⺀-鿿＀-￯　-〿]/.test(char) ? 1 : 0.5), 0);

test('the legacy VideoAI name never reaches Keyvo titles, descriptions or share cards', () => {
  assert.equal(normalizeLegacyBrandText('Kling 3 Pro：价格 | VideoAI'), 'Kling 3 Pro：价格 | Keyvo');
  assert.equal(normalizeLegacyBrandText('在 MaxVideoAI 上使用'), '在 Keyvo 上使用');
  assert.equal(normalizeLegacyBrandText('AI Video model'), 'AI Video model');
  assert.deepEqual(normalizeLegacyBrandDeep({ a: ['VideoAI 工作台', { b: 'VideoAI' }], n: 3 }), { a: ['Keyvo 工作台', { b: 'Keyvo' }], n: 3 });
  const metadata = buildSeoMetadata({
    locale: 'zh',
    title: 'Kling 3 Pro：价格 | VideoAI',
    description: '在 VideoAI 上生成 Kling 3 Pro 视频。',
    englishPath: '/models/kling-3-pro',
    imageAlt: 'VideoAI Kling 3 Pro',
  });
  assert.doesNotMatch(JSON.stringify(metadata), /VideoAI/);
  assert.equal((metadata.title as { absolute: string }).absolute, 'Kling 3 Pro：价格 | Keyvo');
});

test('zh model overlays are normalized when loaded', () => {
  const source = readFileSync('frontend/lib/models/i18n.ts', 'utf8');
  assert.match(source, /locale === 'zh' \? normalizeLegacyBrandDeep\(merged\) : merged/);
});

test('home and pricing search snippets fit Baidu limits, name the brand and avoid unoffered models', () => {
  for (const meta of [zhMessages.home.meta, zhMessages.pricing.meta]) {
    assert.ok(width(meta.title) <= 30, `${meta.title} is ${width(meta.title)} wide`);
    assert.ok(width(meta.description) <= 78, `${meta.description} is ${width(meta.description)} wide`);
    assert.match(meta.title, /Keyvo/);
    assert.match(meta.title + meta.description, /AI 视频/);
    assert.doesNotMatch(meta.title + meta.description, /VideoAI|FLUX|Veo|LTX|Sora|Haiper|Luma|Midjourney|Nano Banana/);
  }
  assert.match(zhMessages.home.meta.description, /文生视频/);
  assert.match(zhMessages.home.meta.description, /图生视频/);
});

test('catalog, pay-as-you-go and tools snippets only name models Keyvo offers', () => {
  const sources = [
    'frontend/app/(localized)/[locale]/(marketing)/models/_lib/models-catalog-copy.ts',
    'frontend/app/(localized)/[locale]/(marketing)/pay-as-you-go-ai-video-generator/_content/zh.ts',
  ].map((file) => readFileSync(file, 'utf8'));
  const [catalog, payg] = sources;
  assert.doesNotMatch(catalog, /涵盖 Kling、Haiper|包含 Nano Banana、Midjourney/);
  const paygDescription = payg.match(/description: '([^']+)'/)?.[1] ?? '';
  assert.doesNotMatch(paygDescription, /FLUX|LTX|Veo|Grok/);
  assert.doesNotMatch(payg.match(/features: \[[^\]]+\]/)?.[0] ?? '', /FLUX|LTX|Veo/);
  assert.doesNotMatch(zhMessages.toolMarketing.hub.meta.description, /视角控制/);
});

test('organization and website entities are Chinese, use the real studio name and invent no profiles', () => {
  const organization = buildSiteOrganizationSchema();
  const website = buildSiteWebSiteSchema('zh-CN');
  assert.equal(organization.name, 'Keyvo');
  assert.equal(organization.alternateName, 'Keyvo 影像工作室');
  assert.equal(website.alternateName, 'Keyvo 影像工作室');
  assert.equal(website['@id'], `${organization.url}#website`);
  assert.equal(website.inLanguage, 'zh-CN');
  assert.ok(!('sameAs' in organization) && !('sameAs' in website));
  assert.match(organization.logo, /\/assets\/branding\/app-icon-512\.png$/);
  assert.equal(readFileSync('frontend/public/assets/branding/app-icon-512.png').subarray(1, 4).toString(), 'PNG');
  const studioNameElsewhere = readFileSync('frontend/app/(localized)/[locale]/layout.tsx', 'utf8');
  assert.match(studioNameElsewhere, /Keyvo 影像工作室/, 'the alternate name already appears in the site metadata');
});

test('the zh sitemap lists no account-flow pages and carries only zh and x-default alternates', async () => {
  const react = frontendRequire('react') as { cache?: (fn: unknown) => unknown };
  react.cache ??= (fn) => fn;
  const sitemap = await import('../frontend/lib/sitemapData.ts');
  const xml = await sitemap.buildLocaleSitemapXml('zh');
  assert.doesNotMatch(xml, /\/zh\/legal\/reconsent/);
  assert.match(xml, /<loc>https:\/\/app\.keyvo\.cn\/zh\/pricing<\/loc>/);
  const languages = new Set([...xml.matchAll(/hreflang="([^"]+)"/g)].map((match) => match[1]));
  assert.deepEqual([...languages].sort(), ['x-default', 'zh']);
  const models = await sitemap.buildModelsSitemapXml();
  assert.deepEqual([...new Set([...models.matchAll(/hreflang="([^"]+)"/g)].map((match) => match[1]))].sort(), ['x-default', 'zh']);
});

test('every dated Keyvo route is an ISO date that is not in the future', () => {
  const today = new Date().toISOString().slice(0, 10);
  for (const [route, date] of Object.entries(KEYVO_SITEMAP_ROUTE_TIMESTAMPS)) {
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/, route);
    assert.ok(date <= today, `${route} is dated in the future`);
  }
  assert.ok(!('/legal/reconsent' in KEYVO_SITEMAP_ROUTE_TIMESTAMPS));
});

test('lastmod falls back to the build date, never to the request time', () => {
  const lastmod = readFileSync('frontend/lib/sitemap/lastmod.ts', 'utf8');
  assert.match(lastmod, /process\.env\.SITEMAP_BUILD_DATE/);
  assert.match(readFileSync('frontend/next.config.js', 'utf8'), /env: \{ SITEMAP_BUILD_DATE \}/);
});
