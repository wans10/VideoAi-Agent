import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveVideoProviderRoutingPlan } from '../frontend/src/server/video-providers/router.ts';
import { resolveLlmhubVideoModel } from '../frontend/src/server/video-providers/llmhub/model-map.ts';
import { LlmhubVideoClient } from '../frontend/src/server/video-providers/llmhub/client.ts';
import { matchesLlmhubVideoGeometry } from '../frontend/src/server/video-providers/llmhub/video-size.ts';
import {
  isSupportedLlmhubMinimaxRequest,
  llmhubIsMinimaxRoute,
  narrowToLlmhubMinimax,
} from '../frontend/src/server/llmhub-minimax-capabilities.ts';
import { getFalEngineById } from '../frontend/src/config/falEngines.ts';

const on = { LLMHUB_INFERENCE_ROUTING_ENABLED: 'true', LLMHUB_API_KEY: 'key' };
const plan = (engineId: string, mode: string, request?: Record<string, unknown>, env: Record<string, string> = on) =>
  resolveVideoProviderRoutingPlan({ engineId, mode, isAdmin: false, env, request } as Parameters<typeof resolveVideoProviderRoutingPlan>[0]);

test('MiniMax H3 and Hailuo 02 map to their LLM Hub models for text and image starts only', () => {
  assert.equal(resolveLlmhubVideoModel('minimax-h3', 't2v'), 'MiniMax-H3');
  assert.equal(resolveLlmhubVideoModel('minimax-h3', 'i2v'), 'MiniMax-H3');
  assert.equal(resolveLlmhubVideoModel('minimax-h3', 'ref2v'), null);
  assert.equal(resolveLlmhubVideoModel('minimax-hailuo-02-text', 't2v'), 'MiniMax-Hailuo-02');
  assert.equal(resolveLlmhubVideoModel('minimax-h3-max', 't2v'), null);
});

test('routing sends only requests LLM Hub accepts, and only with the routing switch on', () => {
  assert.equal(plan('minimax-h3', 't2v', { durationSec: 5, resolution: '768P' }).kind, 'llmhub_primary');
  assert.equal(plan('minimax-h3', 't2v', { durationSec: 15, resolution: '2K' }).kind, 'llmhub_primary');
  for (const request of [{ durationSec: 5, resolution: '480P' }, { durationSec: 5, resolution: '4K' }, { durationSec: 3, resolution: '768P' }, { durationSec: 4, resolution: '768P' }, { durationSec: 16, resolution: '768P' }]) {
    assert.equal(plan('minimax-h3', 't2v', request).kind, 'fal_only', JSON.stringify(request));
  }
  assert.equal(plan('minimax-h3', 'ref2v').kind, 'fal_only');
  assert.equal(plan('minimax-h3', 't2v', { durationSec: 5, resolution: '768P' }, { LLMHUB_API_KEY: 'key' }).kind, 'fal_only');
  assert.equal(plan('minimax-hailuo-02-text', 't2v', { durationSec: 6, resolution: '768P' }).kind, 'llmhub_primary');
  assert.equal(plan('minimax-hailuo-02-text', 't2v', { durationSec: 5, resolution: '768P' }).kind, 'fal_only');
  assert.equal(plan('minimax-hailuo-02-text', 't2v', { durationSec: 6, resolution: '512P' }).kind, 'fal_only');
  assert.equal(plan('minimax-h3-max', 't2v').kind, 'fal_only');
});

test('request support follows the plugin limits', () => {
  assert.equal(isSupportedLlmhubMinimaxRequest({ engineId: 'minimax-h3', mode: 'i2v', durationSec: 5, resolution: '2k' }), true);
  assert.equal(isSupportedLlmhubMinimaxRequest({ engineId: 'minimax-h3', mode: 'i2v', durationSec: 4 }), false);
  assert.equal(isSupportedLlmhubMinimaxRequest({ engineId: 'minimax-h3', mode: 'v2v', durationSec: 4 }), false);
  assert.equal(isSupportedLlmhubMinimaxRequest({ engineId: 'wan-3', mode: 't2v', durationSec: 99, resolution: 'x' }), true);
});

test('H3 text request is JSON with seconds, resolution and ratio', async () => {
  let body: Record<string, unknown> = {};
  const client = new LlmhubVideoClient('key', async (_url, init) => {
    assert.equal((init?.headers as Record<string, string>)['Content-Type'], 'application/json');
    body = JSON.parse(String(init?.body));
    return Response.json({ id: 't1', status: 'queued' });
  });
  await client.create({ model: 'MiniMax-H3', prompt: 'sky', seconds: 6, resolution: '768P', aspectRatio: '9:16', jobId: 'j1' });
  assert.deepEqual(body, { model: 'MiniMax-H3', prompt: 'sky', seconds: 6, resolution: '768P', metadata: { ratio: '9:16' } });
});

test('H3 image request passes the first frame as http(s) content and follows its framing', async () => {
  let body: Record<string, any> = {};
  const client = new LlmhubVideoClient('key', async (_url, init) => { body = JSON.parse(String(init?.body)); return Response.json({ id: 't2' }); });
  await client.create({ model: 'MiniMax-H3', prompt: 'walk', seconds: 5, resolution: '2K', aspectRatio: '16:9',
    imageUrl: 'https://media.maxvideoai.com/start.png', jobId: 'j2' });
  assert.equal(body.metadata.ratio, 'adaptive');
  assert.deepEqual(body.metadata.content, [
    { type: 'text', text: 'walk' },
    { type: 'image_url', image_url: { url: 'https://media.maxvideoai.com/start.png' }, role: 'first_frame' },
  ]);
  assert.equal(body.resolution, '2K');
});

