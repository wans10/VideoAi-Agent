// Character Recast is hidden on Keyvo until the CNY currency mismatch is fixed (see KEYVO_RECAST_HIDDEN in
// frontend/config/keyvo-disabled-features.ts and docs/engineering/keyvo-upstream-deviations.md).
// The code and data stay in place; every customer entry point is hidden or refused, and reopening is one constant.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import test from 'node:test';
import mcpPublication from '../frontend/config/mcp-publication.json' with { type: 'json' };
import { isKeyvoRecastHidden, KEYVO_RECAST_HIDDEN } from '../frontend/config/keyvo-disabled-features';
import { buildCurrentOtherPricing } from '../frontend/app/(localized)/[locale]/(marketing)/pricing/_lib/current-other-pricing';
import { mountToolFixture } from './helpers/tool-selection-fixture';

const source = (path: string) => readFileSync(`frontend/${path}`, 'utf8');
const withEnv = async <T>(value: string | undefined, run: () => Promise<T> | T): Promise<T> => {
  const previous = process.env.KEYVO_RECAST_FULL_UI;
  if (value === undefined) delete process.env.KEYVO_RECAST_FULL_UI; else process.env.KEYVO_RECAST_FULL_UI = value;
  try { return await run(); } finally {
    if (previous === undefined) delete process.env.KEYVO_RECAST_FULL_UI; else process.env.KEYVO_RECAST_FULL_UI = previous;
  }
};

test('the Recast constant is on, and only the test-only env switch reopens the rule', async () => {
  assert.equal(KEYVO_RECAST_HIDDEN, true);
  await withEnv(undefined, () => assert.equal(isKeyvoRecastHidden(), true));
  await withEnv('1', () => assert.equal(isKeyvoRecastHidden(), false));
  await withEnv('0', () => assert.equal(isKeyvoRecastHidden(), true));
});

test('Character Studio navigation offers no Recast tab', async () => {
  const f = await mountToolFixture(`
    import {CharacterStudioNavigation} from './src/components/tools/character-builder/_components/CharacterStudioNavigation.client';
    import {getCharacterStudioCopy} from './src/components/tools/character-builder/_lib/character-studio-copy';
    function App(){return <CharacterStudioNavigation mode="character" onMode={()=>{}} onNew={()=>{}} onExplore={()=>{}} copy={getCharacterStudioCopy('zh')} />}
  `, { 'next/link': `import React from 'react';export default ({prefetch,...p})=>React.createElement('a',p)` });
  try {
    const text = f.w.document.body.textContent ?? '';
    assert.doesNotMatch(text, /Recast/);
    assert.equal(f.w.document.querySelectorAll('[aria-pressed]').length, 0, 'no mode switch is rendered');
  } finally { await f.close(); }
});

