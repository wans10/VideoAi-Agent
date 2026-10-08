import { normalizeMediaUrl } from '@/lib/media';
import { uploadImageToStorage } from '@/server/storage';
import { buildGoogleVertexImagePayload } from './google-vertex-image-payload';
import { extractGoogleVertexImages, parseGoogleVertexResponseId } from './google-vertex-image-response';
import { referenceFile } from './llmhub-flare-generation';
import { resolveLlmhubImageModel } from './llmhub-image-models';
import type { ExecuteImageProviderWithOptionalLumaDirectParams } from './luma-agents-execution';

const API_BASE = 'https://api.llmhub.com.cn/v1beta/models';
const MAX_INLINE_REFERENCE_BYTES = 7 * 1024 * 1024;
const MAX_TOTAL_REFERENCE_BYTES = 30 * 1024 * 1024;

function extension(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'png';
}

export async function runLlmhubGeminiGeneration(
  params: ExecuteImageProviderWithOptionalLumaDirectParams,
  deps: { fetch?: typeof fetch; apiKey?: string; upload?: typeof uploadImageToStorage } = {},
) {
  const route = resolveLlmhubImageModel(params.engine.id);
  if (route?.protocol !== 'gemini') throw new Error('Unsupported LLM Hub Gemini engine.');
  const apiKey = deps.apiKey ?? process.env.LLMHUB_API_KEY?.trim();
  if (!apiKey) throw new Error('LLM Hub API key is not configured.');
  const fetchFn = deps.fetch ?? fetch;
  const references: Array<{ mimeType: string; data: string }> = [];
  let referenceBytes = 0;
  for (const [index, url] of params.combinedImageUrls.entries()) {
    const file = await referenceFile(url, index, fetchFn);
    referenceBytes += file.size;
    if (file.size > MAX_INLINE_REFERENCE_BYTES || referenceBytes > MAX_TOTAL_REFERENCE_BYTES) {
      throw new Error('LLM Hub Gemini reference images exceed the inline upload limit.');
    }
    references.push({ mimeType: file.type, data: Buffer.from(await file.arrayBuffer()).toString('base64') });
  }
  if (params.mode === 'i2i' && !references.length) throw new Error('LLM Hub Gemini edit requires an image.');
  const payload = buildGoogleVertexImagePayload({
    prompt: params.effectivePrompt,
    referenceImages: references,
    aspectRatio: params.falAspectRatio,
    imageSize: params.requestedResolution,
    enableWebSearch: params.enableWebSearch,
  });
  const images: Array<{ url: string }> = [];
  let requestId: string | null = null;
  for (let index = 0; index < params.numImages; index += 1) {
    const response = await fetchFn(`${API_BASE}/${encodeURIComponent(route.modelId)}:generateContent`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `${params.jobId}-${index + 1}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(180_000),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(`LLM Hub Gemini request failed (${response.status}).`) as Error & { status: number };
      error.status = response.status;
      throw error;
    }
    requestId ??= parseGoogleVertexResponseId(body) ?? response.headers.get('x-request-id');
    const inlineImages = extractGoogleVertexImages(body);
    if (!inlineImages.length) throw new Error('LLM Hub Gemini did not return an image.');
    for (const [imageIndex, image] of inlineImages.entries()) {
      const stored = await (deps.upload ?? uploadImageToStorage)({
        data: image.data,
        mime: image.mimeType,
        userId: params.userId,
        prefix: 'renders/images',
        fileName: `${params.jobId}-${index + 1}-${imageIndex + 1}.${extension(image.mimeType)}`,
      });
      images.push({ url: normalizeMediaUrl(stored.url) ?? stored.url });
    }
  }
  if (requestId) params.onProviderJobId?.(requestId);
  return {
    result: { data: { images }, requestId },
    providerJobId: requestId,
    providerMode: 'LLMHUB',
  };
}
