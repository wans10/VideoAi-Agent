import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { build } from 'esbuild';

test('an audio shelf limited to voice shows no music or song samples, and hides items without a kind', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'starter-audio-kinds-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const req = createRequire(resolve('frontend/package.json')); const React = req('react'); const { renderToStaticMarkup } = req('react-dom/server');
  const output = join(dir, 'shelf.cjs');
  await build({ entryPoints: ['frontend/components/starters/StarterMediaShelf.client.tsx'], outfile: output, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', tsconfig: 'frontend/tsconfig.json', plugins: [{ name: 'render-boundaries', setup(b) {
    b.onResolve({ filter: /^@\/lib\/i18n\/I18nProvider$/ }, () => ({ path: 'i18n', namespace: 'fixture' }));
    b.onResolve({ filter: /^\.\/useStarterMedia$/ }, () => ({ path: 'items', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, a => ({ contents: a.path === 'i18n' ? "export const useI18n=()=>({locale:'zh'});"
      : `import {BUILTIN_STARTER_MEDIA} from ${JSON.stringify(resolve('frontend/lib/starter-media.ts'))};export const useStarterMedia=s=>s==='audio'?[...BUILTIN_STARTER_MEDIA.audio,{id:'admin-added',title:'Admin sample',src:'/assets/app-starters/admin-added.mp3',prompt:'p'}]:BUILTIN_STARTER_MEDIA[s];`, loader: 'ts', resolveDir: process.cwd() }));
    b.onResolve({ filter: /^(react(?:\/.*)?|next\/image)$/ }, a => ({ path: req.resolve(a.path), external: true }));
  } }] });
  const { StarterMediaShelf } = req(output);
  const render = (props: object) => renderToStaticMarkup(React.createElement(StarterMediaShelf, { surface: 'audio', ...props }));

  const all = render({});
  for (const id of ['every-story', 'electro-funk', 'outside-the-lines', 'admin-added']) assert.ok(all.includes(id), `unrestricted shelf lists ${id}`);

  const voice = render({ onlyAudioKinds: ['voice'] });
  assert.ok(voice.includes('every-story'), 'the voice sample stays');
  for (const id of ['electro-funk', 'outside-the-lines', 'admin-added']) assert.ok(!voice.includes(id), `${id} is hidden`);
  assert.ok(!voice.includes('纯音乐') && !voice.includes('歌曲'), 'no music or song labels');

  assert.equal(render({ onlyAudioKinds: ['song'] }).includes('outside-the-lines'), true);
  assert.equal(render({ onlyAudioKinds: [] }), '', 'nothing to show renders nothing, not an empty section');
});
