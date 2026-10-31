import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import snapshot from '../frontend/config/public-examples.json';
import zhPrompts from '../frontend/config/home-showcase-zh.json';
import { readerCopy } from '../frontend/components/examples/example-reader-copy';
import type { ExampleWatchDetail } from '../frontend/lib/example-watch-detail';
import {
  BUNDLED_FALLBACK_LOCALE,
  bundledFallbackReaderCopy,
  localizeBundledBreadcrumbs,
  localizeBundledFallbackDetail,
} from '../frontend/app/(public-watch)/video/[id]/_lib/bundled-fallback-detail';
import { bundledExamplePromptHref } from '../frontend/server/keyvo-example-eligibility';

const cards = snapshot.cards as unknown as Record<string, { promptFull?: string; prompt?: string }>;
const zh = zhPrompts as Record<string, string>;
const NEEDS_REFERENCE = /@\[[^\]]+\]|@(?:image|video|audio|element|ref)\w*\d*|\b(?:reference image|uploaded image)\b/i;
const original = (id: string) => cards[id].promptFull ?? cards[id].prompt ?? '';
const carried = (href: string) => new URL(href, 'https://example.test').searchParams.get('prompt');
const ids = Object.keys(zh).filter((id) => id in cards);
const remixableId = ids.find((id) => !NEEDS_REFERENCE.test(original(id)) && encodeURIComponent(zh[id].trim()).length < 1500)!;
const referenceId = ids.find((id) => NEEDS_REFERENCE.test(original(id)))!;
const tooLongId = ids.find((id) => !NEEDS_REFERENCE.test(original(id)) && encodeURIComponent(zh[id].trim()).length > 3600)!;

function detailFor(id: string, overrides: Partial<ExampleWatchDetail> = {}): ExampleWatchDetail {
  const settings = { durationSec: 8, resolution: '1080p', aspectRatio: '16:9', audio: true };
  return {
    id, title: 'Kling 3.0 Turbo Pro video example', prompt: zh[id], videoUrl: 'https://media.maxvideoai.com/example.mp4', posterUrl: null,
    engineLabel: 'Kling 3.0 Turbo Pro', watchHref: `/video/${id}`, modelHref: '/models/kling-3-pro', recreateHref: `/app?from=${id}`,
    aspectRatio: '16:9', durationSec: 8, hasAudio: true, historicalCost: null, scenario: settings,
    quotes: [{ engineId: 'kling-3-pro', label: 'Kling 3 Pro', amountCents: 146, currency: 'CNY', href: `/app?from=${id}&remix=1`, original: true, settings, changed: [] }],
    references: [],
    context: {
      intro: '', visualContext: null, negativePrompt: null, createdAt: '', details: [], controls: [], highlights: [], notes: [],
      engineDescription: '', engineBadges: [],
      compareLinks: [{ href: '/ai-video-engines/kling-3-pro-vs-kling-3-turbo-pro', label: 'Kling 3 Pro vs Turbo Pro', reason: '' }],
      keyframes: null,
    },
    ...overrides,
  } as ExampleWatchDetail;
}

test('the fixtures cover a remixable, a reference-dependent and a too-long example', () => {
  assert.ok(remixableId && referenceId && tooLongId);
});

test('a bundled example offers only an honest prompt hand-off: Chinese, whole, and never for reference-dependent runs', () => {
  const detail = localizeBundledFallbackDetail(detailFor(remixableId));
  assert.ok(detail.recreateHref, 'a short, self-contained prompt can travel');
  assert.ok(detail.recreateHref.startsWith('/app?prompt='), 'the prompt hand-off, not the upstream /app?from= job recreation');
  assert.equal(carried(detail.recreateHref), zh[remixableId].trim(), 'the whole Chinese prompt travels');
  assert.equal(detail.recreateHref, bundledExamplePromptHref(remixableId));
  assert.equal(localizeBundledFallbackDetail(detailFor(referenceId)).recreateHref, null, 'needs reference files the workspace cannot supply');
  assert.equal(localizeBundledFallbackDetail(detailFor(tooLongId)).recreateHref, null, 'a silently shortened prompt would not make the same video');
  assert.equal(bundledExamplePromptHref('unknown-example'), null);
});

test('a bundled example drops the comparison pages and keeps only a visible, localized model page', () => {
  const detail = localizeBundledFallbackDetail(detailFor(remixableId));
  assert.deepEqual(detail.context.compareLinks, []);
  assert.equal(detail.modelHref, '/zh/models/kling-3-pro');
  assert.equal(localizeBundledFallbackDetail(detailFor(remixableId, { modelHref: '/models/veo-3-1' })).modelHref, null, 'a hidden model has no page to link');
  assert.equal(localizeBundledFallbackDetail(detailFor(remixableId, { modelHref: null })).modelHref, null);
});