test('the Character Studio workspace wires every Recast hand-off through the rule', () => {
  const workspace = source('src/components/tools/CharacterBuilderWorkspace.tsx');
  assert.match(workspace, /!isKeyvoRecastHidden\(\) && searchParams\?\.get\('mode'\) === 'recast'/, 'mode=recast cannot open the tab');
  assert.match(workspace, /onRecastResult=\{isKeyvoRecastHidden\(\) \? undefined : handoffRecast\}/, 'result cards: no Send to Recast');
  assert.match(workspace, /onRecast=\{isKeyvoRecastHidden\(\) \? undefined : handoffRecast\}/, 'library: no Recast buttons');
  assert.match(workspace, /onRecast=\{isKeyvoRecastHidden\(\) \? undefined : \(\) => changeMode\('recast'\)\}/, 'Explore: no Recast button');
  assert.match(workspace, /recast=\{isKeyvoRecastHidden\(\) \? null :/, 'the Recast panel is not mounted');
  assert.match(source('src/components/tools/character-builder/landing/CharacterStudioPublicFilms.tsx'), /if \(isKeyvoRecastHidden\(\)\) return null/);
});

test('Recast examples, landing section, blog proof and next-step links are hidden', async () => {
  const { withoutRecastFaq } = await import('../frontend/src/components/tools/character-builder/landing/character-builder-landing-recast');
  const zh = JSON.parse(source('messages/zh.json')).toolMarketing.characterBuilder;
  assert.ok(zh.faq.items.some((i: { question: string; answer: string }) => /recast/i.test(i.question + i.answer)), 'fixture still has Recast copy');
  await withEnv(undefined, () => {
    const kept = withoutRecastFaq(zh).faq.items;
    assert.ok(kept.length > 0 && kept.every((i: { question: string; answer: string }) => !/recast/i.test(i.question + i.answer)));
  });
  await withEnv('1', () => assert.equal(withoutRecastFaq(zh).faq.items.length, zh.faq.items.length));
  assert.match(source('src/components/tools/character-builder/landing/CharacterBuilderLandingWorkflowSections.tsx'),
    /isKeyvoRecastHidden\(\) \? null : <><section className=\{styles\.recastSection\} id="recast">/);
  const { getNextStepCopy } = await import('../frontend/app/(localized)/[locale]/(marketing)/blog/[slug]/_lib/blog-post-data');
  for (const locale of ['en', 'fr', 'es'] as const) {
    const hidden = await withEnv(undefined, () => getNextStepCopy(locale, 'how-to-create-consistent-ai-characters'));
    const open = await withEnv('1', () => getNextStepCopy(locale, 'how-to-create-consistent-ai-characters'));
    assert.ok(hidden && hidden.links.length > 0 && hidden.links.every(l => !l.href.includes('mode=recast')));
    assert.ok(open?.links.some(l => l.href.includes('mode=recast')), 'reopening restores the link');
  }
});

test('the Character Studio landing page has no Recast section, price pointer or link', async () => {
  const f = await mountToolFixture(`import {CharacterBuilderLandingSections} from './src/components/tools/character-builder/landing/CharacterBuilderLandingSections';import {withoutRecastFaq} from './src/components/tools/character-builder/landing/character-builder-landing-recast';import dictionary from './messages/zh.json';function App(){return <CharacterBuilderLandingSections content={withoutRecastFaq(dictionary.toolMarketing.characterBuilder)} locale="zh" journey={dictionary.toolMarketing.journey}/>}`, {
    'next/image': `import React from 'react';export default function Image({fill,priority,sizes,...p}){return React.createElement('img',{...p,sizes})}`,
    '@/i18n/navigation': `import React from 'react';export const Link=({prefetch,...p})=>React.createElement('a',p)`,
    './CharacterStudioLanding.module.css': `export default new Proxy({},{get:(_,key)=>key})`,
    '../../production/ProductionDepartments.module.css': `export default new Proxy({},{get:(_,key)=>key})`,
    './ProductionDepartments.module.css': `export default new Proxy({},{get:(_,key)=>key})`,
  });
  try {
    const doc = f.w.document;
    assert.ok(doc.getElementById('outputs'), 'the rest of the page still renders');
    assert.equal(doc.getElementById('recast'), null);
    assert.equal(doc.querySelector('a[href*="mode=recast"]'), null);
    assert.doesNotMatch(doc.body.textContent ?? '', /Recast/);
  } finally { await f.close(); }
});

test('the pricing hub has no Recast row and never reads a Recast quote while hidden', async () => {
  const reads: unknown[] = [];
  const dependencies = {
    audio: async () => { throw new Error('not used'); }, product: async () => { throw new Error('not used'); },
    recast: async (input: unknown) => { reads.push(input); return { status: 'unavailable' as const }; },
  };
  const hidden = await withEnv(undefined, () => buildCurrentOtherPricing(
    { imageRows: [], audioRows: [], toolRows: [], recastExamples: [{ outputSeconds: 6, sourceSeconds: 0, price720: '$1', price1080: '$2' }] }, 'zh', dependencies));
  assert.equal(hidden.recastExamples, undefined);
  assert.deepEqual(reads, []);
  const open = await buildCurrentOtherPricing({ imageRows: [], audioRows: [], toolRows: [] }, 'en', { ...dependencies, recastHidden: false });
  assert.equal(open.recastExamples?.length, 2, 'reopening restores the examples');
  assert.equal(reads.length, 4);

  const render = (recastHidden?: boolean) => mountToolFixture(`
    import {PricingOtherSurfacesSection} from './app/(localized)/[locale]/(marketing)/pricing/_components/PricingOtherSurfacesSection';
    function App(){return <PricingOtherSurfacesSection locale="zh" data={{imageRows:[],audioRows:[],toolRows:[]}} ${recastHidden === undefined ? '' : `recastHidden={${recastHidden}}`} />}
  `, {
    '@/i18n/navigation': `import React from 'react';export const Link=({prefetch,href,...p})=>React.createElement('a',{...p,href:typeof href==='string'?href:href.pathname})`,
    './PricingTableScrollRegion': `import React from 'react';export const PricingTableScrollRegion=({children})=>React.createElement('div',null,children)`,
  });
  const byDefault = await render();
  try {
    assert.equal(byDefault.w.document.querySelector('#character-recast-pricing'), null);
    assert.equal(byDefault.w.document.querySelector('a[href*="mode=recast"]'), null);
  } finally { await byDefault.close(); }
  const reopened = await render(false);
  try {
    assert.ok(reopened.w.document.querySelector('#character-recast-pricing'), 'reopening restores the row');
  } finally { await reopened.close(); }
});

/** Bundles one Recast route with every pricing/wallet/provider collaborator replaced by a recorder that fails the test if reached. */
async function loadRoute(path: string, env: string | undefined) {
  const root = resolve('frontend');
  const reached: string[] = [];
  const trap = (name: string) => `export const ${name} = (...a) => { globalThis.__recastReached.push(${JSON.stringify(name)}); throw new Error('reached ${name}'); };`;
  const stubs: Record<string, string> = {
    'server-only': '',
    '@/server/tools/creator-http': `${trap('runCreatorHttp')}${trap('readCreatorJson')}`,
    '@/server/character-studio/recast': `${trap('prepareRecast')}${trap('confirmRecast')}`,
    '@/server/character-studio/recast-public-price': trap('readRecastPublicPrice'),
    '@/server/character-studio/recast-rehearsal': `${trap('rehearseRecast')}export const localRecastRehearsalEnabled = () => false;`,
    '@/server/character-studio/recast-readiness': `${trap('recastReadiness')}export const liveRecastEnabled = () => true;`,
    '@/server/fraud-cleanup': trap('getActiveAccountRestriction'),
    '@/server/agent-api/errors': 'export class AgentApiError extends Error {}',
    '@/server/video-excerpts/media': 'export class VideoExcerptError extends Error {}',
  };
  const built = await build({ absWorkingDir: root, entryPoints: [path], tsconfig: resolve(root, 'tsconfig.json'), bundle: true,
    platform: 'node', format: 'cjs', write: false, packages: 'external',
    plugins: [{ name: 'recast-route-fixture', setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => args.path in stubs ? { path: args.path, namespace: 'fixture' } : undefined);
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: stubs[args.path], loader: 'js' }));
    } }],
  });
  const module = { exports: {} as any };
  const sandbox = { module, exports: module.exports, require: createRequire(resolve(root, 'package.json')), process: { env: { ...process.env, ...(env === undefined ? {} : { KEYVO_RECAST_FULL_UI: env }) } },
    Buffer, Uint8Array, Object, Error, Promise, JSON, URL, Response, Request, Headers, TextEncoder, TextDecoder, __recastReached: reached };
  (sandbox as any).globalThis = sandbox;
  runInNewContext(built.outputFiles[0].text, sandbox);
  return { routes: module.exports, reached };
}

