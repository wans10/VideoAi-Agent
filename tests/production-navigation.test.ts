import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { MARKETING_SITE_NAV_LINKS, MARKETING_NAV_DROPDOWNS } from '../frontend/config/navigation';
import { ANGLE_PRODUCTION_COPY } from '../frontend/src/components/tools/angle/landing/angle-production-copy';

test('public navigation follows production departments with technical catalogs as secondary destinations', () => {
  assert.deepEqual(MARKETING_SITE_NAV_LINKS.map(item => item.key), ['production', 'craft', 'screening', 'pricing']);
  const tasks = MARKETING_NAV_DROPDOWNS.production!.items;
  assert.deepEqual(tasks.map(item => item.href), ['/studio', '/app', '/app/tools/storyboard', '/app/image', '/app/audio']);
  assert.ok(MARKETING_NAV_DROPDOWNS.craft!.items.some(item => item.href === '/tools/angle'));
  const references = MARKETING_NAV_DROPDOWNS.screening!.sections![0].items;
  assert.ok(references.some(item => item.href === '/models'));
  assert.ok(references.some(item => item.href === '/ai-video-engines'));
  assert.equal(MARKETING_NAV_DROPDOWNS.pipeline?.items.length, 0, 'disabled public MCP cannot expose setup links');
});

test('every production department and task has authored copy in each supported language', () => {
  for (const locale of ['en', 'fr', 'es', 'zh']) {
    const { nav } = JSON.parse(readFileSync(`frontend/messages/${locale}.json`, 'utf8'));
    for (const link of MARKETING_SITE_NAV_LINKS) {
      assert.ok(nav.linkLabels[link.key], `${locale}: ${link.key}`);
      if (link.key === 'pricing') continue;
      const copy = nav.dropdown[link.key];
      for (const field of ['heading', 'intro', 'all']) assert.ok(copy[field], `${locale}: ${link.key}.${field}`);
      for (const entry of MARKETING_NAV_DROPDOWNS[link.key]!.items) {
        assert.ok(copy.items[entry.key], `${locale}: ${entry.key}`);
        if (entry.description) assert.ok(copy.descriptions[entry.key]);
      }
    }
  }
});

test('camera studies disclose prepared examples and retain real next-stage destinations', () => {
  for (const copy of Object.values(ANGLE_PRODUCTION_COPY)) {
    assert.equal(copy.frames.length, 3);
    assert.equal(copy.steps.length, 3);
    assert.deepEqual(copy.nextLinks.map(([,href]) => href), ['/tools/character-builder', '/app/tools/storyboard', '/app']);
  }
  assert.match(ANGLE_PRODUCTION_COPY.zh.note, /预先生成/);
  assert.match(ANGLE_PRODUCTION_COPY.zh.limitBody, /不保证精确/);
  const view = readFileSync('frontend/src/components/tools/angle/landing/AngleLandingView.tsx', 'utf8');
  assert.match(view, /AngleProductionSections/);
  assert.match(view, /buildToolBreadcrumbJsonLd/);
  assert.match(view, /buildMarketingServiceJsonLd/);
});
