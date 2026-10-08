import { resolveQwenImageSize } from '@/lib/image/qwen-image';
import { normalizeAlibabaBaseUrl } from '@/server/video-providers/alibaba-model-studio/client';
import { ImageGenerationExecutionError } from './image-generation-error';
import type { GeneratedImage } from '@/types/image-generation';

export class QwenImageError extends Error {
  constructor(message: string, public readonly status: number, public readonly detail: unknown = null,
    public readonly definitiveRejection = false) {
    super(message); this.name = 'QwenImageError';
  }
}

export function getQwenImageConfig(env: NodeJS.ProcessEnv = process.env) {
  const apiKey = env.ALIBABA_MODEL_STUDIO_API_KEY?.trim();
  if (!apiKey || !env.ALIBABA_MODEL_STUDIO_BASE_URL?.trim()) {
    throw new ImageGenerationExecutionError('Alibaba Qwen image credentials and base URL are required.', {
      code: 'alibaba_qwen_image_unavailable', status: 503,
    });
  }
  const baseUrl = normalizeAlibabaBaseUrl(env.ALIBABA_MODEL_STUDIO_BASE_URL);
  const host = new URL(baseUrl).hostname;
  if ((host !== 'dashscope.aliyuncs.com' && !/^[a-z0-9-]+\.cn-beijing\.maas\.aliyuncs\.com$/i.test(host))
    || (env.ALIBABA_MODEL_STUDIO_REGION && env.ALIBABA_MODEL_STUDIO_REGION.trim() !== 'cn-beijing')) {
    throw new ImageGenerationExecutionError('Qwen image pricing currently requires a Beijing endpoint and region.', {
      code: 'alibaba_qwen_image_region_mismatch', status: 503,
    });
  }
  return { apiKey, baseUrl };
}

export function buildQwenImagePayload(input: {
  modelId: string; prompt: string; mode: 't2i' | 'i2i'; imageUrls: string[];
  resolution: string; aspectRatio: string | null; numImages: number; seed: number | null; watermark: boolean;
}) {
  if (!['qwen-image-3.0', 'qwen-image-3.0-pro'].includes(input.modelId)) throw new QwenImageError('Invalid Qwen image model.', 400);
  if (!input.prompt.trim()) throw new QwenImageError('Prompt is required.', 400);
  if (input.numImages !== 1) throw new QwenImageError('Qwen currently supports one output per request.', 400);
  if (input.mode === 'i2i' && (input.imageUrls.length < 1 || input.imageUrls.length > 3)) {
    throw new QwenImageError('Qwen image editing requires 1–3 reference images.', 400);
  }
  if (input.seed !== null && (!Number.isInteger(input.seed) || input.seed < 0 || input.seed > 2147483647)) {
    throw new QwenImageError('Qwen image seed is out of range.', 400);
  }
  return {
    model: input.modelId,
    input: { messages: [{ role: 'user', content: [
      ...(input.mode === 'i2i' ? input.imageUrls.map(image => ({ image })) : []),
      { text: input.prompt },
    ] }] },
    parameters: { n: 1, size: resolveQwenImageSize(input.resolution, input.aspectRatio).size,
      watermark: input.watermark, prompt_extend: true, prompt_extend_mode: 'direct',
      ...(input.seed === null ? {} : { seed: input.seed }) },
  };
}

type QwenResponse = {
  request_id?: string; code?: string; message?: string;
  output?: { choices?: { message?: { content?: { image?: string }[] } }[] };
  usage?: { output_width?: number; output_height?: number };
};

export function assertQwenImageRequest(input: Parameters<typeof buildQwenImagePayload>[0]) {
  try {
    buildQwenImagePayload(input);
  } catch (error) {
    if (error instanceof QwenImageError) {
      throw new ImageGenerationExecutionError(error.message, {
        mode: input.mode, code: 'qwen_image_input_invalid', status: error.status, detail: error.detail,
      });
    }
    throw error;
  }
}

export function extractQwenImageResult(body: QwenResponse): { requestId: string | null; images: GeneratedImage[] } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new QwenImageError('Invalid Qwen image response.', 502, body);
  if (body.request_id !== undefined && (typeof body.request_id !== 'string' || !body.request_id.trim()
    || body.request_id.length > 256 || /[\s\x00-\x1f\x7f]/.test(body.request_id))) {
    throw new QwenImageError('Invalid Qwen request identity.', 502, body);
  }
  if (body.code) throw new QwenImageError(body.message || 'Qwen image request failed.', 502, body);
  if (!Array.isArray(body.output?.choices)) throw new QwenImageError('Qwen did not return the requested image.', 502, body);
  for (const dimension of [body.usage?.output_width, body.usage?.output_height]) {
    if (dimension !== undefined && (!Number.isSafeInteger(dimension) || dimension <= 0)) {
      throw new QwenImageError('Invalid Qwen output dimensions.', 502, body);
    }
  }
  const images: GeneratedImage[] = [];
  for (const choice of body.output?.choices ?? []) {
    if (!choice || !Array.isArray(choice.message?.content)) throw new QwenImageError('Invalid Qwen image response.', 502, body);
    for (const item of choice.message?.content ?? []) {
      if (!item || typeof item !== 'object') throw new QwenImageError('Invalid Qwen image response.', 502, body);
      if (!item.image) continue;
      let url: URL;
      try { url = new URL(item.image); } catch { throw new QwenImageError('Invalid Qwen output URL.', 502, body); }
      if (url.protocol !== 'https:' || url.username || url.password) throw new QwenImageError('Invalid Qwen output URL.', 502, body);
      images.push({ url: item.image, mimeType: 'image/png', width: body.usage?.output_width, height: body.usage?.output_height });
    }
  }
  if (images.length !== 1) throw new QwenImageError('Qwen did not return the requested image.', 502, body);
  return { requestId: body.request_id ?? null, images };
}

export async function callQwenImage(config: ReturnType<typeof getQwenImageConfig>,
  payload: ReturnType<typeof buildQwenImagePayload>, fetchFn: typeof fetch = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 600_000);
  timer.unref?.();
  try {
    const response = await fetchFn(`${config.baseUrl}/api/v1/services/aigc/multimodal-generation/generation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify(payload), signal: controller.signal,
    });
    let body: QwenResponse;
    try { body = await response.json(); } catch { throw new QwenImageError('Invalid Qwen image response.', 502); }
    if (!body || typeof body !== 'object') throw new QwenImageError('Invalid Qwen image response.', 502);
    if (!response.ok) throw new QwenImageError(body.message || `Qwen image request failed (${response.status}).`, response.status, body,
      [400,401,403,404,422,429].includes(response.status) && typeof body.code === 'string' && Boolean(body.code.trim()));
    return extractQwenImageResult(body);
  } finally { clearTimeout(timer); }
}
