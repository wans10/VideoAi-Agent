import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { CREATOR_TOOL_IDS, CREATOR_TOOL_AVAILABILITY, isCreatorToolPublic, getReleasedCreatorToolIds, isCreatorPublicPathAvailable } from '../frontend/src/lib/toolbox/creator-availability';
import { getCreatorMarketingCopy } from '../frontend/src/components/tools/creator-marketing/creator-copy';
import { buildCreatorToolMetadata } from '../frontend/src/components/tools/creator-marketing/creator-marketing-routing';
import { localizePathFromEnglish, englishPathFromLocale } from '../frontend/lib/i18n/paths';
import { routing } from '../frontend/i18n/routing';
import { isKeyvoToolDisabled } from '../frontend/config/keyvo-disabled-features';

// Keyvo 2026-11-14: Subtitles is hidden (no mainland speech-to-text route); the other four stay released.
const KEYVO_HIDDEN_CREATORS = ['subtitles'] as const;
const RELEASED_CREATORS = CREATOR_TOOL_IDS.filter(id => !(KEYVO_HIDDEN_CREATORS as readonly string[]).includes(id));

test('the four released creators are discoverable without publishing unknown or hidden identities', () => {
  assert.deepEqual(getReleasedCreatorToolIds(), RELEASED_CREATORS);
  for (const id of RELEASED_CREATORS) {
    assert.equal(isCreatorToolPublic(id), true);
    assert.equal(isCreatorPublicPathAvailable(`/tools/${id}`), true);
  }
  for (const id of KEYVO_HIDDEN_CREATORS) {
    assert.equal(isCreatorToolPublic(id), false);
    assert.equal(isCreatorPublicPathAvailable(`/tools/${id}`), false);
  }
  assert.equal(isCreatorToolPublic('invented'), false);
  assert.equal(isCreatorPublicPathAvailable('/tools/upscale'), true);
  assert.equal(isCreatorPublicPathAvailable('/tools'), true);
});

test('all creator pages retain exact localized canonical and reciprocal language routes', () => {
  for (const id of CREATOR_TOOL_IDS) {
    const en = `/tools/${id}`;
    const paths = { en, fr: `/fr/outils/${id}`, es: `/es/herramientas/${id}` };
    for (const locale of ['en', 'fr', 'es'] as const) {
      const metadata = buildCreatorToolMetadata(id, locale);
      assert.equal(metadata.alternates?.canonical, `https://app.keyvo.cn${paths[locale]}`);
      assert.equal(localizePathFromEnglish(locale, en), paths[locale]);
      assert.equal(englishPathFromLocale(locale, paths[locale]), en);
      assert.equal(routing.pathnames[en as keyof typeof routing.pathnames][locale], paths[locale].replace(/^\/(fr|es)/, ''));
      assert.ok(getCreatorMarketingCopy(locale, id).limits.length >= 2);
      assert.ok(String(metadata.description).trim().length > 40);
      const languages = metadata.alternates?.languages as Record<string, string>;
      // Keyvo publishes hreflang for the visible Simplified Chinese locale only.
      assert.deepEqual(languages, { zh: `https://app.keyvo.cn/zh${en}`, 'x-default': `https://app.keyvo.cn/zh${en}` });
    }
  }
});

test('released creator routes appear in the actual discovered sitemap', async () => {
  const react = createRequire(new URL('../frontend/package.json', import.meta.url))('react');
  react.cache ??= (fn: unknown) => fn;
  const old = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    const { getCanonicalPathEntries } = await import('../frontend/lib/sitemap/route-discovery');
    const entries = await getCanonicalPathEntries();
    // Keyvo has no provider for Upscale; its landing page is deliberately kept out of the sitemap.
    assert.equal(entries.some(entry => entry.englishPath === '/tools/upscale'), !isKeyvoToolDisabled('upscale'));
    for (const id of RELEASED_CREATORS) assert.ok(entries.some(entry => entry.englishPath === `/tools/${id}`));
    for (const id of KEYVO_HIDDEN_CREATORS) assert.equal(entries.some(entry => entry.englishPath === `/tools/${id}`), false);
  } finally {
    if (old === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = old;
  }
});

test('unreleased route rendering and metadata stop at the same not-found gate', async () => {
  for (const id of KEYVO_HIDDEN_CREATORS) {
    const route = await import(`../frontend/app/(localized)/[locale]/(marketing)/tools/${id}/page.tsx`);
    const props = { params: Promise.resolve({ locale: 'fr' }) };
    await assert.rejects(route.default(props), /NEXT_HTTP_ERROR_FALLBACK;404/);
    await assert.rejects(route.generateMetadata(props), /NEXT_HTTP_ERROR_FALLBACK;404/);
  }
  for (const id of RELEASED_CREATORS) {
    const route = await import(`../frontend/app/(localized)/[locale]/(marketing)/tools/${id}/page.tsx`);
    const props = { params: Promise.resolve({ locale: 'fr' }) };
    assert.ok(await route.default(props));
    assert.equal((await route.generateMetadata(props)).alternates?.canonical, `https://app.keyvo.cn/fr/outils/${id}`);
    const released = CREATOR_TOOL_AVAILABILITY[id].publicReleased;
    CREATOR_TOOL_AVAILABILITY[id].publicReleased = false;
    try {
      assert.equal(isCreatorPublicPathAvailable(`/tools/${id}`), false);
      await assert.rejects(route.default(props), /NEXT_HTTP_ERROR_FALLBACK;404/);
      await assert.rejects(route.generateMetadata(props), /NEXT_HTTP_ERROR_FALLBACK;404/);
    } finally {
      CREATOR_TOOL_AVAILABILITY[id].publicReleased = released;
    }
  }
});

test('released creators appear in the public hub and marketing navigation', async () => {
  const { CreatorToolsCollection } = await import('../frontend/src/components/tools/creator-marketing/CreatorToolsCollection');
  const { MARKETING_NAV_TOOLS } = await import('../frontend/config/navigation');
  assert.ok(CreatorToolsCollection({ locale: 'en' }));
  for (const id of RELEASED_CREATORS) assert.ok(MARKETING_NAV_TOOLS.some(item => item.key === id));
  for (const id of KEYVO_HIDDEN_CREATORS) assert.equal(MARKETING_NAV_TOOLS.some(item => item.key === id), false);
});
