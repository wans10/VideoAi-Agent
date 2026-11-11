import assert from 'node:assert/strict';
import test from 'node:test';

import type { GeneratePayload } from '../frontend/src/lib/fal-types';
import { getKlingFailureMessage } from '../frontend/lib/kling-failure-messages';
import { getKlingV4OfficialLimitViolation, isKlingV4PromptWithinOfficialLimit } from '../frontend/src/lib/kling-v4-official-limits';
import { KlingDirectClient, KLING_DEFAULT_API_BASE_URL } from '../frontend/src/server/video-providers/kling-direct/client';
import {
  computeKlingDirectV2Credits,
  computeKlingDirectV2ProviderCostUsd,
  estimateKlingDirectCost,
} from '../frontend/src/server/video-providers/kling-direct/cost';
import {
  classifyKlingDirectError,
  isKlingDirectBusyRejection,
  isKlingDirectDefiniteRejection,
  KlingDirectError,
} from '../frontend/src/server/video-providers/kling-direct/errors';
import {
  isKlingDirectV2Engine,
  resolveKlingDirectModelRoute,
} from '../frontend/src/server/video-providers/kling-direct/model-map';
import { buildKlingDirectPayload } from '../frontend/src/server/video-providers/kling-direct/payload';
import { buildKlingDirectV2Payload, foldKlingV2ShotPlan } from '../frontend/src/server/video-providers/kling-direct/payload-v2';
import { normalizeKlingDirectV2Task } from '../frontend/src/server/video-providers/kling-direct/response';
import {
  resolveVideoProviderRoutingPlan,
  shouldRouteKlingDirectSourceElementsToFal,
} from '../frontend/src/server/video-providers/router';
import { submitKlingDirectGenerateTask } from '../frontend/app/api/generate/_lib/kling-direct-submission';
import { validateProviderSpecificConstraints } from '../frontend/src/server/video-generation/execution-constraints';

const directEnv = {
  KLING_DIRECT_ENABLED: 'true',
  KLING_API_KEY: 'test-only-key',
  KLING_DIRECT_PUBLIC_ROUTING_ENABLED: 'true',
  KLING_DIRECT_ADMIN_ONLY: 'false',
  KLING_DIRECT_FALLBACK_TO_FAL_ENABLED: 'true',
  FAL_API_KEY: '',
  FAL_KEY: '',
};

const image = (name: string) => `https://media.example.test/${name}.png`;
const video = (name: string) => `https://media.example.test/${name}.mp4`;

test('Kling 4.0 and Flash map to the official new-design paths with unified /tasks polling', () => {
  const v4 = resolveKlingDirectModelRoute('kling-v4');
  assert.equal(v4.apiDesign, 'v2');
  assert.equal(v4.providerModel, 'kling-4.0');
  assert.deepEqual(v4.createPaths, {
    t2v: '/text-to-video/kling-4.0', i2v: '/image-to-video/kling-4.0',
    ref2v: '/omni-video/kling-4.0', v2v: '/omni-video/kling-4.0',
  });
  assert.ok(Object.values(v4.pollPathPrefixes).every(path => path === '/tasks'));
  const flash = resolveKlingDirectModelRoute('kling-v4-flash');
  assert.deepEqual(flash.createPaths, {
    t2v: '/text-to-video/kling-4.0-flash', i2v: '/image-to-video/kling-4.0-flash', ref2v: '/omni-video/kling-4.0-flash',
  });
  assert.equal(isKlingDirectV2Engine('kling-v4-flash'), true);
  assert.equal(isKlingDirectV2Engine('kling-3-pro'), false);
  assert.throws(() => buildKlingDirectPayload({ engineId: 'kling-v4', jobId: 'j', mode: 't2v', prompt: 'x', durationSec: 5 }), /new-design/);
  assert.equal(KLING_DEFAULT_API_BASE_URL, 'https://api-beijing.klingai.com');
});

