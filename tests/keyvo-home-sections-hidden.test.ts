// The zh home page hides its pricing teaser and FAQ (KEYVO_HOME_PRICING_TEASER_HIDDEN / KEYVO_HOME_FAQ_HIDDEN in
// frontend/config/keyvo-disabled-features.ts; docs/engineering/keyvo-upstream-deviations.md). The rendered-HTML proof
// (no headings, no FAQPage JSON-LD, no price read) lives in tests/home-streaming.test.ts.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  KEYVO_HOME_FAQ_HIDDEN,
  KEYVO_HOME_PRICING_TEASER_HIDDEN,
  isKeyvoHomeFaqHidden,
  isKeyvoHomePricingTeaserHidden,
} from '../frontend/config/keyvo-disabled-features';

const page = readFileSync('frontend/app/(localized)/[locale]/(marketing)/(home)/page.tsx', 'utf8');

test('both home section flags are on and only the test-only env switch reopens them', () => {
  assert.equal(KEYVO_HOME_PRICING_TEASER_HIDDEN, true);
  assert.equal(KEYVO_HOME_FAQ_HIDDEN, true);
  const previous = process.env.KEYVO_HOME_SECTIONS_FULL_UI;
  try {
    delete process.env.KEYVO_HOME_SECTIONS_FULL_UI;
    assert.equal(isKeyvoHomePricingTeaserHidden(), true);
    assert.equal(isKeyvoHomeFaqHidden(), true);
    process.env.KEYVO_HOME_SECTIONS_FULL_UI = '1';
    assert.equal(isKeyvoHomePricingTeaserHidden(), false);
    assert.equal(isKeyvoHomeFaqHidden(), false);
    process.env.KEYVO_HOME_SECTIONS_FULL_UI = '0';
    assert.equal(isKeyvoHomePricingTeaserHidden(), true);
  } finally {
    if (previous === undefined) delete process.env.KEYVO_HOME_SECTIONS_FULL_UI; else process.env.KEYVO_HOME_SECTIONS_FULL_UI = previous;
  }
});

test('the home route composes sections behind the flags, keeping page.tsx an orchestrator', () => {
  assert.match(page, /isKeyvoHomePricingTeaserHidden\(\)/);
  assert.match(page, /isKeyvoHomeFaqHidden\(\)/);
  assert.match(page, /showPricing \? prepareHomePricingData\(locale\) : null/, 'no price read starts while the teaser is hidden');
  assert.match(page, /showFaq \? buildFaqSchema/, 'FAQPage JSON-LD follows the visible FAQ');
  assert.match(page, /\{faqSchema \? <script id="home-faq-jsonld"/);
  assert.ok(page.split('\n').length < 120);
});

test('no home link or anchor points at the hidden sections', () => {
  const sources = ['HomePromptHero.tsx', 'HomeShowcaseWall.client.tsx', 'HomeHeroSecondaryLinks.tsx', 'HomeWorkflowSeoSummary.tsx']
    .map((file) => readFileSync(`frontend/components/marketing/home/${file}`, 'utf8')).join('\n');
  assert.doesNotMatch(sources, /#your-price|#faq|#pricing/);
});
