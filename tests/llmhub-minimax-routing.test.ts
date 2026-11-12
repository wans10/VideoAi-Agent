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
import { getBaseEngines } from '../frontend/src/lib/engines.ts';

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

test('geometry follows the pixel count MiniMax tiers fix, measured on the live provider', () => {
  const fits = (resolution: string, aspectRatio: string | null, width: number, height: number) =>
    matchesLlmhubVideoGeometry({ resolution, aspectRatio, width, height });
  // H3 768P: the same 1,032,192 px for every ratio.
  assert.equal(fits('768P', '16:9', 1344, 768), true);
  assert.equal(fits('768P', '21:9', 1536, 672), true);
  assert.equal(fits('768P', '9:16', 768, 1344), true);
  // H3 2K and Hailuo 02 768P.
  assert.equal(fits('2K', '16:9', 2560, 1440), true);
  assert.equal(fits('768P', '16:9', 1366, 768), true);
  // A render of another tier or ratio is still refused.
  assert.equal(fits('768P', '16:9', 1280, 720), false);
  assert.equal(fits('768P', '16:9', 2560, 1440), false);
  assert.equal(fits('2K', '16:9', 1344, 768), false);
  assert.equal(fits('768P', '21:9', 1344, 768), false);
  assert.equal(fits('2K', null, 1366, 768), false);
});

test('H3 lists 16:9 first so a new form falls back to it', async () => {
  const { getBaseEngines } = await import('../frontend/src/lib/engines.ts');
  const h3 = narrowToLlmhubMinimax(getBaseEngines().find((engine) => engine.id === 'minimax-h3')!, on);
  // The engine-level list keeps 'auto' (the start-image framing) in front and puts 16:9 next.
  assert.deepEqual(h3.aspectRatios, ['auto', '16:9', '9:16', '1:1', '4:3', '3:4', '21:9']);
  const t2v = (h3.modeCaps?.t2v?.aspectRatio ?? []) as string[];
  assert.equal(t2v[0], '16:9');
  assert.deepEqual([...t2v].sort(), ['1:1', '16:9', '21:9', '3:4', '4:3', '9:16'].sort());
  const fields = (h3.inputSchema?.optional ?? []).filter((entry) => entry.id === 'aspect_ratio');
  assert.ok(fields.length > 0);
  for (const field of fields) assert.ok(field.default === '16:9' || (field.values as string[])[0] === 'auto', JSON.stringify(field.default));
});

const official = { ...on, MINIMAX_OFFICIAL_ENABLED: 'true', MINIMAX_API_KEY: 'mm' };
const officialOnly = { MINIMAX_OFFICIAL_ENABLED: 'true', MINIMAX_API_KEY: 'mm' };

test('with the official switch, H3 adds 4 s, last frame and references, and needs no LLM Hub', () => {
  assert.equal(plan('minimax-h3', 't2v', { durationSec: 4, resolution: '768P' }, official).kind, 'llmhub_primary');
  assert.equal(plan('minimax-h3', 't2v', { durationSec: 4, resolution: '768P' }, officialOnly).kind, 'llmhub_primary');
  assert.equal(plan('minimax-h3', 'i2v', {
    durationSec: 6, resolution: '2K',
    attachments: [{ kind: 'image', slotId: 'image_url', url: 'https://a/1.png' }, { kind: 'image', slotId: 'end_image_url', url: 'https://a/2.png' }],
  }, official).kind, 'llmhub_primary');
  assert.equal(plan('minimax-h3', 'ref2v', {
    durationSec: 5, resolution: '768P',
    attachments: [
      { kind: 'image', slotId: 'reference_image_urls', url: 'https://a/1.png' },
      { kind: 'video', slotId: 'reference_video_urls', url: 'https://a/1.mp4' },
      { kind: 'audio', slotId: 'reference_audio_urls', url: 'https://a/1.mp3' },
    ],
  }, official).kind, 'llmhub_primary');
  for (const request of [{ durationSec: 5, resolution: '480P' }, { durationSec: 5, resolution: '4K' }, { durationSec: 3, resolution: '768P' },
    { durationSec: 5, resolution: '768P', seed: 4 }, { durationSec: 5, resolution: '768P', extraInputValues: { prompt_expansion_mode: 'fast' } }]) {
    assert.equal(plan('minimax-h3', 't2v', request, officialOnly).kind, 'fal_only', JSON.stringify(request));
  }
  assert.equal(plan('minimax-h3', 'ref2v', {
    durationSec: 5, resolution: '768P', attachments: [{ kind: 'image', slotId: 'image_url', url: 'https://a/1.png' }],
  }, official).kind, 'fal_only');
  assert.equal(resolveLlmhubVideoModel('minimax-h3', 'ref2v', officialOnly), 'MiniMax-H3');
});

