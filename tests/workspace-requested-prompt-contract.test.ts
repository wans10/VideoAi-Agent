import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
  buildWorkspacePromptHref,
  sanitizeWorkspacePrompt,
  stripWorkspacePromptParam,
  WORKSPACE_PROMPT_LINK_MAX_ENCODED,
  WORKSPACE_PROMPT_MAX_CHARS,
} from '../frontend/lib/workspace-prompt-link';
import { resolveWorkspaceRequestParams } from '../frontend/app/(core)/(workspace)/app/_lib/workspace-hydration';
import { useWorkspaceRequestedPrompt } from '../frontend/app/(core)/(workspace)/app/_hooks/useWorkspaceRequestedPrompt';

const appDir = 'frontend/app/(core)/(workspace)/app';

test('the workspace accepts a trimmed, control-free prompt capped at 2000 characters', () => {
  assert.equal(sanitizeWorkspacePrompt('  一只猫在雨中奔跑  '), '一只猫在雨中奔跑');
  assert.equal(sanitizeWorkspacePrompt('a\u0000b\u0007c\r\nd'), 'abc\nd');
  assert.equal(sanitizeWorkspacePrompt('   '), null);
  assert.equal(sanitizeWorkspacePrompt(null), null);
  assert.equal(Array.from(sanitizeWorkspacePrompt('字'.repeat(5000))!).length, WORKSPACE_PROMPT_MAX_CHARS);
});

test('request parsing exposes the prompt and the route without it', () => {
  const request = resolveWorkspaceRequestParams(new URLSearchParams('prompt=%E4%B8%80%E5%8F%AA%E7%8C%AB&engine=kling-3-pro'), '/app');
  assert.equal(request.requestedPrompt, '一只猫');
  assert.equal(stripWorkspacePromptParam('/app', request.searchString), '/app?engine=kling-3-pro');
  assert.equal(request.loginRedirectTarget, '/app?prompt=%E4%B8%80%E5%8F%AA%E7%8C%AB&engine=kling-3-pro');
  const bare = resolveWorkspaceRequestParams(new URLSearchParams(''), '/app');
  assert.equal(bare.requestedPrompt, null);
  assert.equal(stripWorkspacePromptParam('/app', 'prompt=x'), '/app');
});

test('marketing links stay short enough for the login redirect and are always accepted back', () => {
  assert.equal(buildWorkspacePromptHref(''), '/app');
  assert.equal(buildWorkspacePromptHref(undefined), '/app');
  const short = buildWorkspacePromptHref('雨中的猫');
  assert.equal(short, `/app?prompt=${encodeURIComponent('雨中的猫')}`);
  for (const long of ['字'.repeat(1500), 'A cinematic shot. '.repeat(200), '😀'.repeat(900)]) {
    const href = buildWorkspacePromptHref(long);
    const value = new URL(href, 'https://example.test').searchParams.get('prompt')!;
    assert.ok(encodeURIComponent(value).length <= WORKSPACE_PROMPT_LINK_MAX_ENCODED, href.length.toString());
    assert.ok(long.startsWith(value.slice(0, 20)));
    assert.equal(sanitizeWorkspacePrompt(value), value, 'the workspace accepts what the link carries');
  }
  // A long English prompt is cut on a sentence or word boundary, not mid-word.
  const english = new URL(buildWorkspacePromptHref('Create a cinematic shot of a harbour at dawn with slow camera movement. '.repeat(60)), 'https://x.test').searchParams.get('prompt')!;
  assert.match(english, /[.!?]$/);
});

