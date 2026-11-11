import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isMinimaxLegacyTaskId,
  isMinimaxOfficialEnabled,
  isMinimaxOfficialTaskId,
  MINIMAX_MESSAGES,
  MinimaxOfficialVideoClient,
  shouldUseMinimaxOfficial,
} from '../frontend/src/server/video-providers/minimax-official/client';
import { LlmhubVideoClient } from '../frontend/src/server/video-providers/llmhub/client';
import { resetMinimaxRateLimits } from '../frontend/src/server/minimax-rate-limit';

type Call = { url: string; init?: RequestInit };
function fake(responses: Array<Response | (() => Response)>) {
  const calls: Call[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const next = responses.shift();
    if (!next) throw new Error('unexpected request');
    return typeof next === 'function' ? next() : next;
  }) as typeof fetch;
  return { fn, calls };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const body = (call: Call) => JSON.parse(String(call.init?.body));

test('official routing needs both the flag and a key, and only covers MiniMax-H3', () => {
  assert.equal(isMinimaxOfficialEnabled({ MINIMAX_OFFICIAL_ENABLED: 'true' }), false);
  assert.equal(isMinimaxOfficialEnabled({ MINIMAX_API_KEY: 'k' }), false);
  assert.equal(isMinimaxOfficialEnabled({ MINIMAX_OFFICIAL_ENABLED: 'true', MINIMAX_API_KEY: 'k' }), true);
  const on = { MINIMAX_OFFICIAL_ENABLED: 'true', MINIMAX_API_KEY: 'k' };
  assert.equal(shouldUseMinimaxOfficial('MiniMax-H3', on), true);
  // Hailuo runs on the legacy V1 API under the same switch (Keyvo decision 2026-11-11).
  assert.equal(shouldUseMinimaxOfficial('MiniMax-Hailuo-02', on), true);
  assert.equal(shouldUseMinimaxOfficial('MiniMax-Hailuo-2.3', on), true);
  assert.equal(shouldUseMinimaxOfficial('MiniMax-H3-Max', on), false);
  assert.equal(shouldUseMinimaxOfficial('MiniMax-H3', {}), false);
});

test('official task IDs are told apart from LLM Hub IDs', () => {
  assert.equal(isMinimaxOfficialTaskId('460424993944153'), true);
  assert.equal(isMinimaxOfficialTaskId('task_njNFrC7efplic0TTdDV0VSEbJWH5nPD2'), false);
  assert.equal(isMinimaxOfficialTaskId('video_123456789'), false);
});

test('text-to-video sends an explicit ratio and upper-case resolution', async () => {
  const { fn, calls } = fake([json({ task_id: '460424993944153' })]);
  const client = new MinimaxOfficialVideoClient('key', fn);
  const result = await client.create({ model: 'MiniMax-H3', prompt: 'a cat', seconds: 5, resolution: '768p', aspectRatio: '21:9' });
  assert.equal(result.id, '460424993944153');
  assert.equal(calls[0].url, 'https://api.minimax.cn/v2/video_generation');
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer key');
  assert.deepEqual(body(calls[0]), {
    model: 'MiniMax-H3',
    content: [{ type: 'text', text: 'a cat' }],
    resolution: '768P',
    duration: 5,
    ratio: '21:9',
  });
});

test('a first-frame render sends the signed image and no ratio', async () => {
  const { fn, calls } = fake([json({ task_id: '460424993944154' })]);
  const client = new MinimaxOfficialVideoClient('key', fn, async (url) => `${url}?signed=1`);
  await client.create({ model: 'MiniMax-H3', prompt: 'p', seconds: 6, resolution: '2K', aspectRatio: '16:9', imageUrl: 'https://cdn.example.cn/a.png' });
  const sent = body(calls[0]);
  assert.equal('ratio' in sent, false);
  assert.deepEqual(sent.content[1], { type: 'image_url', image_url: { url: 'https://cdn.example.cn/a.png?signed=1' }, role: 'first_frame' });
});

test('4xx submissions carry their status so the refund path sees a definite rejection', async () => {
  for (const status of [400, 402, 422, 429]) {
    const { fn } = fake([json({ type: 'error', error: { type: 'x', message: 'no', http_code: String(status) } }, status)]);
    await assert.rejects(
      new MinimaxOfficialVideoClient('key', fn).create({ model: 'MiniMax-H3', prompt: 'p', seconds: 5 }),
      (error: Error & { status?: number }) => error.status === status,
    );
  }
  const { fn } = fake([json({}, 500)]);
  await assert.rejects(
    new MinimaxOfficialVideoClient('key', fn).create({ model: 'MiniMax-H3', prompt: 'p', seconds: 5 }),
    (error: Error & { status?: number }) => error.status === 500,
  );
});

