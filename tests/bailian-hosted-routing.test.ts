import assert from 'node:assert/strict';
import test from 'node:test';

import type { GeneratePayload } from '../frontend/src/lib/fal-types';
import {
  buildAlibabaRequestPayload,
  buildBailianHostedPayload,
} from '../frontend/src/server/video-providers/alibaba-model-studio/bailian-payload';
import {
  parseBailianRouteOrder,
  shouldFallbackFromBailianSubmit,
  shouldFallbackFromKlingDirectToBailian,
  shouldFallbackFromMinimaxDirectToBailian,
} from '../frontend/src/server/video-providers/alibaba-model-studio/bailian-routing';
import {
  createAlibabaCapacityError,
  resetAlibabaCapacityStateForTests,
  tryTakeAlibabaRateSlot,
} from '../frontend/src/server/video-providers/alibaba-model-studio/capacity';
import { estimateAlibabaProviderCost } from '../frontend/src/server/video-providers/alibaba-model-studio/cost';
import { AlibabaModelStudioError } from '../frontend/src/server/video-providers/alibaba-model-studio/errors';
import { resolveAlibabaModelRoute, isAlibabaDirectEngine } from '../frontend/src/server/video-providers/alibaba-model-studio/model-map';
import { KlingDirectError } from '../frontend/src/server/video-providers/kling-direct/errors';
import { MINIMAX_MESSAGES } from '../frontend/src/server/video-providers/minimax-official/client';
import { resolveVideoProviderRoutingPlan, type VideoProviderRoutingEnv } from '../frontend/src/server/video-providers/router';
import { estimateAlibabaJobCost } from '../frontend/server/alibaba-job-accounting';
import { submitAlibabaModelStudioGenerateTask } from '../frontend/app/api/generate/_lib/alibaba-model-studio-submission';
import type { NormalizedVideoProviderTask } from '../frontend/src/server/video-providers/types';

const IMG = 'https://media.example/a.png';
const IMG2 = 'https://media.example/b.png';
const VID = 'https://media.example/v.mp4';

const baseEnv: VideoProviderRoutingEnv = {
  PRICING_SANDBOX: '',
  ALIBABA_MODEL_STUDIO_ENABLED: 'true',
  ALIBABA_MODEL_STUDIO_API_KEY: 'synthetic-bailian-key',
  ALIBABA_MODEL_STUDIO_PUBLIC_ROUTING_ENABLED: 'true',
  ALIBABA_MODEL_STUDIO_ADMIN_ONLY: 'false',
  ALIBABA_MODEL_STUDIO_FALLBACK_TO_FAL_ENABLED: 'true',
  KLING_DIRECT_ENABLED: 'true',
  KLING_API_KEY: 'synthetic-kling-key',
  KLING_ACCESS_KEY: '',
  KLING_SECRET_KEY: '',
  KLING_DIRECT_PUBLIC_ROUTING_ENABLED: 'true',
  KLING_DIRECT_ADMIN_ONLY: 'false',
  KLING_DIRECT_FALLBACK_TO_FAL_ENABLED: '',
  KLING_DIRECT_FALLBACK_ON_CREDITS_DEPLETED_ENABLED: '',
  KLING_DIRECT_ELEMENT_REGISTRATION_ENABLED: 'true',
  LLMHUB_INFERENCE_ROUTING_ENABLED: '',
  LLMHUB_API_KEY: '',
  MINIMAX_OFFICIAL_ENABLED: 'true',
  MINIMAX_API_KEY: 'synthetic-minimax-key',
  KLING_ROUTE_ORDER: '',
  MINIMAX_H3_ROUTE_ORDER: '',
  FAL_API_KEY: '',
  FAL_KEY: '',
};

const klingDirect = {
  kind: 'kling_direct_primary',
  primaryProvider: 'kling_direct',
  fallbackProvider: 'fal',
  fallbackEnabled: false,
  fallbackOnCreditsDepletedEnabled: false,
  elementRegistrationEnabled: true,
} as const;

function plan(engineId: string, mode: string, env: Partial<VideoProviderRoutingEnv> = {}, request?: Record<string, unknown>, isAdmin = false) {
  return resolveVideoProviderRoutingPlan({ engineId, mode, isAdmin, env: { ...baseEnv, ...env }, request });
}

