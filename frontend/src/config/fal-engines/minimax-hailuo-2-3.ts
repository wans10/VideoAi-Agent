import type { EngineCaps } from '../../../types/engines';
import { calculateMinimaxHailuoCost } from '../../lib/minimax-hailuo-pricing';
import type { RawFalEngineEntry } from './types';

/**
 * MiniMax Hailuo 2.3 and 2.3 Fast run only on MiniMax's own legacy video API (`/v1/video_generation`,
 * MINIMAX_OFFICIAL_ENABLED); there is no fal endpoint, so `falModelId` carries the MiniMax model name.
 * Limits: https://platform.minimaxi.com/docs/api-reference/video-generation-t2v.md and -i2v.md (checked 2026-11-11):
 * 768P for 6 or 10 s, 1080P for 6 s; Hailuo 2.3 Fast is image-to-video only; prompt up to 2000 characters;
 * start image JPG/PNG/WebP under 20 MB, short side above 300 px, ratio between 2:5 and 5:2.
 */
type HailuoVariant = {
  id: 'minimax-hailuo-2-3' | 'minimax-hailuo-2-3-fast';
  model: 'MiniMax-Hailuo-2.3' | 'MiniMax-Hailuo-2.3-Fast';
  label: string;
  versionLabel: string;
  modes: Array<'t2v' | 'i2v'>;
};

const VARIANTS: readonly HailuoVariant[] = [
  { id: 'minimax-hailuo-2-3', model: 'MiniMax-Hailuo-2.3', label: 'MiniMax Hailuo 2.3', versionLabel: '2.3', modes: ['t2v', 'i2v'] },
  { id: 'minimax-hailuo-2-3-fast', model: 'MiniMax-Hailuo-2.3-Fast', label: 'MiniMax Hailuo 2.3 Fast', versionLabel: '2.3 Fast', modes: ['i2v'] },
];

const RESOLUTIONS = ['768P', '1080P'];
const DURATIONS = [6, 10];
const IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];

function buildEngine(variant: HailuoVariant): EngineCaps {
  // Display rates only: billing uses the per-video CNY list in minimax-hailuo-pricing.ts.
  const rate = (resolution: string) => {
    const mode = variant.modes[0]!;
    const cost = calculateMinimaxHailuoCost({ engineId: variant.id, mode, resolution, durationSec: 6 });
    return Number((cost.subtotalUsdCents / 6).toFixed(4));
  };
  return {
    id: variant.id,
    label: variant.label,
    provider: 'MiniMax',
    version: variant.versionLabel,
    status: 'live',
    latencyTier: 'standard',
    queueDepth: 0,
    region: 'cn',
    modes: [...variant.modes],
    maxDurationSec: 10,
    resolutions: [...RESOLUTIONS],
    aspectRatios: variant.modes.includes('t2v') ? ['16:9'] : ['auto'],
    fps: [25],
    audio: false,
    upscale4k: false,
    extend: false,
    motionControls: false,
    keyframes: false,
    params: {},
    inputLimits: { imageMaxMB: 20, promptMaxChars: 2000, promptMaxCharsSource: 'official' },
    inputSchema: {
      required: [
        { id: 'prompt', type: 'text', label: 'Prompt', modes: [...variant.modes], requiredInModes: [...variant.modes] },
        {
          id: 'image_url',
          type: 'image',
          label: 'Start image',
          modes: ['i2v'],
          requiredInModes: ['i2v'],
          minCount: 1,
          maxCount: 1,
          maxSizeMB: 20,
          imageAspectRatio: { min: 0.4, max: 2.5 },
          acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          acceptedFileExtensions: [...IMAGE_FORMATS],
          source: 'either',
        },
      ],
      optional: [
        {
          id: 'duration',
          type: 'enum',
          label: 'Duration',
          values: DURATIONS.map(String),
          default: '6',
          min: 6,
          max: 10,
          description: '1080P renders last 6 seconds.',
        },
        { id: 'resolution', type: 'enum', label: 'Resolution', values: [...RESOLUTIONS], default: '768P' },
        { id: 'prompt_optimizer', type: 'enum', label: 'Prompt optimiser', values: ['on', 'off'], default: 'on' },
      ],
      constraints: {
        minImageSidePx: 301,
        maxImageSizeMB: 20,
        supportedFormats: [...IMAGE_FORMATS],
        ownedAssetModes: ['i2v'],
      },
    },
    pricingDetails: {
      currency: 'USD',
      perSecondCents: { default: rate('768P'), byResolution: { '768P': rate('768P'), '1080P': rate('1080P') } },
    },
    pricing: {
      unit: 'USD/s',
      base: rate('768P') / 100,
      currency: 'USD',
      notes: 'MiniMax per-video CNY list price converted at the application accounting rate (provisional).',
    },
    updatedAt: '2026-11-11T00:00:00Z',
    ttlSec: 600,
    providerMeta: { provider: 'minimax', modelSlug: variant.model },
    availability: 'available',
    brandId: 'minimax',
  };
}

export const MINIMAX_HAILUO_2_3_FAL_ENGINE_REGISTRY: RawFalEngineEntry[] = VARIANTS.map((variant) => {
  const engine = buildEngine(variant);
  return {
    id: variant.id,
    marketingName: variant.label,
    cardTitle: variant.label,
    provider: 'MiniMax',
    brandId: 'minimax',
    versionLabel: variant.versionLabel,
    availability: 'available',
    logoPolicy: 'textOnly',
    billingNote: 'Priced per clip by resolution and duration; 1080P renders last 6 seconds.',
    engine,
    modes: variant.modes.map((mode) => ({
      mode,
      falModelId: variant.model,
      ui: {
        modes: [mode],
        duration: { options: [...DURATIONS], default: 6 },
        resolution: [...RESOLUTIONS],
        ...(mode === 't2v' ? { aspectRatio: ['16:9'] } : { acceptsImageFormats: [...IMAGE_FORMATS], maxUploadMB: 20 }),
        fps: 25,
        audioToggle: false,
        notes: mode === 't2v'
          ? 'Silent 16:9 clip; camera moves can be written as [推进], [左摇] and similar commands in the prompt.'
          : 'Animates the start image; framing follows the image. Silent output.',
      },
    })),
    defaultFalModelId: variant.model,
    type: variant.modes.includes('t2v') ? 'Text + Image · Silent' : 'Image · Silent',
    seo: {
      title: variant.label,
      description: `${variant.label} video generation on MiniMax's own API.`,
      canonicalPath: `/models/${variant.id}`,
    },
    prompts: [],
  };
});
