import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { useImageComposerPersistence } from '../frontend/app/(core)/(workspace)/app/image/_hooks/useImageComposerPersistence';
import { resetWorkspaceDocumentEntryForTests } from '../frontend/app/(core)/(workspace)/app/_lib/workspace-prompt-entry';
import { listFalEngines } from '../frontend/src/config/falEngines';

async function openImageComposer({ navigationType, accountId, search = '' }: {
  navigationType: string; accountId: string | null; search?: string;
}) {
  resetWorkspaceDocumentEntryForTests();
  const dom = new JSDOM('<div id="root"></div>', { url: `http://localhost/app/image${search}` });
  const performanceStub = new Proxy(performance, {
    get(target, key) {
      if (key === 'getEntriesByType') return () => [{ type: navigationType }];
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  const globals = { window: dom.window, document: dom.window.document, performance: performanceStub, IS_REACT_ACT_ENVIRONMENT: true };
  const previous = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const baseCaps = listFalEngines().find(entry => entry.category === 'image')!.engine;
  const engines = [{ id: 'saved', name: 'saved', modes: ['t2i'], aliases: [], prompts: [], pricePerImage: 0.1, currency: 'USD',
    engineCaps: { ...baseCaps, id: 'saved', modes: ['t2i'], inputSchema: { required: [], optional: [] } } }];
  dom.window.localStorage.setItem(`maxvideoai.image.composer.v1:${accountId ?? 'guest'}`, JSON.stringify({ version: 5, engineId: 'saved',
    mode: 't2i', prompt: 'My saved prompt', numImages: 3, referenceSlots: [] }));
  const initial = { engineId: 'saved', mode: 't2i', prompt: '', numImages: 1, aspectRatio: null, background: null, resolution: null,
    customImageWidth: '', customImageHeight: '', seed: '', outputFormat: null, quality: null, style: null, maskUrl: '',
    enableWebSearch: false, thinkingLevel: null, limitGenerations: false, watermark: false, referenceSlots: [] };
  let observed: typeof initial;
  function Fixture() {
    const [state, setState] = React.useState(initial);
    const setters = React.useMemo(() => Object.fromEntries(Object.keys(initial).map(key => [
      `set${key[0].toUpperCase()}${key.slice(1)}`,
      (value: unknown) => setState(current => ({ ...current, [key]: typeof value === 'function' ? value(current[key as keyof typeof initial]) : value })),
    ])), []);
    useImageComposerPersistence({ ...state, ...setters, accountId, engines, persistableReferenceSlots: [] } as unknown as Parameters<typeof useImageComposerPersistence>[0]);
    observed = state;
    return null;
  }
  const root = createRoot(dom.window.document.getElementById('root')!);
  try {
    await React.act(async () => root.render(React.createElement(Fixture)));
    return { prompt: observed!.prompt, numImages: observed!.numImages };
  } finally {
    await React.act(async () => root.unmount()); dom.window.close();
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  }
}

test('a signed-in fresh entry restores image settings but not the last prompt', async () => {
  assert.deepEqual(await openImageComposer({ navigationType: 'navigate', accountId: 'a' }), { prompt: '', numImages: 3 });
});

test('a signed-in reload, a ?job= link and signed-out visitors keep the stored prompt', async () => {
  assert.deepEqual(await openImageComposer({ navigationType: 'reload', accountId: 'a' }), { prompt: 'My saved prompt', numImages: 3 });
  assert.equal((await openImageComposer({ navigationType: 'navigate', accountId: 'a', search: '?job=j1' })).prompt, 'My saved prompt');
  assert.equal((await openImageComposer({ navigationType: 'navigate', accountId: null })).prompt, 'My saved prompt');
});
