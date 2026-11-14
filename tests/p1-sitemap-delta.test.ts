import assert from 'node:assert/strict';
import test from 'node:test';

import modelRoster from '../frontend/config/model-roster.json' with { type: 'json' };
import fixture from './fixtures/p1-production-routes-before.json' with { type: 'json' };
import { getHubComparisonSlugsForSitemap } from '../frontend/lib/compare-hub/data.ts';
import { getIndexableComparisonLocales } from '../frontend/lib/compare-hub/indexation.ts';
import { isKeyvoHiddenModel } from '../frontend/config/keyvo-model-visibility.ts';

const comparisonPaths = getHubComparisonSlugsForSitemap().map(
  (slug) => `/ai-video-engines/${slug}`,
);
const modelPaths = modelRoster.map(({ modelSlug }) => `/models/${modelSlug}`);
const dynamicPaths = new Set([...modelPaths, ...comparisonPaths]);

// Keyvo hides comparison pages that involve non-Chinese-vendor models (see config/keyvo-model-visibility.ts).
// Owner allowlist (2026-11-14): a comparison is published only when every model in it is offered.
// Wan 2.5, Happy Horse 1.0, Seedance 1.5 Pro and Seedream 5.0 Lite are offline (owner decision 2026-11-11). Their
// comparisons are hidden as well. Wan 2.6, Kling 2.5 Turbo and Kling 2.6 Pro followed on 2026-11-13 (no mainland
// route). MiniMax-H3-Max is served again since 2026-11-12 (MiniMax's own API).
const KEYVO_OFFLINE_MODEL_SLUGS = [
  'wan-2-5', 'happy-horse-1-0', 'seedance-1-5-pro', 'seedream', 'wan-2-6', 'kling-2-5-turbo', 'kling-2-6-pro',
] as const;
const HIDDEN_KEYVO_MODEL_SLUGS = new Set<string>(KEYVO_OFFLINE_MODEL_SLUGS);
const isVisiblePath = (path: string) => !path.replace(/^\/ai-video-engines\//, '').split('-vs-').some((slug) => HIDDEN_KEYVO_MODEL_SLUGS.has(slug) || isKeyvoHiddenModel(slug));

test('P1 and subsequent candidates add four net model routes while Keyvo publishes only visible comparison routes', () => {
  // Eleven upstream additions minus the seven model pages Keyvo took offline (Wan 2.5, Happy Horse 1.0,
  // Seedance 1.5 Pro, Seedream 5.0 Lite on 2026-11-11; Wan 2.6, Kling 2.5 Turbo, Kling 2.6 Pro on 2026-11-13),
  // which leave the published roster. It was seven net routes before 2026-11-13.
  assert.equal(modelPaths.length - fixture.publishedModelCount, 4);
  for (const slug of KEYVO_OFFLINE_MODEL_SLUGS) {
    assert.equal(dynamicPaths.has(`/models/${slug}`), false, slug);
  }
  assert.ok(comparisonPaths.length < fixture.publishedComparisonCount, 'hidden-vendor comparisons are not published');
  for (const path of comparisonPaths) assert.equal(isVisiblePath(path), true, `${path} involves a hidden model`);
});

test('P1 route delta: models stay in the roster while Keyvo hides non-Chinese-vendor comparisons', () => {
  assert.ok(getIndexableComparisonLocales('seedance-2-5-vs-wan-3').includes('zh'), 'seedance-2-5-vs-wan-3 must have a Chinese sitemap URL');
  // H3 Max is served again, so its visible comparisons return with its roster model row.
  assert.ok(comparisonPaths.some((path) => path.includes('minimax-h3-max')));
  assert.equal(dynamicPaths.has('/models/minimax-h3-max'), true);
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