test('a bundled example speaks Chinese: copy, locale and breadcrumbs', () => {
  assert.equal(BUNDLED_FALLBACK_LOCALE, 'zh');
  const copy = bundledFallbackReaderCopy(readerCopy('zh'));
  assert.equal(copy.create, '使用此提示词');
  assert.doesNotMatch(JSON.stringify(copy), /同款/, 'only the prompt travels, so nothing promises the same video');
  assert.deepEqual(
    localizeBundledBreadcrumbs([
      { label: 'Home', href: '/' }, { label: 'Examples', href: '/examples' }, { label: 'Kling', href: '/examples/kling' }, { label: 'Kling 3.0 Turbo Pro video example: long mixed title' },
    ], 'Kling 3.0 Turbo Pro'),
    [{ label: '首页', href: '/zh' }, { label: '案例', href: '/zh/examples' }, { label: 'Kling', href: '/zh/examples/kling' }, { label: 'Kling 3.0 Turbo Pro' }],
  );
});

async function renderReader(options: { bundled: boolean }) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/video/example', pretendToBeVisual: true });
  Object.defineProperty(dom.window.navigator, 'clipboard', { value: { writeText: async () => {} } });
  dom.window.HTMLMediaElement.prototype.pause = () => {};
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, React, IS_REACT_ACT_ENVIRONMENT: true };
  const saved = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const root = createRoot(dom.window.document.getElementById('root')!);
  try {
    const { ExampleReaderContent } = await import('../frontend/components/examples/ExampleReaderContent');
    const base = detailFor(remixableId);
    const detail = options.bundled ? localizeBundledFallbackDetail(base) : base;
    const copy = options.bundled ? bundledFallbackReaderCopy(readerCopy('zh')) : readerCopy('en');
    await act(async () => root.render(React.createElement(ExampleReaderContent, {
      detail, copy, locale: options.bundled ? 'zh' : 'en', headingLevel: 'h1', bundledExample: options.bundled,
    })));
    const doc = dom.window.document;
    return {
      hrefs: [...doc.querySelectorAll('a')].map((anchor) => anchor.getAttribute('href') ?? ''),
      text: doc.body.textContent ?? '',
      hasComparison: Boolean(doc.querySelector('.video-reader-comparison')),
      primary: doc.querySelector('.video-reader-primary'),
    };
  } finally {
    await act(async () => root.unmount());
    for (const [key, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete (globalThis as Record<string, unknown>)[key]; }
    dom.window.close();
  }
}

test('the rendered bundled page has no comparison pages, no Studio/assistant hand-off and no "同款"', async () => {
  const page = await renderReader({ bundled: true });
  assert.ok(page.hrefs.length > 0);
  assert.equal(page.hrefs.filter((href) => href.includes('/ai-video-engines')).length, 0, 'compare pages are hidden on Keyvo');
  assert.equal(page.hrefs.filter((href) => href.startsWith('/app/studio')).length, 0, 'no Studio hand-off for an example without a job');
  assert.equal(page.hrefs.filter((href) => /chatgpt\.com|claude\.ai/.test(href)).length, 0, 'no external assistant hand-off');
  assert.equal(page.hrefs.filter((href) => href.includes('from=')).length, 0, 'no upstream /app?from= recreation');
  assert.equal(page.hasComparison, false, 'the per-model quote table needs a job and is omitted');
  assert.ok(page.hrefs.includes(localizeBundledFallbackDetail(detailFor(remixableId)).recreateHref!), 'the prompt hand-off link is present');
  assert.ok(page.primary?.textContent?.includes('使用此提示词'), 'the button says what it does');
  assert.ok(page.hrefs.includes('/zh/models/kling-3-pro'));
  assert.doesNotMatch(page.text, /同款|Use this prompt in the app|Adapt in Studio|Explore the model/);
});

test('a database-style example page is unchanged: comparison table and Studio/assistant hand-off are still there', async () => {
  const page = await renderReader({ bundled: false });
  assert.equal(page.hasComparison, true);
  assert.ok(page.hrefs.some((href) => href.startsWith('/app/studio')), 'the Studio hand-off stays for real jobs');
  assert.ok(page.hrefs.some((href) => /chatgpt\.com/.test(href)));
  assert.ok(page.hrefs.some((href) => href.includes('/ai-video-engines/')), 'upstream compare links stay for real jobs');
  assert.ok(page.hrefs.includes(`/app?from=${remixableId}`), 'the upstream recreation link stays for real jobs');
});
