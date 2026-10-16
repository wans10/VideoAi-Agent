import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider } from '../frontend/lib/i18n/I18nProvider';
import type { Dictionary } from '../frontend/lib/i18n/types';
import { generationActivityCopy } from '../frontend/components/composer/generation-activity-copy';
import { formatAspectRatioLabel } from '../frontend/lib/image/aspectRatios';
import { formatImageSizeLabel, formatQualityLabel } from '../frontend/app/(core)/(workspace)/app/image/_lib/image-workspace-utils';
import { DEFAULT_COPY } from '../frontend/app/(core)/(workspace)/app/image/_lib/image-workspace-copy';
import {
  GEMINI_OMNI_REFERENCE_IMAGES_ACTIVE_MESSAGE,
  GEMINI_OMNI_REFINE_ACTIVE_MESSAGE,
  GEMINI_OMNI_SOURCE_IMAGE_ACTIVE_MESSAGE,
  GEMINI_OMNI_SOURCE_VIDEO_ACTIVE_MESSAGE,
  localizeGeminiOmniMessage,
} from '../frontend/app/(core)/(workspace)/app/_lib/gemini-omni-unified-workflow';
import {
  KLING_O3_SOURCE_VIDEO_UNSUPPORTED_MESSAGE,
  KLING_O3_VIDEO_FRAME_IGNORED_MESSAGE,
  localizeKlingO3Message,
} from '../frontend/app/(core)/(workspace)/app/_lib/kling-o3-unified-workflow';
import { SettingsGenericAdvancedFields } from '../frontend/components/settings-controls/settings-control-generic-fields';
import { AppAppearanceControl } from '../frontend/components/app/AppAppearanceControl.client';
import { studioConversationEntryCopy } from '../frontend/app/(core)/(workspace)/app/studio/_lib/studio-conversation-entry';
import { conversationCopy } from '../frontend/lib/studio/conversation-copy';
import { buildWorkspaceTimelineRenderManifest } from '../frontend/app/(core)/(workspace)/app/studio/_shared/_lib/workspace-timeline-render';
import { DEFAULT_STUDIO_COPY, resolveStudioCopy } from '../frontend/app/(core)/(workspace)/app/studio/_lib/studio-copy';
import { DEFAULT_BILLING_COPY } from '../frontend/app/(core)/billing/_lib/billing-copy';

const zhDictionary = JSON.parse(readFileSync('frontend/messages/zh.json', 'utf8')) as Dictionary;
const enDictionary = JSON.parse(readFileSync('frontend/messages/en.json', 'utf8')) as Dictionary;
const hasChinese = (value: string) => /[㐀-鿿]/.test(value);

// Components compiled with the classic JSX transform read a global React, as in zh-runtime-copy.test.ts.
function renderMarkup(element: React.ReactElement): string {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'React');
  Object.defineProperty(globalThis, 'React', { configurable: true, value: React });
  try {
    return renderToStaticMarkup(element);
  } finally {
    if (saved) Object.defineProperty(globalThis, 'React', saved); else Reflect.deleteProperty(globalThis, 'React');
  }
}

function collectStrings(value: unknown, path = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((item, index) => collectStrings(item, `${path}.${index}`));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, item]) => collectStrings(item, path ? `${path}.${key}` : key));
  return [];
}

function sameKeys(left: object, right: object, label: string) {
  assert.deepEqual(Object.keys(left).sort(), Object.keys(right).sort(), label);
}

test('header and generation activity copy is translated for Chinese', () => {
  const zh = generationActivityCopy('zh');
  const en = generationActivityCopy('en');
  sameKeys(zh, en, 'generation activity keys');
  assert.equal(zh.empty, '暂无进行中的生成');
  assert.equal(zh.title, '进行中的生成');
  assert.equal(zh.count(2), '2 个进行中');
  assert.equal(zh.open(1), '查看进行中的生成');
  assert.equal(zh.open(3), '查看 3 个进行中的生成');
  for (const [key, value] of Object.entries(zh)) {
    if (typeof value === 'function') assert.ok(hasChinese(String(value(2))), key);
    else assert.ok(hasChinese(value), key);
  }
});

