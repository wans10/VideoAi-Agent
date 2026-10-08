import assert from 'node:assert/strict';
import test from 'node:test';

import { HREFLANG_VARIANTS } from '../frontend/lib/seo/alternateLocales';
import { buildMetadataUrls } from '../frontend/lib/metadataUrls.ts';
import { buildDetailSlugMap } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-links.ts';

// Match Google Search's supported hreflang structure for our use case:
// ISO 639-1 language, optional ISO 15924 script, optional ISO 3166-1 alpha-2 region.
const SUPPORTED_HREFLANG_PATTERN = /^[a-z]{2}(?:-[A-Za-z]{4})?(?:-[A-Za-z]{2})?$/;

test('hreflang variants use Google-supported language and region codes', () => {
  for (const variant of HREFLANG_VARIANTS) {
    assert.match(
      variant.hreflang,
      SUPPORTED_HREFLANG_PATTERN,
      `Unsupported hreflang variant: ${variant.hreflang}`
    );
  }
});

test('only the authored published Chinese locale is advertised', () => {
  assert.deepEqual(HREFLANG_VARIANTS, [{ hreflang: 'zh', locale: 'zh' }]);
});

test('Seedance 2.5 and 2.0 expose reciprocal EN, FR, ES, and x-default model routes', () => {
  for (const slug of ['seedance-2-5', 'seedance-2-0'] as const) {
    const expectedUrls = {
      en: `https://app.keyvo.cn/models/${slug}`,
      fr: `https://app.keyvo.cn/fr/modeles/${slug}`,
      es: `https://app.keyvo.cn/es/modelos/${slug}`,
    };
    const expectedLanguages = { 'x-default': `https://app.keyvo.cn/zh/models/${slug}` };

    for (const locale of ['en', 'fr', 'es'] as const) {
      const metadataUrls = buildMetadataUrls(locale, buildDetailSlugMap(slug), {
        englishPath: `/models/${slug}`,
        availableLocales: ['en', 'fr', 'es'],
      });

      assert.equal(metadataUrls.canonical, expectedUrls[locale]);
      assert.deepEqual(metadataUrls.languages, expectedLanguages);
    }
  }
});
