import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import engineCatalog from '../frontend/config/engine-catalog.json' with { type: 'json' };
import { getEnginePictogram } from '../frontend/src/lib/engine-branding.ts';

const tokensSource = readFileSync('frontend/src/styles/tokens.css', 'utf8');
const themeTokensSource = readFileSync('frontend/lib/theme-tokens.ts', 'utf8');
const globalsSource = readFileSync('frontend/app/globals.css', 'utf8');
const homeSource = [
  readFileSync('frontend/components/marketing/home/HomeRedesignSections.tsx', 'utf8'),
  readFileSync('frontend/components/marketing/home/HomeHeroSection.tsx', 'utf8'),
  readFileSync('frontend/components/marketing/home/HomeShotTypeEngineSelector.tsx', 'utf8'),
  readFileSync('frontend/components/marketing/home/HomeRealExamplesPreview.tsx', 'utf8'),
  readFileSync('frontend/components/marketing/home/HomeConversionSections.tsx', 'utf8'),
].join('\n');
const heroShowcaseSource = readFileSync('frontend/components/marketing/home/HeroVideoShowcase.tsx', 'utf8');
const navSource = readFileSync('frontend/components/marketing/MarketingNav.tsx', 'utf8');
const buttonSource = readFileSync('frontend/components/ui/Button.tsx', 'utf8');
const toolsHubSource = readFileSync('frontend/src/components/tools/ToolsMarketingHubPage.tsx', 'utf8');
const blogPageSource = readFileSync('frontend/app/(localized)/[locale]/(marketing)/blog/page.tsx', 'utf8');
const comparePageSource = readFileSync('frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/page.tsx', 'utf8');
const marketingHeroImageSource = readFileSync('frontend/components/marketing/MarketingHeroImage.tsx', 'utf8');

const lightTokenBlock = tokensSource.slice(tokensSource.indexOf(':root {'), tokensSource.indexOf('\n}\n\n@media'));
const darkTokenBlock = tokensSource.slice(tokensSource.indexOf('[data-theme="dark"] {'), tokensSource.indexOf('\n}\n\n.card'));