test('route order parsing defaults to bailian,direct and accepts a single leg', () => {
  assert.deepEqual(parseBailianRouteOrder(undefined), ['bailian', 'direct']);
  assert.deepEqual(parseBailianRouteOrder(''), ['bailian', 'direct']);
  assert.deepEqual(parseBailianRouteOrder(' Direct , BAILIAN '), ['direct', 'bailian']);
  assert.deepEqual(parseBailianRouteOrder('bailian'), ['bailian']);
  assert.deepEqual(parseBailianRouteOrder('direct,direct'), ['direct']);
  assert.deepEqual(parseBailianRouteOrder('fal,nonsense'), ['bailian', 'direct']);
});

test('hosted engines map to Bailian models without becoming first-party Alibaba engines', () => {
  assert.deepEqual(resolveAlibabaModelRoute('kling-3-turbo-pro', 'i2v'), {
    model: 'kling/kling-v3-turbo-video-generation', family: 'kling_turbo', mode: 'i2v', fallbackCompatible: false, klingMode: 'pro',
  });
  assert.equal(resolveAlibabaModelRoute('kling-3-4k', 'i2v')?.klingMode, '4k');
  assert.equal(resolveAlibabaModelRoute('kling-o3-standard', 'v2v')?.model, 'kling/kling-v3-omni-video-generation');
  assert.equal(resolveAlibabaModelRoute('minimax-h3', 'ref2v')?.model, 'MiniMax/MiniMax-H3');
  assert.equal(resolveAlibabaModelRoute('kling-3-turbo-standard', 'ref2v'), null);
  assert.equal(resolveAlibabaModelRoute('kling-v4', 't2v'), null);
  assert.equal(resolveAlibabaModelRoute('minimax-h3-max', 't2v'), null);
  for (const engineId of ['kling-3-pro', 'kling-o3-pro', 'minimax-h3']) assert.equal(isAlibabaDirectEngine(engineId), false);
});

test('default order: Bailian primary with the vendor route attached as pre-acceptance fallback', () => {
  assert.deepEqual(plan('kling-3-turbo-standard', 't2v'), {
    kind: 'alibaba_model_studio_primary', primaryProvider: 'alibaba_model_studio', fallbackProvider: 'fal',
    fallbackEnabled: false, bailianHosted: true, directFallback: klingDirect,
  });
  const h3 = plan('minimax-h3', 'i2v');
  assert.equal(h3.kind, 'alibaba_model_studio_primary');
  assert.deepEqual(h3.kind === 'alibaba_model_studio_primary' && h3.directFallback,
    { kind: 'llmhub_primary', primaryProvider: 'llmhub', modelId: 'MiniMax-H3' });
});

test('direct,bailian keeps the vendor primary and marks the Bailian fallback', () => {
  assert.deepEqual(plan('kling-3-pro', 'i2v', { KLING_ROUTE_ORDER: 'direct,bailian' }), { ...klingDirect, bailianFallback: true });
  assert.deepEqual(plan('minimax-h3', 't2v', { MINIMAX_H3_ROUTE_ORDER: 'direct,bailian' }),
    { kind: 'llmhub_primary', primaryProvider: 'llmhub', modelId: 'MiniMax-H3', bailianFallback: true });
});

