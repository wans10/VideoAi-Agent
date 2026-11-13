import { allowGenerationPoll } from './helpers/generation-poll-claim';
import assert from 'node:assert/strict';
import test from 'node:test';

import type { GeneratePayload } from '../frontend/src/lib/fal-types';
import { getKlingFailureMessage } from '../frontend/lib/kling-failure-messages';
import {
  buildKling3TurboOfficialPrompt,
  foldKling3TurboShotPlan,
  getKling3TurboOfficialPromptViolation,
  isKling3TurboRequestWithinOfficialLimits,
  kling3TurboOfficialPromptLimitMessage,
} from '../frontend/src/lib/kling-3-turbo-official-limits';
import { calculateKling3TurboProviderCost } from '../frontend/src/lib/kling-3-turbo';
import { KlingDirectClient, KLING_DEFAULT_API_BASE_URL } from '../frontend/src/server/video-providers/kling-direct/client';
import {
  computeKlingDirectV2Credits,
  estimateKlingDirectCost,
} from '../frontend/src/server/video-providers/kling-direct/cost';
import { KlingDirectError } from '../frontend/src/server/video-providers/kling-direct/errors';
import {
  isKlingDirectEngine,
  isKlingDirectV2Engine,
  resolveKlingDirectModelRoute,
  resolveKlingDirectPollPathPrefix,
} from '../frontend/src/server/video-providers/kling-direct/model-map';
import { buildKlingDirectPayload } from '../frontend/src/server/video-providers/kling-direct/payload';
import { buildKlingDirectV2Payload } from '../frontend/src/server/video-providers/kling-direct/payload-v2';
import { resolveVideoProviderRoutingPlan, type VideoProviderRoutingEnv } from '../frontend/src/server/video-providers/router';
import { submitKlingDirectGenerateTask } from '../frontend/app/api/generate/_lib/kling-direct-submission';
import { runKlingDirectPoll } from '../frontend/server/kling-direct-poll';

// Official docs fetched 2026-11-12: klingai.com/document-api/api/video/3-0-turbo/{text-to-video,image-to-video}.md,
// pricing/base/video.md ("Kling 3.0 Turbo | 有声 | 0.8积分（¥0.8）/秒 | 1.0积分（¥1.0）/秒").

const IMG = 'https://media.example.test/start.png';

const env: VideoProviderRoutingEnv = {
  PRICING_SANDBOX: '',
  ALIBABA_MODEL_STUDIO_ENABLED: 'true',
  ALIBABA_MODEL_STUDIO_API_KEY: 'synthetic-bailian-key',
  ALIBABA_MODEL_STUDIO_PUBLIC_ROUTING_ENABLED: 'true',
  ALIBABA_MODEL_STUDIO_ADMIN_ONLY: 'false',
  KLING_DIRECT_ENABLED: 'true',
  KLING_API_KEY: 'synthetic-kling-key',
  KLING_ACCESS_KEY: '',
  KLING_SECRET_KEY: '',
  KLING_DIRECT_PUBLIC_ROUTING_ENABLED: 'true',
  KLING_DIRECT_ADMIN_ONLY: 'false',
  KLING_DIRECT_FALLBACK_TO_FAL_ENABLED: 'true',
  KLING_DIRECT_FALLBACK_ON_CREDITS_DEPLETED_ENABLED: 'true',
  KLING_DIRECT_ELEMENT_REGISTRATION_ENABLED: '',
  KLING_ROUTE_ORDER: '',
  FAL_API_KEY: '',
  FAL_KEY: '',
};

const turboDirect = {
  kind: 'kling_direct_primary',
  primaryProvider: 'kling_direct',
  fallbackProvider: 'fal',
  fallbackEnabled: false,
  fallbackOnCreditsDepletedEnabled: false,
  elementRegistrationEnabled: false,
  apiDesign: 'v2',
} as const;

const bailianOnly = {
  kind: 'alibaba_model_studio_primary', primaryProvider: 'alibaba_model_studio', fallbackProvider: 'fal',
  fallbackEnabled: false, bailianHosted: true,
} as const;

