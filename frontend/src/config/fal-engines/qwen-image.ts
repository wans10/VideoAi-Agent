import type { EngineCaps, Resolution } from '../../../types/engines';
import { QWEN_IMAGE_IDS, QWEN_IMAGE_RATIOS, calculateQwenImageCost } from '@/lib/image/qwen-image';
import type { RawFalEngineEntry } from './types';

export const QWEN_IMAGE_ENGINE_REGISTRY: RawFalEngineEntry[] = QWEN_IMAGE_IDS.map(id => {
  const modelId = id.replace('3-0', '3.0');
  const label = id === 'qwen-image-3-0-pro' ? 'Qwen Image 3.0 Pro' : 'Qwen Image 3.0';
  const resolutions: Resolution[] = ['1k', '2k'];
  const unit = calculateQwenImageCost({ engineId: id, resolution: '1k', mode: 't2i', outputCount: 1 });
  const unit2k = calculateQwenImageCost({ engineId: id, resolution: '2k', mode: 't2i', outputCount: 1 });
  const engine: EngineCaps = {
    id, label, provider: 'Alibaba', version: '3.0', status: 'live', latencyTier: 'standard',
    queueDepth: 0, region: 'cn-beijing', modes: ['t2i', 'i2i'], maxDurationSec: 1,
    resolutions, aspectRatios: [...QWEN_IMAGE_RATIOS], fps: [1], audio: false,
    upscale4k: false, extend: false, motionControls: false, keyframes: false, params: {},
    inputLimits: { imageMaxMB: 10 },
    inputSchema: {
      required: [{ id: 'prompt', type: 'text', label: 'Prompt' }],
      optional: [
        { id: 'num_images', type: 'number', label: 'Images', min: 1, max: 1, default: 1,
          description: 'One image per request in this integration.' },
        { id: 'resolution', type: 'enum', label: 'Resolution', values: resolutions, default: '1k' },
        { id: 'aspect_ratio', type: 'enum', label: 'Ratio', values: [...QWEN_IMAGE_RATIOS], default: '1:1' },
        { id: 'image_urls', type: 'image', label: 'Reference images', modes: ['i2i'],
          requiredInModes: ['i2i'], minCount: 1, maxCount: 3, source: 'either' },
        { id: 'output_format', type: 'enum', label: 'Output format', values: ['png'], default: 'png' },
        { id: 'seed', type: 'number', label: 'Seed', min: 0, max: 2147483647, step: 1 },
        { id: 'watermark', type: 'boolean', label: 'Watermark', default: false },
      ],
      constraints: { maxImageSizeMB: 10, supportedFormats: ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp', 'gif'] },
    },
    pricingDetails: { currency: 'USD', flatCents: { default: unit.outputUsdCents,
      byResolution: { '1k': unit.outputUsdCents, '2k': unit2k.outputUsdCents } } },
    pricing: { unit: 'image', base: unit.outputUsdCents / 100, currency: 'USD',
      notes: 'Beijing provider output rate converted at the application accounting rate; reference inputs are billed separately.' },
    providerMeta: { provider: 'alibaba_qwen_image', modelSlug: modelId },
    availability: 'available', brandId: 'alibaba', updatedAt: '2026-10-08T00:00:00Z', ttlSec: 600,
  };
  return {
    id, marketingName: label, cardTitle: label, provider: 'Alibaba', brandId: 'alibaba',
    versionLabel: id.endsWith('-pro') ? '3.0 Pro' : '3.0', availability: 'available', logoPolicy: 'textOnly', engine,
    modes: (['t2i', 'i2i'] as const).map(mode => ({ mode, falModelId: modelId,
      ui: { modes: [mode], resolution: [...resolutions], aspectRatio: [...QWEN_IMAGE_RATIOS],
        ...(mode === 'i2i' ? { acceptsImageFormats: ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp', 'gif'], maxUploadMB: 10 } : {}) } })),
    defaultFalModelId: modelId, type: 'image', prompts: [],
    seo: { title: label, description: `${label} image generation and editing.`, canonicalPath: `/models/${id}` },
  };
});
