// Voice-only mode (the default; KEYVO_AUDIO_FULL_UI is deliberately not set): the workspace offers no
// video-soundtrack entry and no music or song samples, because those have no mainland provider.
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { build } from 'esbuild';
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { newAudioDraft } from '../frontend/src/lib/audio-creation';

const require = createRequire(import.meta.url);
const frontendRequire = createRequire(resolve('frontend/package.json'));
const mocks: Record<string, string> = {
  'next/navigation': `import {useSyncExternalStore} from 'react';const subscribe=fn=>{window.addEventListener('popstate',fn);window.addEventListener('audio-history',fn);return()=>{window.removeEventListener('popstate',fn);window.removeEventListener('audio-history',fn)}};export const useSearchParams=()=>new URLSearchParams(useSyncExternalStore(subscribe,()=>window.location.search));export const usePathname=()=>'/app/audio'; const router={replace(){throw Error('Unexpected RSC navigation')},push(){throw Error('Unexpected RSC navigation')}};export const useRouter=()=>router;`,
  './AudioWorkspace': `export default ()=>null;`,
  'next/dynamic': `export default ()=>()=>null;`,
  '@/hooks/useRequireAuth': `export const useRequireAuth=()=>({user:{id:globalThis.audioReview.owner}});`,
  '@/lib/i18n/I18nProvider': `export const useI18n=()=>({locale:'en'});`,
  '@/lib/api': `export const runAudioGenerate=body=>new Promise(resolve=>globalThis.audioReview.runs.push({body,resolve}));export const useInfiniteJobs=()=>({stableJobs:[{jobId:'old-job',prompt:'Restore previous job',createdAt:'2026-09-08',status:'completed',audioUrl:'https://fixture.example/old-job.mp3',engineLabel:'MMAudio V2',pricing:{currency:'USD',totalCents:5}}],mutate:()=>{globalThis.audioReview.refreshes++},isLoading:false});`,
  './_lib/audio-workspace-helpers': `export const uploadAsset=()=>new Promise(resolve=>globalThis.audioReview.uploads.push(resolve));export const fetchJobDetail=()=>new Promise(resolve=>globalThis.audioReview.restores.push(resolve));`,
};

test('the voice-only workspace hides the video soundtrack entry and the other intents', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'audio-workspace-test-'));
  const output = join(directory, 'workspace.cjs');
  const compiled = await build({ entryPoints: [resolve('frontend/app/(core)/(workspace)/app/audio/AudioCreationWorkspace.tsx')], outfile: output, bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', tsconfig: 'frontend/tsconfig.json', packages: 'external', loader: { '.css': 'empty', '.module.css': 'empty' }, plugins: [{name:'audio-fixture',setup(builder) {
    builder.onResolve({filter:/.*/}, args => {
      if (args.path in mocks) return { path: args.path, namespace: 'fixture' };
      if (args.path === 'react' || args.path.startsWith('react/')) return { path: require.resolve(args.path), external: true };
      // The bundle lives in /tmp, outside pnpm's package resolution tree.
      if (!args.path.startsWith('.') && !args.path.startsWith('/') && !args.path.startsWith('@/')) {
        return { path: frontendRequire.resolve(args.path), external: true };
      }
      return undefined;
    });
    builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'js'}));
  }}] });
  await writeFile(output, compiled.outputFiles[0].contents);
  const Workspace = require(output).default;
  const dom = new JSDOM('<div id="root"></div>', {url:'http://localhost/app/audio'});
  dom.window.HTMLMediaElement.prototype.pause = () => {};
  dom.window.HTMLMediaElement.prototype.load = () => {};
  const nativePush = dom.window.history.pushState.bind(dom.window.history);
  dom.window.history.pushState = (data, unused, url) => {
    nativePush(data, unused, url);
    // Model Next's native history subscription; the browser integration is verified separately.
    dom.window.dispatchEvent(new dom.window.Event('audio-history'));
  };
  const review = { owner:'a', runs:[] as any[], uploads:[] as any[], restores:[] as any[], refreshes:0 };
  const globals = { window:dom.window, document:dom.window.document, navigator:dom.window.navigator, localStorage:dom.window.localStorage, CustomEvent:dom.window.CustomEvent, React, IS_REACT_ACT_ENVIRONMENT:true, audioReview:review,
    Audio: class { duration=1; onloadedmetadata=()=>{}; onerror=()=>{}; set src(_value:string) {queueMicrotask(()=>this.onloadedmetadata())} removeAttribute(){} load(){} },
    fetch: async () => new Response(JSON.stringify({ok:true,inputKey:'same-config',expiresAt:Date.now()+60000,pricing:{currency:'USD',totalCents:20}})),
  };
  const saved = new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const [key,value] of Object.entries(globals))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  const root = createRoot(dom.window.document.getElementById('root')!);
  const tick = () => act(async()=>{await new Promise(resolve=>setTimeout(resolve,390));});
  try {
    delete process.env.KEYVO_AUDIO_FULL_UI;
    for (const search of ['?intent=voice', '?intent=video', '?intent=music', '']) {
      dom.window.history.replaceState(null, '', search);
      await act(async()=>{review.owner='a';root.render(React.createElement(Workspace));});await tick();
      const doc = dom.window.document;
      assert.equal(doc.querySelector('main')?.getAttribute('data-audio-creation'), 'voice', search || '(none)');
      assert.equal(doc.querySelector('a[href*="intent=video"]'), null, 'no video soundtrack entry ' + search);
      assert.equal(doc.querySelectorAll('nav button').length, 1, 'only the voice intent ' + search);
      await act(async()=>root.render(null));
    }
  } finally {
    await act(async()=>root.unmount());dom.window.close();for(const [key,descriptor]of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key)}await rm(directory,{recursive:true,force:true});
  }
});