function plan(engineId: string, mode: string, overrides: Partial<VideoProviderRoutingEnv> = {}, request?: Record<string, unknown>) {
  return resolveVideoProviderRoutingPlan({ engineId, mode, isAdmin: false, env: { ...env, ...overrides }, request });
}

test('Kling 3.0 Turbo maps to the real Turbo model on the new-design API, not kling-v3', () => {
  for (const [engineId, resolution] of [['kling-3-turbo-standard', '720p'], ['kling-3-turbo-pro', '1080p']] as const) {
    assert.equal(isKlingDirectEngine(engineId), true);
    assert.equal(isKlingDirectV2Engine(engineId), true);
    assert.deepEqual(resolveKlingDirectModelRoute(engineId), {
      engineId,
      endpointFamily: 'video-v3-turbo',
      createPaths: { t2v: '/text-to-video/kling-3.0-turbo', i2v: '/image-to-video/kling-3.0-turbo' },
      pollPathPrefixes: { t2v: '/tasks', i2v: '/tasks' },
      providerModel: 'kling-3.0-turbo',
      mode: 'per_request',
      resolution,
      apiDesign: 'v2',
    });
    assert.equal(resolveKlingDirectPollPathPrefix(resolveKlingDirectModelRoute(engineId), 'i2v'), '/tasks');
    // The legacy model_name builder refuses it, so nothing can send Turbo as kling-v3 any more.
    assert.throws(() => buildKlingDirectPayload({ engineId, jobId: 'j', mode: 't2v', prompt: 'x', durationSec: 5 }), /new-design/);
  }
  assert.equal(KLING_DEFAULT_API_BASE_URL, 'https://api-beijing.klingai.com');
});

test('text-to-video: top-level prompt, tier resolution, ratio, duration, job id as external task id', () => {
  const payload = buildKlingDirectV2Payload({ engineId: 'kling-3-turbo-pro', jobId: 'job_t2v', mode: 't2v', falPayload: {
    engineId: 'kling-3-turbo-pro', mode: 't2v', prompt: 'A night train arrives.', negativePrompt: 'blur',
    durationSec: 12, aspectRatio: '9:16', resolution: '720p', audioEnabled: false,
  } as GeneratePayload });
  assert.equal(payload.providerModel, 'kling-3.0-turbo');
  assert.equal(payload.createPath, '/text-to-video/kling-3.0-turbo');
  assert.equal(payload.pollPathPrefix, '/tasks');
  assert.equal(payload.resolution, '1080p');
  // No negative prompt, sound or cfg field exists on this endpoint; audio is always rendered.
  assert.deepEqual(payload.body, {
    prompt: 'A night train arrives.',
    settings: { resolution: '1080p', aspect_ratio: '9:16', duration: 12 },
    options: { external_task_id: 'job_t2v', watermark_info: { enabled: false } },
  });
  const standard = buildKlingDirectV2Payload({ engineId: 'kling-3-turbo-standard', jobId: 'job_std', mode: 't2v', falPayload: {
    engineId: 'kling-3-turbo-standard', mode: 't2v', prompt: 'A kite.', durationSec: 3,
  } as GeneratePayload });
  assert.deepEqual(standard.body.settings, { resolution: '720p', aspect_ratio: '16:9', duration: 3 });
});

test('image-to-video: contents with prompt and first frame only, no aspect ratio', () => {
  const payload = buildKlingDirectV2Payload({ engineId: 'kling-3-turbo-standard', jobId: 'job_i2v', mode: 'i2v', falPayload: {
    engineId: 'kling-3-turbo-standard', mode: 'i2v', prompt: 'The still life gathers a breeze.', durationSec: 15,
    imageUrl: IMG, aspectRatio: '16:9',
  } as GeneratePayload });
  assert.equal(payload.createPath, '/image-to-video/kling-3.0-turbo');
  assert.deepEqual(payload.body, {
    contents: [{ type: 'prompt', text: 'The still life gathers a breeze.' }, { type: 'first_frame', url: IMG }],
    settings: { resolution: '720p', duration: 15 },
    options: { external_task_id: 'job_i2v', watermark_info: { enabled: false } },
  });
  const imageOnly = buildKlingDirectV2Payload({ engineId: 'kling-3-turbo-pro', jobId: 'j', mode: 'i2v', falPayload: {
    engineId: 'kling-3-turbo-pro', mode: 'i2v', prompt: '', durationSec: 5, imageUrl: IMG,
  } as GeneratePayload });
  assert.deepEqual(imageOnly.body.contents, [{ type: 'first_frame', url: IMG }]);
});

