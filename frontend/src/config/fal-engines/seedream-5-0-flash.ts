import type { EngineCaps } from '../../../types/engines';
import {
  SEEDREAM_ASPECT_RATIO_VALUES,
} from '../../../lib/image/seedream';
import { SEEDREAM_PRO_ENGINE } from './seedream';
import type { RawFalEngineEntry } from './types';

/**
 * Seedream 5.0 Flash (`doubao-seedream-5-0-flash-260915`, Volcengine Ark cn-beijing).
 * Doc: https://ark.volcengine.com/region:cn-beijing/docs/seedream-5-0-pro.md (pro / flash share sizes,
 * single-image output, up to 10 reference images). PROVISIONAL vendor cost: official list price
 * 0.12 CNY per successful image (https://ark.volcengine.com/region:cn-beijing/docs/model-pricing.md)
 * = 0.015 USD at the 8 CNY/USD customer rate; the cent-based provider basis rounds up to 2 cents,
 * like Lite's 0.035 USD list price was authored as 4 cents. The margin rule applies on top.
 */
const SEEDREAM_FLASH_ENGINE: EngineCaps = {
  ...SEEDREAM_PRO_ENGINE,
  id: 'seedream-5-0-flash',
  label: 'Seedream 5.0 Flash',
  version: '5.0 Flash',
  inputSchema: {
    required: [
      {
        id: 'prompt',
        type: 'text',
        label: 'Prompt',
        description: 'Describe the reference image, product still, character, or edit you want Seedream Flash to create.',
      },
    ],
    optional: [
      {
        id: 'num_images',
        type: 'number',
        label: 'Images',
        min: 1,
        max: 1,
        step: 1,
        default: 1,
        description: 'Seedream 5.0 Flash supports one generated image per request.',
      },
      {
        id: 'aspect_ratio',
        type: 'enum',
        label: 'Ratio',
        values: [...SEEDREAM_ASPECT_RATIO_VALUES],
        default: 'auto',
        description: 'Choose auto, or map the 2K output to a recommended width and height.',
      },
      {
        id: 'image_urls',
        type: 'image',
        label: 'Reference images',
        description: 'Add up to 10 source images for Seedream Flash edit and reference workflows.',
        modes: ['i2i'],
        requiredInModes: ['i2i'],
        minCount: 1,
        maxCount: 10,
        source: 'either',
      },
      {
        id: 'resolution',
        engineParam: 'size',
        type: 'enum',
        label: 'Image size',
        values: ['2K'],
        default: '2K',
        description: 'Seedream Flash generates 2K outputs.',
      },
      {
        id: 'output_format',
        engineParam: 'output_format',
        type: 'enum',
        label: 'Output format',
        values: ['jpeg', 'png'],
        default: 'jpeg',
        description: 'Choose the Seedream output file format.',
      },
    ],
    constraints: {
      supportedFormats: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'gif'],
      maxImageSizeMB: 10,
    },
  },
  pricingDetails: {
    currency: 'USD',
    perSecondCents: {
      default: 2,
      byResolution: {
        '2K': 2,
      },
    },
    flatCents: {
      default: 2,
      byResolution: {
        '2K': 2,
      },
    },
  },
  pricing: {
    unit: 'image',
    base: 0.015,
    byResolution: {
      '2K': 0.015,
    },
    currency: 'USD',
    notes:
      'Seedream 5.0 Flash is billed per successfully generated image (PROVISIONAL: official list price 0.12 CNY per image).',
  },
  updatedAt: '2026-11-11T00:00:00Z',
  providerMeta: {
    provider: 'byteplus_modelark',
    modelSlug: 'doubao-seedream-5-0-flash-260915',
  },
};

export const SEEDREAM_5_0_FLASH_FAL_ENGINE_REGISTRY: RawFalEngineEntry[] = [
  {
    id: 'seedream-5-0-flash',
    marketingName: 'Seedream 5.0 Flash',
    cardTitle: 'Seedream 5.0 Flash',
    provider: 'ByteDance',
    brandId: 'bytedance',
    versionLabel: '5.0 Flash',
    availability: 'available',
    logoPolicy: 'textOnly',
    billingNote: 'Seedream 5.0 Flash is priced per successfully generated image.',
    engine: SEEDREAM_FLASH_ENGINE,
    modes: [
      {
        mode: 't2i',
        falModelId: 'doubao-seedream-5-0-flash-260915',
        ui: {
          modes: ['t2i'],
          resolution: ['2K'],
          aspectRatio: [...SEEDREAM_ASPECT_RATIO_VALUES],
          notes: 'Generate fast, low-cost reference images, product stills and source frames before video animation.',
        },
      },
      {
        mode: 'i2i',
        falModelId: 'doubao-seedream-5-0-flash-260915',
        ui: {
          modes: ['i2i'],
          resolution: ['2K'],
          aspectRatio: [...SEEDREAM_ASPECT_RATIO_VALUES],
          acceptsImageFormats: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'gif'],
          maxUploadMB: 10,
          notes: 'Edit with up to 10 references for quick, controlled visual references.',
        },
      },
    ],
    defaultFalModelId: 'doubao-seedream-5-0-flash-260915',
    seo: {
      title: 'Seedream 5.0 Flash AI Image Generator | Keyvo',
      description:
        'Use Seedream 5.0 Flash in Keyvo for fast, low-cost ByteDance image generation and editing before animating with Seedance.',
      canonicalPath: '/models/seedream-5-0-flash',
    },
    type: 'image',
    seoText:
      'Seedream 5.0 Flash is the fast, lower-cost ByteDance Seedream 5.0 image model for reference images, product stills, character concepts and quick edits.',
    media: {
      videoUrl: '/assets/model-examples/seedream-5-0-pro/hero.webp',
      imagePath: '/assets/model-examples/seedream-5-0-pro/hero.webp',
      altText: 'Seedream 5.0 image generation example',
    },
    prompts: [
      {
        title: 'Seedance reference frame',
        prompt:
          'Create a clean cinematic reference image for a premium skincare bottle on pale stone, controlled daylight, centered hero framing, realistic product label, uncluttered background.',
        mode: 't2i',
        notes: 'Use this as a source frame before animating with Seedance.',
      },
      {
        title: 'Quick edit',
        prompt:
          'Keep the product shape and label from the reference, replace the background with a sunlit marble counter, soft shadows, clean commercial lighting.',
        mode: 'i2i',
      },
    ],
    faqs: [
      {
        question: 'How is Seedream 5.0 Flash different from Seedream 5.0 Pro?',
        answer:
          'Flash generates faster at a lower price. Use Pro when final image quality, dense layouts or complex edits matter most.',
      },
      {
        question: 'Does Seedream 5.0 Flash support batch output?',
        answer:
          'No. Seedream 5.0 Flash returns one image per request, matching the direct provider API.',
      },
    ],
    pricingHint: {
      currency: 'USD',
      amountCents: 2,
      resolution: '2K',
      label: 'Per 2K image',
    },
    promptExample:
      'Clean cinematic reference image of a luxury watch on black stone, precise product shape, readable dial, controlled rim light, uncluttered background for Seedance animation.',
  },
];
