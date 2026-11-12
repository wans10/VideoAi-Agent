import assert from 'node:assert/strict';
import test from 'node:test';

import { submitBytePlusGenerateTask } from '../frontend/app/api/generate/_lib/byteplus-submission';
import type { PendingReceipt } from '../frontend/app/api/generate/_lib/initial-video-job';
import {
  assertSeedance2FourKCapacity,
  BYTEPLUS_4K_CONCURRENCY_LIMIT_CODE,
  isSeedance2FourKSubmission,
  resolveSeedance2FourKConcurrency,
  SEEDANCE_2_4K_DOCUMENTED_LIMITS,
} from '../frontend/src/server/video-providers/byteplus-modelark-capacity';
import { BytePlusModelArkError } from '../frontend/src/server/video-providers/byteplus-modelark-error';
import {
  getBytePlusTaskFailureCode,
  getBytePlusUserSafeErrorMessage,
} from '../frontend/src/server/video-providers/byteplus-modelark-response';
import { getSeedanceFailureMessage, SEEDANCE_4K_CAPACITY_BUSY } from '../frontend/lib/seedance-failure-messages';
import { toUserFacingFailureMessage } from '../frontend/server/user-facing-failure-messages';
import {
  BYTEPLUS_SEEDANCE_2_5_DEFAULT_MODEL_ID,
  BYTEPLUS_SEEDANCE_DEFAULT_MODEL_ID,
  BYTEPLUS_SEEDANCE_FAST_DEFAULT_BASE_URL,
  BYTEPLUS_SEEDANCE_FAST_DEFAULT_MODEL_ID,
  BYTEPLUS_SEEDANCE_MINI_DEFAULT_MODEL_ID,
  BYTEPLUS_ARK_DEFAULT_REGION,
} from '../frontend/src/server/video-providers/byteplus-modelark-constants';

test('documented Ark 4K limit for Seedance 2.0 is RPM 15 and concurrency 1', () => {
  assert.deepEqual(SEEDANCE_2_4K_DOCUMENTED_LIMITS, { rpm: 15, concurrency: 1 });
  assert.equal(resolveSeedance2FourKConcurrency(undefined), 1);
  assert.equal(resolveSeedance2FourKConcurrency('0'), 1);
  assert.equal(resolveSeedance2FourKConcurrency('2'), 2);
  assert.equal(isSeedance2FourKSubmission('seedance-2-0', '4K'), true);
  assert.equal(isSeedance2FourKSubmission('seedance-2-0', '1080p'), false);
  assert.equal(isSeedance2FourKSubmission('seedance-2-0-fast', '4k'), false);
});

test('code defaults are the Volcengine mainland ids and host', () => {
  assert.equal(BYTEPLUS_SEEDANCE_DEFAULT_MODEL_ID, 'doubao-seedance-2-0-260128');
  assert.equal(BYTEPLUS_SEEDANCE_FAST_DEFAULT_MODEL_ID, 'doubao-seedance-2-0-fast-260128');
  assert.equal(BYTEPLUS_SEEDANCE_MINI_DEFAULT_MODEL_ID, 'doubao-seedance-2-0-mini-260615');
  assert.equal(BYTEPLUS_SEEDANCE_2_5_DEFAULT_MODEL_ID, 'doubao-seedance-2-5-260628');
  assert.equal(BYTEPLUS_SEEDANCE_FAST_DEFAULT_BASE_URL, 'https://ark.cn-beijing.volces.com/api/v3');
  assert.equal(BYTEPLUS_ARK_DEFAULT_REGION, 'cn-beijing');
});

test('the guard counts only other in-flight Seedance 2.0 4K Ark tasks', async () => {
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  const queryFn = async (sql: string, values?: unknown[]) => { calls.push({ sql, values }); return [{ active: 0 }]; };
  await assertSeedance2FourKCapacity({ engineId: 'seedance-2-0', resolution: '1080p', jobId: 'j', queryFn });
  assert.equal(calls.length, 0, 'non-4K submissions never query');
  await assertSeedance2FourKCapacity({ engineId: 'seedance-2-0', resolution: '4k', jobId: 'j', queryFn });
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /status IN \('queued', 'running'\)/);
  assert.match(calls[0].sql, /\{core,resolution\}/);
  assert.deepEqual(calls[0].values, ['seedance-2-0', 'byteplus_modelark', 'j']);
  await assert.rejects(
    assertSeedance2FourKCapacity({ engineId: 'seedance-2-0', resolution: '4k', jobId: 'j',
      queryFn: async () => [{ active: 1 }] }),
    (error: unknown) => error instanceof BytePlusModelArkError && error.status === 429
      && error.code === BYTEPLUS_4K_CONCURRENCY_LIMIT_CODE,
  );
});

