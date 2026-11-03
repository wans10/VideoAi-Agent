import assert from 'node:assert/strict';
import test from 'node:test';
import {
  KEYVO_FAL_FEATURES_HIDDEN,
  isKeyvoAudioDisabled,
  isKeyvoHiddenFeaturePath,
  isKeyvoToolDisabled,
} from '../frontend/config/keyvo-disabled-features.ts';
import { APP_ACTIVITIES, NAV_ITEMS, getAppMenuItems } from '../frontend/components/app/app-navigation.ts';
import { MARKETING_NAV_TOOLS } from '../frontend/config/navigation.ts';
import { STUDIO_NAV_DROPDOWNS } from '../frontend/config/studio-navigation.ts';
import { supportsMediaDestination } from '../frontend/lib/media-handoff.ts';

const HIDDEN_TOOLS = ['upscale', 'background-removal', 'restore-video', 'denoise', 'fix-blur', 'smooth-motion', 'angle'];
const KEPT_TOOLS = ['character-builder', 'storyboard'];

const hrefOf = (item: { href: unknown }) => (typeof item.href === 'string' ? item.href : (item.href as { pathname: string }).pathname);

test('the fal-backed tools and the audio workspace are hidden, the others are not', () => {
  assert.equal(KEYVO_FAL_FEATURES_HIDDEN, true);
  for (const id of HIDDEN_TOOLS) assert.equal(isKeyvoToolDisabled(id), true, id);
  for (const id of KEPT_TOOLS) assert.equal(isKeyvoToolDisabled(id), false, id);
  assert.equal(isKeyvoToolDisabled(undefined), false);
  assert.equal(isKeyvoAudioDisabled(), true);
});

test('hidden paths are recognised with and without a locale prefix, and kept tools are not', () => {
  for (const path of ['/app/audio', '/zh/app/audio', '/app/tools/angle', '/tools/upscale', '/zh/tools/background-removal', '/app/tools/denoise?media=x']) {
    assert.equal(isKeyvoHiddenFeaturePath(path), true, path);
  }
  for (const path of ['/app', '/app/image', '/app/tools', '/tools', '/tools/character-builder', '/app/tools/storyboard', '/zh/tools/character-builder', '/audience']) {
    assert.equal(isKeyvoHiddenFeaturePath(path), false, path);
  }
});

test('no navigation surface offers the audio workspace or a hidden tool', () => {
  const links = [
    ...NAV_ITEMS.map(hrefOf),
    ...APP_ACTIVITIES.map(hrefOf),
    ...getAppMenuItems(true, true).map(hrefOf),
    ...MARKETING_NAV_TOOLS.map(hrefOf),
    ...Object.values(STUDIO_NAV_DROPDOWNS).flatMap((dropdown) => dropdown.items.map(hrefOf)),
  ];
  assert.ok(links.length > 10);
  assert.deepEqual(links.filter((href) => isKeyvoHiddenFeaturePath(href)), []);
  assert.ok(links.includes('/app/tools/character-builder') || links.includes('/app/tools'));
  assert.ok(links.includes('/app/image'));
});

test('a library asset cannot be sent to a hidden tool', () => {
  for (const kind of ['image', 'video'] as const) {
    for (const destination of HIDDEN_TOOLS as Array<'upscale' | 'angle' | 'background-removal' | 'restore-video' | 'denoise' | 'fix-blur' | 'smooth-motion'>) {
      assert.equal(supportsMediaDestination({ kind }, destination), false, `${kind} -> ${destination}`);
    }
  }
  assert.equal(supportsMediaDestination({ kind: 'image' }, 'image'), true);
  assert.equal(supportsMediaDestination({ kind: 'image' }, 'video'), true);
});