test('single-leg orders and unavailable legs drop the fallback', () => {
  const bailianOnly = plan('kling-o3-pro', 'ref2v', { KLING_ROUTE_ORDER: 'bailian' });
  assert.equal(bailianOnly.kind, 'alibaba_model_studio_primary');
  assert.equal('directFallback' in bailianOnly, false);
  assert.deepEqual(plan('kling-3-pro', 't2v', { KLING_ROUTE_ORDER: 'direct' }), klingDirect);
  // Kling direct disabled: Bailian alone.
  const noKling = plan('kling-3-standard', 't2v', { KLING_DIRECT_ENABLED: 'false' });
  assert.equal(noKling.kind, 'alibaba_model_studio_primary');
  assert.equal('directFallback' in noKling, false);
  // Bailian not configured / admin-only / public routing off: the vendor plan is returned unchanged.
  assert.deepEqual(plan('kling-3-pro', 't2v', { ALIBABA_MODEL_STUDIO_ENABLED: 'false' }), klingDirect);
  assert.deepEqual(plan('kling-3-pro', 't2v', { ALIBABA_MODEL_STUDIO_API_KEY: '' }), klingDirect);
  assert.deepEqual(plan('kling-3-pro', 't2v', { ALIBABA_MODEL_STUDIO_ADMIN_ONLY: 'true' }), klingDirect);
  assert.equal(plan('kling-3-pro', 't2v', { ALIBABA_MODEL_STUDIO_ADMIN_ONLY: 'true' }, undefined, true).kind,
    'alibaba_model_studio_primary');
  assert.deepEqual(plan('kling-3-pro', 't2v', { ALIBABA_MODEL_STUDIO_PUBLIC_ROUTING_ENABLED: 'false' }), klingDirect);
  // Neither leg usable: the vendor's unavailable/Fal answer stays as before.
  assert.equal(plan('kling-3-pro', 't2v', { ALIBABA_MODEL_STUDIO_ENABLED: 'false', KLING_DIRECT_ENABLED: 'false' }).kind, 'fal_only');
  // Kling 4.0 is not hosted on Bailian.
  assert.equal(plan('kling-v4', 't2v').kind, 'kling_direct_primary');
});

test('requests Bailian cannot serve stay on the vendor route alone', () => {
  assert.deepEqual(plan('kling-o3-pro', 'ref2v', {}, { elements: [{ frontalImageUrl: IMG }] }), klingDirect);
  assert.deepEqual(plan('kling-3-pro', 'i2v', {}, { voiceIds: ['voice_1'] }), klingDirect);
  assert.deepEqual(plan('kling-3-pro', 'i2v', {}, { extraInputValues: { camera_control: { type: 'simple' } } }), klingDirect);
  assert.equal(plan('kling-3-pro', 'i2v', {}, { prompt: 'x', extraInputValues: { cfg_scale: 0.5 } }).kind, 'alibaba_model_studio_primary');
  assert.equal(plan('minimax-h3', 't2v', {}, { seed: 7 }).kind, 'fal_only');
});

function aliError(status: number | null, extra: { code?: string; errorClass?: ConstructorParameters<typeof AlibabaModelStudioError>[1]['errorClass'] } = {}) {
  return new AlibabaModelStudioError('failed', { status, code: extra.code ?? null, errorClass: extra.errorClass ?? null, body: {} });
}

test('Bailian fallback decision table: definite rejections only, never after a task or an unknown outcome', () => {
  const cases: Array<[string, unknown, boolean]> = [
    ['400 parameters', aliError(400), true],
    ['404 model', aliError(404), true],
    ['401 key', aliError(401), true],
    ['403 not activated', aliError(403), true],
    ['402 balance', aliError(402), true],
    ['413 payload', aliError(413), true],
    ['429 throttled', aliError(429), true],
    ['local capacity guard', createAlibabaCapacityError(), true],
    ['local validation', aliError(null, { code: 'BAILIAN_INPUT_UNSUPPORTED', errorClass: 'invalid_request' }), true],
    ['500 ambiguous', aliError(500), false],
    ['503 ambiguous', aliError(503), false],
    ['timeout', aliError(null, { code: 'ALIBABA_MODEL_STUDIO_TIMEOUT', errorClass: 'timeout' }), false],
    ['network', aliError(null, { code: 'ALIBABA_MODEL_STUDIO_NETWORK_ERROR', errorClass: 'transient_provider_error' }), false],
    ['no task id', aliError(null, { code: 'ALIBABA_MODEL_STUDIO_INVALID_RESPONSE', errorClass: 'invalid_response' }), false],
    ['moderation', aliError(400, { errorClass: 'moderation' }), false],
    ['our media access', aliError(400, { code: 'REFERENCE_INVALID', errorClass: 'invalid_request' }), false],
    ['unknown error', new Error('boom'), false],
  ];
  for (const [label, error, expected] of cases) {
    assert.equal(shouldFallbackFromBailianSubmit({ acceptedProviderJobId: null, error }), expected, label);
  }
  assert.equal(shouldFallbackFromBailianSubmit({ acceptedProviderJobId: 'task_1', error: aliError(400) }), false);
});