test('a 200 without a task ID is an error, not an accepted task', async () => {
  const { fn } = fake([json({})]);
  await assert.rejects(new MinimaxOfficialVideoClient('key', fn).create({ model: 'MiniMax-H3', prompt: 'p', seconds: 5 }), /no task ID/);
});

test('task states map onto the shared status set', async () => {
  for (const [raw, expected] of [['queued', 'queued'], ['running', 'running'], ['succeeded', 'completed'], ['failed', 'failed'], ['cancelled', 'failed']] as const) {
    const { fn } = fake([json({ task: { id: '1', status: raw } })]);
    assert.equal((await new MinimaxOfficialVideoClient('key', fn).status('460424993944153')).status, expected);
  }
  const { fn } = fake([json({ task: { id: '1', status: 'mystery' } })]);
  await assert.rejects(new MinimaxOfficialVideoClient('key', fn).status('460424993944153'), /unknown/);
});

test('content downloads the signed URL only over HTTPS on a named host', async () => {
  const ok = fake([
    json({ task: { status: 'succeeded', content: { url: 'https://videos.example.aliyuncs.com/o.mp4?sig=1' } } }),
    new Response('x', { headers: { 'content-type': 'video/mp4' } }),
  ]);
  const response = await new MinimaxOfficialVideoClient('key', ok.fn).content('460424993944153');
  assert.equal(response.ok, true);
  assert.equal(ok.calls[1].url, 'https://videos.example.aliyuncs.com/o.mp4?sig=1');
  for (const url of ['http://videos.example.com/o.mp4', 'https://10.0.0.1/o.mp4', 'https://[::1]/o.mp4']) {
    const bad = fake([json({ task: { status: 'succeeded', content: { url } } })]);
    await assert.rejects(new MinimaxOfficialVideoClient('key', bad.fn).content('460424993944153'), /not allowed/);
    assert.equal(bad.calls.length, 1, 'the unsafe URL must not be fetched');
  }
});

