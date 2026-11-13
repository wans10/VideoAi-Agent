import type { NormalizedVideoProviderTask } from '@/server/video-providers/types';
import { query } from '@/lib/db';
import { getKlingDirectClient } from '@/server/video-providers/kling-direct/client';
import { estimateKlingDirectCost } from '@/server/video-providers/kling-direct/cost';
import { ensureKlingDirectElementsForPayload } from '@/server/video-providers/kling-direct/elements';
import {
  classifyKlingDirectError,
  isKlingDirectBusyRejection,
  isKlingDirectDefiniteRejection,
  KlingDirectError,
} from '@/server/video-providers/kling-direct/errors';
import { resolveKlingDirectModelRoute } from '@/server/video-providers/kling-direct/model-map';
import { buildKlingDirectV2Payload } from '@/server/video-providers/kling-direct/payload-v2';
import {
  createProviderAttempt,
  linkProviderFallbackAttempt,
  markProviderAttemptFailed,
} from '@/server/video-providers/provider-attempts';
import { shouldFallbackFromKlingDirectToBailian } from '@/server/video-providers/alibaba-model-studio/bailian-routing';
import { isKling3TurboOfficialPromptLimitMessage } from '@/lib/kling-3-turbo-official-limits';
import { createFalMediaTransport } from '@/server/fal-provider-media-access';
import { persistDirectProviderAcceptance } from './direct-provider-acceptance';
import { rollbackPendingPayment } from './payment-rollback';
import {
  KLING_DIRECT_BUSY_MESSAGE,
  markJobFailedBeforeFallback,
  userSafeKlingDirectMessage,
} from './kling-direct-submission-shared';
import type { KlingDirectGenerateSubmissionResult, submitKlingDirectGenerateTask } from './kling-direct-submission';

type Params = Parameters<typeof submitKlingDirectGenerateTask>[0];

/** Docs (concurrency rules): exponential backoff from 1 s for 1302/1303; no task exists after such a rejection. */
export const KLING_DIRECT_BUSY_RETRY_DELAYS_MS = [1_000, 2_000, 4_000] as const;
const STALLED_MESSAGE = 'Provider acceptance needs manual review.';

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Kling 4.0 / 4.0 Flash / 3.0 Turbo official ("new design") submission. Never falls back to Fal.
 * - Kling 3.0 Turbo is also hosted on Bailian (KLING_ROUTE_ORDER): as the second leg this call links its attempt
 *   to Bailian's (`fallbackFromAttemptId`); as the first leg (`direct,bailian`) a definite pre-acceptance
 *   rejection hands the reserved charge to the single Bailian submission instead of refunding.
 * - Definite rejections (local validation, documented 1xxx business codes) fail the job and refund.
 * - 1302/1303 (rate / parallel-task limit) are retried with backoff, then fail as "busy" with a refund.
 * - Ambiguous outcomes (transport, 5xxx) are resolved through `options.external_task_id` (the job id):
 *   a found task is accepted, a confirmed absence is refunded, an unanswerable lookup stalls for review.
 */
