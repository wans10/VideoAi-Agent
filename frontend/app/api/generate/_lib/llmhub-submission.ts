import { query } from '@/lib/db';
import { LlmhubVideoClient } from '@/server/video-providers/llmhub/client';
import { LLMHUB_VIDEO_PROVIDER } from '@/server/video-providers/llmhub/model-map';
import { isDefiniteLlmhubRejection } from '@/server/video-providers/llmhub/rejection';
import {
  MINIMAX_MESSAGES,
  MINIMAX_OFFICIAL_MODELS,
  MINIMAX_V2_MAX_INFLIGHT_TASKS,
  shouldUseMinimaxOfficial,
} from '@/server/video-providers/minimax-official/client';
import type { MinimaxOfficialMedia } from './minimax-official-media';
import {
  createProviderAttempt,
  linkProviderFallbackAttempt,
  markProviderAttemptAccepted,
  markProviderAttemptFailed,
} from '@/server/video-providers/provider-attempts';
import { buildUserFacingRefundDescription } from '@/server/user-facing-failure-messages';
import { rollbackPendingPayment } from './payment-rollback';
import { shouldFallbackFromMinimaxDirectToBailian } from '@/server/video-providers/alibaba-model-studio/bailian-routing';
import type { GenerateProviderSubmissionResult } from './video-provider-submission';
import type { PendingReceipt } from './initial-video-job';
import type { PricingSnapshot } from '@/types/engines';

