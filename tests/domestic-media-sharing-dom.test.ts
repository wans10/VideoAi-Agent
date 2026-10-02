import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';

test('image and video sharing preserve original files and captions without automatic publication', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/app/library', pretendToBeVisual: true });
  const downloads: string[] = [], copied: string[] = [];
  const shares: ShareData[] = [];
  Object.defineProperties(dom.window.navigator, {
    clipboard: { value: { writeText: async (text: string) => { copied.push(text); } } },
    canShare: { value: () => true },
    share: { value: async (data: ShareData) => { shares.push(data); } },
  });
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, React,
    IS_REACT_ACT_ENVIRONMENT: true, fetch: async (input: string) => {
      downloads.push(String(input));
      assert.ok(String(input).startsWith('/api/download?'), 'images must not mint video links or upload to platforms');
      const image = String(input).includes('image.png');
      return new Response(new Blob(['original'], { type: image ? 'image/png' : 'video/mp4' }));
    } };
  const saved = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const root = createRoot(dom.window.document.getElementById('root')!);
  try {
    const { VideoSharePanel } = await import('../frontend/components/library/VideoSharePanel.client');
    for (const kind of ['image', 'video'] as const) {
      const url = `https://media.example.com/${kind}.${kind === 'image' ? 'png' : 'mp4'}?signature=private`;
      await act(async () => root.render(React.createElement(VideoSharePanel, {
        key: kind, asset: { id: kind, kind, url }, locale: 'zh',
        ...(kind === 'video' ? { fixedShareUrl: 'https://example.com/s/test' } : {}),
      })));
      assert.equal(downloads.length, kind === 'image' ? 0 : 1, 'no file download before selecting a platform');
      const button = [...dom.window.document.querySelectorAll('button')].find(b => b.textContent === '小红书')!;
      await act(async () => button.click());
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); });
      const download = dom.window.document.querySelector<HTMLAnchorElement>('a[href^="/api/download"]')!;
      assert.equal(new URL(download.href).searchParams.get('url'), url, 'keep exact signed original');
      const portal = dom.window.document.querySelector<HTMLAnchorElement>('a[target="_blank"]')!;
      assert.equal(portal.href, 'https://creator.xiaohongshu.com/');
      assert.equal(shares.length, kind === 'image' ? 0 : 1, 'selection never publishes or opens native sharing automatically');
      const fileButton = [...dom.window.document.querySelectorAll('button')].find(b => b.textContent?.includes('通过手机应用'))!;
      assert.ok(fileButton, dom.window.document.body.textContent ?? 'file action missing');
      await act(async () => fileButton.click());
      const sharedFile = shares.at(-1)?.files?.[0]!;
      assert.equal(sharedFile.type, kind === 'image' ? 'image/png' : 'video/mp4');
      assert.equal(await sharedFile.text(), 'original');
      const caption = [...dom.window.document.querySelectorAll('button')].find(b => b.textContent?.includes('复制文案'))!;
      await act(async () => caption.click());
      assert.equal(copied.at(-1), shares.at(-1)?.text);
    }
  } finally {
    await act(async () => root.unmount()); dom.window.close();
    for (const [key, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  }
});
