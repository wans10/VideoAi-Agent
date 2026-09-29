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

test('P1 EN/FR/ES route delta stays stable while Chinese comparison URLs follow the publication policy', () => {
  assert.equal(modelPaths.length - fixture.publishedModelCount, 5);
  assert.equal(comparisonPaths.length - fixture.publishedComparisonCount, 6);
  assert.equal(dynamicPaths.size - fixture.dynamicEnglishCanonicalCount, 11);

  const legacyLocalizedLocCount = modelRoster.length * 3 + getHubComparisonSlugsForSitemap().reduce(
    (total, slug) => total + getIndexableComparisonLocales(slug).filter((locale) => locale !== 'zh').length,
    0,
  );
  assert.equal(legacyLocalizedLocCount - fixture.localizedLocCount, 29 - 82);
  for (const slug of ['seedance-2-5-vs-wan-3', 'minimax-h3-max-vs-seedance-2-5']) {
    assert.ok(getIndexableComparisonLocales(slug).includes('zh'), `${slug} must have a Chinese sitemap URL`);
  }
  for (const path of fixture.expectedNewEnglishPaths) assert.equal(dynamicPaths.has(path), true, path);
  for (const path of [
    '/ai-video-engines/seedance-2-5-vs-wan-3',
    '/ai-video-engines/minimax-h3-max-vs-seedance-2-5',
  ]) assert.equal(dynamicPaths.has(path), true, path);
  for (const path of fixture.protectedEnglishPaths) assert.equal(dynamicPaths.has(path), true, path);
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