async function mountHook(initial: { requestedPrompt: string | null; draftReady: boolean }) {
  const dom = new JSDOM('<div id="root"></div>');
  const previousWindow = (globalThis as any).window;
  const previousDocument = (globalThis as any).document;
  const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const calls = { setPrompt: [] as string[], applied: 0 };
  function Probe(props: { requestedPrompt: string | null; draftReady: boolean; tick: number }) {
    useWorkspaceRequestedPrompt({
      requestedPrompt: props.requestedPrompt,
      draftReady: props.draftReady,
      setPrompt: ((value: string) => { calls.setPrompt.push(value); }) as never,
      onApplied: () => { calls.applied += 1; },
    });
    return null;
  }
  const root = createRoot(dom.window.document.getElementById('root')!);
  const render = (props: { requestedPrompt: string | null; draftReady: boolean; tick?: number }) =>
    act(async () => { root.render(React.createElement(Probe, { tick: 0, ...props })); });
  await render(initial);
  return {
    calls,
    render,
    async cleanup() {
      await act(async () => root.unmount());
      (globalThis as any).window = previousWindow;
      (globalThis as any).document = previousDocument;
      (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
      dom.window.close();
    },
  };
}

test('the requested prompt waits for the draft, is applied once, and then asks for the URL to be cleaned', async () => {
  const harness = await mountHook({ requestedPrompt: '雨中的猫', draftReady: false });
  try {
    assert.deepEqual(harness.calls.setPrompt, [], 'nothing is applied before the stored draft hydrates');
    assert.equal(harness.calls.applied, 0);
    await harness.render({ requestedPrompt: '雨中的猫', draftReady: true });
    assert.deepEqual(harness.calls.setPrompt, ['雨中的猫']);
    assert.equal(harness.calls.applied, 1);
    await harness.render({ requestedPrompt: '雨中的猫', draftReady: true, tick: 1 });
    await harness.render({ requestedPrompt: '雨中的猫', draftReady: false });
    await harness.render({ requestedPrompt: '雨中的猫', draftReady: true });
    assert.equal(harness.calls.setPrompt.length, 1, 'a re-render never re-applies the same prompt');
    assert.equal(harness.calls.applied, 1);
    await harness.render({ requestedPrompt: null, draftReady: true });
    assert.equal(harness.calls.setPrompt.length, 1, 'the prompt leaves the URL, so there is nothing more to apply');
  } finally {
    await harness.cleanup();
  }
});

test('without a requested prompt the workspace draft is untouched', async () => {
  const harness = await mountHook({ requestedPrompt: null, draftReady: true });
  try {
    assert.deepEqual(harness.calls.setPrompt, []);
    assert.equal(harness.calls.applied, 0);
  } finally {
    await harness.cleanup();
  }
});

test('the prompt link only seeds the composer prompt; generation, wallet and polling files are not involved', () => {
  const hydration = readFileSync(`${appDir}/_hooks/useWorkspaceDraftHydration.ts`, 'utf8');
  const storage = readFileSync(`${appDir}/_hooks/useWorkspaceDraftStorage.ts`, 'utf8');
  const client = readFileSync(`${appDir}/AppClient.tsx`, 'utf8');
  const hook = readFileSync(`${appDir}/_hooks/useWorkspaceRequestedPrompt.ts`, 'utf8');
  assert.match(hydration, /useWorkspaceRequestedPrompt\(\{[\s\S]*draftReady: activeDraft\.ready && hydratedForScope === storageScope && Boolean\(form\)/);
  const navigation = readFileSync(`${appDir}/_hooks/useWorkspaceRouteNavigation.ts`, 'utf8');
  assert.match(storage, /requestedPrompt,\s*\n\s*searchString/);
  assert.match(client, /requestedPrompt: draft\.requestedPrompt, onRequestedPromptApplied: clearRequestedPrompt/);
  assert.match(navigation, /stripWorkspacePromptParam\(window\.location\.pathname, window\.location\.search\)/);
  assert.doesNotMatch(hook, /writeStorage|readStorage|setForm|runGenerate|wallet|poll/i);
  for (const file of ['useWorkspaceGenerationRunner.ts', 'useWorkspaceWalletPreflight.ts']) {
    assert.doesNotMatch(readFileSync(`${appDir}/_hooks/${file}`, 'utf8'), /requestedPrompt|WORKSPACE_PROMPT/);
  }
});
