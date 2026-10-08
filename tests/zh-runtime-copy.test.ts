import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider } from '../frontend/lib/i18n/I18nProvider';
import { SettingsKlingV3Controls, SettingsSeedanceAdvancedControls } from '../frontend/components/settings-controls/settings-control-engine-advanced';
import { QuadMosaicFigure } from '../frontend/components/quad-preview/QuadMosaicFigure';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { getExamplesGalleryUiCopy, getExamplesMainVideoCopy, getExamplesModelPageLabels, buildExamplesNextStepLinks } from '../frontend/app/(localized)/[locale]/(marketing)/examples/_lib/examples-page-copy';
import { buildModelPricingCallout } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-pricing-callouts';
import { getFallbackCapabilityDifference } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-score-utils';
import { referencePickerCopy } from '../frontend/components/library/reference-picker-copy';
import { mediaActionCopy, referenceContinuationCopy } from '../frontend/components/library/media-action-copy';
import { assetLibraryActionsCopy, assetLibraryLocaleDefaults } from '../frontend/components/library/asset-library-copy';

function chineseProse(value: unknown) {
  if (typeof value === 'string') assert.match(value, /[\u3400-\u9fff]/, value);
  else if (value && typeof value === 'object') Object.values(value).forEach(chineseProse);
}

test('Chinese examples runtime covers gallery, model navigation and comparison links', () => {
  chineseProse(getExamplesGalleryUiCopy('zh'));
  for (const family of ['kling', 'ltx', 'seedance', 'veo']) {
    chineseProse(getExamplesMainVideoCopy('zh', family));
    const flags = { isKlingLanding: family === 'kling', isLtxLanding: family === 'ltx', isSeedanceLanding: family === 'seedance', isVeoLanding: family === 'veo' };
    chineseProse(getExamplesModelPageLabels({ ...flags, locale: 'zh' }));
    const links = buildExamplesNextStepLinks({ ...flags, familySlug: family, appLocale: 'zh', locale: 'zh', pricingPath: '/zh/pricing' });
    assert.ok(links.length);
    links.forEach(link => { chineseProse(link.label); assert.doesNotMatch(link.label, /Compare | vs /); assert.match(link.href, /^\/zh\//); });
  }
  chineseProse(getFallbackCapabilityDifference('zh'));
});

test('Chinese model pricing calls retain localized destinations and readable prose', () => {
  for (const slug of ['seedance-2-0', 'seedance-2-0-fast', 'ltx-2-3-fast', 'ltx-2-3-pro', 'kling-3-pro', 'kling-3-4k', 'kling-3-standard', 'veo-3-1', 'veo-3-1-lite', 'veo-3-1-fast', 'wan-2-6', 'pika-text-to-video']) {
    const callout = buildModelPricingCallout(slug, 'zh')!;
    assert.ok(callout, slug);
    chineseProse([callout.title, callout.body, callout.linkLabel]);
    assert.match(callout.href, /^\/zh\/pricing#/);
  }
});

test('Chinese shared media copy covers every action and reference picker state', () => {
  for (const provider of [referencePickerCopy, mediaActionCopy, referenceContinuationCopy, assetLibraryActionsCopy]) {
    assert.deepEqual(Object.keys(provider('zh')).sort(), Object.keys(provider('en')).sort());
    chineseProse(provider('zh'));
  }
  assert.deepEqual(Object.keys(assetLibraryLocaleDefaults('zh')).sort(), Object.keys(assetLibraryLocaleDefaults('fr')).sort());
  chineseProse(assetLibraryLocaleDefaults('zh'));
});

test('Chinese advanced controls and batch readers render localized labels without changing control values', async () => {
  const dictionary = JSON.parse(readFileSync('frontend/messages/zh.json', 'utf8'));
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'React');
  Object.defineProperty(globalThis, 'React', { configurable: true, value: React });
  try {
    const markup = renderToStaticMarkup(React.createElement(I18nProvider, { locale: 'zh', dictionary, fallback: dictionary, children: React.createElement(React.Fragment, null,
      React.createElement(SettingsKlingV3Controls, { layout: 'panel', mode: 'i2v', klingShotType: 'customize', showVoiceControls: true, voiceControlActive: true, voiceIdsValue: 'voice_1' }),
      React.createElement(SettingsSeedanceAdvancedControls, { layout: 'panel', cameraFixed: true, safetyChecker: true, seedValue: '-1' }),
      React.createElement(QuadMosaicFigure, { isPlaying: false, mosaicGridClass: '', mosaicStatusMap: new Map(), mosaicTiles: [], primaryAspect: '16:9', onPrimaryVideoReady: () => {} }),
    ) }));
    assert.match(markup, /镜头模式/);
    assert.match(markup, /自定义/);
    assert.match(markup, /0\.392 美元\/秒/);
    assert.match(markup, /安全检查/);
    assert.match(markup, /拼接预览/);
    assert.match(markup, /value="voice_1"/);
    assert.match(markup, /value="-1"/);
    assert.doesNotMatch(markup, /Shot type|Safety checker|Composite preview|Voice control pricing/);
  } finally {
    if (saved) Object.defineProperty(globalThis, 'React', saved); else Reflect.deleteProperty(globalThis, 'React');
  }
});
