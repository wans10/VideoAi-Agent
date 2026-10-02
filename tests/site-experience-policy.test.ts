import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { resolveSiteLanguageRedirect } from '../frontend/lib/middleware/site-language';
import { publishedLocales, resolveSiteLocale } from '../frontend/i18n/locales';
import { buildMetadataUrls } from '../frontend/lib/metadataUrls';
import { MARKETING_SITE_NAV_LINKS, MARKETING_NAV_ASSISTANTS } from '../frontend/config/navigation';
import { getMcpPublicationState } from '../frontend/lib/mcp-publication';
import { buildRobotsText } from '../frontend/lib/seo/robots-text';
import publication from '../frontend/config/mcp-publication.json';
import { buildModelsSitemapXmlFromRoster } from '../frontend/lib/sitemapData';

test('disabled public languages redirect to the matching Chinese route, retaining query state', () => {
  for (const [from, expected] of [
    ['/', '/zh'], ['/pricing', '/zh/pricing'], ['/fr/tarifs', '/zh/pricing'],
    ['/es/modelos/seedance-2-5?ref=abc', '/zh/models/seedance-2-5?ref=abc'],
    ['/en/models', '/zh/models'], ['/fr/models/happy-horse-1.0', '/zh/models/happy-horse-1.0'], ['/zh/models?lang=en', '/zh/models'],
    ['/fr/login?next=%2Fapp', '/login?next=%2Fapp'],
  ]) {
    const response = resolveSiteLanguageRedirect(new NextRequest(`https://example.com${from}`));
    assert.equal(response?.status, 307, from);
    assert.equal(response?.headers.get('location'), `https://example.com${expected}`, from);
  }
  for (const path of ['/zh', '/zh/models', '/api/jobs', '/auth/callback?code=test', '/oauth/consent', '/app', '/robots.txt']) {
    assert.equal(resolveSiteLanguageRedirect(new NextRequest(`https://example.com${path}`)), null, path);
  }
  assert.equal(resolveSiteLanguageRedirect(new NextRequest('https://example.com/login', { method: 'POST' })), null);
});

test('only Chinese is selectable and advertised in metadata', () => {
  assert.deepEqual(publishedLocales, ['zh']);
  for (const locale of ['en', 'fr', 'es', undefined]) assert.equal(resolveSiteLocale(locale), 'zh');
  const urls = buildMetadataUrls('zh', undefined, { englishPath: '/pricing', availableLocales: ['en', 'fr', 'es', 'zh'] });
  assert.deepEqual(Object.keys(urls.languages), ['zh', 'x-default']);
  assert.equal(urls.languages['x-default'], urls.canonical);
  assert.deepEqual(urls.alternateOg, []);
  const robots = buildRobotsText('public');
  assert.match(robots, /sitemap-zh.xml/);
  assert.doesNotMatch(robots, /sitemap-(en|fr|es).xml/);
});

test('MCP is hidden from public navigation without deleting transport capabilities', () => {
  assert.equal(getMcpPublicationState(publication).renderPublicPage, false);
  assert.equal(getMcpPublicationState(publication).indexable, false);
  assert.ok(!MARKETING_SITE_NAV_LINKS.some(item => item.key === 'pipeline'));
  assert.deepEqual(MARKETING_NAV_ASSISTANTS, []);
  assert.equal(publication.transport, true);
});

test('model sitemap only publishes Chinese models and omits models without Chinese content', async () => {
  const roster = ['translated-model', 'english-only-model'].map(modelSlug => ({
    modelSlug,
    surfaces: { modelPage: { indexable: true, includeInSitemap: true } },
  }));
  const xml = await buildModelsSitemapXmlFromRoster(roster, {
    getLastModified: () => undefined,
    hasLocale: (slug, locale) => slug === 'translated-model' || locale === 'en',
  });
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]).pathname);
  assert.deepEqual(urls, ['/zh/models/translated-model']);
  assert.doesNotMatch(xml, /english-only-model|hreflang="(?:en|fr|es)"/);
});