test('the 4K rejection maps to localized Seedance copy and a stable failure code', () => {
  const english = getBytePlusUserSafeErrorMessage('anything', BYTEPLUS_4K_CONCURRENCY_LIMIT_CODE);
  assert.match(english, /Seedance 2\.0 4K is busy/);
  assert.equal(getBytePlusTaskFailureCode('anything', BYTEPLUS_4K_CONCURRENCY_LIMIT_CODE), SEEDANCE_4K_CAPACITY_BUSY);
  assert.equal(toUserFacingFailureMessage(english), english);
  assert.match(getSeedanceFailureMessage({ failureCode: SEEDANCE_4K_CAPACITY_BUSY, locale: 'zh' })!, /4K 规格同一时间只能运行一个任务/);
  assert.match(getSeedanceFailureMessage({ message: english, locale: 'zh' })!, /改用 1080p/);
});

test('a busy 4K slot rejects before the provider call, skips LLM Hub fallback and refunds the wallet', async () => {
  const pendingReceipt: PendingReceipt = { userId: 'user_4k', amountCents: 900, currency: 'CNY',
    description: 'Run Seedance 4K', jobId: 'job_4k', snapshot: { totalCents: 900 },
    applicationFeeCents: null, vendorAccountId: null };
  let providerCalls = 0;
  let fallbackCalls = 0;
  let rolledBack = false;
  const warn = console.warn;
  console.warn = () => undefined;
  try {
    const result = await submitBytePlusGenerateTask({
      jobId: 'job_4k', userId: 'user_4k', engineId: 'seedance-2-0', engineLabel: 'Seedance 2.0',
      prompt: 'A city at night', durationSec: 5, mode: 't2v', initialImageUrl: null, endImageUrl: null,
      normalizedReferenceImages: [], videoUrls: [], resolvedAudioUrl: null, audioUrls: [],
      effectiveResolution: '4k', aspectRatio: '16:9', audioEnabled: true,
      placeholderThumb: '/assets/frames/thumb-16x9.svg', pricing: { totalCents: 900, currency: 'CNY' } as never,
      paymentStatus: 'paid_wallet', pendingReceipt, paymentMode: 'wallet', walletChargeReserved: true,
      batchId: null, groupId: null, iterationIndex: null, iterationCount: null, renderIds: null,
      heroRenderId: null, localKey: null,
      submitLlmhubFallback: async () => { fallbackCalls += 1; return { ok: true, body: {} }; },
      deps: {
        getBytePlusArkConfigFn: () => ({ seedanceModelId: 'doubao-seedance-2-0-260128' }) as never,
        buildBytePlusSeedancePayloadFn: (payload) => ({ ...payload, content: [] }) as never,
        getBytePlusModelArkClientFn: () => ({ createSeedanceFastTask: async () => {
          providerCalls += 1;
          return { providerJobId: 'unexpected', status: 'queued' };
        } }) as never,
        assertSeedance2FourKCapacityFn: (params) => assertSeedance2FourKCapacity({ ...params,
          queryFn: async () => [{ active: 1 }] }),
        rollbackPendingPaymentFn: async () => { rolledBack = true; },
        queryFn: async (sql) => (sql.includes('app_receipts') ? [{ id: 'refund_4k' }] : []),
      },
    });
    assert.equal(result.ok, false);
    assert.equal(providerCalls, 0);
    assert.equal(fallbackCalls, 0);
    assert.equal(rolledBack, true);
    assert.equal(result.ok ? null : result.status, 429);
    assert.equal(result.body.failureCode, SEEDANCE_4K_CAPACITY_BUSY);
    assert.equal(result.body.paymentStatus, 'refunded_wallet');
  } finally {
    console.warn = warn;
  }
});

test('Ark nested error codes are read and documented busy codes map to retry copy', async () => {
  const { bytePlusErrorCode, isBytePlusBusyErrorCode } = await import('../frontend/src/server/video-providers/byteplus-modelark-response');
  assert.equal(bytePlusErrorCode({ error: { code: 'InputImageSensitiveContentDetected.PrivacyInformation', message: 'x' } }),
    'InputImageSensitiveContentDetected.PrivacyInformation');
  assert.equal(bytePlusErrorCode({ code: 'TopLevel' }), 'TopLevel');
  assert.equal(bytePlusErrorCode({ message: 'none' }), null);
  for (const code of ['RateLimitExceeded.EndpointRPMExceeded', 'ModelAccountConcurrentRequestsLimitExceeded',
    'ModelAccountRpmRateLimitExceeded', 'RequestBurstTooFast', 'ServerOverloaded', 'QuotaExceeded', 'SetLimitExceeded']) {
    assert.equal(isBytePlusBusyErrorCode(code), true, code);
    assert.match(getBytePlusUserSafeErrorMessage('请求过于频繁', code), /temporarily busy/, code);
  }
  assert.equal(isBytePlusBusyErrorCode('InvalidParameter'), false);
  assert.equal(getBytePlusTaskFailureCode('', 'InputImageRiskDetection'), 'seedance_reference_image_blocked');
  assert.equal(getBytePlusTaskFailureCode('', 'InputImageSensitiveContentDetected.PrivacyInformation'), 'seedance_reference_image_blocked');
});
