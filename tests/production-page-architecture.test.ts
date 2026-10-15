import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getToolProductionCopy } from '../frontend/src/components/tools/production/tool-production-copy';
import { getProductionBudgetCopy } from '../frontend/app/(localized)/[locale]/(marketing)/pricing/_lib/production-budget-copy';
import { getScreeningRoomCopy } from '../frontend/app/(localized)/[locale]/(marketing)/examples/_lib/screening-room-copy';
import { getMcpEditorialCopy } from '../frontend/components/marketing/mcp/mcp-editorial-copy';

const source = (path: string) => readFileSync(`frontend/${path}`, 'utf8');
const marketing = 'app/(localized)/[locale]/(marketing)';

test('production department, review and budget copy is authored in all four locales', () => {
  for (const locale of ['en', 'fr', 'es', 'zh'] as const) {
    const tools = getToolProductionCopy(locale);
    assert.equal(tools.stages.length, 3);
    assert.equal(tools.dossierRows.length, 3);
    assert.equal(tools.finishingChecks.length, 3);
    assert.equal(tools.separationChecks.length, 3);
    assert.equal(getProductionBudgetCopy(locale).rows.length, 3);
    assert.equal(getScreeningRoomCopy(locale).rows.length, 3);
    assert.equal(getMcpEditorialCopy(locale).stageBodies.length, 3);
    if (locale !== 'en') {
      assert.notEqual(tools.title, getToolProductionCopy('en').title);
      assert.notEqual(getProductionBudgetCopy(locale).title, getProductionBudgetCopy('en').title);
      assert.notEqual(getScreeningRoomCopy(locale).notes, getScreeningRoomCopy('en').notes);
      assert.notEqual(getMcpEditorialCopy(locale).title, getMcpEditorialCopy('en').title);
    }
  }
});

test('the screening view keeps the real gallery before review notes and technical references', () => {
  const view = source(`${marketing}/examples/_components/examples-page-view.tsx`);
  assert.ok(view.indexOf('<ExamplesIntroHero') < view.indexOf('<ExamplesEngineFilterNav'));
  assert.ok(view.indexOf('<ExamplesGallerySection') < view.indexOf('<ScreeningRoomNotes'));
  assert.ok(view.indexOf('<ScreeningRoomNotes') < view.indexOf('<ExamplesModelLinksSection'));
  assert.match(view, /open=\{isModelLanding\}/);
  assert.match(view, /prioritizeFirstPoster=\{true\}/);
  assert.match(view, /<ExamplesJsonLdScripts/);
});

test('budget planning remains a server-side guide beside canonical quote projections', () => {
  const page = source(`${marketing}/pricing/page.tsx`);
  const sheet = source(`${marketing}/pricing/_components/ProductionBudgetSheet.tsx`);
  assert.match(page, /<ProductionBudgetSheet locale=\{locale\}/);
  // Upstream streams the canonical quote projections through PricingCurrentContent behind Suspense.
  const current = source(`${marketing}/pricing/_components/PricingCurrentContent.tsx`);
  assert.match(page, /<Suspense/);
  assert.match(current, /highlights=\{data.video.highlights\}/);
  assert.match(current, /<PricingVideoMatrixSection video=\{data.video\}/);
  assert.doesNotMatch(sheet, /use client|useState|fetch\(|quoteCanonicalPricing|localStorage/);
});

test('production tool views retain their media, workflow and schema owners', () => {
  const character = source('src/components/tools/character-builder/landing/CharacterBuilderLandingSections.tsx');
  const removal = source('src/components/tools/background-removal/landing/BackgroundRemovalLandingSections.tsx');
  assert.match(character, /<ProductionReviewNotes locale=\{locale\} kind="character"/);
  assert.match(character, /<CharacterBuilderOutputsWorkflowSection/);
  assert.doesNotMatch(character, /<CharacterBuilderWhySection|<CharacterBuilderUseCasesSection/);
  assert.match(removal, /<ProductionReviewNotes locale=\{locale\} kind="separation"/);
  assert.match(removal, /<WorkflowSection/);
  assert.match(removal, /<ProductionSection/);
  for (const [folder, name] of [['character-builder', 'CharacterBuilder'], ['background-removal', 'BackgroundRemoval']]) {
    const view = source(`src/components/tools/${folder}/landing/${name}LandingView.tsx`);
    assert.match(view, /buildToolHowToJsonLd/);
    assert.match(view, /buildToolBreadcrumbJsonLd/);
    assert.doesNotMatch(view, /<ToolJourneyNav/);
  }
});