test('a shot plan uses the documented "镜头 n, m, words;" syntax', () => {
  assert.equal(
    foldKling3TurboShotPlan([{ prompt: 'Wide shot; dusk', durationSec: 3 }, { prompt: ' Close-up ', durationSec: 2 }]),
    '镜头 1, 3, Wide shot； dusk; 镜头 2, 2, Close-up;',
  );
  const payload = buildKlingDirectV2Payload({ engineId: 'kling-3-turbo-standard', jobId: 'job_shots', mode: 't2v', falPayload: {
    engineId: 'kling-3-turbo-standard', mode: 't2v', durationSec: 5,
    multiPrompt: [{ prompt: 'Wide shot', duration: 3 }, { prompt: 'Close-up', duration: 2 }],
  } as GeneratePayload });
  assert.equal(payload.body.prompt, '镜头 1, 3, Wide shot; 镜头 2, 2, Close-up;');
});

test('local validation rejects before submission with a definite (refundable) error', () => {
  const reject = (falPayload: Partial<GeneratePayload>, mode = 't2v', engineId = 'kling-3-turbo-pro') =>
    assert.throws(() => buildKlingDirectV2Payload({ engineId, jobId: 'j', mode, falPayload: {
      engineId, mode, prompt: 'x', durationSec: 5, ...falPayload,
    } as GeneratePayload }), (error: unknown) => error instanceof KlingDirectError && error.code === 'KLING_V2_REQUEST_INVALID',
    JSON.stringify(falPayload));
  reject({ durationSec: 2 });
  reject({ durationSec: 16 });
  reject({ aspectRatio: '4:3' });
  reject({ imageUrl: undefined }, 'i2v');
  reject({ imageUrl: IMG, endImageUrl: IMG }, 'i2v');
  reject({ prompt: 'x', multiPrompt: [{ prompt: 'a', duration: 5 }] });
  reject({ prompt: '', multiPrompt: [{ prompt: 'a', duration: 2 }, { prompt: 'b', duration: 2 }] });
  reject({ prompt: '', multiPrompt: Array.from({ length: 7 }, () => ({ prompt: 'a', duration: 2 })), durationSec: 14 });
  reject({ prompt: '', multiPrompt: [{ prompt: 'a'.repeat(513), duration: 5 }] });
  assert.throws(() => buildKlingDirectV2Payload({ engineId: 'kling-3-turbo-pro', jobId: 'j', mode: 'ref2v', falPayload: {
    engineId: 'kling-3-turbo-pro', mode: 'ref2v', prompt: 'x', durationSec: 5 } as GeneratePayload }), /does not support ref2v/);
});