export async function submitLlmhubGenerateTask(params: {
  jobId: string;
  userId: string;
  engineId: string;
  engineLabel: string;
  modelId: string;
  mode: string;
  prompt: string;
  durationSec: number;
  size?: string | null;
  resolution?: string | null;
  aspectRatio?: string | null;
  audioEnabled?: boolean;
  imageUrl?: string | null;
  /** Last frame, references and prompt optimiser; sent only when the model runs on MiniMax's own API. */
  minimax?: MinimaxOfficialMedia;
  placeholderThumb: string;
  pricing: PricingSnapshot;
  paymentStatus: string;
  pendingReceipt: PendingReceipt | null;
  walletChargeReserved: boolean;
  batchId: string | null;
  groupId: string | null;
  iterationIndex: number | null;
  iterationCount: number | null;
  renderIds: Array<string | null> | null;
  heroRenderId: string | null;
  localKey: string | null;
  client?: Pick<LlmhubVideoClient, 'create'>;
  fallbackFromAttemptId?: number;
  /**
   * MINIMAX_H3_ROUTE_ORDER=direct,bailian: the Bailian-hosted MiniMax-H3, called only after a definite
   * pre-acceptance rejection here (never after a task ID or an unknown outcome). It owns its refund.
   */
  submitBailianFallback?: (attemptId: number) => Promise<GenerateProviderSubmissionResult>;
  /** Tests only: counts MiniMax V2 tasks still running. */
  countMinimaxInflightFn?: () => Promise<number>;
}): Promise<GenerateProviderSubmissionResult> {
  const attempt = await createProviderAttempt({
    publicJobId: params.jobId,
    attemptIndex: params.fallbackFromAttemptId ? 2 : 1,
    provider: LLMHUB_VIDEO_PROVIDER,
    providerModel: params.modelId,
    requestSnapshot: {
      engineId: params.engineId, mode: params.mode, durationSec: params.durationSec,
      hasStartImage: Boolean(params.imageUrl), promptLength: params.prompt.length,
    },
  });
  if (params.fallbackFromAttemptId) {
    await linkProviderFallbackAttempt({
      fromAttemptId: params.fallbackFromAttemptId,
      toAttemptId: attempt.id,
    }).catch((error) => {
      console.warn('[llmhub] unable to link fallback attempts', { jobId: params.jobId }, error);
    });
  }
  let acceptedProviderJobId: string | null = null;
  const minimaxOfficial = shouldUseMinimaxOfficial(params.modelId);
  try {
    if (minimaxOfficial && MINIMAX_OFFICIAL_MODELS.has(params.modelId)
      && await (params.countMinimaxInflightFn ?? countMinimaxV2InflightTasks)().catch(() => 0) >= MINIMAX_V2_MAX_INFLIGHT_TASKS) {
      // The V2 API runs at most 30 tasks per account at once; refuse before submitting so nothing is billed.
      throw Object.assign(new Error('MiniMax in-flight task limit reached.'), {
        status: 429, definiteRejection: true, userMessage: MINIMAX_MESSAGES.rateLimited,
      });
    }
    const result = await (params.client ?? new LlmhubVideoClient()).create({
      model: params.modelId,
      prompt: params.prompt,
      seconds: params.durationSec,
      size: params.size,
      resolution: params.resolution,
      aspectRatio: params.aspectRatio,
      audioEnabled: params.audioEnabled,
      imageUrl: params.mode === 'i2v' ? params.imageUrl : null,
      jobId: params.jobId,
      ...(minimaxOfficial && params.minimax ? { minimax: params.minimax } : {}),
    });
    acceptedProviderJobId = result.id;
    await query(
      `UPDATE app_jobs SET status = 'queued', progress = 10, message = 'Render submitted.',
        provider = $2, provider_job_id = $3, provisional = FALSE, updated_at = NOW()
        WHERE job_id = $1`,
      [params.jobId, LLMHUB_VIDEO_PROVIDER, result.id],
    );
    await markProviderAttemptAccepted({
      attemptId: attempt.id, providerJobId: result.id, responseSnapshot: result.raw,
    });
    return { kind: 'accepted_response', body: {
      ok: true, jobId: params.jobId, providerJobId: result.id,
      provider: LLMHUB_VIDEO_PROVIDER, status: 'queued', progress: 10,
      videoUrl: null, video: null, thumbUrl: params.placeholderThumb,
      pricing: params.pricing, paymentStatus: params.paymentStatus,
      batchId: params.batchId, groupId: params.groupId,
      iterationIndex: params.iterationIndex, iterationCount: params.iterationCount,
      renderIds: params.renderIds, heroRenderId: params.heroRenderId, localKey: params.localKey,
    } };
  } catch (error) {
    const status = error && typeof error === 'object' && 'status' in error
      ? Number((error as { status?: unknown }).status) : NaN;
    const minimaxError = error as { definiteRejection?: unknown; userMessage?: unknown } | null;
    const definiteFailure = !acceptedProviderJobId
      && (isDefiniteLlmhubRejection(status, (error as { detail?: unknown } | null)?.detail)
        || (minimaxOfficial && minimaxError?.definiteRejection === true));
    // MiniMax's canonical English reason (rate limit, content review...); lib/minimax-failure-messages.ts localizes it.
    const rejectionMessage = minimaxOfficial && typeof minimaxError?.userMessage === 'string'
      ? minimaxError.userMessage : 'The render request was rejected.';
    console.warn('[llmhub] video submission failed', {
      jobId: params.jobId, model: params.modelId, status: Number.isFinite(status) ? status : null,
      detail: (error as { detail?: unknown } | null)?.detail ?? (error instanceof Error ? error.message : null),
    });
    const bailianFallback = Boolean(params.submitBailianFallback) && shouldFallbackFromMinimaxDirectToBailian({
      acceptedProviderJobId, definiteRejection: definiteFailure, userMessage: minimaxError?.userMessage,
    });
    if (!acceptedProviderJobId) await markProviderAttemptFailed({
      attemptId: attempt.id,
      errorCode: definiteFailure ? `HTTP_${status}` : 'SUBMISSION_OUTCOME_UNKNOWN',
      errorClass: definiteFailure ? 'provider_rejection' : 'ambiguous_acceptance',
      fallbackEligible: bailianFallback,
      responseSnapshot: { status: Number.isFinite(status) ? status : null },
    }).catch(() => undefined);
    if (bailianFallback && params.submitBailianFallback) {
      // No task exists here; the reserved charge moves to the single Bailian submission.
      return params.submitBailianFallback(attempt.id);
    }
    if (definiteFailure) {
      await rollbackPendingPayment({
        pendingReceipt: params.pendingReceipt,
        walletChargeReserved: params.walletChargeReserved,
        refundDescription: buildUserFacingRefundDescription({
          engineLabel: params.engineLabel,
          durationSec: params.durationSec,
          reason: rejectionMessage,
        }),
      });
    }
    await query(
      `UPDATE app_jobs SET status = $2, progress = 0, message = $3,
        provider = CASE WHEN $5::text IS NOT NULL THEN $6 ELSE provider END,
        provider_job_id = COALESCE($5, provider_job_id),
        payment_status = CASE WHEN $4 AND payment_status = 'paid_wallet' THEN 'refunded_wallet' ELSE payment_status END,
        provisional = FALSE, updated_at = NOW() WHERE job_id = $1`,
      [
        params.jobId,
        definiteFailure ? 'failed' : acceptedProviderJobId ? 'queued' : 'provider_polling_stalled',
        definiteFailure ? rejectionMessage : acceptedProviderJobId
          ? 'Render accepted; tracking is recovering.' : 'Provider acceptance needs manual review.',
        definiteFailure && params.walletChargeReserved,
        acceptedProviderJobId,
        LLMHUB_VIDEO_PROVIDER,
      ],
    );
    const rateLimited = definiteFailure && rejectionMessage === MINIMAX_MESSAGES.rateLimited;
    return { kind: 'error_response', status: rateLimited ? 429 : definiteFailure ? 400 : 503, body: {
      ok: false, error: definiteFailure ? 'PROVIDER_REJECTED' : 'PROVIDER_OUTCOME_UNKNOWN',
      jobId: params.jobId,
      ...(rateLimited ? { code: 'PROVIDER_RATE_LIMITED' } : {}),
      ...(definiteFailure && rejectionMessage !== 'The render request was rejected.' ? { message: rejectionMessage } : {}),
    } };
  }
}

/** MiniMax V2 tasks we submitted that are still running (numeric task IDs on the llmhub job provider). */
async function countMinimaxV2InflightTasks(): Promise<number> {
  const rows = await query<{ count: string | number }>(
    `SELECT COUNT(*) AS count FROM app_jobs
      WHERE provider = $1 AND provider_job_id ~ '^[0-9]{6,}$'
      AND status IN ('pending', 'queued', 'running', 'processing', 'in_progress')
      AND created_at > NOW() - INTERVAL '4 hours'`,
    [LLMHUB_VIDEO_PROVIDER],
  );
  return Number(rows[0]?.count ?? 0);
}