test('Kling direct → Bailian and MiniMax → Bailian decision tables', () => {
  const kling = (status: number | null, code: string | null, name?: string) => {
    const error = new KlingDirectError(name === 'timeout' ? 'request timeout' : 'failed', { status, code });
    return shouldFallbackFromKlingDirectToBailian({ acceptedProviderJobId: null, error });
  };
  assert.equal(kling(401, null), true);
  assert.equal(kling(429, '1102'), true);
  assert.equal(kling(429, '1302'), true);
  assert.equal(kling(400, '1201'), true);
  assert.equal(kling(400, '1301'), false, 'content review');
  assert.equal(kling(500, '5000'), false, 'server error is ambiguous');
  assert.equal(kling(null, null, 'timeout'), false, 'timeout is ambiguous');
  assert.equal(shouldFallbackFromKlingDirectToBailian({ acceptedProviderJobId: 'k1', error: new KlingDirectError('x', { status: 401 }) }), false);

  assert.equal(shouldFallbackFromMinimaxDirectToBailian({ acceptedProviderJobId: null, definiteRejection: true, userMessage: MINIMAX_MESSAGES.rateLimited }), true);
  assert.equal(shouldFallbackFromMinimaxDirectToBailian({ acceptedProviderJobId: null, definiteRejection: true, userMessage: MINIMAX_MESSAGES.inputSensitive }), false);
  assert.equal(shouldFallbackFromMinimaxDirectToBailian({ acceptedProviderJobId: null, definiteRejection: false }), false);
  assert.equal(shouldFallbackFromMinimaxDirectToBailian({ acceptedProviderJobId: '1234567', definiteRejection: true }), false);
});

const base = { prompt: 'A red fox in snow', durationSec: 5, aspectRatio: '16:9', audioEnabled: true };

test('Kling 3.0 Turbo payloads: t2v + first-frame i2v only, std/pro, ratio, audio always on', () => {
  assert.deepEqual(buildBailianHostedPayload({ ...base, engineId: 'kling-3-turbo-standard', mode: 't2v', negativePrompt: 'blur' }), {
    model: 'kling/kling-v3-turbo-video-generation',
    input: { prompt: 'A red fox in snow' },
    parameters: { mode: 'std', aspect_ratio: '16:9', duration: 5, watermark: false },
  });
  const i2v = buildBailianHostedPayload({ ...base, engineId: 'kling-3-turbo-pro', mode: 'i2v', startImageUrl: IMG });
  assert.deepEqual(i2v.input, { prompt: 'A red fox in snow', media: [{ type: 'first_frame', url: IMG }] });
  assert.deepEqual(i2v.parameters, { mode: 'pro', duration: 5, watermark: false });
  for (const bad of [
    { engineId: 'kling-3-turbo-pro', mode: 'i2v', startImageUrl: IMG, endImageUrl: IMG2 },
    { engineId: 'kling-3-turbo-pro', mode: 't2v', aspectRatio: '4:3' },
    { engineId: 'kling-3-turbo-pro', mode: 't2v', durationSec: 16 },
    { engineId: 'kling-3-turbo-pro', mode: 't2v', durationSec: 2 },
    { engineId: 'kling-3-turbo-pro', mode: 'i2v' },
  ]) {
    assert.throws(() => buildBailianHostedPayload({ ...base, ...bad }), (error: unknown) =>
      error instanceof AlibabaModelStudioError && error.errorClass === 'invalid_request');
  }
});

