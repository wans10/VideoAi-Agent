import './helpers/keyvo-unfiltered-catalog';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { buildPricingHubData } from '../frontend/app/(localized)/[locale]/(marketing)/pricing/_lib/pricingHubData.ts';
import { listSeedreamEditorialImages } from '../frontend/lib/seedream-editorial-images';
import { normalizeLegacyBrandDeep } from '../frontend/lib/seo/brand-text.ts';
import { SITE_ORIGIN } from '../frontend/lib/siteOrigin.ts';
import { publishedLocales, siteDefaultLocale } from '../frontend/i18n/locales.ts';
import { buildMetadataUrls } from '../frontend/lib/metadataUrls.ts';
import { getRuntimeModelByCanonicalSlug, resolveRuntimePublicSlug } from '../frontend/config/model-runtime.ts';
import { parseModelDecisionContent } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-decision-content.ts';
import { parseModelExamplesContent } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-examples-content.ts';
import { parseModelPromptingContent } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-prompting-content.ts';
import { getModelPageTemplateConfig } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-template-registry.ts';

const LOCALES = ['en', 'fr', 'es'] as const;
const NEW_MODELS = ['seedream-5-5', 'seedream-5-0-flash'] as const;
const ROOT = process.cwd();
const MODEL_PREFIX = { en: '/models/', fr: '/fr/modeles/', es: '/es/modelos/' } as const;

function readContent(locale: typeof LOCALES[number], slug: string) {
  return JSON.parse(readFileSync(path.join(ROOT, 'content/models', locale, `${slug}.json`), 'utf8'));
}

test('latest Seedream pages own localized strict content and factual image-only capabilities', () => {
  for (const slug of NEW_MODELS) {
    const template = getModelPageTemplateConfig(slug);
    assert.ok(template, `${slug} template`);
    assert.deepEqual(template.pricing.presets.map((preset) => preset.imageResolution), ['1K', '1.5K', '2K']);
    assert.equal(template.hero.primaryCtaHref, `/app/image?engine=${slug}`);

    for (const locale of LOCALES) {
      const content = readContent(locale, slug);
      const decision = parseModelDecisionContent(content.decision, slug, locale);
      parseModelPromptingContent(content.prompting, slug, locale);
      const examples = parseModelExamplesContent(content.examples, slug, locale);
      assert.deepEqual(decision.meta, content.seo);
      assert.equal(decision.hero.primaryCta.href, `/app/image?engine=${slug}`);
      assert.equal(examples.showWhenEmpty, false);
      assert.equal(examples.fallbackItems, null);
      const acceptedHero = listSeedreamEditorialImages(slug).find(image => image.role === 'hero');
      if (acceptedHero) {
        assert.match(decision.media.caption, /Seedream/);
        assert.doesNotMatch(decision.media.caption, /not an output|pas un rendu|no es un resultado/i);
        assert.ok(examples.editorialImages?.some(image => image.id === acceptedHero.id));
      } else if (getRuntimeModelByCanonicalSlug(slug)?.publication.model.published) {
        assert.match(decision.media.caption, /illustrat|ilustraci/i);
      } else {
        // Keyvo keeps the Flash page unpublished, so its unaccepted editorial caption is not a public claim.
        assert.equal(getRuntimeModelByCanonicalSlug(slug)?.publication.model.published, false, `${slug} stays unpublished on Keyvo`);
      }
      const text = JSON.stringify(content);
      assert.match(text, /1K/);
      assert.match(text, /1\.5K/);
      assert.match(text, /2K/);
      assert.match(text, /10/);
      // Comparison cards describe the linked Lite/Pro alternatives, not this model.
      const { decisionCards: _comparisons, ...ownDecision } = content.decision;
      const ownClaims = JSON.stringify({ ...content, decision: ownDecision });
      assert.doesNotMatch(ownClaims, /\b[34]K\b|native audio|audio natif|audio nativo|99 layers|16 layers|\bguaranteed\b|\bgaranti(?:e|s|es)?\b|\bgarantizad[oa]s?\b/i);
      const sibling = slug === 'seedream-5-5' ? 'seedream-5-0-flash' : 'seedream-5-5';
      assert.ok(decision.decisionCards.some((card) => card.cta.href === `${MODEL_PREFIX[locale]}${sibling}`));
    }
  }
});

test('existing Seedream SEO and generation destinations remain intact while linking to new versions', () => {
  const baseline = JSON.parse(readFileSync(path.join(ROOT, 'tests/fixtures/seedream-seo-baseline-2026-11-13.json'), 'utf8'));
  // Keyvo renders every legacy VideoAI/MaxVideoAI name as Keyvo (lib/seo/brand-text.ts), so compare brand-normalized copy.
  for (const entry of baseline) {
    const content = readContent(entry.locale, entry.slug);
    assert.deepEqual(normalizeLegacyBrandDeep(content.seo), normalizeLegacyBrandDeep(entry.seo));
    assert.deepEqual(normalizeLegacyBrandDeep(content.decision.meta), normalizeLegacyBrandDeep(entry.decisionMeta));
    assert.equal(content.decision.hero.title, entry.heroTitle);
    if (entry.slug === 'seedream') {
      // Upstream retired Lite: its hero CTA now opens the successor page, not the removed Lite generation destination.
      assert.equal(content.decision.hero.primaryCta.label, entry.primaryCta.label);
      assert.equal(content.decision.hero.primaryCta.href, `${MODEL_PREFIX[entry.locale as typeof LOCALES[number]]}seedream-5-0-pro`);
    } else {
      assert.deepEqual(content.decision.hero.primaryCta, entry.primaryCta);
    }
    for (const slug of NEW_MODELS) {
      assert.ok(content.decision.decisionCards.some((card: { cta: { href: string } }) => card.cta.href === `${MODEL_PREFIX[entry.locale as typeof LOCALES[number]]}${slug}`));
    }
  }
});