test('official prompt limits: 3072 (t2v) / 2500 (i2v) characters including the folded shot plan', () => {
  assert.equal(getKling3TurboOfficialPromptViolation('t2v', '镜'.repeat(3072)), null);
  assert.equal(getKling3TurboOfficialPromptViolation('t2v', 'x'.repeat(3073))?.maxChars, 3072);
  assert.equal(getKling3TurboOfficialPromptViolation('i2v', 'x'.repeat(2500)), null);
  assert.equal(getKling3TurboOfficialPromptViolation('i2v', 'x'.repeat(2501))?.maxChars, 2500);
  const longShots = Array.from({ length: 6 }, () => ({ prompt: 'a'.repeat(510), duration: 2 }));
  const folded = buildKling3TurboOfficialPrompt({ shots: longShots.map(({ prompt, duration }) => ({ prompt, durationSec: duration })) });
  assert.ok(folded.length > 3072);
  assert.throws(() => buildKlingDirectV2Payload({ engineId: 'kling-3-turbo-pro', jobId: 'j', mode: 't2v', falPayload: {
    engineId: 'kling-3-turbo-pro', mode: 't2v', durationSec: 12, multiPrompt: longShots } as GeneratePayload }),
  (error: unknown) => error instanceof KlingDirectError && error.code === 'KLING_V2_REQUEST_INVALID'
    && error.message === kling3TurboOfficialPromptLimitMessage(3072));
  assert.equal(isKling3TurboRequestWithinOfficialLimits('t2v', { multiPrompt: longShots }), false);
  assert.equal(isKling3TurboRequestWithinOfficialLimits('t2v', { multiPrompt: longShots.slice(0, 5) }), true);
  assert.equal(isKling3TurboRequestWithinOfficialLimits('i2v', { multiPrompt: longShots.slice(0, 5) }), false);
  assert.equal(isKling3TurboRequestWithinOfficialLimits('t2v', { prompt: 'x'.repeat(2500) }), true);
  assert.equal(isKling3TurboRequestWithinOfficialLimits('t2v', undefined), true);
  // Keyvo zh copy for the limit.
  assert.equal(getKlingFailureMessage(kling3TurboOfficialPromptLimitMessage(2500), 'zh'),
    'Kling 3.0 Turbo 在可灵官方通道的提示词上限为 2,500 个字符（含多镜头分镜格式）。请缩短提示词或分镜描述后重试。');
  assert.equal(getKlingFailureMessage(kling3TurboOfficialPromptLimitMessage(3072), 'en'), kling3TurboOfficialPromptLimitMessage(3072));
});

test('routing decision table: Bailian primary, official Turbo as fallback or direct-only, never Fal', () => {
  for (const engineId of ['kling-3-turbo-standard', 'kling-3-turbo-pro']) {
    for (const mode of ['t2v', 'i2v']) {
      // Default bailian,direct: Bailian primary with the real Turbo route as pre-acceptance fallback.
      assert.deepEqual(plan(engineId, mode), { ...bailianOnly, directFallback: turboDirect });
      // direct,bailian: official Turbo first, Bailian after a definite rejection.
      assert.deepEqual(plan(engineId, mode, { KLING_ROUTE_ORDER: 'direct,bailian' }), { ...turboDirect, bailianFallback: true });
      // direct only.
      assert.deepEqual(plan(engineId, mode, { KLING_ROUTE_ORDER: 'direct' }), turboDirect);
      // bailian only.
      assert.deepEqual(plan(engineId, mode, { KLING_ROUTE_ORDER: 'bailian' }), bailianOnly);
      // Bailian unavailable (disabled / no key / admin-only / public off): the official Turbo route alone.
      for (const off of [
        { ALIBABA_MODEL_STUDIO_ENABLED: 'false' }, { ALIBABA_MODEL_STUDIO_API_KEY: '' },
        { ALIBABA_MODEL_STUDIO_ADMIN_ONLY: 'true' }, { ALIBABA_MODEL_STUDIO_PUBLIC_ROUTING_ENABLED: 'false' },
      ]) {
        assert.deepEqual(plan(engineId, mode, off), turboDirect, JSON.stringify(off));
        assert.deepEqual(plan(engineId, mode, { ...off, KLING_ROUTE_ORDER: 'bailian' }), turboDirect, `bailian order, ${JSON.stringify(off)}`);
      }
      // The official Turbo API takes only the API Key; an AK/SK pair leaves Bailian alone.
      const akSk = { KLING_API_KEY: '', KLING_ACCESS_KEY: 'ak', KLING_SECRET_KEY: 'sk' };
      assert.deepEqual(plan(engineId, mode, akSk), bailianOnly);
      // Neither leg usable: refused before any charge (no Fal on Keyvo); Fal only where it is configured upstream.
      assert.deepEqual(plan(engineId, mode, { ...akSk, ALIBABA_MODEL_STUDIO_ENABLED: 'false' }),
        { kind: 'kling_direct_unavailable', reason: 'direct_not_configured' });
      assert.deepEqual(plan(engineId, mode, { ALIBABA_MODEL_STUDIO_ENABLED: 'false', KLING_DIRECT_ADMIN_ONLY: 'true' }),
        { kind: 'kling_direct_unavailable', reason: 'admin_only' });
      assert.deepEqual(plan(engineId, mode, { ...akSk, ALIBABA_MODEL_STUDIO_ENABLED: 'false', FAL_API_KEY: 'fal' }),
        { kind: 'fal_only', primaryProvider: 'fal', fallbackEnabled: false });
    }
    assert.deepEqual(plan(engineId, 'ref2v', { ALIBABA_MODEL_STUDIO_ENABLED: 'false' }),
      { kind: 'kling_direct_unavailable', reason: 'unsupported_mode' });
  }
});