export async function submitKlingDirectV2GenerateTask(params: Params): Promise<KlingDirectGenerateSubmissionResult> {
  const deps = params.deps ?? {};
  const getKlingDirectClientFn = deps.getKlingDirectClientFn ?? getKlingDirectClient;
  const queryFn = deps.queryFn ?? query;
  const rollbackPendingPaymentFn = deps.rollbackPendingPaymentFn ?? rollbackPendingPayment;
  const sleepFn = deps.sleepFn ?? defaultSleep;
  const route = resolveKlingDirectModelRoute(params.engineId);
  const resolution = route.resolution ?? params.falPayload.resolution ?? (route.engineId === 'kling-v4-flash' ? '720p' : '1080p');
  const estimate = estimateKlingDirectCost({
    engineId: params.engineId,
    mode: params.mode,
    durationSec: params.durationSec,
    resolution,
  });
  const elementCount = params.falPayload.elements?.length ?? 0;
  const attempt = await createProviderAttempt({
    publicJobId: params.jobId,
    attemptIndex: params.fallbackFromAttemptId ? 2 : 1,
    provider: 'kling_direct',
    providerModel: route.providerModel,
    status: 'submit_started',
    requestSnapshot: {
      route: 'direct',
      routeRole: params.fallbackFromAttemptId ? 'fallback' : 'primary',
      bailianFallbackAvailable: Boolean(params.submitBailianFallback),
      engineId: params.engineId,
      mode: params.mode,
      providerModel: route.providerModel,
      endpointFamily: route.endpointFamily,
      apiDesign: 'v2',
      createPath: route.createPaths[params.mode as keyof typeof route.createPaths] ?? null,
      pollPathPrefix: route.pollPathPrefixes[params.mode as keyof typeof route.pollPathPrefixes] ?? null,
      durationSec: params.durationSec,
      resolution,
      aspectRatio: params.aspectRatio,
      elementCount,
      elementRegistrationEnabled: params.elementRegistrationEnabled,
      multiPromptCount: params.falPayload.multiPrompt?.length ?? 0,
      promptLength: params.prompt.length,
      estimatedProviderCostUnits: estimate.providerCostUnits,
      estimatedProviderCostUsd: estimate.providerCostUsd,
      estimatedProviderCostSource: estimate.source,
    },
    queryFn,
  });
  if (params.fallbackFromAttemptId) {
    await linkProviderFallbackAttempt({ fromAttemptId: params.fallbackFromAttemptId, toAttemptId: attempt.id, queryFn })
      .catch(() => undefined);
  }

  const client = getKlingDirectClientFn();
  const createMediaTransport = deps.createMediaTransportFn ?? createFalMediaTransport;
  let acceptedTask: NormalizedVideoProviderTask | null = null;
  let failure: unknown = null;
  let sanitize: (value: unknown) => unknown = (value) => value;
  try {
    if (elementCount > 0 && !params.elementRegistrationEnabled) {
      throw new KlingDirectError('Kling direct subject registration is disabled.', { code: 'KLING_ELEMENT_REGISTRATION_DISABLED' });
    }
    // Owned media is private: Kling reads short-lived (1 h) grants; stored payloads keep the originals.
    // The helper only signs GeneratePayload URLs; it does not call Fal.
    let transport: Awaited<ReturnType<typeof createFalMediaTransport>>;
    try {
      transport = await createMediaTransport({ payload: params.falPayload, userId: params.userId });
    } catch (error) {
      const unavailable = (error as { code?: unknown } | null)?.code === 'REFERENCE_INVALID';
      throw new KlingDirectError('Reference media could not be read.', unavailable
        ? { status: 400, code: 'KLING_V2_REQUEST_INVALID', cause: error }
        : { code: 'KLING_REFERENCE_ACCESS_FAILED', cause: error });
    }
    sanitize = transport.sanitize;
    const registration = elementCount > 0
      ? await ensureKlingDirectElementsForPayload({
          elements: params.falPayload.elements ?? null,
          transportElements: transport.payload.elements ?? null,
          userId: params.userId,
          jobId: params.jobId,
          client,
          queryFn,
          engineId: params.engineId,
        })
      : { elements: undefined };
    const payload = buildKlingDirectV2Payload({
      engineId: params.engineId,
      jobId: params.jobId,
      mode: params.mode,
      falPayload: transport.payload,
      registeredElements: registration.elements ?? null,
    });
    for (let retry = 0; ; retry += 1) {
      try {
        acceptedTask = await client.createTask(payload);
        break;
      } catch (error) {
        const delay = KLING_DIRECT_BUSY_RETRY_DELAYS_MS[retry];
        if (!isKlingDirectBusyRejection(error) || delay === undefined) throw error;
        await sleepFn(delay);
      }
    }
  } catch (error) {
    failure = error;
  }

  let outcome: 'definite' | 'stalled' = 'definite';
  if (!acceptedTask && failure && !isKlingDirectDefiniteRejection(failure)) {
    // Ambiguous: the task may exist. The job id was sent as options.external_task_id.
    try {
      acceptedTask = await client.findTaskByExternalId(params.jobId);
    } catch (lookupError) {
      console.warn('[kling-direct-v2] acceptance lookup failed', {
        jobId: params.jobId, code: classifyKlingDirectError(lookupError).code,
      });
      outcome = 'stalled';
    }
  }

  if (acceptedTask?.providerJobId) {
    const status = acceptedTask.status === 'running' ? 'running' : 'queued';
    const progress = status === 'running' ? 30 : 10;
    return { ok: true, kind: 'accepted', body: await persistDirectProviderAcceptance({
      jobId: params.jobId, provider: 'kling_direct', providerJobId: acceptedTask.providerJobId,
      attemptId: attempt.id, responseSnapshot: acceptedTask.raw, status, progress,
      localKey: params.localKey, queryFn,
      logAccepted: () => params.logMetricFn('accepted', { jobId: params.jobId,
        meta: { provider: 'kling_direct', providerJobId: acceptedTask!.providerJobId, providerModel: route.providerModel } }),
      acceptedBody: {
        ok: true, jobId: params.jobId, videoUrl: null, video: null, thumbUrl: params.placeholderThumb,
        status, progress, pricing: params.pricing, paymentStatus: params.paymentStatus,
        provider: 'kling_direct', providerJobId: acceptedTask.providerJobId,
        batchId: params.batchId, groupId: params.groupId, iterationIndex: params.iterationIndex,
        iterationCount: params.iterationCount, renderIds: params.renderIds, heroRenderId: params.heroRenderId,
        localKey: params.localKey,
      },
    }) };
  }

  const normalized = classifyKlingDirectError(failure ?? new KlingDirectError('Kling direct submission was not accepted.'));
  const busy = isKlingDirectBusyRejection(failure);
  if (outcome === 'definite' && failure && isKlingDirectDefiniteRejection(failure) && params.submitBailianFallback
    && shouldFallbackFromKlingDirectToBailian({ acceptedProviderJobId: null, error: failure })) {
    // Kling certainly created no task; the reserved charge moves to the single Bailian submission.
    await markProviderAttemptFailed({
      attemptId: attempt.id,
      errorCode: normalized.code,
      errorClass: busy ? 'provider_busy' : normalized.errorClass,
      fallbackEligible: true,
      responseSnapshot: sanitize(normalized.raw),
      queryFn,
    });
    params.logMetricFn('rejected', { jobId: params.jobId, errorCode: normalized.code ?? normalized.errorClass,
      meta: { provider: 'kling_direct', errorClass: normalized.errorClass, fallbackTo: 'bailian' } });
    return params.submitBailianFallback(attempt.id);
  }
  await markProviderAttemptFailed({
    attemptId: attempt.id,
    errorCode: outcome === 'stalled' ? 'SUBMISSION_OUTCOME_UNKNOWN' : normalized.code,
    errorClass: outcome === 'stalled' ? 'ambiguous_acceptance' : busy ? 'provider_busy' : normalized.errorClass,
    fallbackEligible: false,
    responseSnapshot: sanitize(normalized.raw),
    queryFn,
  }).catch(() => undefined);
  console.warn('[kling-direct-v2] submit not accepted', {
    jobId: params.jobId, engineId: params.engineId, status: normalized.status, code: normalized.code,
    errorClass: normalized.errorClass, outcome,
  });

  if (outcome === 'stalled') {
    // Neither acceptance nor absence is known: keep the charge and stop for manual review (no second paid task).
    await queryFn(
      `UPDATE app_jobs SET status = 'provider_polling_stalled', progress = 0, message = $2,
              provisional = FALSE, updated_at = NOW()
        WHERE job_id = $1`,
      [params.jobId, STALLED_MESSAGE]
    );
    params.logMetricFn('failed', { jobId: params.jobId, errorCode: 'SUBMISSION_OUTCOME_UNKNOWN',
      meta: { provider: 'kling_direct', errorClass: 'ambiguous_acceptance' } });
    return { ok: false, status: 503, body: { ok: false, error: 'PROVIDER_OUTCOME_UNKNOWN', jobId: params.jobId } };
  }

  // Our own Turbo prompt-limit rejection is specific and user-facing; other causes keep the generic copy.
  const turboPromptLimit = normalized.code === 'KLING_V2_REQUEST_INVALID'
    && isKling3TurboOfficialPromptLimitMessage(normalized.message) ? normalized.message : null;
  const message = busy ? KLING_DIRECT_BUSY_MESSAGE : turboPromptLimit ?? userSafeKlingDirectMessage(normalized.errorClass);
  await markJobFailedBeforeFallback({
    jobId: params.jobId,
    engineLabel: params.engineLabel,
    durationSec: params.durationSec,
    message,
    pendingReceipt: params.pendingReceipt,
    paymentMode: params.paymentMode,
    walletChargeReserved: params.walletChargeReserved,
    queryFn,
    rollbackPendingPaymentFn,
  });
  params.logMetricFn('failed', {
    jobId: params.jobId,
    errorCode: normalized.code ?? normalized.errorClass,
    meta: { provider: 'kling_direct', errorClass: busy ? 'provider_busy' : normalized.errorClass },
  });
  const invalid = normalized.errorClass === 'invalid_request' || normalized.errorClass === 'moderation'
    || normalized.code === 'KLING_V2_REQUEST_INVALID';
  return {
    ok: false,
    status: busy ? 503 : invalid ? 400 : 503,
    body: {
      ok: false,
      error: busy ? 'PROVIDER_BUSY' : normalized.code ?? 'KLING_DIRECT_SUBMIT_FAILED',
      message,
      ...(busy ? { retryable: true } : {}),
    },
  };
}
