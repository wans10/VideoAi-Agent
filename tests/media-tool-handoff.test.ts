import assert from 'node:assert/strict';
import test from 'node:test';
import { consumeMediaHandoff, stageMediaHandoff, supportsMediaDestination, MEDIA_TOOL_DESTINATIONS } from '../frontend/lib/media-handoff';
import { isKeyvoToolDisabled } from '../frontend/config/keyvo-disabled-features';

function storage() { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } }; }
const original = { id: 'output-exact-17', sourceOutputId: 'output-exact-17', jobId: 'job-1', url: 'https://media.example/original.mp4?signature=exact', thumbUrl: 'https://media.example/thumb.jpg', kind: 'video' as const };
test('tool continuations keep the selected original and identity, consume once, and reject wrong kinds/accounts/expired transfers', () => {
  // Keyvo hides every fal-backed tool destination, so a library asset cannot be staged for one.
  for (const tool of MEDIA_TOOL_DESTINATIONS.filter(tool => isKeyvoToolDisabled(tool))) {
    assert.throws(() => stageMediaHandoff(storage(), 'a', original, tool, 'token', 100), `${tool} is hidden`);
  }
  const destinations = ['image', 'video', ...MEDIA_TOOL_DESTINATIONS.filter(tool => !isKeyvoToolDisabled(tool))] as const;
  for (const tool of destinations) {
    const value = tool === 'image' || tool === 'product-photo-editor' ? { ...original, kind: 'image' as const, url: 'https://media.example/original.png' } : original;
    const store = storage();
    const path = stageMediaHandoff(store, 'a', value, tool, 'token', 100);
    assert.ok(path.startsWith(tool === 'image' ? '/app/image?media=token' : tool === 'video' ? '/app?media=token' : `/app/tools/${tool}?media=token`));
    assert.deepEqual(consumeMediaHandoff(store, 'a', tool, 'token', 101), value);
    assert.equal(consumeMediaHandoff(store, 'a', tool, 'token', 102), null);
    stageMediaHandoff(store, 'a', value, tool, 'token', 100);
    assert.equal(consumeMediaHandoff(store, 'b', tool, 'token', 101), null);
    stageMediaHandoff(store, 'a', value, tool, 'token', 100);
    assert.equal(consumeMediaHandoff(store, 'a', tool, 'token', 700000), null);
  }
  assert.equal(supportsMediaDestination({ kind: 'audio' }, 'upscale'), false);
  assert.equal(supportsMediaDestination({ kind: 'image' }, 'denoise'), false);
  assert.throws(() => stageMediaHandoff(storage(), 'a', original, 'angle', 'token'));
  assert.throws(() => stageMediaHandoff(storage(), 'a', original, 'upscale', 'token'));
});