test('Recast APIs refuse before any pricing, wallet or provider work', async () => {
  const body = () => JSON.stringify({ seconds: 5, sourceSeconds: 5, audio: false, mode: 'v2v' });
  const post = (url: string) => ({ method: 'POST', url, headers: new Headers({ 'content-type': 'application/json' }),
    nextUrl: new URL(url), json: async () => JSON.parse(body()) });
  for (const name of ['estimate', 'prepare', 'confirm']) {
    const { routes, reached } = await loadRoute(`app/api/tools/character-studio/recast/${name}/route.ts`, undefined);
    const response = await routes.POST(post(`http://localhost/api/tools/character-studio/recast/${name}`));
    assert.equal(response.status, 404, `${name} POST`);
    if (name === 'prepare') {
      const get = routes.GET(post('http://localhost/api/tools/character-studio/recast/prepare?mode=v2v'));
      assert.equal(get.status, 404);
      assert.deepEqual(await get.json(), { ok: false, error: { code: 'TOOLS_DISABLED' } });
    }
    assert.deepEqual(reached, [], `${name} reached pricing, wallet or provider work`);
  }
  // Reopened (test-only switch): the same route reaches the collaborators again, so the guard is the only thing in the way.
  const { routes, reached } = await loadRoute('app/api/tools/character-studio/recast/estimate/route.ts', '1');
  await routes.POST(post('http://localhost/api/tools/character-studio/recast/estimate')).catch(() => undefined);
  assert.deepEqual(reached, ['readRecastPublicPrice']);
});

test('the MCP and Studio Recast tools refuse while hidden', async () => {
  const { createAgentCharacterStudioService } = await import('../frontend/src/server/agent-api/character-studio');
  let touched = 0;
  const integration = new Proxy({}, { get: () => () => { touched += 1; throw new Error('provider/integration must not run'); } });
  const principal = { authMethod: 'oauth', clientId: 'client', userId: 'u1', scopes: [] } as never;
  const service = await withEnv(undefined, () => createAgentCharacterStudioService(principal, { executionEnabled: true, accountUrl: 'https://app.keyvo.cn' }, (() => integration) as never));
  for (const call of [
    () => service.prepareRecast({} as never), () => service.confirmRecast({} as never),
    () => service.getRecastQuote({} as never), () => service.recoverRecast({} as never),
  ]) {
    await assert.rejects(async () => withEnv(undefined, call), (error: { code?: string }) => error.code === 'ENGINE_UNAVAILABLE');
  }
  assert.equal(touched, 0);
  const director = source('src/server/studio/conversation-director.ts');
  assert.match(director, /tool\.action!=='recast\.prepare'/);
  assert.match(source('src/server/studio/conversation-character.ts'), /!options\.characterEnabled \|\| isKeyvoRecastHidden\(\)/);
});

test('llms.txt does not advertise the Recast workflow', async () => {
  const llms = source('lib/seo/llms-text.ts');
  assert.match(llms, /\$\{isKeyvoRecastHidden\(\) \? '' : ' and the Keyvo Recast video workflow'\}/);
  const { buildLlmsText } = await import('../frontend/lib/seo/llms-text');
  assert.doesNotMatch(buildLlmsText(mcpPublication), /Recast/);
});