test('Kling 4.0 routes directly with an API key, never falls back, and refuses without Fal before any charge', () => {
  for (const engineId of ['kling-v4', 'kling-v4-flash']) {
    for (const mode of ['t2v', 'i2v', 'ref2v']) {
      const plan = resolveVideoProviderRoutingPlan({ engineId, mode, isAdmin: false, env: directEnv });
      assert.deepEqual(plan, {
        kind: 'kling_direct_primary', primaryProvider: 'kling_direct', fallbackProvider: 'fal',
        fallbackEnabled: false, fallbackOnCreditsDepletedEnabled: false, elementRegistrationEnabled: false, apiDesign: 'v2',
      });
      assert.equal(shouldRouteKlingDirectSourceElementsToFal({ providerRoutingPlan: plan, elementCount: 2 }), false);
      // AK/SK is valid only on the legacy design.
      const akSk = { ...directEnv, KLING_API_KEY: '', KLING_ACCESS_KEY: 'ak', KLING_SECRET_KEY: 'sk' };
      assert.deepEqual(resolveVideoProviderRoutingPlan({ engineId, mode, isAdmin: false, env: akSk }),
        { kind: 'kling_direct_unavailable', reason: 'direct_not_configured' });
      assert.deepEqual(resolveVideoProviderRoutingPlan({ engineId, mode, isAdmin: false, env: { ...akSk, FAL_API_KEY: 'fal' } }),
        { kind: 'fal_only', primaryProvider: 'fal', fallbackEnabled: false });
      assert.deepEqual(resolveVideoProviderRoutingPlan({ engineId, mode, isAdmin: false, env: { ...directEnv, KLING_DIRECT_ADMIN_ONLY: 'true' } }),
        { kind: 'kling_direct_unavailable', reason: 'admin_only' });
    }
  }
  assert.deepEqual(resolveVideoProviderRoutingPlan({ engineId: 'kling-v4-flash', mode: 'v2v', isAdmin: true, env: directEnv }),
    { kind: 'kling_direct_unavailable', reason: 'unsupported_mode' });
  assert.equal(resolveVideoProviderRoutingPlan({ engineId: 'kling-v4', mode: 'v2v', isAdmin: false, env: directEnv }).kind, 'kling_direct_primary');
});

test('text-to-video sends a top-level prompt with settings and our job id as external task id', () => {
  const payload = buildKlingDirectV2Payload({ engineId: 'kling-v4', jobId: 'job_t2v', mode: 't2v', falPayload: {
    engineId: 'kling-v4', mode: 't2v', prompt: 'A night train arrives.', durationSec: 30, resolution: '720p', aspectRatio: '21:9',
  } as GeneratePayload });
  assert.equal(payload.createPath, '/text-to-video/kling-4.0');
  assert.equal(payload.pollPathPrefix, '/tasks');
  assert.deepEqual(payload.body, {
    prompt: 'A night train arrives.',
    settings: { resolution: '720p', duration: 30, aspect_ratio: '21:9' },
    options: { external_task_id: 'job_t2v', watermark_info: { enabled: false } },
  });
});

test('a shot plan is folded into the prompt using the documented shot syntax', () => {
  assert.equal(foldKlingV2ShotPlan([{ prompt: 'Wide shot', duration: 3 }, { prompt: 'Close-up', duration: 2 }]), '镜头1:3s。Wide shot\n镜头2:2s。Close-up');
  const payload = buildKlingDirectV2Payload({ engineId: 'kling-v4', jobId: 'job_shots', mode: 'i2v', falPayload: {
    engineId: 'kling-v4', mode: 'i2v', prompt: '', durationSec: 5, imageUrl: image('start'), endImageUrl: image('end'),
    multiPrompt: [{ prompt: 'Wide shot', duration: 3 }, { prompt: 'Close-up', duration: 2 }],
  } as GeneratePayload });
  assert.equal(payload.createPath, '/image-to-video/kling-4.0');
  assert.deepEqual(payload.body.contents, [
    { type: 'prompt', text: '镜头1:3s。Wide shot\n镜头2:2s。Close-up' },
    { type: 'first_frame', url: image('start') },
    { type: 'last_frame', url: image('end') },
  ]);
  assert.deepEqual(payload.body.settings, { resolution: '1080p', duration: 5 });
});

