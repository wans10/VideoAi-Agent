import { query } from '@/lib/db';
import { LlmhubVideoClient } from '@/server/video-providers/llmhub/client';
import { LLMHUB_VIDEO_PROVIDER } from '@/server/video-providers/llmhub/model-map';
import {
  createProviderAttempt,
  linkProviderFallbackAttempt,
  markProviderAttemptAccepted,
  markProviderAttemptFailed,
} from '@/server/video-providers/provider-attempts';
import { buildUserFacingRefundDescription } from '@/server/user-facing-failure-messages';
import { rollbackPendingPayment } from './payment-rollback';
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
  try {
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
    const definiteFailure = !acceptedProviderJobId && Number.isFinite(status) && status >= 400 && status < 500;
    if (!acceptedProviderJobId) await markProviderAttemptFailed({
      attemptId: attempt.id,
      errorCode: definiteFailure ? `HTTP_${status}` : 'SUBMISSION_OUTCOME_UNKNOWN',
      errorClass: definiteFailure ? 'provider_rejection' : 'ambiguous_acceptance',
      fallbackEligible: false,
      responseSnapshot: { status: Number.isFinite(status) ? status : null },
    }).catch(() => undefined);
    if (definiteFailure) {
      await rollbackPendingPayment({
        pendingReceipt: params.pendingReceipt,
        walletChargeReserved: params.walletChargeReserved,
        refundDescription: buildUserFacingRefundDescription({
          engineLabel: params.engineLabel,
          durationSec: params.durationSec,
          reason: 'The render request was rejected.',
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
        definiteFailure ? 'The render request was rejected.' : acceptedProviderJobId
          ? 'Render accepted; tracking is recovering.' : 'Provider acceptance needs manual review.',
        definiteFailure && params.walletChargeReserved,
        acceptedProviderJobId,
        LLMHUB_VIDEO_PROVIDER,
      ],
    );
    return { kind: 'error_response', status: definiteFailure ? 400 : 503, body: {
      ok: false, error: definiteFailure ? 'PROVIDER_REJECTED' : 'PROVIDER_OUTCOME_UNKNOWN',
      jobId: params.jobId,
    } };
  }
}