// Each version owns its page; adding a newer model must not redirect the ranking pages.
test('Seedream versions keep independent canonical URLs and reciprocal localized alternates', () => {
  // Keyvo: the retired Lite canonical redirects to Pro, and Flash stays unpublished (Keyvo's own engine).
  assert.equal(resolveRuntimePublicSlug('seedream')?.id, 'seedream-5-0-pro');
  const flash = getRuntimeModelByCanonicalSlug('seedream-5-0-flash');
  assert.equal(flash?.publication.model.published, false);
  assert.equal(flash?.publication.sitemap.published, false);
  // Keyvo offers Seedream 5.5 (owner allowlist) but its model page stays unpublished with no zh content, like Flash.
  const seedream55 = getRuntimeModelByCanonicalSlug('seedream-5-5');
  assert.equal(seedream55?.publication.model.published, false);
  assert.equal(seedream55?.publication.sitemap.published, false);
  for (const slug of ['seedream-5-0-pro']) {
    const model = getRuntimeModelByCanonicalSlug(slug);
    assert.ok(model, slug);
    assert.equal(resolveRuntimePublicSlug(slug)?.id, slug);
    assert.equal(model.publication.model.published, true);
    assert.equal(model.publication.model.indexable, true);
    assert.equal(model.publication.sitemap.published, true);
    const expected = Object.fromEntries(LOCALES.map((locale) => [locale, `${SITE_ORIGIN}${MODEL_PREFIX[locale]}${slug}`]));
    for (const locale of LOCALES) {
      const metadata = buildMetadataUrls(locale, undefined, { englishPath: `/models/${slug}`, availableLocales: [...LOCALES] });
      assert.equal(metadata.canonical, expected[locale]);
      // Keyvo publishes only zh, so hreflang alternates list only the published locales.
      const published = LOCALES.filter((candidate) => publishedLocales.includes(candidate));
      assert.deepEqual(metadata.languages, {
        ...Object.fromEntries(published.map((candidate) => [candidate, expected[candidate]])),
        'x-default': `${SITE_ORIGIN}/${siteDefaultLocale}/models/${slug}`,
      });
    }
  }
});


test('pricing image links retain the selected Seedream engine in every locale', () => {
  for (const locale of LOCALES) {
    const rows = buildPricingHubData(locale).otherSurfaces.imageRows;
    // The retired Lite row is not listed on Keyvo.
    assert.equal(rows.some((candidate) => candidate.id === 'seedream'), false);
    for (const id of ['seedream-5-0-pro', ...NEW_MODELS]) {
      const row = rows.find((candidate) => candidate.id === id);
      assert.ok(row, `${locale}/${id} pricing row`);
      const appLink = row.links.find((link) => link.href.startsWith('/app/image'));
      assert.equal(appLink?.href, `/app/image?engine=${id}`, `${locale}/${id} keeps model selection`);
    }
  }
});

test('pricing image summaries retain intermediate Seedream resolution tiers', () => {
  // Keyvo's Flash engine (fal-engines/seedream-5-0-flash.ts) offers 2K only.
  const expected = {
    'seedream-5-0-pro': '2K',
    'seedream-5-0-flash': '2K',
    'seedream-5-5': '1K · 1.5K · 2K',
  };
  for (const locale of LOCALES) {
    const rows = buildPricingHubData(locale).otherSurfaces.imageRows;
    for (const [id, sizes] of Object.entries(expected)) {
      assert.equal(rows.find((row) => row.id === id)?.sizes, sizes, `${locale}/${id} resolution summary`);
    }
  }
});

test('new Seedream image badges use the selected locale', () => {
  for (const locale of LOCALES) {
    for (const slug of NEW_MODELS) {
      const content = readContent(locale, slug);
      const decision = parseModelDecisionContent(content.decision, slug, locale);
      const prompting = parseModelPromptingContent(content.prompting, slug, locale);
      const badges = [...decision.media.badges, ...prompting.imageExamples!.items.map((item) => item.badge)].join(' ');
      if (locale === 'fr') assert.doesNotMatch(badges, /\bText\b/);
      if (locale === 'es') assert.doesNotMatch(badges, /\bText\b|\bImage\b/);
    }
  }
});

test('Seedream Pro proof cards describe supported image output without audio promises', () => {
  for (const locale of LOCALES) {
    const pro = parseModelExamplesContent(readContent(locale, 'seedream-5-0-pro').examples, 'seedream-5-0-pro', locale);
    assert.ok(pro.proofItems.every((item) => item.icon !== 'audio'));
    assert.doesNotMatch(JSON.stringify(pro.proofItems), /native audio|audio natif|audio nativo/i);
    const outputProof = pro.proofItems.find((item) => item.id === 'proof-3');
    assert.ok(outputProof);
    assert.match(`${outputProof.title} ${outputProof.body}`, /2K/);
    assert.match(`${outputProof.title} ${outputProof.body}`, /PNG/);
  }
});
