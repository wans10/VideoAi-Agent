import assert from 'node:assert/strict';
import test from 'node:test';
import { buildExamplesNextStepLinks, getExamplesMainVideoCopy } from '../frontend/app/(localized)/[locale]/(marketing)/examples/_lib/examples-page-copy';
import { getRuntimeModelByCanonicalSlug } from '../frontend/config/model-runtime';
import { isKeyvoVisibleFamily } from '../frontend/config/keyvo-model-visibility';

for (const locale of ['en', 'fr', 'es'] as const) {
  test(`${locale} Veo and Hailuo journeys offer no hidden comparison links`, () => {
    const pricingPath = locale === 'fr' ? '/fr/tarifs' : locale === 'es' ? '/es/precios' : '/pricing';
    for (const family of ['veo', 'hailuo']) {
      const links = buildExamplesNextStepLinks({
        appLocale: locale, locale, pricingPath, familySlug: family,
        isKlingLanding: false, isLtxLanding: false, isSeedanceLanding: false, isVeoLanding: family === 'veo',
      });
      // Keyvo hides comparison pages, so these journeys offer no comparison links.
      assert.ok(links.length > 0);
      assert.equal(new Set(links.map((link) => link.href)).size, links.length);
      for (const link of links) {
        assert.equal(link.comparison, undefined, link.href);
        assert.doesNotMatch(link.href, /ai-video-engines|comparatif|comparativa/, link.href);
        if (link.modelSlug) assert.ok(isKeyvoVisibleFamily(getRuntimeModelByCanonicalSlug(link.modelSlug)?.family), link.href);
      }
      assert.ok(getExamplesMainVideoCopy(locale, family).recreationHint);
    }
    assert.equal(getExamplesMainVideoCopy(locale).recreationHint, undefined, 'the generic gallery keeps its existing copy');
    assert.equal(getExamplesMainVideoCopy(locale, 'kling').recreationHint, undefined, 'other families are outside this copy change');
  });
}