test('Kling 3.0 and Omni payloads: frames, references, feature video, multi-shot', () => {
  const fl = buildBailianHostedPayload({ ...base, engineId: 'kling-3-4k', mode: 'i2v', startImageUrl: IMG, endImageUrl: IMG2, negativePrompt: 'blur' });
  assert.deepEqual(fl, {
    model: 'kling/kling-v3-video-generation',
    input: { prompt: 'A red fox in snow', negative_prompt: 'blur', media: [{ type: 'first_frame', url: IMG }, { type: 'last_frame', url: IMG2 }] },
    parameters: { mode: '4k', duration: 5, audio: true, watermark: false },
  });
  const ref = buildBailianHostedPayload({ ...base, engineId: 'kling-o3-pro', mode: 'ref2v', prompt: '@Image1 meets @Image2', referenceImageUrls: [IMG, IMG2] });
  assert.equal(ref.input.prompt, '<<<image_1>>> meets <<<image_2>>>');
  assert.deepEqual(ref.input.media, [{ type: 'refer', url: IMG }, { type: 'refer', url: IMG2 }]);
  assert.equal((ref.parameters as { aspect_ratio?: string }).aspect_ratio, '16:9');
  const v2v = buildBailianHostedPayload({ ...base, engineId: 'kling-o3-standard', mode: 'v2v', referenceVideoUrls: [VID], keepAudio: true });
  assert.deepEqual(v2v.input.media, [{ type: 'feature', url: VID, keep_original_sound: 'yes' }]);
  assert.deepEqual(v2v.parameters, { mode: 'std', aspect_ratio: '16:9', duration: 5, audio: false, watermark: false });
  assert.throws(() => buildBailianHostedPayload({ ...base, engineId: 'kling-o3-standard', mode: 'v2v', referenceVideoUrls: [VID], durationSec: 12 }));
  assert.throws(() => buildBailianHostedPayload({ ...base, engineId: 'kling-o3-pro', mode: 'ref2v', startImageUrl: IMG, referenceImageUrls: [IMG2] }));
  assert.throws(() => buildBailianHostedPayload({ ...base, engineId: 'kling-o3-pro', mode: 'ref2v', referenceImageUrls: Array(8).fill(IMG).map((u, i) => `${u}?${i}`) }));
  assert.throws(() => buildBailianHostedPayload({ ...base, engineId: 'kling-3-pro', mode: 'i2v', startImageUrl: { url: IMG, mimeType: 'image/webp' } }));
  const shots = buildBailianHostedPayload({
    ...base, engineId: 'kling-3-standard', mode: 't2v', durationSec: 6, shotType: 'customize',
    multiPrompt: [{ prompt: 'Wide', duration: 3 }, { prompt: 'Close', duration: 3 }],
  });
  assert.deepEqual(shots.input, {
    multi_shot: true, shot_type: 'customize',
    multi_prompt: [{ index: 1, prompt: 'Wide', duration: 3 }, { index: 2, prompt: 'Close', duration: 3 }],
  });
});

test('MiniMax-H3 payloads: t2v ratio, last-frame-only i2v, multimodal references', () => {
  assert.deepEqual(buildBailianHostedPayload({ ...base, engineId: 'minimax-h3', mode: 't2v', resolution: '2k', aspectRatio: 'auto' }), {
    model: 'MiniMax/MiniMax-H3', input: { prompt: 'A red fox in snow' },
    parameters: { resolution: '2K', ratio: '16:9', duration: 5, watermark: false },
  });
  const last = buildBailianHostedPayload({ ...base, engineId: 'minimax-h3', mode: 'i2v', resolution: '768P', endImageUrl: IMG });
  assert.deepEqual(last.input.media, [{ type: 'last_frame', url: IMG }]);
  assert.equal('ratio' in last.parameters, false);
  const ref = buildBailianHostedPayload({
    ...base, engineId: 'minimax-h3', mode: 'ref2v', aspectRatio: null,
    referenceImageUrls: [IMG], referenceVideoUrls: [{ url: VID, durationSec: 6 }], referenceAudioUrls: ['https://media.example/a.mp3'],
  });
  assert.deepEqual(ref.input.media?.map((item) => item.type), ['image_url', 'feature', 'driving_audio']);
  assert.equal((ref.parameters as { ratio?: string }).ratio, 'adaptive');
  assert.throws(() => buildBailianHostedPayload({ ...base, engineId: 'minimax-h3', mode: 't2v', durationSec: 3 }));
  assert.throws(() => buildBailianHostedPayload({ ...base, engineId: 'minimax-h3', mode: 't2v', resolution: '1080p' }));
  assert.throws(() => buildBailianHostedPayload({ ...base, engineId: 'minimax-h3', mode: 'ref2v', referenceVideoUrls: [{ url: VID, durationSec: 10 }, { url: `${VID}?2`, durationSec: 6 }] }));
  assert.throws(() => buildBailianHostedPayload({ ...base, engineId: 'minimax-h3', mode: 'i2v', startImageUrl: IMG, referenceImageUrls: [IMG2] }));
  // The shared entry point still builds Wan bodies unchanged.
  assert.equal(buildAlibabaRequestPayload({ ...base, engineId: 'wan-3', mode: 't2v', resolution: '720p' }).model, 'wan3.0-video');
});