test('reference generation maps images, videos and registered subjects into omni contents', () => {
  const falPayload = {
    engineId: 'kling-v4-flash', mode: 'ref2v', prompt: '@Element1 walks past @Image1', durationSec: 8, aspectRatio: 'auto',
    imageUrl: image('start'), referenceImages: [image('a'), image('b')],
    inputs: [{ name: 'v', kind: 'video', type: 'video/mp4', size: 1, slotId: 'video_urls', url: video('ref') }],
    elements: [{ frontalImageUrl: image('face'), referenceImageUrls: [image('side')] }],
  } as unknown as GeneratePayload;
  const payload = buildKlingDirectV2Payload({ engineId: 'kling-v4-flash', jobId: 'job_ref', mode: 'ref2v', falPayload,
    registeredElements: [{ frontalImageUrl: image('face'), referenceImageUrls: [image('side')], providerElementId: 777 }] });
  assert.equal(payload.createPath, '/omni-video/kling-4.0-flash');
  assert.deepEqual(payload.body.contents, [
    { type: 'prompt', text: '@Element1 walks past @Image1' },
    { type: 'first_frame', url: image('start') },
    { type: 'refer_image', url: image('a'), id: 'Image1' },
    { type: 'refer_image', url: image('b'), id: 'Image2' },
    { type: 'feature_video', url: video('ref'), id: 'Video1' },
    { type: 'element', element_id: '777', id: 'Element1' },
  ]);
  assert.deepEqual(payload.body.settings, { resolution: '720p', duration: 8, aspect_ratio: 'adaptive' });
  assert.throws(() => buildKlingDirectV2Payload({ engineId: 'kling-v4-flash', jobId: 'job_ref', mode: 'ref2v', falPayload }),
    (error: unknown) => error instanceof KlingDirectError && error.code === 'KLING_ELEMENT_REGISTRATION_INCOMPLETE');
});

test('editing sends the source as base_video and may inherit its duration', () => {
  const payload = buildKlingDirectV2Payload({ engineId: 'kling-v4', jobId: 'job_edit', mode: 'v2v', falPayload: {
    engineId: 'kling-v4', mode: 'v2v', prompt: 'Make it snow', videoUrl: video('source'),
  } as GeneratePayload });
  assert.deepEqual(payload.body.contents, [
    { type: 'prompt', text: 'Make it snow' },
    { type: 'base_video', url: video('source'), id: 'Video1' },
  ]);
  assert.deepEqual(payload.body.settings, { resolution: '1080p' });
});

test('official limits reject prorated prompts and more than 15 mixed references before submission', () => {
  assert.equal(isKlingV4PromptWithinOfficialLimit('x'.repeat(26000)), true);
  assert.equal(isKlingV4PromptWithinOfficialLimit('镜'.repeat(11000)), true);
  assert.equal(isKlingV4PromptWithinOfficialLimit('镜'.repeat(11001)), false);
  assert.equal(isKlingV4PromptWithinOfficialLimit(`${'x'.repeat(13000)}${'镜'.repeat(5501)}`), false);
  assert.ok(getKlingV4OfficialLimitViolation({ imageCount: 10, videoCount: 5, elementCount: 1 }));
  assert.ok(getKlingV4OfficialLimitViolation({ videoCount: 3, elementCount: 3, videoElementCount: 3 }));
  assert.equal(getKlingV4OfficialLimitViolation({ imageCount: 10, videoCount: 5 }), null);
  const tooMany = validateProviderSpecificConstraints({ engineId: 'kling-v4', normalizedMode: 'ref2v', payload: {
    prompt: 'x', image_urls: Array.from({ length: 9 }, (_, i) => image(`i${i}`)), image_url: image('s'),
    video_urls: Array.from({ length: 5 }, (_, i) => video(`v${i}`)), elements: [{ frontalImageUrl: image('f'), referenceImageUrls: [image('r')] }],
  } });
  assert.equal(tooMany.ok, false);
  assert.equal(validateProviderSpecificConstraints({ engineId: 'kling-v4', normalizedMode: 't2v', payload: { prompt: '镜'.repeat(11001) } }).ok, false);
  assert.throws(() => buildKlingDirectV2Payload({ engineId: 'kling-v4', jobId: 'j', mode: 't2v', falPayload: {
    engineId: 'kling-v4', mode: 't2v', prompt: '镜'.repeat(11001), durationSec: 5 } as GeneratePayload }),
  (error: unknown) => error instanceof KlingDirectError && error.code === 'KLING_V2_REQUEST_INVALID');
});

