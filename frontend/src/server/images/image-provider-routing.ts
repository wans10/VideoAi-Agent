import {
  executeImageProviderWithLumaAgentsDirectFallback,
  type ExecuteImageProviderWithOptionalLumaDirectParams,
} from './luma-agents-execution';
import { runLlmhubFlareGeneration } from './llmhub-flare-generation';
import { runLlmhubGeminiGeneration } from './llmhub-gemini-generation';
import { resolveLlmhubImageModel } from './llmhub-image-models';
import { isGoogleVertexImageConfigured } from './google-vertex-image-client';
import { resolveBytePlusSeedreamReadiness } from './byteplus-seedream-policy';
import { isBytePlusModelArkEnabled } from '@/server/video-providers/byteplus-modelark';
import { ENV } from '@/lib/env';
import { parseGoogleVertexServiceAccount } from '@/server/video-providers/google-vertex-auth';
import type { EngineCaps } from '@/types/engines';

const VERTEX_IMAGE_MODELS: Readonly<Record<string, string>> = {
  'nano-banana': 'gemini-2.5-flash-image',
  'nano-banana-lite': 'gemini-3.1-flash-lite-image',
  'nano-banana-2': 'gemini-3.1-flash-image',
  'nano-banana-pro': 'gemini-3-pro-image',
};

export type ImageProviderSelection =
  | { kind: 'direct'; engine: EngineCaps }
  | { kind: 'llmhub' }
  | { kind: 'other' };

export function resolveImageProviderSelection(
  engine: EngineCaps,
  env: NodeJS.ProcessEnv = process.env,
): ImageProviderSelection {
  const vertexModel = VERTEX_IMAGE_MODELS[engine.id];
  let vertexCredentialsValid = false;
  if (vertexModel && isGoogleVertexImageConfigured(env)) {
    try {
      parseGoogleVertexServiceAccount(env.GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON);
      vertexCredentialsValid = true;
    } catch {
      vertexCredentialsValid = false;
    }
  }
  if (vertexModel && vertexCredentialsValid) {
    return { kind: 'direct', engine: {
      ...engine, providerMeta: { ...engine.providerMeta, provider: 'google_vertex_image', modelSlug: vertexModel },
    } };
  }
  if (engine.id === 'seedream' && resolveBytePlusSeedreamReadiness(engine, {
    bytePlusEnabled: env === process.env ? isBytePlusModelArkEnabled()
      : ['1', 'true', 'yes', 'on'].includes((env.BYTEPLUS_ARK_ENABLED ?? '').toLowerCase()),
    bytePlusApiKey: env === process.env ? ENV.BYTEPLUS_ARK_API_KEY : env.BYTEPLUS_ARK_API_KEY,
  }).executable) {
    return { kind: 'direct', engine: {
      ...engine, providerMeta: { ...engine.providerMeta, provider: 'byteplus_modelark', modelSlug: 'seedream-5-0-260128' },
    } };
  }
  if (engine.providerMeta?.provider === 'google_vertex_image'
    || engine.providerMeta?.provider === 'alibaba_qwen_image'
    || engine.providerMeta?.provider === 'byteplus_modelark') {
    return { kind: 'direct', engine };
  }
  return resolveLlmhubImageModel(engine.id) ? { kind: 'llmhub' } : { kind: 'other' };
}

export async function executeConfiguredImageProvider(
  params: ExecuteImageProviderWithOptionalLumaDirectParams,
  selection: ImageProviderSelection,
) {
  const route = selection.kind === 'llmhub' ? resolveLlmhubImageModel(params.engine.id) : null;
  if (route?.protocol === 'openai-image') {
    return runLlmhubFlareGeneration({
      engineId: params.engine.id,
      effectivePrompt: params.effectivePrompt,
      numImages: params.numImages,
      mode: params.mode,
      combinedImageUrls: params.combinedImageUrls,
      providerImageSize: params.providerImageSize,
      outputFormat: params.outputFormat,
      quality: params.quality,
      background: params.background ?? null,
      aspectRatio: params.falAspectRatio,
      watermark: params.watermark,
      maskUrl: params.maskUrl,
      jobId: params.jobId,
      userId: params.userId,
      onProviderJobId: params.onProviderJobId,
    });
  }
  if (route?.protocol === 'gemini') return runLlmhubGeminiGeneration(params);
  return executeImageProviderWithLumaAgentsDirectFallback(params);
}
