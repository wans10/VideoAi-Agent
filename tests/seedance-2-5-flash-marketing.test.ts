// Keyvo offers Seedance 2.5 Flash (owner allowlist) but keeps its model page unpublished; these upstream launch contracts run on the unfiltered catalog.
// Keep this import first so the visibility flag is read before runtime modules load.
import './helpers/keyvo-unfiltered-catalog';
import './helpers/keyvo-compare-links-open';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getRuntimeModelById, listPublishedRuntimeModels } from '../frontend/config/model-runtime.ts';
import { getFalEngineById } from '../frontend/src/config/falEngines.ts';
import { buildModelDecisionData } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-decision-data.ts';
import { buildCurrentModelDecisionData } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/current-model-decision-pricing.ts';
import { parseModelExamplesContent } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-examples-content.ts';
import { parseModelPromptingContent } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-prompting-content.ts';
import { buildModelPromptingViewModel } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-prompting-view-model.ts';
import { getModelPageTemplateConfig } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-template-registry.ts';
import { buildEngineOption } from '../frontend/components/marketing/price-estimator/price-estimator-options.ts';
import { getPricingKernel } from '../frontend/src/lib/pricing-kernel.ts';

const slug = 'seedance-2-5-flash';

test('Flash stays selectable in the estimator without a fabricated percentage-based rate', () => {
  const entry = getFalEngineById(slug)!;
  const option = buildEngineOption(entry, entry.engine, entry.engine, getPricingKernel(), {});
  assert.ok(option);
  assert.deepEqual(option.resolutions.map(resolution => resolution.value), ['480p', '720p']);
  assert.ok(option.resolutions.every(resolution => resolution.rate === null));
  assert.equal(option.minDuration, 4);
  assert.equal(option.maxDuration, 30);
  assert.equal(option.baseEngineId, slug);
});

test('Flash is offered through the owner allowlist while its model page stays unpublished on Keyvo', () => {
  const model = getRuntimeModelById(slug)!;
  const template = getModelPageTemplateConfig(slug)!;
  assert.ok(model);
  assert.ok(template);
  // Keyvo keeps the Flash model page, examples, comparisons and sitemap entry unpublished (no zh content); the app and
  // pricing surfaces are published. Seedream 5.0 Flash and 5.5 follow the same pattern.
  assert.equal(listPublishedRuntimeModels().some((entry) => entry.id === slug), false);
  assert.equal(model.publication.model.published, false);
  assert.equal(model.publication.model.indexable, false);
  assert.equal(model.publication.examples.published, false);
  assert.equal(model.publication.examples.includeInFamilyCopy, false);
  assert.equal(model.publication.sitemap.published, false);
  assert.equal(model.publication.app.published, true);
  assert.equal(model.publication.pricing.published, true);
  assert.equal(model.publication.compare.published, false);
  assert.equal(template.pricing.enabled, true);
  assert.deepEqual(template.pricing.presets.map(preset => preset.id), ['4s-480p', '8s-720p-audio', '30s-720p']);
  assert.equal(template.sections.examples, true);
  assert.equal(template.sections.compare, true);
});

test('each Flash locale uses current quotes and does not fabricate media or authored retail amounts', async () => {
  const engine = getFalEngineById(slug)!;
  const promptCopies = new Set<string>();
  for (const [locale, compareHref] of [['en', '/ai-video-engines'], ['fr', '/fr/comparatif'], ['es', '/es/comparativa']] as const) {
    const content = JSON.parse(readFileSync(`content/models/${locale}/${slug}.json`, 'utf8')) as {
      decision: unknown; prompting: unknown; examples: unknown;
    };
    // The Flash compare is unpublished, so exercise the localized compare link contract with the comparison treated as published.
    const decision = buildModelDecisionData({ engine, locale, decisionContent: content.decision, isComparisonPublished: () => true });
    const prompting = parseModelPromptingContent(content.prompting, slug, locale);
    const examples = parseModelExamplesContent(content.examples, slug, locale);
    assert.ok(decision);
    assert.equal(decision.hero.primaryCta.href, `/app?engine=${slug}`);
    assert.equal(decision.hero.secondaryCta.href, `${compareHref}/seedance-2-5-vs-seedance-2-5-flash`);
    assert.doesNotMatch(JSON.stringify(content.decision), /\$\s*\d|\d+(?:\.\d+)?\s*(?:USD|EUR)/);
    const unavailable = await buildCurrentModelDecisionData(engine, locale, content.decision, async () => ({ status: 'unavailable' }));
    assert.equal(unavailable.data!.pricing.scenarios.length, 3);
    assert.ok(unavailable.data!.pricing.scenarios.every(scenario => !/\d/.test(scenario.value)), 'missing canonical prices must erase provisional amounts');
    const requests: unknown[] = [];
    const current = await buildCurrentModelDecisionData(engine, locale, content.decision, async input => {
      requests.push(input);
      return { status: 'exact', amountCents: 137, currency: 'USD', revision: 'reviewed-current-tariff', scenarioLabel: 'test' };
    });
    assert.equal(requests.length, 3);
    assert.ok(current.data!.pricing.scenarios.every(scenario => /1[.,]37/.test(scenario.value)));
    const view = buildModelPromptingViewModel({
      content: prompting, locale, engineId: slug, modelSlug: slug, appGenerationEnabled: false,
      imageAnchorId: 'prompting', isVideoEngine: true, isImageEngine: false, supportsNativeAudio: false,
      demoPromptSource: 'editorial', defaultDemoPromptSource: 'editorial', demoMedia: null,
      defaultDemoPresentation: { audioBadgeLabel: '', altContext: '' }, referenceWorkflows: [],
    });
    assert.equal(view.tabs.usePromptHref, null);
    assert.equal(view.tabs.exampleHref, null);
    assert.equal(view.defaultPresentation.demo, null);
    assert.ok(view.demo);
    assert.equal(view.demo.videoSrc, null);
    assert.equal(view.demo.posterSrc, null);
    assert.equal(view.demo.fullHref, null);
    // The reviewed Last Train film now supplies factual timing and framing.
    // A reader without its media still must not invent a playable source above.
    assert.equal(view.demo.durationLabel, '18s');
    assert.equal(view.demo.aspectLabel, '16:9');
    assert.equal(prompting.imageExamples, null);
    assert.equal(examples.fallbackItems, null);
    assert.equal(examples.showWhenEmpty, false);
    assert.equal(prompting.tabs.length, 0, 'the reviewed recipe replaces the unrendered scene-plan tabs');
    assert.ok(prompting.recipe?.excerpt);
    assert.ok(prompting.recipe.factors.length > 0);
    promptCopies.add(prompting.recipe.note);
  }
  assert.equal(promptCopies.size, 3, 'recipe guidance belongs to its requested locale');
});