test('appearance toggle renders Chinese light and dark labels', () => {
  const markup = renderMarkup(React.createElement(I18nProvider, {
    locale: 'zh', dictionary: zhDictionary, fallback: zhDictionary,
    children: React.createElement(AppAppearanceControl, { locale: 'zh' }),
  }));
  assert.match(markup, /aria-label="外观"/);
  assert.match(markup, />浅色</);
  assert.match(markup, />深色</);
  assert.doesNotMatch(markup, />Light</);
  assert.doesNotMatch(markup, />Dark</);
});

test('generic advanced boolean toggles render Chinese On and Off values', () => {
  const markup = renderMarkup(React.createElement(SettingsGenericAdvancedFields, {
    locale: 'zh',
    fields: [{ required: false, field: { id: 'generate_audio', label: 'Audio', type: 'boolean', default: true } as never }],
    values: { generate_audio: true },
  }));
  assert.match(markup, />开启</);
  assert.match(markup, />关闭</);
  assert.doesNotMatch(markup, />On</);
  assert.doesNotMatch(markup, />Off</);

  const english = renderMarkup(React.createElement(SettingsGenericAdvancedFields, {
    fields: [{ required: false, field: { id: 'generate_audio', label: 'Audio', type: 'boolean', default: true } as never }],
    values: { generate_audio: true },
  }));
  assert.match(english, />On</);
  assert.match(english, />Off</);
});

test('image aspect, size and quality labels have complete Chinese projections that keep English defaults', () => {
  const zhAspect = (zhDictionary.workspace as any).image.composer.aspectRatioLabels as Record<string, string>;
  const zhSize = (zhDictionary.workspace as any).image.composer.imageSizeLabels as Record<string, string>;
  const zhQuality = (zhDictionary.workspace as any).image.composer.qualityLabels as Record<string, string>;
  const ratios = ['auto', '9:16', '16:9', '1:1', '4:1', '1:4', '8:1', '1:8', '4:5', '5:4', '4:3', '3:4', '3:2', '2:3', '21:9'];
  for (const ratio of ratios) {
    assert.ok(hasChinese(zhAspect[ratio] ?? ''), `aspect ${ratio}`);
    assert.notEqual(formatAspectRatioLabel(ratio, zhAspect), formatAspectRatioLabel(ratio), `aspect ${ratio} is localized`);
  }
  assert.equal(formatAspectRatioLabel('1:1', zhAspect), '方形 1:1');
  assert.equal(formatAspectRatioLabel('1:1'), 'Square 1:1', 'English default is preserved');
  assert.equal(formatAspectRatioLabel('16:9', {}), 'Horizontal 16:9', 'missing overrides fall back to English');

  assert.equal(formatImageSizeLabel('landscape_16_9', zhSize), '横屏 16:9 · 1920 x 1080');
  assert.equal(formatImageSizeLabel('portrait_16_9', zhSize), '竖屏 · 1024 x 1536');
  assert.equal(formatImageSizeLabel('square', zhSize), '方形 · 1024 x 1024');
  assert.equal(formatImageSizeLabel('custom', zhSize), '自定义尺寸');
  assert.equal(formatImageSizeLabel('landscape_16_9'), 'Landscape 16:9 · 1920 x 1080');

  assert.equal(formatQualityLabel('high', zhQuality), '高');
  assert.equal(formatQualityLabel('low', zhQuality), '低');
  assert.equal(formatQualityLabel('high'), 'High');

  // The image workspace merges zh.json over DEFAULT_COPY, so the default object must carry the same keys.
  assert.deepEqual(Object.keys(DEFAULT_COPY.composer.aspectRatioLabels), []);
  assert.ok(DEFAULT_COPY.composer.imageSizeLabels && DEFAULT_COPY.composer.qualityLabels);
});

