import { query } from '@/lib/db';
import { normalizeMediaUrl } from '@/lib/media';
import type { BillingProductKey, JobSurface } from '@/types/billing';
import type { EngineCaps, PricingSnapshot } from '@/types/engines';
import type { ImageGenerationMode, ImageGenerationResponse } from '@/types/image-generation';
import { createSignedDownloadUrl, extractStorageKeyFromUrl, isStorageConfigured } from '@/server/storage';
import { createImageThumbnailBatch } from '@/server/image-thumbnails';
import { getQwenImageConfig, buildQwenImagePayload, callQwenImage, QwenImageError } from './alibaba-qwen-image-client';
import { persistCompletedImageGeneration } from './image-generation-completion';
import { persistFailedImageGeneration } from './image-generation-failure';
import type { PendingReceipt } from './image-generation-receipts';
import { ImageGenerationExecutionError } from './image-generation-error';
import { copyGeneratedImagesToStorage } from './image-output-storage';

async function signReferenceUrls(urls: string[]): Promise<string[]> {
  return Promise.all(urls.map(async url => {
    const key = extractStorageKeyFromUrl(url);
    return key && isStorageConfigured()
      ? createSignedDownloadUrl(key, { expiresInSeconds: 3600 }) : url;
  }));
}

export async function executeAlibabaQwenImageGeneration(params: {
  onPreAcceptanceFailure?: () => Promise<ImageGenerationResponse>;
  billingProductKey: BillingProductKey | null;
  characterReferenceCount: number;
  combinedImageUrls: string[];
  costBreakdownJson: string | null;
  effectivePrompt: string;
  engine: EngineCaps;
  engineEntry: {
    id: string;
    marketingName: string;
  };
  indexable: boolean;
  jobId: string;
  jobSurface: JobSurface;
  limitGenerations: boolean;
  maskUrl: string | null;
  mode: ImageGenerationMode;
  normalizedSeed: number | null;
  numImages: number;
  outputFormat: string | null;
  pendingReceipt: PendingReceipt;
  priceOnlyReceipts: boolean;
  pricing: PricingSnapshot;
  pricingSnapshotJson: string;
  quality: string | null;
  refundDescription: string;
  resolvedAspectRatio: string | null;
  resolution: string;
  thinkingLevel: string | null;
  userId: string;
  vendorAccountId: string | null;
  visibility: 'public' | 'private';
  watermark: boolean;
}, deps: {
  getConfig?: typeof getQwenImageConfig;
  callProvider?: typeof callQwenImage;
  signReferences?: typeof signReferenceUrls;
  copyOutputs?: typeof copyGeneratedImagesToStorage;
  createThumbnails?: typeof createImageThumbnailBatch;
  complete?: typeof persistCompletedImageGeneration;
  fail?: typeof persistFailedImageGeneration;
  queryFn?: typeof query;
} = {}): Promise<ImageGenerationResponse> {
  const modelId = params.engine.providerMeta?.modelSlug ?? params.engine.id;
  let providerJobId: string | null = null;
  let providerAttempted = false;

  try {
    const config = (deps.getConfig ?? getQwenImageConfig)();
    const referenceUrls = params.mode === 'i2i' ? await (deps.signReferences ?? signReferenceUrls)(params.combinedImageUrls) : [];
    const payload = buildQwenImagePayload({
      modelId, prompt: params.effectivePrompt, mode: params.mode, imageUrls: referenceUrls,
      numImages: params.numImages, resolution: params.resolution, aspectRatio: params.resolvedAspectRatio,
      seed: params.normalizedSeed, watermark: params.watermark,
    });
    providerAttempted = true;
    const result = await (deps.callProvider ?? callQwenImage)(config, payload);
    providerJobId = result.requestId;
    await (deps.queryFn ?? query)(`UPDATE app_jobs SET provider_job_id=COALESCE($3,provider_job_id),updated_at=NOW() WHERE job_id=$1 AND user_id=$2`,[params.jobId,params.userId,providerJobId]);
    const images = result.images;

    const normalizedImages = images.map((image) => ({
      ...image,
      url: normalizeMediaUrl(image.url) ?? image.url,
    }));
    const storedImages = await (deps.copyOutputs ?? copyGeneratedImagesToStorage)({
      images: normalizedImages,
      jobId: params.jobId,
      userId: params.userId,
      requireOwnedOutput: true,
    });
    const thumbUrls = await (deps.createThumbnails ?? createImageThumbnailBatch)({
      jobId: params.jobId,
      userId: params.userId,
      imageUrls: storedImages.map((image) => image.url),
    });
    const normalizedImagesWithThumbs = storedImages.map((image, index) => ({
      ...image,
      thumbUrl: thumbUrls[index] ?? null,
    }));

    const { heroThumb } = await (deps.complete ?? persistCompletedImageGeneration)({
      billingProductKey: params.billingProductKey,
      characterReferenceCount: params.characterReferenceCount,
      costBreakdownJson: params.costBreakdownJson,
      description: null,
      enableWebSearch: false,
      engineId: params.engine.id,
      engineLabel: params.engine.label,
      images: normalizedImagesWithThumbs,
      indexable: params.indexable,
      jobId: params.jobId,
      jobSurface: params.jobSurface,
      limitGenerations: params.limitGenerations,
      maskUrl: params.maskUrl,
      mode: params.mode,
      normalizedSeed: params.normalizedSeed,
      numImages: params.numImages,
      outputFormat: params.outputFormat,
      pricing: params.pricing,
      pricingSnapshotJson: params.pricingSnapshotJson,
      providerJobId,
      providerMode: 'alibaba_qwen_image_direct',
      quality: params.quality,
      resolvedAspectRatio: params.resolvedAspectRatio,
      resolution: params.resolution,
      thinkingLevel: params.thinkingLevel,
      userId: params.userId,
      vendorAccountId: params.vendorAccountId,
      visibility: params.visibility,
    });
    return {
      ok: true,
      jobId: params.jobId,
      mode: params.mode,
      images: normalizedImagesWithThumbs,
      description: null,
      requestId: providerJobId ?? undefined,
      providerJobId: providerJobId ?? undefined,
      engineId: params.engineEntry.id,
      engineLabel: params.engineEntry.marketingName,
      durationMs: undefined,
      pricing: params.pricing,
      paymentStatus: 'paid_wallet',
      thumbUrl: heroThumb,
      aspectRatio: params.resolvedAspectRatio,
      resolution: params.resolution,
    } satisfies ImageGenerationResponse;
  } catch (error) {
    console.error('[images] Alibaba Qwen image generation failed', error);
    if (!providerJobId && error instanceof QwenImageError && error.detail && typeof error.detail==='object') {
      const requestId=(error.detail as {request_id?:unknown}).request_id;
      if(typeof requestId==='string')providerJobId=requestId;
    }
    const definitiveRejection=error instanceof QwenImageError && [400,401,403,404,422,429].includes(error.status);
    if(providerAttempted && (providerJobId || !definitiveRejection)) {
      await (deps.queryFn ?? query)(`UPDATE app_jobs SET status='pending',message=$3,provider_job_id=COALESCE($4,provider_job_id),updated_at=NOW() WHERE job_id=$1 AND user_id=$2 AND status<>'completed'`,
        [params.jobId,params.userId,'Qwen outcome requires reconciliation. Do not submit another paid request.',providerJobId]);
      throw new ImageGenerationExecutionError('The provider outcome requires reconciliation. Check your generation history before trying again.', {
        mode:params.mode,code:'qwen_outcome_unknown',status:503,
        extras:{jobId:params.jobId,paymentStatus:'paid_wallet',...(providerJobId?{providerJobId}:{})},
      });
    }
    const { message, providerBody, providerStatus } = await (deps.fail ?? persistFailedImageGeneration)({
      characterReferenceCount: params.characterReferenceCount,
      enableWebSearch: false,
      engineId: params.engine.id,
      error,
      falModelId: modelId,
      jobId: params.jobId,
      limitGenerations: params.limitGenerations,
      maskUrl: params.maskUrl,
      mode: params.mode,
      normalizedSeed: params.normalizedSeed,
      numImages: params.numImages,
      outputFormat: params.outputFormat,
      pendingReceipt: params.pendingReceipt,
      priceOnlyReceipts: params.priceOnlyReceipts,
      pricing: params.pricing,
      providerJobId,
      providerMode: 'alibaba_qwen_image_direct',
      quality: params.quality,
      referenceImageUrls: params.combinedImageUrls,
      refundDescription: params.refundDescription,
      resolvedAspectRatio: params.resolvedAspectRatio,
      resolution: params.resolution,
      thinkingLevel: params.thinkingLevel,
    });

    throw new ImageGenerationExecutionError(message, {
      mode: params.mode,
      code: 'alibaba_qwen_image_error',
      status: error instanceof QwenImageError ? error.status : 502,
      detail: { providerStatus, providerBody },
      extras: {
        engineId: params.engineEntry.id,
        engineLabel: params.engineEntry.marketingName,
        jobId: params.jobId,
        paymentStatus: 'refunded_wallet',
      },
    });
  }
}
