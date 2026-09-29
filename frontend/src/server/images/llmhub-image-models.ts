import { ImageGenerationExecutionError } from './image-generation-error';

export const LLMHUB_OPENAI_IMAGE_MODELS = {
  'gpt-image-2': 'gpt-image-2',
  'gpt-image-2-5-flare': 'gpt-image-2.5-flare',
  'gpt-image-2-5-sunburst': 'gpt-image-2.5-sunburst',
  seedream: 'doubao-seedream-5.0-lite',
} as const;

export const LLMHUB_GEMINI_IMAGE_MODELS = {
  'nano-banana': 'gemini-2.5-flash-image',
  'nano-banana-lite': 'gemini-3.1-flash-lite-image',
  'nano-banana-2': 'gemini-3.1-flash-image',
  'nano-banana-pro': 'gemini-3-pro-image',
} as const;

export function resolveLlmhubImageModel(engineId: string):
  | { protocol: 'openai-image' | 'gemini'; modelId: string }
  | null {
  if (Object.hasOwn(LLMHUB_OPENAI_IMAGE_MODELS, engineId)) {
    return {
      protocol: 'openai-image',
      modelId: LLMHUB_OPENAI_IMAGE_MODELS[engineId as keyof typeof LLMHUB_OPENAI_IMAGE_MODELS],
    };
  }
  if (Object.hasOwn(LLMHUB_GEMINI_IMAGE_MODELS, engineId)) {
    return {
      protocol: 'gemini',
      modelId: LLMHUB_GEMINI_IMAGE_MODELS[engineId as keyof typeof LLMHUB_GEMINI_IMAGE_MODELS],
    };
  }
  return null;
}

export function assertLlmhubImageAvailable(engineId: string, apiKey = process.env.LLMHUB_API_KEY): void {
  if (!resolveLlmhubImageModel(engineId) || apiKey?.trim()) return;
  throw new ImageGenerationExecutionError('LLM Hub image generation is unavailable.', {
    code: 'llmhub_image_unavailable', status: 503, extras: { engineId },
  });
}