test('omni and Kling source-video notices localize to Chinese while English constants stay unchanged', () => {
  const omniMessages = [
    GEMINI_OMNI_SOURCE_IMAGE_ACTIVE_MESSAGE,
    GEMINI_OMNI_REFERENCE_IMAGES_ACTIVE_MESSAGE,
    GEMINI_OMNI_SOURCE_VIDEO_ACTIVE_MESSAGE,
    GEMINI_OMNI_REFINE_ACTIVE_MESSAGE,
  ];
  for (const message of omniMessages) {
    const localized = localizeGeminiOmniMessage(message, 'zh');
    assert.ok(hasChinese(localized), message);
    assert.notEqual(localized, message);
    assert.equal(localizeGeminiOmniMessage(message, 'en'), message);
    assert.equal(localizeGeminiOmniMessage(message, undefined), message);
  }
  assert.equal(localizeGeminiOmniMessage(GEMINI_OMNI_SOURCE_VIDEO_ACTIVE_MESSAGE, 'zh'), '源视频正在控制此 Omni 工作流。请先移除源视频，再使用图像、参考素材、纯文本或精修。');
  assert.equal(GEMINI_OMNI_SOURCE_VIDEO_ACTIVE_MESSAGE, 'Source video controls this Omni workflow. Remove it to use image, references, text-only, or refine.');

  for (const message of [KLING_O3_SOURCE_VIDEO_UNSUPPORTED_MESSAGE, KLING_O3_VIDEO_FRAME_IGNORED_MESSAGE]) {
    assert.ok(hasChinese(localizeKlingO3Message(message, 'zh')), message);
    assert.equal(localizeKlingO3Message(message, 'en'), message);
  }
  assert.equal(localizeKlingO3Message(KLING_O3_VIDEO_FRAME_IGNORED_MESSAGE, 'zh'), '源视频正在控制此 Omni 工作流。视频生视频模式会忽略首帧和尾帧。');
  // Messages without a Chinese projection pass through unchanged rather than becoming empty.
  assert.equal(localizeKlingO3Message('unknown notice', 'zh'), 'unknown notice');
});

test('reference inventory, asset library and recent-reference notices pass the UI locale through', () => {
  const inventory = readFileSync('frontend/components/composer/WorkspaceReferenceInventory.client.tsx', 'utf8');
  assert.match(inventory, /locale === 'zh' \? '源视频' : 'Source video'/);

  const referenceFields = readFileSync('frontend/app/(core)/(workspace)/app/_lib/workspace-reference-fields.ts', 'utf8');
  assert.match(referenceFields, /locale\?: string \| null;/);
  assert.match(referenceFields, /localizeGeminiOmniMessage\(omniEnglishReason, locale\)/);
  assert.match(referenceFields, /localizeKlingO3Message\(klingO3EnglishReason, locale\)/);

  const composer = readFileSync('frontend/app/(core)/(workspace)/app/_components/WorkspaceComposerSurface.tsx', 'utf8');
  assert.match(composer, /showOmniStudioPanel, showLumaRay32KeyframeEditor, locale: uiLocale,/);
  assert.match(composer, /localizeKlingO3Message\(klingO3UnsupportedVideoReason, uiLocale\)/);

  const readyView = readFileSync('frontend/app/(core)/(workspace)/app/_components/WorkspaceAppReadyView.tsx', 'utf8');
  assert.match(readyView, /workflowCopy, locale: uiLocale,/);
  assert.match(readyView, /disabledEngineReasons: localizedKlingO3DisabledEngineReasons/);

  const modal = readFileSync('frontend/components/library/AssetLibraryModal.tsx', 'utf8');
  assert.match(modal, /'选择参考视频'/);
  assert.match(modal, /'加载更多'/);
  assert.match(modal, /'暂无保存的视频。'/);
  assert.match(modal, /'暂无已上传的视频。上传源视频后将显示在此处。'/);
  assert.match(modal, /'暂无已生成的视频。生成视频后可在此处复用。'/);
});