test('LlmhubVideoClient delegates MiniMax-H3 only when official routing is on, and by task ID afterwards', async () => {
  const saved = { f: process.env.MINIMAX_OFFICIAL_ENABLED, k: process.env.MINIMAX_API_KEY };
  try {
    delete process.env.MINIMAX_OFFICIAL_ENABLED;
    process.env.MINIMAX_API_KEY = 'mm-key';
    const off = fake([json({ id: 'task_abc' })]);
    await new LlmhubVideoClient('hub-key', off.fn).create({ model: 'MiniMax-H3', prompt: 'p', seconds: 5, resolution: '768P', aspectRatio: '16:9', jobId: 'job_1' });
    assert.equal(off.calls[0].url, 'https://api.llmhub.com.cn/v1/videos');

    process.env.MINIMAX_OFFICIAL_ENABLED = 'true';
    const on = fake([json({ task_id: '460424993944155' })]);
    const created = await new LlmhubVideoClient('hub-key', on.fn).create({ model: 'MiniMax-H3', prompt: 'p', seconds: 5, resolution: '768P', aspectRatio: '16:9', jobId: 'job_2' });
    assert.equal(created.id, '460424993944155');
    assert.match(on.calls[0].url, /^https:\/\/api\.minimax\.cn\/v2\/video_generation$/);
    assert.equal((on.calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer mm-key');

    const hailuo = fake([json({ task_id: '106916112212032', base_resp: { status_code: 0, status_msg: 'success' } })]);
    const legacy = await new LlmhubVideoClient('hub-key', hailuo.fn).create({ model: 'MiniMax-Hailuo-02', prompt: 'p', seconds: 6, resolution: '768P', jobId: 'job_3' });
    assert.equal(hailuo.calls[0].url, 'https://api.minimax.cn/v1/video_generation');
    assert.equal(legacy.id, 'mmv1-106916112212032');

    const polled = fake([json({ id: 'task_abc', status: 'in_progress', progress: 40 })]);
    const status = await new LlmhubVideoClient('hub-key', polled.fn).status('task_abc');
    assert.equal(status.status, 'running');
    assert.match(polled.calls[0].url, /llmhub\.com\.cn/);

    const official = fake([json({ task: { status: 'running' } })]);
    await new LlmhubVideoClient('hub-key', official.fn).status('460424993944155');
    assert.match(official.calls[0].url, /api\.minimax\.cn\/v2\/query/);
  } finally {
    if (saved.f === undefined) delete process.env.MINIMAX_OFFICIAL_ENABLED; else process.env.MINIMAX_OFFICIAL_ENABLED = saved.f;
    if (saved.k === undefined) delete process.env.MINIMAX_API_KEY; else process.env.MINIMAX_API_KEY = saved.k;
  }
});

test('the official first+last frame request carries both roles and no ratio', async () => {
  resetMinimaxRateLimits();
  const { fn, calls } = fake([json({ task_id: '460424993944160' })]);
  await new MinimaxOfficialVideoClient('key', fn).create({
    model: 'MiniMax-H3', prompt: 'p', seconds: 4, resolution: '2K', aspectRatio: '16:9',
    imageUrl: 'https://cdn.example.cn/a.png', endImageUrl: 'https://cdn.example.cn/b.png',
  });
  const sent = body(calls[0]);
  assert.equal(sent.duration, 4);
  assert.equal('ratio' in sent, false);
  assert.deepEqual(sent.content.slice(1), [
    { type: 'image_url', image_url: { url: 'https://cdn.example.cn/a.png' }, role: 'first_frame' },
    { type: 'image_url', image_url: { url: 'https://cdn.example.cn/b.png' }, role: 'last_frame' },
  ]);
});

test('multimodal references use their roles and default to adaptive framing', async () => {
  resetMinimaxRateLimits();
  const { fn, calls } = fake([json({ task_id: '460424993944161' }), json({ task_id: '460424993944162' })]);
  const client = new MinimaxOfficialVideoClient('key', fn);
  await client.create({
    model: 'MiniMax-H3', prompt: 'p', seconds: 10, resolution: '768P', aspectRatio: 'auto',
    referenceImageUrls: ['https://cdn.example.cn/r1.png'],
    referenceVideoUrls: ['https://cdn.example.cn/v.mp4'],
    referenceAudioUrls: ['https://cdn.example.cn/a.mp3'],
  });
  const sent = body(calls[0]);
  assert.equal('ratio' in sent, false);
  assert.deepEqual(sent.content.slice(1).map((item: { role: string; type: string }) => [item.type, item.role]), [
    ['image_url', 'reference_image'], ['video_url', 'reference_video'], ['audio_url', 'reference_audio'],
  ]);
  await client.create({ model: 'MiniMax-H3', prompt: 'p', seconds: 5, aspectRatio: '9:16', referenceImageUrls: ['https://cdn.example.cn/r1.png'] });
  assert.equal(body(calls[1]).ratio, '9:16');
});

test('documented limits are refused before any request, as definite rejections', async () => {
  resetMinimaxRateLimits();
  const cases: Array<Record<string, unknown>> = [
    { seconds: 3 },
    { seconds: 16 },
    { seconds: 5, resolution: '480P' },
    { seconds: 5, resolution: '4K' },
    { seconds: 5, imageUrl: 'https://x.cn/a.png', referenceImageUrls: ['https://x.cn/b.png'] },
    { seconds: 5, referenceImageUrls: Array.from({ length: 10 }, (_, index) => `https://x.cn/${index}.png`) },
    { seconds: 5, referenceVideoUrls: ['https://x.cn/1.mp4', 'https://x.cn/2.mp4', 'https://x.cn/3.mp4', 'https://x.cn/4.mp4'] },
    { seconds: 5, prompt: 'x'.repeat(7001) },
  ];
  for (const extra of cases) {
    const { fn, calls } = fake([]);
    await assert.rejects(
      new MinimaxOfficialVideoClient('key', fn).create({ model: 'MiniMax-H3', prompt: 'p', ...extra } as never),
      (error: { status?: number; definiteRejection?: boolean }) => error.status === 400 && error.definiteRejection === true,
      JSON.stringify(extra).slice(0, 80),
    );
    assert.equal(calls.length, 0);
  }
});

test('errors carry the internal code, 529 overloaded counts as a definite rejection, 500 does not', async () => {
  resetMinimaxRateLimits();
  const cases = [
    { status: 429, message: 'rate limit, please retry later (1002)', user: MINIMAX_MESSAGES.rateLimited, definite: true },
    { status: 422, message: 'video description contains sensitive content (1026)', user: MINIMAX_MESSAGES.inputSensitive, definite: true },
    { status: 529, message: 'overloaded', user: MINIMAX_MESSAGES.overloaded, definite: true },
    { status: 500, message: 'internal error (1000)', user: undefined, definite: false },
  ];
  for (const item of cases) {
    const { fn } = fake([json({ type: 'error', error: { type: 'x', message: item.message, http_code: String(item.status) } }, item.status)]);
    await assert.rejects(
      new MinimaxOfficialVideoClient('key', fn).create({ model: 'MiniMax-H3', prompt: 'p', seconds: 5 }),
      (error: { status?: number; userMessage?: string; definiteRejection?: boolean }) =>
        error.status === item.status && error.userMessage === item.user && error.definiteRejection === item.definite,
      String(item.status),
    );
  }
});

test('a failed task reports MiniMax\'s reason', async () => {
  const { fn } = fake([json({ task: { status: 'failed', error: { code: '1027', message: 'output sensitive' } } })]);
  const result = await new MinimaxOfficialVideoClient('key', fn).status('460424993944153');
  assert.equal(result.status, 'failed');
  assert.equal(result.errorCode, '1027');
  assert.equal(result.failureMessage, MINIMAX_MESSAGES.outputSensitive);
});

test('an expired task (older than 7 days) is reported as such', async () => {
  const { fn } = fake([json({ type: 'error', error: { type: 'bad_request_error', message: 'invalid task_id (2013)' } }, 400)]);
  await assert.rejects(new MinimaxOfficialVideoClient('key', fn).status('460424993944153'),
    (error: { code?: string }) => error.code === 'task_expired');
});

test('the V2 RPM guard refuses locally once the documented 300 per minute are used', async () => {
  resetMinimaxRateLimits();
  const { acquireMinimaxSlot } = await import('../frontend/src/server/minimax-rate-limit');
  for (let index = 0; index < 300; index += 1) acquireMinimaxSlot('video_v2');
  const { fn, calls } = fake([]);
  await assert.rejects(
    new MinimaxOfficialVideoClient('key', fn).create({ model: 'MiniMax-H3', prompt: 'p', seconds: 5 }),
    (error: { status?: number; userMessage?: string }) => error.status === 429 && error.userMessage === MINIMAX_MESSAGES.rateLimited,
  );
  assert.equal(calls.length, 0);
  resetMinimaxRateLimits();
});

test('legacy Hailuo requests follow the per-model matrix and keep a prefixed task ID', async () => {
  resetMinimaxRateLimits();
  const { fn, calls } = fake([
    json({ task_id: '106916112212032', base_resp: { status_code: 0 } }),
    json({ task_id: '106916112212033', base_resp: { status_code: 0 } }),
  ]);
  const client = new MinimaxOfficialVideoClient('key', fn, async (url) => `${url}?signed=1`);
  const created = await client.create({ model: 'MiniMax-Hailuo-2.3', prompt: 'p [推进]', seconds: 6, resolution: '1080P', promptOptimizer: false });
  assert.equal(created.id, 'mmv1-106916112212032');
  assert.equal(isMinimaxLegacyTaskId(created.id), true);
  assert.equal(isMinimaxOfficialTaskId(created.id), false);
  assert.deepEqual(body(calls[0]), { model: 'MiniMax-Hailuo-2.3', prompt: 'p [推进]', duration: 6, resolution: '1080P', prompt_optimizer: false });
  await client.create({ model: 'MiniMax-Hailuo-02', prompt: 'p', seconds: 10, resolution: '768P',
    imageUrl: 'https://x.cn/a.png', endImageUrl: 'https://x.cn/b.png' });
  assert.deepEqual(body(calls[1]), { model: 'MiniMax-Hailuo-02', prompt: 'p', first_frame_image: 'https://x.cn/a.png?signed=1',
    last_frame_image: 'https://x.cn/b.png?signed=1', duration: 10, resolution: '768P' });
  for (const bad of [
    { model: 'MiniMax-Hailuo-2.3', seconds: 10, resolution: '1080P' },
    { model: 'MiniMax-Hailuo-2.3-Fast', seconds: 6, resolution: '768P' },
    { model: 'MiniMax-Hailuo-02', seconds: 6, resolution: '512P', imageUrl: 'https://x.cn/a.png', endImageUrl: 'https://x.cn/b.png' },
    { model: 'MiniMax-Hailuo-2.3', seconds: 6, resolution: '768P', imageUrl: 'https://x.cn/a.png', endImageUrl: 'https://x.cn/b.png' },
  ]) {
    await assert.rejects(client.create({ prompt: 'p', ...bad } as never), (error: { status?: number }) => error.status === 400, JSON.stringify(bad));
  }
  assert.equal(calls.length, 2);
});

test('legacy business errors arrive as HTTP 200 with a status code and are definite rejections', async () => {
  resetMinimaxRateLimits();
  const { fn } = fake([json({ task_id: '', base_resp: { status_code: 1002, status_msg: 'rate limit' } })]);
  await assert.rejects(
    new MinimaxOfficialVideoClient('key', fn).create({ model: 'MiniMax-Hailuo-02', prompt: 'p', seconds: 6, resolution: '768P' }),
    (error: { status?: number; definiteRejection?: boolean; userMessage?: string }) =>
      error.status === 429 && error.definiteRejection === true && error.userMessage === MINIMAX_MESSAGES.rateLimited,
  );
});

test('legacy status and download use the query and file APIs', async () => {
  for (const [raw, expected] of [['Preparing', 'queued'], ['Queueing', 'queued'], ['Processing', 'running'], ['Success', 'completed'], ['Fail', 'failed']] as const) {
    const { fn, calls } = fake([json({ task_id: '1', status: raw, base_resp: { status_code: 0 } })]);
    assert.equal((await new MinimaxOfficialVideoClient('key', fn).status('mmv1-106916112212032')).status, expected);
    assert.equal(calls[0].url, 'https://api.minimax.cn/v1/query/video_generation?task_id=106916112212032');
  }
  const ok = fake([
    json({ task_id: '1', status: 'Success', file_id: '176844028768320', base_resp: { status_code: 0 } }),
    json({ file: { file_id: 176844028768320, download_url: 'https://files.example.cn/o.mp4?sig=1' }, base_resp: { status_code: 0 } }),
    new Response('x', { headers: { 'content-type': 'video/mp4' } }),
  ]);
  const response = await new MinimaxOfficialVideoClient('key', ok.fn).content('mmv1-106916112212032');
  assert.equal(response.ok, true);
  assert.equal(ok.calls[1].url, 'https://api.minimax.cn/v1/files/retrieve?file_id=176844028768320');
  assert.equal(ok.calls[2].url, 'https://files.example.cn/o.mp4?sig=1');
});

test('generate payload media maps onto the official last frame, references and prompt optimiser', async () => {
  const { resolveMinimaxOfficialMedia } = await import('../frontend/app/api/generate/_lib/minimax-official-media');
  const base = { engineId: 'minimax-h3', prompt: 'p' };
  assert.deepEqual(resolveMinimaxOfficialMedia({ ...base, inputs: [
    { name: 'a', type: 'image/png', size: 1, kind: 'image', slotId: 'image_url', url: 'https://m/a.png' },
    { name: 'b', type: 'image/png', size: 1, kind: 'image', slotId: 'end_image_url', url: 'https://m/b.png' },
  ] }, 'i2v'), { endImageUrl: 'https://m/b.png' });
  assert.deepEqual(resolveMinimaxOfficialMedia({ ...base, referenceImages: ['https://m/r.png'], inputs: [
    { name: 'r', type: 'image/png', size: 1, kind: 'image', slotId: 'reference_image_urls', url: 'https://m/r.png' },
    { name: 'v', type: 'video/mp4', size: 1, kind: 'video', slotId: 'reference_video_urls', url: 'https://m/v.mp4' },
    { name: 'u', type: 'audio/mpeg', size: 1, kind: 'audio', slotId: 'reference_audio_urls', url: 'https://m/u.mp3' },
  ] }, 'ref2v'), {
    referenceImageUrls: ['https://m/r.png'], referenceVideoUrls: ['https://m/v.mp4'], referenceAudioUrls: ['https://m/u.mp3'],
  });
  assert.deepEqual(resolveMinimaxOfficialMedia({ ...base, extraInputValues: { prompt_optimizer: 'off' } }, 't2v'), { promptOptimizer: false });
});
