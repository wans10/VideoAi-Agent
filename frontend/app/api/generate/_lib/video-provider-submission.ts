import type { GeneratePayload, GenerateResult } from '@/lib/fal';
import type { Mode, PricingSnapshot, ProviderClientErrorPolicy } from '@/types/engines';
import {
  isLlmhubVideoRoutingSelected,
  type BailianDirectFallbackPlan,
  type VideoProviderRoutingPlan,
} from '@/server/video-providers/router';
import { resolveLlmhubVideoModel } from '@/server/video-providers/llmhub/model-map';
import { submitFalGenerateTask } from './fal-submission';
import {
  submitAlibabaModelStudioGenerateTask,
  type AlibabaModelStudioGenerateSubmissionResult,
} from './alibaba-model-studio-submission';
import { submitGoogleVertexOmniGenerateTask } from './google-vertex-omni-submission';
import { submitGoogleVertexVeoGenerateTask } from './google-vertex-veo-submission';
import { submitKlingDirectGenerateTask, type KlingDirectGenerateSubmissionResult } from './kling-direct-submission';
import { submitLumaAgentsGenerateTask } from './luma-agents-submission';
import type { FalInputSummary } from './fal-request';
import type { PaymentMode, PendingReceipt } from './initial-video-job';
import { createProviderJobTracker } from './provider-job-tracker';
import { submitLlmhubGenerateTask } from './llmhub-submission';
import { llmhubVideoSize } from '@/server/video-providers/llmhub/video-size';
import { resolveMinimaxOfficialMedia } from './minimax-official-media';

type LogMetricFn = Parameters<typeof submitFalGenerateTask>[0]['logMetricFn'];

export type GenerateProviderSubmissionResult =
  | {
      kind: 'accepted_response';
      body: Record<string, unknown>;
    }
  | {
      kind: 'generation_result';
      generationResult: GenerateResult;
    }
  | {
      kind: 'error_response';
      status: number;
      body: Record<string, unknown>;
    };

type DirectSubmissionResult = AlibabaModelStudioGenerateSubmissionResult | KlingDirectGenerateSubmissionResult;

function fromDirectSubmission(result: DirectSubmissionResult): GenerateProviderSubmissionResult {
  if (!result.ok) return { kind: 'error_response', status: result.status, body: result.body };
  return result.kind === 'accepted'
    ? { kind: 'accepted_response', body: result.body }
    : { kind: 'generation_result', generationResult: result.generationResult };
}

function toDirectSubmission(result: GenerateProviderSubmissionResult): AlibabaModelStudioGenerateSubmissionResult {
  return result.kind === 'accepted_response'
    ? { ok: true, kind: 'accepted', body: result.body }
    : result.kind === 'error_response'
      ? { ok: false, status: result.status, body: result.body }
      : { ok: true, kind: 'fal_result', generationResult: result.generationResult };
}