test('Studio conversation entry, render card and timeline issue copy have Chinese projections', () => {
  const zh = studioConversationEntryCopy('zh');
  sameKeys(zh, studioConversationEntryCopy('en'), 'entry copy keys');
  for (const [path, value] of collectStrings(zh)) assert.ok(hasChinese(value), path);
  assert.match(zh.unauthorized, /打开 Studio/);
  assert.match(zh.unauthorized, /Studio/);

  assert.equal(conversationCopy('zh', 'Download MP4', 'Télécharger le MP4'), '下载 MP4');
  assert.equal(conversationCopy('zh', 'Your film is ready.', 'Votre film est prêt.'), '影片已就绪。');
  assert.equal(conversationCopy('zh', 'Film render', 'Rendu du film'), '影片渲染');

  const zhCopy = resolveStudioCopy(zhDictionary);
  const enCopy = resolveStudioCopy(enDictionary);
  const issueKeys = [
    'timelineProcessingIssue', 'timelineFailedIssue', 'timelineMissingMediaIssue', 'timelineLinkedAudioIssue',
    'timelineMissingDimensionsIssue', 'timelineTransitionNoNextIssue', 'timelineCrossfadeGapIssue', 'timelineEmptyIssue',
  ];
  for (const key of issueKeys) {
    assert.ok(key in DEFAULT_STUDIO_COPY.exportDialog, key);
    assert.ok(hasChinese(zhCopy.exportDialog[key]), key);
    assert.ok(!hasChinese(enCopy.exportDialog[key]), `${key} English stays English`);
  }
  assert.match(zhCopy.exportDialog.timelineLinkedAudioIssue, /\{item\}/);
  assert.doesNotMatch(zhCopy.exportDialog.timelineLinkedAudioIssue, /video clip/);
  assert.doesNotMatch(zhCopy.exportDialog.timelineTransitionNoNextIssue, /video clip/);

  const clip = (id: string, start: number, track = 'video') => ({
    id, title: `Clip ${id}`, track, startSec: start, durationSec: 2, sourceStartSec: 0, sourceDurationSec: 2,
    sourceNodeId: `node-${id}`, linkedGroupId: 'group-1', mediaUrl: 'https://cdn.example.test/a.mp4',
  }) as never;
  const manifest = buildWorkspaceTimelineRenderManifest({
    items: [clip('audio', 0, 'audio')], nodes: [], projectName: 'Fixture', exportDialogCopy: zhCopy.exportDialog,
    canvasNodeCopy: zhCopy.canvas.nodes, createdAt: '2026-10-16T00:00:00.000Z',
  } as never);
  const linked = manifest.issues.find(issue => issue.code === 'orphan_linked_audio');
  assert.ok(linked, 'linked-audio issue exists');
  assert.ok(hasChinese(linked.message), linked.message);
  assert.doesNotMatch(linked.message, /video clip/);

  const englishManifest = buildWorkspaceTimelineRenderManifest({
    items: [clip('audio', 0, 'audio')], nodes: [], projectName: 'Fixture', exportDialogCopy: enCopy.exportDialog,
    canvasNodeCopy: enCopy.canvas.nodes, createdAt: '2026-10-16T00:00:00.000Z',
  } as never);
  assert.match(englishManifest.issues.find(issue => issue.code === 'orphan_linked_audio')!.message, /without a matching video clip\.$/);
});

test('billing currency options show the Chinese currency name alongside the code', () => {
  const zhNames = (zhDictionary.workspace as any).billing.wallet.currencyNames as Record<string, string>;
  assert.equal(zhNames.CNY, '人民币（CNY）');
  assert.ok(hasChinese(zhNames.USD));
  assert.deepEqual(Object.keys(DEFAULT_BILLING_COPY.wallet.currencyNames).sort(), Object.keys(zhNames).sort());

  const panel = readFileSync('frontend/app/(core)/billing/_components/WalletTopupPanel.tsx', 'utf8');
  assert.match(panel, /copy\.wallet\.currencyNames\?\.\[code\] \?\? code/);
  assert.match(panel, /\{currencyName\(copy, option\)\}/);
});

test('header account trigger has a Chinese label instead of the English fallback', () => {
  const menu = readFileSync('frontend/components/app/AppSiteMenu.client.tsx', 'utf8');
  assert.match(menu, /locale === 'zh'\s*\? \{ account: '账户', signIn: '登录' \}/);
  assert.match(menu, /: \{ account: 'Account', signIn: 'Sign in' \}/);
});