test('Hailuo 02 request uses input_reference and no H3 metadata', async () => {
  let body: Record<string, any> = {};
  const client = new LlmhubVideoClient('key', async (_url, init) => { body = JSON.parse(String(init?.body)); return Response.json({ id: 't3' }); });
  await client.create({ model: 'MiniMax-Hailuo-02', prompt: 'p', seconds: 10, resolution: '768P', aspectRatio: '16:9',
    imageUrl: 'https://media.maxvideoai.com/a.png', jobId: 'j3' });
  assert.equal(body.input_reference, 'https://media.maxvideoai.com/a.png');
  assert.equal('metadata' in body, false);
  assert.equal(body.seconds, 10);
});

test('a rejected submission reports its HTTP status for the refund decision', async () => {
  const client = new LlmhubVideoClient('key', async () => new Response('{}', { status: 400 }));
  await assert.rejects(client.create({ model: 'MiniMax-H3', prompt: 'p', seconds: 5, jobId: 'j4' }), (error: unknown) => (error as { status?: number }).status === 400);
});

test('workspace sees only what LLM Hub accepts for H3 and Hailuo 02', () => {
  const h3 = narrowToLlmhubMinimax(getFalEngineById('minimax-h3')!.engine, on);
  assert.deepEqual(h3.modes, ['t2v', 'i2v']);
  assert.deepEqual(h3.resolutions, ['768P', '2K']);
  const optional = h3.inputSchema?.optional ?? [];
  const ids = optional.map((field) => field.id);
  for (const gone of ['end_image_url', 'reference_image_urls', 'reference_video_urls', 'reference_audio_urls', 'target_audio_url', 'seed', 'prompt_expansion_mode']) {
    assert.equal(ids.includes(gone), false, gone);
  }
  assert.deepEqual(optional.find((field) => field.id === 'duration')?.values, ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15']);
  assert.deepEqual(optional.find((field) => field.id === 'resolution')?.values, ['768P', '2K']);

  const hailuo = narrowToLlmhubMinimax(getFalEngineById('minimax-hailuo-02-text')!.engine, on);
  assert.deepEqual(hailuo.resolutions, ['768P']);
  assert.deepEqual(hailuo.aspectRatios, ['16:9']);
  assert.deepEqual((hailuo.inputSchema?.optional ?? []).find((field) => field.id === 'duration')?.values, ['6', '10']);
  assert.equal((hailuo.inputSchema?.optional ?? []).some((field) => field.id === 'prompt_optimizer' || field.id === 'end_image_url'), false);
});

test('the narrowing is off unless LLM Hub is the only MiniMax route, and never touches other engines', () => {
  const full = getFalEngineById('minimax-h3')!.engine;
  assert.equal(narrowToLlmhubMinimax(full, { ...on, FAL_KEY: 'fal' }), full);
  assert.equal(narrowToLlmhubMinimax(full, {}), full);
  assert.equal(llmhubIsMinimaxRoute(on), true);
  const wan = getFalEngineById('wan-3')!.engine;
  assert.equal(narrowToLlmhubMinimax(wan, on), wan);
});

test('geometry accepts MiniMax 768P and a 2K floor, and rejects a wrong size', () => {
  assert.equal(matchesLlmhubVideoGeometry({ resolution: '768P', aspectRatio: '16:9', width: 1366, height: 768 }), true);
  assert.equal(matchesLlmhubVideoGeometry({ resolution: '768P', aspectRatio: '16:9', width: 1280, height: 720 }), false);
  assert.equal(matchesLlmhubVideoGeometry({ resolution: '2K', aspectRatio: '16:9', width: 2560, height: 1440 }), true);
  assert.equal(matchesLlmhubVideoGeometry({ resolution: '2K', aspectRatio: null, width: 1366, height: 768 }), false);
});

test('every duration and resolution the workspace offers for H3 can be priced', async () => {
  const { getFalEngineById } = await import('../frontend/src/config/falEngines.ts');
  const { calculateMinimaxH3ProviderPrice } = await import('../frontend/src/lib/minimax-h3-pricing.ts');
  const h3 = narrowToLlmhubMinimax(getFalEngineById('minimax-h3')!.engine, on);
  const optional = h3.inputSchema?.optional ?? [];
  const durations = (optional.find((field) => field.id === 'duration')?.values ?? []).map(Number);
  const resolutions = (optional.find((field) => field.id === 'resolution')?.values ?? []) as string[];
  assert.ok(durations.length > 0 && resolutions.length > 0);
  for (const resolution of resolutions) {
    for (const durationSec of durations) {
      assert.doesNotThrow(() => calculateMinimaxH3ProviderPrice({ durationSec, resolution } as Parameters<typeof calculateMinimaxH3ProviderPrice>[0]), `${resolution} ${durationSec}s`);
    }
  }
  // The guard itself: the pricing layer refuses a 4 s clip, which is why the workspace must not offer it.
  assert.throws(() => calculateMinimaxH3ProviderPrice({ durationSec: 4, resolution: '768P' } as Parameters<typeof calculateMinimaxH3ProviderPrice>[0]));
});