test('a shot plan beyond the official limit drops the direct leg before any charge', () => {
  const longShots = Array.from({ length: 6 }, () => ({ prompt: 'a'.repeat(510), duration: 2 }));
  const request = { multiPrompt: longShots, durationSec: 12 };
  assert.deepEqual(plan('kling-3-turbo-pro', 't2v', {}, request), bailianOnly);
  assert.deepEqual(plan('kling-3-turbo-pro', 't2v', { KLING_ROUTE_ORDER: 'direct,bailian' }, request), bailianOnly);
  assert.deepEqual(plan('kling-3-turbo-pro', 't2v', { ALIBABA_MODEL_STUDIO_ENABLED: 'false' }, request),
    { kind: 'kling_direct_unavailable', reason: 'unsupported_request' });
  assert.deepEqual(plan('kling-3-turbo-pro', 't2v', { ALIBABA_MODEL_STUDIO_ENABLED: 'false' }, { multiPrompt: longShots.slice(0, 5) }),
    turboDirect);
});

test('PROVISIONAL vendor cost: official list credits, 1 credit = CNY 1, 1 USD = 8 CNY; equal to the pricing facts', () => {
  assert.equal(computeKlingDirectV2Credits({ engineId: 'kling-3-turbo-standard', resolution: '720p', outputDurationSec: 5 }), 4);
  assert.equal(computeKlingDirectV2Credits({ engineId: 'kling-3-turbo-pro', resolution: '1080p', outputDurationSec: 10 }), 10);
  assert.equal(computeKlingDirectV2Credits({ engineId: 'kling-3-turbo-pro', resolution: null, outputDurationSec: 3 }), 3);
  assert.equal(computeKlingDirectV2Credits({ engineId: 'kling-3-turbo-standard', resolution: '1080p', outputDurationSec: 5 }), null);
  for (const [engineId, durationSec, credits, usd] of [
    ['kling-3-turbo-standard', 3, 2.4, 0.3],
    ['kling-3-turbo-standard', 15, 12, 1.5],
    ['kling-3-turbo-pro', 3, 3, 0.375],
    ['kling-3-turbo-pro', 15, 15, 1.875],
  ] as const) {
    // The requested resolution is ignored: each tier has one resolution.
    const estimate = estimateKlingDirectCost({ engineId, mode: 't2v', durationSec, resolution: '4k' });
    assert.deepEqual(estimate, { providerCostUnits: credits, providerCostUsd: usd, source: 'kling_cn_list_price_2026_11_11_provisional' });
    // Keyvo 2026-11-13: the pricing facts are the same official list cost (customer = 80% of it, official-list-pricing.ts).
    assert.equal(Math.round(usd * 100_000) / 1000, calculateKling3TurboProviderCost({ engineId, durationSec }).providerCostExactCents);
  }
});

type QueryEntry = { sql: string; params: unknown[] };
const accepted = { providerJobId: 'task_turbo', status: 'queued', rawStatus: 'submitted', videoUrl: null, message: null, usage: null, raw: {} };

