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
const isVisiblePath = (path: string) => !HIDDEN_MODEL_TOKEN.test(path);

test('P1 route delta: models stay in the roster while Keyvo hides non-Chinese-vendor comparisons', () => {
  assert.equal(modelPaths.length - fixture.publishedModelCount, 5);
  assert.ok(comparisonPaths.length < fixture.publishedComparisonCount, 'hidden-vendor comparisons are not published');
  for (const path of comparisonPaths) assert.equal(isVisiblePath(path), true, `${path} involves a hidden model`);

  for (const slug of ['seedance-2-5-vs-wan-3', 'minimax-h3-max-vs-seedance-2-5']) {
    assert.ok(getIndexableComparisonLocales(slug).includes('zh'), `${slug} must have a Chinese sitemap URL`);
  }
  const expected = [
    ...fixture.expectedNewEnglishPaths,
    ...fixture.protectedEnglishPaths,
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