export async function submitGenerateProviderTask(params: {
  lumaGenerationSource?: import('@/server/agent-api/generation-luma-lineage').OwnedLumaGenerationSource;
  providerRoutingPlan: VideoProviderRoutingPlan;
  request?: Record<string, unknown>;
  providerKey: string;
  falPayload: GeneratePayload;
  jobId: string;
  userId: string;
  engineId: string;
  engineLabel: string;
  mode: Mode;
  prompt: string;
  negativePrompt?: unknown;
  durationSec: number;
  aspectRatio: string | null;
  audioEnabled: boolean | undefined;
  effectiveResolution: string | null;
  imageUrl: string | null | undefined;
  cfgScale: unknown;
  placeholderThumb: string;
  pricing: PricingSnapshot;
  paymentStatus: string;
  pendingReceipt: PendingReceipt | null;
  paymentMode: PaymentMode;
  walletChargeReserved: boolean;
  falInputSummary: FalInputSummary;
  isLumaRay2: boolean;
  batchId: string | null;
  groupId: string | null;
  iterationIndex: number | null;
  iterationCount: number | null;
  renderIds: Array<string | null> | null;
  heroRenderId: string | null;
  localKey: string | null;
  logMetricFn: LogMetricFn;
  clientErrorPolicy?: ProviderClientErrorPolicy;
}): Promise<GenerateProviderSubmissionResult> {
  const submitLlmhub = (
    modelId: string,
    fallbackFromAttemptId?: number,
    submitBailianFallback?: (attemptId: number) => Promise<GenerateProviderSubmissionResult>,
  ) =>
    submitLlmhubGenerateTask({
      jobId: params.jobId,
      userId: params.userId,
      engineId: params.engineId,
      engineLabel: params.engineLabel,
      modelId,
      mode: params.mode,
      prompt: params.prompt,
      durationSec: params.durationSec,
      size: llmhubVideoSize(params.effectiveResolution, params.aspectRatio, params.engineId),
      resolution: params.effectiveResolution,
      aspectRatio: params.aspectRatio,
      audioEnabled: params.audioEnabled,
      imageUrl: params.imageUrl,
      minimax: resolveMinimaxOfficialMedia(params.falPayload, params.mode),
      placeholderThumb: params.placeholderThumb,
      pricing: params.pricing,
      paymentStatus: params.paymentStatus,
      pendingReceipt: params.pendingReceipt,
      walletChargeReserved: params.walletChargeReserved,
      batchId: params.batchId,
      groupId: params.groupId,
      iterationIndex: params.iterationIndex,
      iterationCount: params.iterationCount,
      renderIds: params.renderIds,
      heroRenderId: params.heroRenderId,
      localKey: params.localKey,
      fallbackFromAttemptId,
      submitBailianFallback,
    });
  const fallbackModel = params.request
    && isLlmhubVideoRoutingSelected(params.engineId, params.mode, undefined, params.request)
    && process.env.LLMHUB_API_KEY?.trim()
    && (!params.engineId.startsWith('veo-3-1')
      || (params.durationSec === 8 && params.effectiveResolution === '720p'
        && params.aspectRatio === '16:9' && params.audioEnabled !== false))
      ? resolveLlmhubVideoModel(params.engineId, params.mode)
      : null;
  const submitAlibaba = (options: {
    fallbackToFalEnabled: boolean;
    submitLlmhubFallback?: (directAttemptId: number) => Promise<AlibabaModelStudioGenerateSubmissionResult>;
    submitDirectFallback?: (bailianAttemptId: number) => Promise<AlibabaModelStudioGenerateSubmissionResult>;
    fallbackFromAttemptId?: number;
  }) => submitAlibabaModelStudioGenerateTask({
      jobId: params.jobId,
      userId: params.userId,
      engineId: params.engineId,
      engineLabel: params.engineLabel,
      mode: params.mode,
      prompt: params.prompt,
      negativePrompt: typeof params.negativePrompt === 'string' ? params.negativePrompt : null,
      durationSec: params.durationSec,
      aspectRatio: params.aspectRatio,
      audioEnabled: params.audioEnabled,
      effectiveResolution: params.effectiveResolution,
      imageUrl: params.imageUrl,
      placeholderThumb: params.placeholderThumb,
      pricing: params.pricing,
      paymentStatus: params.paymentStatus,
      pendingReceipt: params.pendingReceipt,
      paymentMode: params.paymentMode,
      walletChargeReserved: params.walletChargeReserved,
      ...options,
      falPayload: params.falPayload,
      falInputSummary: params.falInputSummary,
      isLumaRay2: params.isLumaRay2,
      batchId: params.batchId,
      groupId: params.groupId,
      iterationIndex: params.iterationIndex,
      iterationCount: params.iterationCount,
      renderIds: params.renderIds,
      heroRenderId: params.heroRenderId,
      localKey: params.localKey,
      logMetricFn: params.logMetricFn,
      clientErrorPolicy: params.clientErrorPolicy,
    });
  /** A second leg never chains Fal (its attempt index is taken by the first leg). */
  const submitKling = (
    plan: Extract<BailianDirectFallbackPlan, { kind: 'kling_direct_primary' }>,
    options: {
      fallbackFromAttemptId?: number;
      submitBailianFallback?: (klingAttemptId: number) => Promise<KlingDirectGenerateSubmissionResult>;
    },
  ) => submitKlingDirectGenerateTask({
      jobId: params.jobId,
      userId: params.userId,
      engineId: params.engineId,
      engineLabel: params.engineLabel,
      mode: params.mode,
      prompt: params.prompt,
      negativePrompt: typeof params.negativePrompt === 'string' ? params.negativePrompt : null,
      durationSec: params.durationSec,
      aspectRatio: params.aspectRatio,
      audioEnabled: params.audioEnabled,
      imageUrl: params.imageUrl,
      cfgScale: params.cfgScale,
      placeholderThumb: params.placeholderThumb,
      pricing: params.pricing,
      paymentStatus: params.paymentStatus,
      pendingReceipt: params.pendingReceipt,
      paymentMode: params.paymentMode,
      walletChargeReserved: params.walletChargeReserved,
      fallbackToFalEnabled: options.fallbackFromAttemptId ? false : plan.fallbackEnabled,
      fallbackOnCreditsDepletedEnabled: options.fallbackFromAttemptId ? false : plan.fallbackOnCreditsDepletedEnabled,
      elementRegistrationEnabled: plan.elementRegistrationEnabled,
      falPayload: params.falPayload,
      falInputSummary: params.falInputSummary,
      isLumaRay2: params.isLumaRay2,
      batchId: params.batchId,
      groupId: params.groupId,
      iterationIndex: params.iterationIndex,
      iterationCount: params.iterationCount,
      renderIds: params.renderIds,
      heroRenderId: params.heroRenderId,
      localKey: params.localKey,
      logMetricFn: params.logMetricFn,
      clientErrorPolicy: params.clientErrorPolicy,
      ...options,
    });
  /** Bailian as the second leg: never chains a further fallback. */
  const submitBailianFallback = (fromAttemptId: number) =>
    submitAlibaba({ fallbackToFalEnabled: false, fallbackFromAttemptId: fromAttemptId });
  /** The vendor's own route as the second leg after Bailian rejected the request before accepting a task. */
  const submitVendorFallback = async (plan: BailianDirectFallbackPlan, fromAttemptId: number) => plan.kind === 'llmhub_primary'
    ? toDirectSubmission(await submitLlmhub(plan.modelId, fromAttemptId))
    : submitKling(plan, { fallbackFromAttemptId: fromAttemptId });

  if (params.providerRoutingPlan.kind === 'llmhub_primary') {
    return submitLlmhub(
      params.providerRoutingPlan.modelId,
      undefined,
      params.providerRoutingPlan.bailianFallback
        ? async (attemptId) => fromDirectSubmission(await submitBailianFallback(attemptId))
        : undefined,
    );
  }
  if (params.providerRoutingPlan.kind === 'alibaba_model_studio_primary') {
    const plan = params.providerRoutingPlan;
    if (plan.bailianHosted) {
      const directFallback = plan.directFallback;
      return fromDirectSubmission(await submitAlibaba({
        fallbackToFalEnabled: false,
        submitDirectFallback: directFallback ? (attemptId) => submitVendorFallback(directFallback, attemptId) : undefined,
      }));
    }
    return fromDirectSubmission(await submitAlibaba({
      fallbackToFalEnabled: plan.fallbackEnabled,
      submitLlmhubFallback: fallbackModel
        ? async (directAttemptId) => toDirectSubmission(await submitLlmhub(fallbackModel, directAttemptId))
        : undefined,
    }));
  }

  if (params.providerRoutingPlan.kind === 'luma_agents_direct_primary') {
    const lumaSubmission = await submitLumaAgentsGenerateTask({
      lumaGenerationSource: params.lumaGenerationSource,
      jobId: params.jobId,
      userId: params.userId,
      engineId: params.engineId,
      engineLabel: params.engineLabel,
      mode: params.mode,
      prompt: params.prompt,
      negativePrompt: typeof params.negativePrompt === 'string' ? params.negativePrompt : null,
      durationSec: params.durationSec,
      aspectRatio: params.aspectRatio,
      audioEnabled: params.audioEnabled,
      effectiveResolution: params.effectiveResolution,
      imageUrl: params.imageUrl,
      placeholderThumb: params.placeholderThumb,
      pricing: params.pricing,
      paymentStatus: params.paymentStatus,
      pendingReceipt: params.pendingReceipt,
      paymentMode: params.paymentMode,
      walletChargeReserved: params.walletChargeReserved,
      fallbackToFalEnabled: params.providerRoutingPlan.fallbackEnabled,
      advancedDirectOnlyEnabled: params.providerRoutingPlan.advancedDirectOnlyEnabled,
      falPayload: params.falPayload,
      falInputSummary: params.falInputSummary,
      isLumaRay2: params.isLumaRay2,
      batchId: params.batchId,
      groupId: params.groupId,
      iterationIndex: params.iterationIndex,
      iterationCount: params.iterationCount,
      renderIds: params.renderIds,
      heroRenderId: params.heroRenderId,
      localKey: params.localKey,
      logMetricFn: params.logMetricFn,
      clientErrorPolicy: params.clientErrorPolicy,
    });
    if (!lumaSubmission.ok) {
      return { kind: 'error_response', status: lumaSubmission.status, body: lumaSubmission.body };
    }
    if (lumaSubmission.kind === 'accepted') {
      return { kind: 'accepted_response', body: lumaSubmission.body };
    }
    return { kind: 'generation_result', generationResult: lumaSubmission.generationResult };
  }

  if (params.providerRoutingPlan.kind === 'kling_direct_primary') {
    return fromDirectSubmission(await submitKling(params.providerRoutingPlan, {
      submitBailianFallback: params.providerRoutingPlan.bailianFallback ? submitBailianFallback : undefined,
    }));
  }

  if (params.providerRoutingPlan.kind === 'google_vertex_veo_primary') {
    const googleSubmission = await submitGoogleVertexVeoGenerateTask({
      jobId: params.jobId,
      userId: params.userId,
      engineId: params.engineId,
      engineLabel: params.engineLabel,
      mode: params.mode,
      prompt: params.prompt,
      negativePrompt: typeof params.negativePrompt === 'string' ? params.negativePrompt : null,
      durationSec: params.durationSec,
      aspectRatio: params.aspectRatio,
      audioEnabled: params.audioEnabled,
      effectiveResolution: params.effectiveResolution,
      placeholderThumb: params.placeholderThumb,
      pricing: params.pricing,
      paymentStatus: params.paymentStatus,
      pendingReceipt: params.pendingReceipt,
      paymentMode: params.paymentMode,
      walletChargeReserved: params.walletChargeReserved,
      fallbackToFalEnabled: false,
      submitLlmhubFallback: fallbackModel ? async (directAttemptId) => {
        const result = await submitLlmhub(fallbackModel, directAttemptId ?? undefined);
        return result.kind === 'accepted_response'
          ? { ok: true, kind: 'accepted' as const, body: result.body }
          : result.kind === 'error_response'
            ? { ok: false, status: result.status, body: result.body }
            : { ok: true, kind: 'fal_result' as const, generationResult: result.generationResult };
      } : undefined,
      falPayload: params.falPayload,
      falInputSummary: params.falInputSummary,
      isLumaRay2: params.isLumaRay2,
      batchId: params.batchId,
      groupId: params.groupId,
      iterationIndex: params.iterationIndex,
      iterationCount: params.iterationCount,
      renderIds: params.renderIds,
      heroRenderId: params.heroRenderId,
      localKey: params.localKey,
      logMetricFn: params.logMetricFn,
    });
    if (!googleSubmission.ok) {
      return { kind: 'error_response', status: googleSubmission.status, body: googleSubmission.body };
    }
    if (googleSubmission.kind === 'accepted') {
      return { kind: 'accepted_response', body: googleSubmission.body };
    }
    return { kind: 'generation_result', generationResult: googleSubmission.generationResult };
  }

  if (params.providerRoutingPlan.kind === 'google_vertex_omni_primary') {
    const googleSubmission = await submitGoogleVertexOmniGenerateTask({
      jobId: params.jobId,
      userId: params.userId,
      engineId: params.engineId,
      engineLabel: params.engineLabel,
      mode: params.mode,
      prompt: params.prompt,
      negativePrompt: typeof params.negativePrompt === 'string' ? params.negativePrompt : null,
      durationSec: params.durationSec,
      aspectRatio: params.aspectRatio,
      resolution: params.effectiveResolution ?? params.falPayload.resolution ?? '720p',
      audioEnabled: params.audioEnabled,
      placeholderThumb: params.placeholderThumb,
      pricing: params.pricing,
      paymentStatus: params.paymentStatus,
      pendingReceipt: params.pendingReceipt,
      paymentMode: params.paymentMode,
      walletChargeReserved: params.walletChargeReserved,
      falPayload: params.falPayload,
      batchId: params.batchId,
      groupId: params.groupId,
      iterationIndex: params.iterationIndex,
      iterationCount: params.iterationCount,
      renderIds: params.renderIds,
      heroRenderId: params.heroRenderId,
      localKey: params.localKey,
      logMetricFn: params.logMetricFn,
    });
    if (!googleSubmission.ok) {
      return { kind: 'error_response', status: googleSubmission.status, body: googleSubmission.body };
    }
    return { kind: 'accepted_response', body: googleSubmission.body };
  }

  const providerJobTracker = createProviderJobTracker({
    jobId: params.jobId,
    providerKey: params.providerKey,
    engineId: params.engineId,
    prompt: params.prompt,
    inputSummary: params.falInputSummary,
  });
  const falSubmission = await submitFalGenerateTask({
    userId: params.userId,
    falPayload: { ...params.falPayload, submissionMode: 'enqueue' },
    jobId: params.jobId,
    engineId: params.engineId,
    engineLabel: params.engineLabel,
    isLumaRay2: params.isLumaRay2,
    batchId: params.batchId,
    durationSec: params.durationSec,
    pendingReceipt: params.pendingReceipt,
    paymentMode: params.paymentMode,
    walletChargeReserved: params.walletChargeReserved,
    getLastProviderJobId: providerJobTracker.getLastProviderJobId,
    setLastProviderJobId: providerJobTracker.setLastProviderJobId,
    persistProviderJobId: providerJobTracker.persistProviderJobId,
    logMetricFn: params.logMetricFn,
    clientErrorPolicy: params.clientErrorPolicy,
  });
  if (!falSubmission.ok) {
    return { kind: 'error_response', status: falSubmission.status, body: falSubmission.body };
  }
  if (falSubmission.generationResult.providerJobId) {
    // The initial job and charge already exist. Do not overwrite a fast terminal webhook
    // with a queued finalization (including its media and refund state).
    return {
      kind: 'accepted_response',
      body: {
        ok: true,
        jobId: params.jobId,
        providerJobId: falSubmission.generationResult.providerJobId,
        status: 'queued',
      },
    };
  }
  return { kind: 'generation_result', generationResult: falSubmission.generationResult };
}