function submission(client: Record<string, unknown>, options: {
  fallbackFromAttemptId?: number;
  submitBailianFallback?: (attemptId: number) => Promise<unknown>;
  multiPrompt?: Array<{ prompt: string; duration: number }>;
} = {}) {
  const queries: QueryEntry[] = [];
  const refunds: unknown[] = [];
  const created: unknown[] = [];
  const queryFn = async <T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> => {
    queries.push({ sql, params });
    if (/INSERT INTO provider_attempts/.test(sql)) return [{ id: 11, attempt_index: params[1] }] as T[];
    return [] as T[];
  };
  const falPayload = { engineId: 'kling-3-turbo-pro', mode: 't2v', prompt: options.multiPrompt ? '' : 'A night train.',
    durationSec: 5, aspectRatio: '16:9', ...(options.multiPrompt ? { multiPrompt: options.multiPrompt, durationSec: 12 } : {}) };
  const run = () => submitKlingDirectGenerateTask({
    jobId: 'job_turbo', userId: 'user_1', engineId: 'kling-3-turbo-pro', engineLabel: 'Kling 3.0 Turbo Pro', mode: 't2v',
    prompt: 'A night train.', negativePrompt: null, durationSec: falPayload.durationSec, aspectRatio: '16:9', audioEnabled: undefined,
    imageUrl: null, cfgScale: null, placeholderThumb: '/assets/frames/thumb-16x9.svg',
    pricing: { totalCents: 100, currency: 'CNY' } as never, paymentStatus: 'paid_wallet',
    pendingReceipt: { id: 'receipt' } as never, paymentMode: 'wallet', walletChargeReserved: true,
    fallbackToFalEnabled: true, fallbackOnCreditsDepletedEnabled: true, elementRegistrationEnabled: false,
    falPayload: falPayload as GeneratePayload,
    falInputSummary: { hasImage: false, hasVideo: false, imageCount: 0, videoCount: 0 } as never,
    isLumaRay2: false, batchId: null, groupId: null, iterationIndex: null, iterationCount: null,
    renderIds: null, heroRenderId: null, localKey: null, logMetricFn() {},
    fallbackFromAttemptId: options.fallbackFromAttemptId,
    submitBailianFallback: options.submitBailianFallback as never,
    deps: {
      queryFn,
      getKlingDirectClientFn: () => ({
        ...client,
        async createTask(payload: unknown) { created.push(payload); return (client.createTask as (p: unknown) => unknown)(payload); },
      }) as never,
      rollbackPendingPaymentFn: (async (input: unknown) => { refunds.push(input); }) as never,
      sleepFn: async () => undefined,
      createMediaTransportFn: (async ({ payload }: { payload: GeneratePayload }) => ({ payload, sanitize: (value: unknown) => value })) as never,
      submitFalGenerateTaskFn: (async () => { throw new Error('Fal must never be called for Kling 3.0 Turbo'); }) as never,
    },
  });
  return { queries, refunds, created, run };
}

test('submission sends the Turbo body, records the Turbo attempt and never falls back to Fal', async () => {
  const ok = submission({ async createTask() { return accepted; } });
  const result = await ok.run();
  assert.equal(result.ok, true);
  const payload = ok.created[0] as { createPath: string; body: { settings: unknown } };
  assert.equal(payload.createPath, '/text-to-video/kling-3.0-turbo');
  assert.deepEqual(payload.body.settings, { resolution: '1080p', aspect_ratio: '16:9', duration: 5 });
  const insert = ok.queries.find(entry => /INSERT INTO provider_attempts/.test(entry.sql))!;
  assert.equal(insert.params[1], 1);
  const snapshot = JSON.parse(String(insert.params[5]));
  assert.equal(snapshot.providerModel, 'kling-3.0-turbo');
  assert.equal(snapshot.pollPathPrefix, '/tasks');
  assert.equal(snapshot.resolution, '1080p');
  assert.equal(snapshot.estimatedProviderCostUnits, 5);
  assert.equal(snapshot.routeRole, 'primary');

  // A definite rejection refunds once and never calls Fal (the Fal dep throws).
  const rejected = submission({ async createTask() { throw new KlingDirectError('Account balance not enough', { status: 429, code: '1102' }); } });
  const rejectedResult = await rejected.run();
  assert.equal(rejectedResult.ok, false);
  assert.equal(rejected.refunds.length, 1);
});