test('new-design polling reads outputs, usage and billing; cost follows the documented formula', async () => {
  const requests: Array<{ url: string; auth: string | null }> = [];
  const originalFetch = globalThis.fetch;
  const body = { code: 0, message: 'SUCCEED', data: [{ id: '893605946402811985', status: 'succeeded', external_id: 'job_1',
    outputs: [{ type: 'video', id: 'v', url: 'https://cdn.example.test/out.mp4', duration: '5.04' }],
    usage: { input_duration: '8.03', output_duration: '5' },
    billing: [{ charge_type: 'unit', amount: '13.03', package_type: 'video' }] }] };
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    requests.push({ url: String(url), auth: new Headers(init?.headers).get('authorization') });
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  try {
    const client = new KlingDirectClient({ apiKey: 'test-only-key', baseUrl: KLING_DEFAULT_API_BASE_URL });
    const task = await client.retrieveTask({ pollPathPrefix: '/tasks', providerJobId: '893605946402811985' });
    assert.equal(task.status, 'completed');
    assert.equal(task.videoUrl, 'https://cdn.example.test/out.mp4');
    assert.equal(task.providerCostUnits, 13.03);
    assert.equal(task.providerCostUsd, computeKlingDirectV2ProviderCostUsd(13.03));
    const recovered = await client.findTaskByExternalId('job_1');
    assert.equal(recovered?.providerJobId, '893605946402811985');
    assert.deepEqual(requests.map(entry => entry.url), [
      'https://api-beijing.klingai.com/tasks?task_ids=893605946402811985',
      'https://api-beijing.klingai.com/tasks?external_task_ids=job_1',
    ]);
    assert.ok(requests.every(entry => entry.auth === 'Bearer test-only-key'));
    const jwtOnly = new KlingDirectClient({ accessKey: 'ak', secretKey: 'sk', baseUrl: KLING_DEFAULT_API_BASE_URL });
    await assert.rejects(jwtOnly.retrieveTask({ pollPathPrefix: '/tasks', providerJobId: 'x' }), /KLING_API_KEY/);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(normalizeKlingDirectV2Task({ code: 0, data: [] }, { externalId: 'missing' }), null);
  // Docs: no input video bills output; input <= output bills 2x output; input > output bills input + output.
  assert.equal(computeKlingDirectV2Credits({ engineId: 'kling-v4', resolution: '1080p', outputDurationSec: 10 }), 15);
  assert.equal(computeKlingDirectV2Credits({ engineId: 'kling-v4', resolution: '720p', outputDurationSec: 10, inputVideoDurationSec: 4 }), 12);
  assert.equal(computeKlingDirectV2Credits({ engineId: 'kling-v4', resolution: '720p', outputDurationSec: 5, inputVideoDurationSec: 8 }), 7.8);
  assert.equal(computeKlingDirectV2Credits({ engineId: 'kling-v4-flash', resolution: '720p', outputDurationSec: 20 }), 12);
  assert.equal(computeKlingDirectV2Credits({ engineId: 'kling-v4-flash', resolution: '1080p', outputDurationSec: 5 }), null);
  const estimate = estimateKlingDirectCost({ engineId: 'kling-v4', mode: 't2v', durationSec: 8, resolution: '1080p' });
  assert.deepEqual(estimate, { providerCostUnits: 12, providerCostUsd: 1.5, source: 'kling_cn_list_price_2026_11_11_provisional' });
});

test('documented error codes classify into account, whitelist, busy and definite rejections', () => {
  assert.equal(classifyKlingDirectError(new KlingDirectError('x', { status: 429, code: '1100' })).errorClass, 'provider_account_error');
  assert.equal(classifyKlingDirectError(new KlingDirectError('x', { status: 429, code: '1304' })).errorClass, 'provider_access_denied');
  const busy = new KlingDirectError('parallel task over resource pack limit', { status: 429, body: { code: 1303 } });
  assert.equal(isKlingDirectBusyRejection(busy), true);
  assert.equal(isKlingDirectDefiniteRejection(busy), true);
  assert.equal(isKlingDirectDefiniteRejection(new KlingDirectError('x', { status: 500, code: '5000' })), false);
  assert.equal(isKlingDirectDefiniteRejection(new Error('fetch failed')), false);
  assert.match(getKlingFailureMessage('This Kling model is busy right now (concurrent task limit reached). Please try again in about a minute.', 'zh') ?? '', /繁忙/);
});

type QueryEntry = { sql: string; params: unknown[] };

function submissionHarness(client: Record<string, unknown>) {
  const queries: QueryEntry[] = [];
  const refunds: unknown[] = [];
  const sleeps: number[] = [];
  const queryFn = async <T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> => {
    queries.push({ sql, params });
    if (/INSERT INTO provider_attempts/.test(sql)) return [{ id: 1, attempt_index: 1 }] as T[];
    return [] as T[];
  };
  const run = () => submitKlingDirectGenerateTask({
    jobId: 'job_v4', userId: 'user_1', engineId: 'kling-v4', engineLabel: 'Kling 4.0', mode: 't2v',
    prompt: 'A night train arrives.', negativePrompt: null, durationSec: 5, aspectRatio: '16:9', audioEnabled: undefined,
    imageUrl: null, cfgScale: null, placeholderThumb: '/assets/frames/thumb-16x9.svg',
    pricing: { totalCents: 100, currency: 'CNY' } as never, paymentStatus: 'paid_wallet',
    pendingReceipt: { id: 'receipt' } as never, paymentMode: 'wallet', walletChargeReserved: true,
    fallbackToFalEnabled: true, fallbackOnCreditsDepletedEnabled: true, elementRegistrationEnabled: false,
    falPayload: { engineId: 'kling-v4', mode: 't2v', prompt: 'A night train arrives.', durationSec: 5, resolution: '1080p', aspectRatio: '16:9' },
    falInputSummary: { hasImage: false, hasVideo: false, imageCount: 0, videoCount: 0 } as never,
    isLumaRay2: false, batchId: null, groupId: null, iterationIndex: null, iterationCount: null,
    renderIds: null, heroRenderId: null, localKey: null, logMetricFn() {},
    deps: {
      queryFn,
      getKlingDirectClientFn: () => client as never,
      rollbackPendingPaymentFn: (async (input: unknown) => { refunds.push(input); }) as never,
      sleepFn: async (ms: number) => { sleeps.push(ms); },
      createMediaTransportFn: (async ({ payload }: { payload: GeneratePayload }) => ({ payload, sanitize: (value: unknown) => value })) as never,
      submitFalGenerateTaskFn: (async () => { throw new Error('Fal must never be called for Kling 4.0'); }) as never,
    },
  });
  return { queries, refunds, sleeps, run };
}

const accepted = { providerJobId: 'task_1', status: 'queued', rawStatus: 'submitted', videoUrl: null, message: null, usage: null, raw: {} };

test('1303 is retried with backoff and an accepted retry is persisted without fallback', async () => {
  let calls = 0;
  const harness = submissionHarness({
    async createTask() { calls += 1; if (calls < 3) throw new KlingDirectError('busy', { status: 429, code: '1303' }); return accepted; },
    async findTaskByExternalId() { throw new Error('not expected'); },
  });
  const result = await harness.run();
  assert.equal(result.ok, true);
  assert.equal(calls, 3);
  assert.deepEqual(harness.sleeps, [1000, 2000]);
  assert.equal(harness.refunds.length, 0);
  assert.ok(harness.queries.some(entry => /provider_job_id=\$5/.test(entry.sql) && entry.params[4] === 'task_1'));
});

test('persistent 1303 fails as busy and refunds; definite 1201 refunds without a lookup', async () => {
  const busy = submissionHarness({
    async createTask() { throw new KlingDirectError('busy', { status: 429, code: '1303' }); },
    async findTaskByExternalId() { throw new Error('not expected'); },
  });
  const busyResult = await busy.run();
  assert.equal(busyResult.ok, false);
  assert.equal(!busyResult.ok && busyResult.body.error, 'PROVIDER_BUSY');
  assert.deepEqual(busy.sleeps, [1000, 2000, 4000]);
  assert.equal(busy.refunds.length, 1);
  const rejected = submissionHarness({
    async createTask() { throw new KlingDirectError('bad', { status: 400, code: '1201' }); },
    async findTaskByExternalId() { throw new Error('not expected'); },
  });
  const rejectedResult = await rejected.run();
  assert.equal(!rejectedResult.ok && rejectedResult.status, 400);
  assert.equal(rejected.refunds.length, 1);
});

test('ambiguous submissions are resolved by external task id: found accepts, absent refunds, unknown stalls', async () => {
  const found = submissionHarness({
    async createTask() { throw new Error('fetch failed'); },
    async findTaskByExternalId(id: string) { assert.equal(id, 'job_v4'); return accepted; },
  });
  assert.equal((await found.run()).ok, true);
  assert.equal(found.refunds.length, 0);

  const absent = submissionHarness({
    async createTask() { throw new KlingDirectError('server', { status: 500, code: '5000' }); },
    async findTaskByExternalId() { return null; },
  });
  assert.equal((await absent.run()).ok, false);
  assert.equal(absent.refunds.length, 1);

  const unknown = submissionHarness({
    async createTask() { throw new Error('network timeout'); },
    async findTaskByExternalId() { throw new Error('fetch failed'); },
  });
  const unknownResult = await unknown.run();
  assert.equal(!unknownResult.ok && unknownResult.body.error, 'PROVIDER_OUTCOME_UNKNOWN');
  assert.equal(unknown.refunds.length, 0);
  assert.ok(unknown.queries.some(entry => /provider_polling_stalled/.test(entry.sql)));
});
