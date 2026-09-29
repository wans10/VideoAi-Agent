import { createSignedDownloadUrl, extractStorageKeyFromUrl, isAllowedAssetHost, isStorageConfigured } from '@/server/storage';
import type { GptImage2ImageSize } from '@/lib/image/gptImage2';
import type { ImageGenerationMode } from '@/types/image-generation';
import { ImageGenerationExecutionError } from './image-generation-error';
import { resolveSeedreamProviderSize } from '@/lib/image/seedream';
import { resolveLlmhubImageModel, assertLlmhubImageAvailable } from './llmhub-image-models';

export const LLMHUB_FLARE_ENGINE_ID = 'gpt-image-2-5-flare';
export const LLMHUB_FLARE_MODEL_ID = 'gpt-image-2.5-flare';
const API_BASE = 'https://api.llmhub.com.cn/v1/images';
const MAX_REFERENCE_BYTES = 25 * 1024 * 1024;
const REFERENCE_TIMEOUT_MS = 30_000;
const GENERATION_TIMEOUT_MS = 180_000;

const PRESET_SIZES: Record<string, string> = {
  landscape_4_3: '1024x768',
  portrait_4_3: '768x1024',
  square: '1024x1024',
  square_hd: '1024x1024',
  portrait_16_9: '1024x1536',
  landscape_16_9: '1920x1080',
};

export function isLlmhubFlareEngine(engineId: string): boolean {
  return engineId === LLMHUB_FLARE_ENGINE_ID;
}

export function assertLlmhubFlareAvailable(
  engineId: string,
  apiKey: string | undefined = process.env.LLMHUB_API_KEY,
): void {
  if (isLlmhubFlareEngine(engineId) && !apiKey?.trim()) {
    throw new ImageGenerationExecutionError('LLM Hub image generation is unavailable.', {
      code: 'llmhub_image_unavailable',
      status: 503,
      extras: { engineId },
    });
  }
}

export { assertLlmhubImageAvailable };

function imageSize(value: string | GptImage2ImageSize | null): string | null {
  if (!value || value === 'auto') return null;
  if (typeof value === 'string') return PRESET_SIZES[value] ?? value;
  return `${value.width}x${value.height}`;
}

export async function referenceFile(url: string, index: number, fetchFn: typeof fetch): Promise<File> {
  if (!isAllowedAssetHost(url)) throw new Error('LLM Hub reference image host is not allowed.');
  const key = extractStorageKeyFromUrl(url);
  const source = key && isStorageConfigured()
    ? await createSignedDownloadUrl(key, { expiresInSeconds: 60 * 60 })
    : url;
  const response = await fetchFn(source, { signal: AbortSignal.timeout(REFERENCE_TIMEOUT_MS), redirect: 'error' });
  if (!response.ok) throw new Error(`LLM Hub reference image fetch failed (${response.status}).`);
  const declaredLength = Number(response.headers.get('content-length'));
  if (declaredLength > MAX_REFERENCE_BYTES) throw new Error('LLM Hub reference image is too large.');
  const mime = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime)) {
    throw new Error('LLM Hub reference image format is unsupported.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('LLM Hub reference image is empty.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    length += next.value.byteLength;
    if (length > MAX_REFERENCE_BYTES) {
      await reader.cancel();
      throw new Error('LLM Hub reference image is too large.');
    }
    chunks.push(next.value);
  }
  if (!length) throw new Error('LLM Hub reference image is empty.');
  const bytes = new Uint8Array(new ArrayBuffer(length));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
  return new File([bytes], `reference-${index + 1}.${extension}`, { type: mime });
}

export async function runLlmhubFlareGeneration(params: {
  engineId?: string;
  effectivePrompt: string;
  numImages: number;
  mode: ImageGenerationMode;
  combinedImageUrls: string[];
  providerImageSize: string | GptImage2ImageSize | null;
  outputFormat: string | null;
  quality: string | null;
  background: string | null;
  aspectRatio?: string | null;
  watermark?: boolean;
  maskUrl: string | null;
  jobId: string;
  onProviderJobId?: (id: string) => void;
}, deps: { fetch?: typeof fetch; apiKey?: string } = {}): Promise<{
  result: { data: { images: Array<{ url: string }>; description?: string }; requestId: string | null };
  providerJobId: string | null;
  providerMode: string;
}> {
  const apiKey = deps.apiKey ?? process.env.LLMHUB_API_KEY?.trim();
  if (!apiKey) throw new Error('LLM Hub API key is not configured.');
  const engineId = params.engineId ?? LLMHUB_FLARE_ENGINE_ID;
  const route = resolveLlmhubImageModel(engineId);
  if (!route || route.protocol !== 'openai-image') throw new Error('Unsupported LLM Hub image engine.');
  const fetchFn = deps.fetch ?? fetch;
  const size = imageSize(params.providerImageSize);
  const isGptImage = engineId.startsWith('gpt-image-');
  const seedreamSize = engineId === 'seedream' && size
    ? resolveSeedreamProviderSize(size, params.aspectRatio) : null;
  const common = {
    model: route.modelId,
    prompt: params.effectivePrompt,
    n: params.numImages,
    ...((isGptImage ? size : seedreamSize) ? { size: isGptImage ? size : seedreamSize } : {}),
    ...(isGptImage && params.quality ? { quality: params.quality } : {}),
    ...(isGptImage && params.background ? { background: params.background } : {}),
    ...(params.outputFormat ? { output_format: params.outputFormat } : {}),
    ...(engineId === 'seedream' ? { watermark: params.watermark === true } : {}),
    response_format: 'url',
  };
  let body: BodyInit;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Idempotency-Key': params.jobId,
  };
  if (params.mode === 'i2i') {
    if (!params.combinedImageUrls.length) throw new Error('LLM Hub edit requires an image.');
    const form = new FormData();
    for (const [key, value] of Object.entries(common)) form.set(key, String(value));
    for (const [index, url] of params.combinedImageUrls.entries()) {
      form.append('image', await referenceFile(url, index, fetchFn));
    }
    if (params.maskUrl && isGptImage) form.set('mask', await referenceFile(params.maskUrl, params.combinedImageUrls.length, fetchFn));
    body = form;
  } else {
    body = JSON.stringify(common);
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetchFn(`${API_BASE}/${params.mode === 'i2i' ? 'edits' : 'generations'}`, {
    method: 'POST', headers, body, signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(`LLM Hub image request failed (${response.status}).`) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  const images = Array.isArray(payload?.data)
    ? payload.data.filter((item: unknown): item is { url: string } =>
      Boolean(item && typeof item === 'object' && typeof (item as { url?: unknown }).url === 'string'
        && /^https?:\/\//i.test((item as { url: string }).url)))
    : [];
  if (!images.length) throw new Error('LLM Hub did not return image URLs.');
  const requestId = response.headers.get('x-request-id') ?? null;
  if (requestId) params.onProviderJobId?.(requestId);
  return {
    result: { data: { images }, requestId },
    providerJobId: requestId,
    providerMode: 'LLMHUB',
  };
}