test('direct,bailian: a definite rejection hands the charge to Bailian; content review and unknown outcomes do not', async () => {
  const calls: number[] = [];
  const bailianResult = { ok: true, kind: 'accepted', body: { ok: true, provider: 'alibaba_model_studio' } };
  const fallback = async (attemptId: number) => { calls.push(attemptId); return bailianResult; };
  const rejected = submission({ async createTask() { throw new KlingDirectError('balance', { status: 429, code: '1102' }); } },
    { submitBailianFallback: fallback });
  assert.deepEqual(await rejected.run(), bailianResult);
  assert.deepEqual(calls, [11]);
  assert.equal(rejected.refunds.length, 0, 'the second leg owns acceptance and refund');
  assert.ok(rejected.queries.some(entry => /fallback_eligible/.test(entry.sql) && entry.params.includes(true)));

  // Local Turbo limit violation (folded shot plan too long) is also definite: Bailian takes it.
  const longShots = Array.from({ length: 6 }, () => ({ prompt: 'a'.repeat(510), duration: 2 }));
  const tooLong = submission({ async createTask() { throw new Error('not expected'); } },
    { submitBailianFallback: fallback, multiPrompt: longShots });
  assert.deepEqual(await tooLong.run(), bailianResult);
  assert.equal(tooLong.created.length, 0);

  calls.length = 0;
  const moderation = submission({ async createTask() { throw new KlingDirectError('blocked', { status: 400, code: '1301' }); } },
    { submitBailianFallback: fallback });
  assert.equal((await moderation.run()).ok, false);
  assert.equal(moderation.refunds.length, 1);
  const unknown = submission({
    async createTask() { throw new Error('network timeout'); },
    async findTaskByExternalId() { throw new Error('fetch failed'); },
  }, { submitBailianFallback: fallback });
  const unknownResult = await unknown.run();
  assert.equal(!unknownResult.ok && unknownResult.body.error, 'PROVIDER_OUTCOME_UNKNOWN');
  assert.equal(unknown.refunds.length, 0);
  assert.deepEqual(calls, []);
});

test('Bailian-unavailable fallback leg: attempt 2 linked to the Bailian attempt; the Turbo limit message is stored', async () => {
  const leg = submission({ async createTask() { return accepted; } }, { fallbackFromAttemptId: 4 });
  assert.equal((await leg.run()).ok, true);
  const insert = leg.queries.find(entry => /INSERT INTO provider_attempts/.test(entry.sql))!;
  assert.equal(insert.params[1], 2);
  assert.equal(JSON.parse(String(insert.params[5])).routeRole, 'fallback');
  assert.ok(leg.queries.some(entry => /fallback_to_attempt_id/.test(entry.sql) && entry.params.includes(4) && entry.params.includes(11)));

  const longShots = Array.from({ length: 6 }, () => ({ prompt: 'a'.repeat(510), duration: 2 }));
  const tooLong = submission({ async createTask() { throw new Error('not expected'); } }, { fallbackFromAttemptId: 4, multiPrompt: longShots });
  const result = await tooLong.run();
  assert.equal(!result.ok && result.status, 400);
  assert.equal(!result.ok && result.body.message, kling3TurboOfficialPromptLimitMessage(3072));
  assert.equal(tooLong.refunds.length, 1);
});

const turboJob = {
  job_id: 'job_turbo', user_id: 'user_1', engine_id: 'kling-3-turbo-pro', engine_label: 'Kling 3.0 Turbo Pro',
  provider_job_id: 'task_turbo', status: 'running', duration_sec: 8, thumb_url: '/assets/frames/thumb-16x9.svg',
  preview_video_url: null, keyframe_urls: null, aspect_ratio: '16:9', has_audio: true, final_price_cents: 1200,
  pricing_snapshot: { totalCents: 1200, currency: 'CNY' }, settings_snapshot: { core: { durationSec: 8, aspectRatio: '16:9', mode: 't2v' } },
  currency: 'CNY', payment_status: 'paid_wallet',
  updated_at: new Date(Date.now() - 20_000).toISOString(), created_at: new Date(Date.now() - 60_000).toISOString(),
};

