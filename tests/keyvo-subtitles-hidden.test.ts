// Keyvo 2026-11-14 (Subtitles) and 2026-11-16 (Lip Sync, Product Photo Editor, Product Video Editor, Motion Transfer):
// every creator tool is hidden from customers. Code, routes and APIs stay; flipping the flags in
// frontend/src/lib/toolbox/creator-availability.ts reopens them (see docs/engineering/keyvo-upstream-deviations.md).
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CREATOR_TOOL_AVAILABILITY,
  CREATOR_TOOL_IDS,
  getReleasedCreatorToolIds,
  isCreatorPublicPathAvailable,
  isCreatorToolPublic,
} from '../frontend/src/lib/toolbox/creator-availability';

test('no creator tool is released', () => {
  assert.equal(CREATOR_TOOL_IDS.length, 5);
  for (const id of CREATOR_TOOL_IDS) {
    assert.equal(CREATOR_TOOL_AVAILABILITY[id].publicReleased, false, id);
    assert.equal(isCreatorToolPublic(id), false, id);
  }
  assert.deepEqual(getReleasedCreatorToolIds(), []);
});

test('no creator marketing path is offered to sitemap or discovery', () => {
  for (const id of CREATOR_TOOL_IDS) assert.equal(isCreatorPublicPathAvailable(`/tools/${id}`), false, id);
  // Unrelated tool paths and the hub itself are not affected by this gate.
  assert.equal(isCreatorPublicPathAvailable('/tools/upscale'), true);
  assert.equal(isCreatorPublicPathAvailable('/tools'), true);
});

test('the /app/tools catalogue shows no creator cards and no empty "Create and edit" group', async () => {
  const { build } = await import('esbuild');
  const { resolve } = await import('node:path');
  const { createRequire } = await import('node:module');
  // The section imports a CSS module, so bundle it with the empty CSS loader like the other DOM tests.
  const compiled = await build({ entryPoints: [resolve('frontend/src/components/tools/CreatorCatalogueSection.client.tsx')], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', tsconfig: 'frontend/tsconfig.json', packages: 'external', loader: { '.css': 'empty', '.module.css': 'empty' } });
  const module = { exports: {} as { default: React.ComponentType<{ locale: string; filter: string }> } };
  const requireFromRepo = createRequire(resolve('frontend/package.json'));
  const React = requireFromRepo('react') as typeof import('react');
  const { renderToStaticMarkup } = requireFromRepo('react-dom/server') as typeof import('react-dom/server');
  new Function('module', 'exports', 'require', compiled.outputFiles[0].text)(module, module.exports, requireFromRepo);
  const CreatorCatalogueSection = module.exports.default;
  for (const locale of ['zh', 'en']) {
    for (const filter of ['all', 'image', 'video', 'audio'] as const) {
      const html = renderToStaticMarkup(React.createElement(CreatorCatalogueSection, { locale, filter }));
      assert.equal(html, '', `${locale}/${filter}`);
    }
  }
});

test('library and media hand-offs offer no creator destination', async () => {
  const { discoverableMediaToolDestinations } = await import('../frontend/lib/media-handoff');
  for (const kind of ['image', 'video', 'audio'] as const) {
    const offered = discoverableMediaToolDestinations({ kind } as never) as readonly string[];
    for (const id of CREATOR_TOOL_IDS) assert.equal(offered.includes(id), false, `${kind}/${id}`);
  }
});

test('marketing navigation lists no creator tool', async () => {
  const { MARKETING_NAV_TOOLS } = await import('../frontend/config/navigation');
  for (const id of CREATOR_TOOL_IDS) assert.equal(MARKETING_NAV_TOOLS.some(item => item.key === id), false, id);
});
