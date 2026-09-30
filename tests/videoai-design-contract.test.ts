import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolveCookieBannerLocale } from '../frontend/components/legal/cookie-banner-copy';
import { recentMediaCopy } from '../frontend/components/library/recent-media-copy';

test('fresh core routes use Chinese consent copy while localized public paths retain their language', () => {
  for (const path of ['/app', '/app/image', '/billing', '/settings', '/login']) assert.equal(resolveCookieBannerLocale(path), 'zh');
  for (const locale of ['zh', 'fr', 'es'] as const) assert.equal(resolveCookieBannerLocale(`/${locale}/pricing`), locale);
  assert.equal(resolveCookieBannerLocale('/pricing'), 'en');
});

test('Chinese recent-media controls include usable loading and recovery copy', () => {
  const copy = recentMediaCopy('zh-CN');
  for (const key of ['title', 'activity', 'loading', 'error', 'retry', 'empty', 'auth'] as const) assert.match(copy[key], /[\u3400-\u9fff]/);
  assert.equal(Object.keys(copy.issues).length, Object.keys(recentMediaCopy('en').issues).length);
});

test('all custom missing-page entries explicitly prohibit indexing', () => {
  for (const file of [
    'frontend/app/404/page.tsx',
    'frontend/app/not-found.tsx',
    'frontend/app/(localized)/[locale]/(marketing)/404/page.tsx',
  ]) assert.match(readFileSync(file, 'utf8'), /robots: \{ index: false, follow: true \}/, file);
});