test('Hailuo engines follow the documented legacy matrix on the official route', () => {
  assert.equal(resolveLlmhubVideoModel('minimax-hailuo-2-3', 't2v'), null);
  assert.equal(resolveLlmhubVideoModel('minimax-hailuo-2-3', 't2v', officialOnly), 'MiniMax-Hailuo-2.3');
  assert.equal(resolveLlmhubVideoModel('minimax-hailuo-2-3-fast', 't2v', officialOnly), null);
  assert.equal(resolveLlmhubVideoModel('minimax-hailuo-2-3-fast', 'i2v', officialOnly), 'MiniMax-Hailuo-2.3-Fast');
  assert.equal(plan('minimax-hailuo-2-3', 't2v', { durationSec: 6, resolution: '1080P' }, officialOnly).kind, 'llmhub_primary');
  assert.equal(plan('minimax-hailuo-2-3', 't2v', { durationSec: 10, resolution: '1080P' }, officialOnly).kind, 'fal_only');
  assert.equal(plan('minimax-hailuo-2-3', 't2v', { durationSec: 6, resolution: '768P' }, on).kind, 'fal_only');
  assert.equal(plan('minimax-hailuo-02-text', 'i2v', { durationSec: 10, resolution: '512P',
    attachments: [{ kind: 'image', slotId: 'image_url', url: 'https://a/1.png' }] }, officialOnly).kind, 'llmhub_primary');
  assert.equal(plan('minimax-hailuo-02-text', 't2v', { durationSec: 6, resolution: '512P' }, officialOnly).kind, 'fal_only');
  assert.equal(plan('minimax-hailuo-02-text', 'i2v', { durationSec: 6, resolution: '768P',
    attachments: [{ kind: 'image', slotId: 'image_url', url: 'https://a/1.png' }, { kind: 'image', slotId: 'end_image_url', url: 'https://a/2.png' }],
  }, officialOnly).kind, 'llmhub_primary');
  assert.equal(plan('minimax-hailuo-02-text', 'i2v', { durationSec: 6, resolution: '512P',
    attachments: [{ kind: 'image', slotId: 'image_url', url: 'https://a/1.png' }, { kind: 'image', slotId: 'end_image_url', url: 'https://a/2.png' }],
  }, officialOnly).kind, 'fal_only');
  assert.equal(plan('minimax-hailuo-2-3', 'i2v', { durationSec: 6, resolution: '768P',
    attachments: [{ kind: 'image', slotId: 'image_url', url: 'https://a/1.png' }, { kind: 'image', slotId: 'end_image_url', url: 'https://a/2.png' }],
  }, officialOnly).kind, 'fal_only');
  assert.equal(plan('minimax-hailuo-2-3', 't2v', { durationSec: 6, resolution: '768P', extraInputValues: { prompt_optimizer: 'off' } }, officialOnly).kind, 'llmhub_primary');
  assert.equal(plan('minimax-h3-max', 't2v', { durationSec: 6, resolution: '768P' }, official).kind, 'fal_only');
});

test('the workspace sees what the official API accepts when the switch is on', () => {
  const h3 = narrowToLlmhubMinimax(getFalEngineById('minimax-h3')!.engine, official);
  assert.deepEqual(h3.modes, ['t2v', 'i2v', 'ref2v']);
  assert.deepEqual(h3.resolutions, ['768P', '2K']);
  const ids = (h3.inputSchema?.optional ?? []).map((field) => field.id);
  for (const kept of ['end_image_url', 'reference_image_urls', 'reference_video_urls', 'reference_audio_urls']) assert.ok(ids.includes(kept), kept);
  for (const gone of ['target_audio_url', 'seed', 'prompt_expansion_mode']) assert.equal(ids.includes(gone), false, gone);
  assert.equal((h3.inputSchema?.optional ?? []).find((field) => field.id === 'duration')?.values?.[0], '4');

  // The workspace narrows the app engines (with per-mode caps), not the raw registry entry.
  const hailuoBase = getBaseEngines().find((engine) => engine.id === 'minimax-hailuo-02-text');
  assert.ok(hailuoBase?.modeCaps);
  const hailuo = narrowToLlmhubMinimax(hailuoBase, officialOnly);
  assert.deepEqual(hailuo.modeCaps?.t2v?.resolution, ['768P']);
  assert.deepEqual(hailuo.modeCaps?.i2v?.resolution, ['768P', '512P']);
  assert.ok((hailuo.inputSchema?.optional ?? []).some((field) => field.id === 'end_image_url'));

  const fast = narrowToLlmhubMinimax(getFalEngineById('minimax-hailuo-2-3-fast')!.engine, officialOnly);
  assert.deepEqual(fast.modes, ['i2v']);
  assert.deepEqual(fast.resolutions, ['768P', '1080P']);
});

test('H3 catalogue no longer offers 480P or 4K and starts at 4 s', () => {
  const h3 = getFalEngineById('minimax-h3')!.engine;
  assert.deepEqual(h3.resolutions, ['768P', '2K']);
  const duration = (h3.inputSchema?.optional ?? []).find((field) => field.id === 'duration');
  assert.equal(duration?.min, 4);
});