test('PROVISIONAL Bailian CNY list cost in USD at 8 CNY/USD', () => {
  const usd = (input: Parameters<typeof estimateAlibabaProviderCost>[0]) => estimateAlibabaProviderCost(input).providerCostUsd;
  assert.equal(usd({ engineId: 'kling-3-turbo-standard', mode: 't2v', durationSec: 5 }), 0.5); // 0.8 x 5 / 8
  assert.equal(usd({ engineId: 'kling-3-turbo-pro', mode: 'i2v', durationSec: 8 }), 1); // 1.0 x 8 / 8
  assert.equal(usd({ engineId: 'kling-3-standard', mode: 't2v', durationSec: 5, audioEnabled: true }), 0.5625); // 0.9
  assert.equal(usd({ engineId: 'kling-3-pro', mode: 't2v', durationSec: 5, audioEnabled: false }), 0.5); // 0.8
  assert.equal(usd({ engineId: 'kling-o3-4k', mode: 'ref2v', durationSec: 5 }), 1.875); // 3.0
  assert.equal(usd({ engineId: 'kling-o3-standard', mode: 'v2v', durationSec: 5, audioEnabled: false }), 0.5625); // video input 0.9
  assert.equal(usd({ engineId: 'minimax-h3', mode: 'ref2v', durationSec: 10, resolution: '2K', referenceImageCount: 7 }), 1.05); // 8 + 0.4
  assert.equal(usd({ engineId: 'minimax-h3', mode: 'ref2v', durationSec: 5, resolution: '768P', inputVideoDurationSec: 3 }), 0.5); // 0.5 x 8
  assert.equal(estimateAlibabaProviderCost({ engineId: 'kling-3-pro', mode: 't2v', durationSec: 5 }).source,
    'bailian_cn_beijing_list_price_2026_11_11_provisional');

  const job = { engine_id: 'minimax-h3', duration_sec: 6, has_audio: false,
    settings_snapshot: { inputMode: 'ref2v', resolution: '768P' }, pricing_snapshot: {} };
  const task = { raw: { usage: { duration: 10 } } } as unknown as NormalizedVideoProviderTask;
  const accounted = estimateAlibabaJobCost(job, task);
  assert.equal(accounted.providerCostUnits, 10);
  assert.equal(accounted.providerCostUsd, 0.625);
  assert.equal(accounted.status, 'list_estimate_from_provider_usage');
});

test('Bailian hosted models get the documented 300 RPM window', () => {
  resetAlibabaCapacityStateForTests();
  const now = 1_000_000;
  for (let index = 0; index < 300; index += 1) assert.equal(tryTakeAlibabaRateSlot('MiniMax/MiniMax-H3', now).ok, true);
  assert.equal(tryTakeAlibabaRateSlot('MiniMax/MiniMax-H3', now).ok, false);
  assert.equal(tryTakeAlibabaRateSlot('kling/kling-v3-video-generation', now).ok, true);
  assert.equal(tryTakeAlibabaRateSlot('MiniMax/MiniMax-H3', now + 60_001).ok, true);
  resetAlibabaCapacityStateForTests();
});

function recorder() {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  let id = 1;
  const queryFn = async <T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> => {
    queries.push({ sql, params });
    if (/INSERT INTO provider_attempts/.test(sql)) return [{ id: id++, attempt_index: params[1] }] as T[];
    return [] as T[];
  };
  return { queries, queryFn };
}

