import assert from 'node:assert/strict';
import test from 'node:test';

import modelRoster from '../frontend/config/model-roster.json' with { type: 'json' };
import fixture from './fixtures/p1-production-routes-before.json' with { type: 'json' };
import { getHubComparisonSlugsForSitemap } from '../frontend/lib/compare-hub/data.ts';
import { getIndexableComparisonLocales } from '../frontend/lib/compare-hub/indexation.ts';

const comparisonPaths = getHubComparisonSlugsForSitemap().map(
  (slug) => `/ai-video-engines/${slug}`,
);
const modelPaths = modelRoster.map(({ modelSlug }) => `/models/${modelSlug}`);
const dynamicPaths = new Set([...modelPaths, ...comparisonPaths]);

// Keyvo hides comparison pages that involve non-Chinese-vendor models (see config/keyvo-model-visibility.ts).
const HIDDEN_MODEL_TOKEN = /veo|gemini-omni|ltx|luma|grok|flux|pika|sora|gpt-image|nano-banana/;
// MiniMax-H3-Max has no mainland route (KEYVO_HIDDEN_MODEL_IDS); Wan 2.5, Happy Horse 1.0, Seedance 1.5 Pro and
// Seedream 5.0 Lite are offline (owner decision 2026-11-11). Their comparisons are hidden as well.
const HIDDEN_KEYVO_MODEL_SLUGS = new Set(['minimax-h3-max', 'wan-2-5', 'happy-horse-1-0', 'seedance-1-5-pro', 'seedream']);
const isVisiblePath = (path: string) => !HIDDEN_MODEL_TOKEN.test(path)
  && !path.replace(/^\/ai-video-engines\//, '').split('-vs-').some((slug) => HIDDEN_KEYVO_MODEL_SLUGS.has(slug));

test('P1 and subsequent candidates add seven net model routes while Keyvo publishes only visible comparison routes', () => {
  // Eleven upstream additions minus the four model pages Keyvo took offline (Wan 2.5, Happy Horse 1.0,
  // Seedance 1.5 Pro, Seedream 5.0 Lite), which leave the published roster.
  assert.equal(modelPaths.length - fixture.publishedModelCount, 7);
  for (const slug of ['wan-2-5', 'happy-horse-1-0', 'seedance-1-5-pro', 'seedream']) {
    assert.equal(dynamicPaths.has(`/models/${slug}`), false, slug);
  }
  assert.ok(comparisonPaths.length < fixture.publishedComparisonCount, 'hidden-vendor comparisons are not published');
  for (const path of comparisonPaths) assert.equal(isVisiblePath(path), true, `${path} involves a hidden model`);
});

test('P1 route delta: models stay in the roster while Keyvo hides non-Chinese-vendor comparisons', () => {
  assert.ok(getIndexableComparisonLocales('seedance-2-5-vs-wan-3').includes('zh'), 'seedance-2-5-vs-wan-3 must have a Chinese sitemap URL');
  // Hidden H3 Max keeps its roster model row, but none of its comparisons is published.
  assert.equal(comparisonPaths.some((path) => path.includes('minimax-h3-max')), false);
  const v4 = modelRoster.find(model => model.modelSlug === 'kling-v4');
  assert.ok(v4);
  assert.deepEqual(v4.surfaces.modelPage, { indexable: true, includeInSitemap: true });
  assert.equal(dynamicPaths.has('/models/kling-v4'), true);
  const nano21 = modelRoster.find(model => model.modelSlug === 'nano-banana-2-1');
  assert.ok(nano21);
  assert.deepEqual(nano21.surfaces.modelPage, { indexable: true, includeInSitemap: true });
  assert.equal(dynamicPaths.has('/models/nano-banana-2-1'), true);
  const expected = [
    ...fixture.expectedNewEnglishPaths,
    ...fixture.protectedEnglishPaths,
    '/models/flux-3-max',
    '/models/kling-v4-flash',
    '/models/gpt-image-2-6-flare',
    '/models/gpt-image-2-6-sunburst',
    '/ai-video-engines/kling-v4-vs-kling-v4-flash',
    '/ai-video-engines/flux-3-vs-flux-3-max',
    '/ai-video-engines/seedance-2-5-vs-wan-3',
    '/ai-video-engines/minimax-h3-max-vs-seedance-2-5',
  ];
  for (const path of expected) {
    assert.equal(dynamicPaths.has(path), path.startsWith('/models/') || isVisiblePath(path), path);
  }
});

test('aliases and excluded products add no canonical route', () => {
  for (const path of [
    '/models/gemini-omni-flash-1-1',
    '/models/gemini-omni-1-1-flash',
    '/models/gemini-omni-flash-1-0',
    '/models/minimax-h3-max-turbo',
  ]) {
    assert.equal(dynamicPaths.has(path), false, path);
  }
  assert.equal([...dynamicPaths].some((path) => path.toLowerCase().includes('runway')), false);
});