async function pollTurbo(requestSnapshot: Record<string, unknown> | null, raw: unknown) {
  const queries: Array<{ sql: string; params?: unknown[] }> = [];
  const pollPaths: string[] = [];
  await runKlingDirectPoll({ deps: {
    claimPollFn: allowGenerationPoll,
    queryFn: async (sql, params) => {
      queries.push({ sql, params });
      if (/FROM app_jobs/.test(sql) && /provider = \$1/.test(sql)) return [turboJob] as never;
      if (/FROM provider_attempts/.test(sql)) return [{ id: 7, attempt_index: 1, request_snapshot: requestSnapshot }] as never;
      if (/UPDATE app_jobs/.test(sql) && /RETURNING job_id/.test(sql)) return [{ job_id: 'job_turbo' }] as never;
      return [] as never;
    },
    getKlingDirectClientFn: () => ({
      retrieveTask: async ({ pollPathPrefix }: { pollPathPrefix: string }) => {
        pollPaths.push(pollPathPrefix);
        return { providerJobId: 'task_turbo', status: 'completed', rawStatus: 'succeeded', videoUrl: 'https://cdn.kling.test/out.mp4',
          message: null, usage: null, providerCostUnits: null, providerCostUsd: null, raw };
      },
    }) as never,
    ensureFastStartVideoFn: async () => 'https://cdn.keyvo.test/jobs/job_turbo/video.mp4',
    detectVideoDimensionsFn: async () => ({ width: 1920, height: 1080 }),
    ensureJobThumbnailFn: async () => 'https://cdn.keyvo.test/jobs/job_turbo/thumb.jpg',
    upsertLegacyJobOutputsFn: async () => undefined,
    generateAndPersistJobPreviewVideoFn: async () => null,
    generateAndPersistJobKeyframesFn: async () => [],
  } as never });
  const completed = queries.find(entry => /SET status = 'completed'/.test(entry.sql));
  return { pollPaths, cost: completed ? JSON.parse(JSON.stringify(completed.params?.[3])) : null };
}

test('polling uses the unified /tasks query and costs Turbo from the official list; legacy jobs keep their path', async () => {
  const v2Raw = { code: 0, data: [{ id: 'task_turbo', status: 'succeeded', outputs: [{ type: 'video', url: 'https://cdn.kling.test/out.mp4', duration: '8' }] }] };
  const current = await pollTurbo({ pollPathPrefix: '/tasks', resolution: '1080p' }, v2Raw);
  assert.deepEqual(current.pollPaths, ['/tasks']);
  const cost = typeof current.cost === 'string' ? JSON.parse(current.cost) : current.cost;
  assert.equal(cost.provider_model, 'kling-3.0-turbo');
  assert.equal(cost.provider_cost_source, 'kling_cn_list_price_2026_11_11_provisional');
  assert.equal(cost.provider_cost_units, 8);
  assert.equal(cost.provider_cost_usd, 1);

  // No snapshot path: the route's poll path (now /tasks).
  assert.deepEqual((await pollTurbo(null, v2Raw)).pollPaths, ['/tasks']);
  // A Turbo job submitted on the legacy kling-v3 path before this change keeps that path and its costing.
  const legacy = await pollTurbo({ pollPathPrefix: '/v1/videos/text2video' }, { data: { task_id: 'task_turbo', final_unit_deduction: 6.4 } });
  assert.deepEqual(legacy.pollPaths, ['/v1/videos/text2video']);
  const legacyCost = typeof legacy.cost === 'string' ? JSON.parse(legacy.cost) : legacy.cost;
  assert.notEqual(legacyCost?.provider_cost_source, 'kling_cn_list_price_2026_11_11_provisional');
});

test('the client polls Turbo tasks with the API key on the mainland endpoint', async () => {
  const requests: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    requests.push(String(url));
    return new Response(JSON.stringify({ code: 0, data: [{ id: 't1', status: 'processing' }] }), { status: 200 });
  }) as typeof fetch;
  try {
    const client = new KlingDirectClient({ apiKey: 'test-only-key', baseUrl: KLING_DEFAULT_API_BASE_URL });
    const route = resolveKlingDirectModelRoute('kling-3-turbo-standard');
    const task = await client.retrieveTask({ pollPathPrefix: resolveKlingDirectPollPathPrefix(route, 't2v'), providerJobId: 't1' });
    assert.equal(task.status, 'running');
    assert.deepEqual(requests, ['https://api-beijing.klingai.com/tasks?task_ids=t1']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