function submission(overrides: Record<string, unknown>, deps: Record<string, unknown>) {
  const falPayload: GeneratePayload = { engineId: 'kling-3-pro', prompt: 'A red fox', mode: 't2v', durationSec: 5, aspectRatio: '16:9' };
  return submitAlibabaModelStudioGenerateTask({
    jobId: 'job_bailian', userId: 'user_1', engineId: 'kling-3-pro', engineLabel: 'Kling 3 Pro', mode: 't2v',
    prompt: 'A red fox', negativePrompt: null, durationSec: 5, aspectRatio: '16:9', audioEnabled: true,
    effectiveResolution: '1080p', imageUrl: null, placeholderThumb: '/thumb.svg',
    pricing: { totalCents: 100, currency: 'cny' } as never, paymentStatus: 'paid_wallet',
    pendingReceipt: { id: 'receipt_1' } as never, paymentMode: 'wallet', walletChargeReserved: true,
    fallbackToFalEnabled: false, falPayload,
    falInputSummary: { hasImage: false, hasVideo: false, imageCount: 0, videoCount: 0 } as never,
    isLumaRay2: false, batchId: null, groupId: null, iterationIndex: null, iterationCount: null,
    renderIds: null, heroRenderId: null, localKey: null, logMetricFn: () => undefined,
    ...overrides,
    deps: { reserveCapacityFn: async () => ({ release() {} }), createOwnedMediaReadUrlFn: async ({ url }: { url: string }) => url, ...deps },
  } as Parameters<typeof submitAlibabaModelStudioGenerateTask>[0]);
}

test('a definite Bailian rejection hands the reserved charge to the direct route once, without a refund', async () => {
  const { queries, queryFn } = recorder();
  let refunds = 0;
  let fallbackFrom: number | null = null;
  let submitted: unknown = null;
  const result = await submission({
    submitDirectFallback: async (attemptId: number) => {
      fallbackFrom = attemptId;
      return { ok: true, kind: 'accepted', body: { provider: 'kling_direct' } };
    },
  }, {
    queryFn,
    rollbackPendingPaymentFn: async () => { refunds += 1; },
    getAlibabaModelStudioClientFn: () => ({
      createVideo: async (payload: unknown) => { submitted = payload; throw new AlibabaModelStudioError('denied', { status: 403, body: { code: 'AccessDenied' } }); },
      getTask: async () => { throw new Error('unused'); },
    }),
  });
  assert.deepEqual(result, { ok: true, kind: 'accepted', body: { provider: 'kling_direct' } });
  assert.equal(fallbackFrom, 1);
  assert.equal(refunds, 0);
  assert.equal((submitted as { model: string }).model, 'kling/kling-v3-video-generation');
  const attempt = queries.find((entry) => /INSERT INTO provider_attempts/.test(entry.sql));
  assert.equal(attempt?.params[3], 'kling/kling-v3-video-generation');
  assert.match(String(attempt?.params[5]), /"route":"bailian"/);
  assert.equal(queries.some((entry) => /SET status = 'failed'/.test(entry.sql)), false);
});

test('an ambiguous Bailian failure never resubmits elsewhere; only this leg is refunded', async () => {
  const { queryFn } = recorder();
  let refunds = 0;
  let fallbackCalls = 0;
  const result = await submission({
    submitDirectFallback: async () => { fallbackCalls += 1; return { ok: true, kind: 'accepted', body: {} }; },
  }, {
    queryFn,
    rollbackPendingPaymentFn: async () => { refunds += 1; },
    getAlibabaModelStudioClientFn: () => ({
      createVideo: async () => { throw new AlibabaModelStudioError('timed out', { code: 'ALIBABA_MODEL_STUDIO_TIMEOUT', errorClass: 'timeout' }); },
      getTask: async () => { throw new Error('unused'); },
    }),
  });
  assert.equal(result.ok, false);
  assert.equal(fallbackCalls, 0);
  assert.equal(refunds, 1);
});

test('Bailian as the fallback leg links to the first attempt and uses attempt index 2', async () => {
  const { queries, queryFn } = recorder();
  const result = await submission({ fallbackFromAttemptId: 41 }, {
    queryFn,
    getAlibabaModelStudioClientFn: () => ({
      createVideo: async () => ({ providerJobId: 'task_b', status: 'queued', rawStatus: 'PENDING', videoUrl: null, message: null,
        usage: { totalTokens: null, completionTokens: null }, raw: { output: { task_id: 'task_b' } } }),
      getTask: async () => { throw new Error('unused'); },
    }),
  });
  assert.equal(result.ok, true);
  const insert = queries.find((entry) => /INSERT INTO provider_attempts/.test(entry.sql));
  assert.equal(insert?.params[1], 2);
  assert.match(String(insert?.params[5]), /"routeRole":"fallback"/);
  assert.ok(queries.some((entry) => /fallback/i.test(entry.sql) && entry.params.includes(41)));
});