function token(block: string, name: string) {
  const value = block.match(new RegExp(`--${name}: (#[0-9a-f]{6});`, 'i'))?.[1];
  assert.ok(value, `${name} is a solid semantic color`);
  return value;
}
function luminance(hex: string) {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
test('studio semantic text and primary actions meet WCAG AA contrast in both themes', () => {
  for (const block of [lightTokenBlock, darkTokenBlock]) {
    for (const surface of ['bg', 'surface', 'surface-2']) {
      for (const text of ['text-primary', 'text-secondary', 'text-muted', 'brand']) {
        assert.ok(contrast(token(block, surface), token(block, text)) >= 4.5, `${surface}/${text}`);
      }
    }
    const buttonFill = block.match(/--brand-gradient: linear-gradient\((#[0-9a-f]{6})/i)?.[1];
    assert.ok(buttonFill);
    assert.ok(contrast(buttonFill, token(block, 'on-brand')) >= 4.5, 'primary action text');
  }
});

test('engine brand ids used by catalog have theme tokens in light and dark modes', () => {
  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const brandIds = [...new Set(engineCatalog.map((entry) => entry.brandId).filter(Boolean))].sort();

  for (const brandId of brandIds) {
    const escaped = escapeRegExp(brandId);
    assert.match(lightTokenBlock, new RegExp(`--engine-${escaped}-bg: #[0-9A-Fa-f]{6};`));
    assert.match(lightTokenBlock, new RegExp(`--engine-${escaped}-ink: #[0-9A-Fa-f]{6};`));
    assert.match(darkTokenBlock, new RegExp(`--engine-${escaped}-bg: #[0-9A-Fa-f]{6};`));
    assert.match(darkTokenBlock, new RegExp(`--engine-${escaped}-ink: #[0-9A-Fa-f]{6};`));
    assert.match(themeTokensSource, new RegExp(`key: 'engine-${escaped}-bg'`));
    assert.match(themeTokensSource, new RegExp(`key: 'engine-${escaped}-ink'`));
  }
});

test('xAI and Black Forest Labs cards consume their semantic theme tokens', () => {
  assert.deepEqual(getEnginePictogram({ brandId: 'xai', label: 'Grok Imagine Video' }), {
    code: 'Gr',
    backgroundColor: 'var(--engine-xai-bg)',
    textColor: 'var(--engine-xai-ink)',
  });
  assert.deepEqual(getEnginePictogram({ brandId: 'black-forest-labs', label: 'FLUX 3 Video' }), {
    code: 'Fl',
    backgroundColor: 'var(--engine-black-forest-labs-bg)',
    textColor: 'var(--engine-black-forest-labs-ink)',
  });
});

test('global backgrounds consume the theme token and primary buttons use semantic fills', () => {
  assert.match(globalsSource, /body \{[\s\S]*?background: var\(--bg\);/);
  assert.match(globalsSource, /\[data-theme="dark"\] body \{\s*background: var\(--bg\);/);
  assert.match(buttonSource, /var\(--brand-gradient\)/);
  assert.match(buttonSource, /text-on-brand/);
});

test('homepage workflow cards avoid light image wash in dark mode', () => {
  const referenceWorkflowSource = homeSource.slice(homeSource.indexOf('export function ReferenceWorkflow'), homeSource.indexOf('export function AiVideoToolbox'));

  assert.match(referenceWorkflowSource, /dark:opacity-\[0\.28\]/);
  assert.match(referenceWorkflowSource, /dark:brightness-\[0\.72\]/);
  assert.match(referenceWorkflowSource, /rgba\(3,7,18,0\.96\)_0%/);
  assert.match(referenceWorkflowSource, /rgba\(3,7,18,0\.88\)_100%/);
  assert.doesNotMatch(referenceWorkflowSource, /dark:invert/);
  assert.doesNotMatch(referenceWorkflowSource, /rgba\(5,11,20,0\.66\)_100%/);
});


test('decorative marketing hero images stay hidden from assistive tech', () => {
  assert.match(marketingHeroImageSource, /<div aria-hidden=\{alt \? undefined : 'true'\}/);
  assert.match(marketingHeroImageSource, /alt=\{alt\}[\s\S]*aria-hidden=\{alt \? undefined : 'true'\}/);
});

test('public navigation uses the studio shell independently of saved app theme', () => {
  assert.match(navSource, /videoai-public-header sticky top-0/);
  assert.match(navSource, /<BrandLockup/);
  const css = readFileSync('frontend/src/styles/videoai-marketing.css', 'utf8');
  assert.match(css, /\.marketing-site\.videoai-site > \.videoai-public-header/);
});

test('marketing navigation authenticated generate CTA turns white in dark mode', () => {
  assert.match(navSource, /marketing_nav_start_app/);
  assert.match(navSource, /dark:bg-white dark:text-\[#030712\]/);
  assert.match(navSource, /dark:hover:bg-slate-100/);
});

// D85 gives marketing a fixed palette; the app keeps its independent dark theme.
test('cinema hero uses the fixed ivory surface and subdued player without ambient neon', () => {
  const cinema = readFileSync('frontend/src/styles/marketing-cinema.css', 'utf8');
  const hero = readFileSync('frontend/components/marketing/home/HomeHeroSection.tsx', 'utf8');
  assert.match(hero, /home-hero-section cinema-opening/);
  assert.doesNotMatch(hero, /home-hero-dark-grid|dark-section-neon/);
  assert.match(cinema, /\.marketing-site \.cinema-opening\{background:#f4f2ee/);
  assert.match(cinema, /\.marketing-site \.cinema-player>div:first-child>div.absolute\{display:none\}/);
  assert.match(cinema, /\.marketing-site \.cinema-player \[data-hero-player\]\{border:0/);
});

test('tools hero uses the actual catalogue artwork in a fixed composition', () => {
  assert.match(toolsHubSource, /ProductionDepartments.module.css/);
  assert.match(toolsHubSource, /WORKSHOP_ART\['character-builder'\]/);
  assert.match(toolsHubSource, /WORKSHOP_ART.angle/);
  assert.match(toolsHubSource, /Object.entries\(QUICK_TOOL_ART\)/);
  assert.match(toolsHubSource, /aria-hidden="true"/);
  assert.doesNotMatch(toolsHubSource, /tools-hero-reference-dark|dark:invert/);
});
