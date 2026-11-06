import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isMinimaxOfficialEnabled,
  isMinimaxOfficialTaskId,
  MinimaxOfficialVideoClient,
  shouldUseMinimaxOfficial,
} from '../frontend/src/server/video-providers/minimax-official/client';
import { LlmhubVideoClient } from '../frontend/src/server/video-providers/llmhub/client';

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
  assert.equal(shouldUseMinimaxOfficial('MiniMax-Hailuo-02', on), false);
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

    const hailuo = fake([json({ id: 'task_def' })]);
    await new LlmhubVideoClient('hub-key', hailuo.fn).create({ model: 'MiniMax-Hailuo-02', prompt: 'p', seconds: 6, resolution: '768P', jobId: 'job_3' });
    assert.equal(hailuo.calls[0].url, 'https://api.llmhub.com.cn/v1/videos');

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
