import { buildH3OperationCaps } from '../../../lib/h3-source-operations';
import type { AspectRatio, EngineCaps } from '../../../types/engines';
import type { RawFalEngineEntry } from './types';

export const MINIMAX_H3_MAX_ID = 'minimax-h3-max' as const;

export const MINIMAX_H3_MAX_ENDPOINTS = {
  t2v: 'minimax/h3-max/text-to-video',
  i2v: 'minimax/h3-max/image-to-video',
  ref2v: 'minimax/h3-max/reference-to-video',
} as const;

export const MINIMAX_H3_MAX_MODES = ['t2v', 'i2v', 'ref2v'] as const;
export const MINIMAX_H3_MAX_DURATION_OPTIONS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;
// Keyvo runs H3-Max on MiniMax's own V2 API: 480P or 768P only (Fal's 1080P refinement does not exist there).
export const MINIMAX_H3_MAX_RESOLUTIONS = ['480P', '768P'] as const;
export const MINIMAX_H3_MAX_TEXT_ASPECT_RATIOS = [
  '21:9',
  '16:9',
  '4:3',
  '1:1',
  '3:4',
  '9:16',
] as const satisfies readonly AspectRatio[];
export const MINIMAX_H3_MAX_PROMPT_EXPANSION_MODES = ['disabled', 'balanced', 'quality'] as const;

// Supported upload formats. MiniMax's V2 API limits (images 30 MB, video 50 MB, audio 15 MB) mirror MiniMax-H3.
const IMAGE_UPLOAD = { acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'], acceptedFileExtensions: ['jpg', 'jpeg', 'png', 'webp'] };
const AUDIO_UPLOAD = { acceptedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'], acceptedFileExtensions: ['mp3', 'wav'] };

const COMMON_MODES = [...MINIMAX_H3_MAX_MODES];

const inputSchema: NonNullable<EngineCaps['inputSchema']> = {
  required: [
    {
      id: 'prompt',
      type: 'text',
      label: 'Prompt',
      description: 'Describe the characters, action, setting, camera, dialogue, and sound.',
      modes: COMMON_MODES,
      requiredInModes: COMMON_MODES,
    },
  ],
  optional: [
    // Keyvo (MiniMax V2 API): no middle frame or reference order, and frames cannot be combined with references.
    {
      id: 'image_url',
      type: 'image',
      ...IMAGE_UPLOAD,
      label: 'Start image',
      description: 'First frame; supply a start image, an end image, or both.',
      modes: ['i2v'],
      minCount: 0,
      maxCount: 1,
      source: 'either',
    },
    {
      id: 'end_image_url',
      type: 'image',
      ...IMAGE_UPLOAD,
      label: 'End image',
      description: 'Final frame; may be supplied alone or with a start image.',
      modes: ['i2v'],
      minCount: 0,
      maxCount: 1,
      source: 'either',
    },
    {
      id: 'reference_image_urls',
      type: 'image',
      ...IMAGE_UPLOAD,
      label: 'Reference images',
      imageAspectRatio: { min: 0.4, max: 2.5 },
      modes: ['ref2v'],
      minCount: 0,
      maxCount: 9,
      source: 'either',
    },
    {
      id: 'reference_video_urls',
      type: 'video',
      acceptedMimeTypes: ['video/mp4', 'video/quicktime'],
      acceptedFileExtensions: ['mp4', 'mov'],
      label: 'Reference videos',
      description: 'Each clip must be 2–15 seconds, with at most 15 seconds combined.',
      modes: ['ref2v'],
      minCount: 0,
      maxCount: 3,
      minDurationSec: 2,
      maxDurationSec: 15,
      source: 'either',
    },
    {
      id: 'reference_audio_urls',
      type: 'audio',
      ...AUDIO_UPLOAD,
      label: 'Reference audio',
      description: 'Each clip must be 2–15 seconds, with at most 15 seconds combined. Audio may be used alone or with visual references.',
      modes: ['ref2v'],
      minCount: 0,
      maxCount: 3,
      minDurationSec: 2,
      maxDurationSec: 15,
      source: 'either',
    },
    // No soundtrack or seed: MiniMax's V2 API has no equivalent (Fal-only controls).
    {
      id: 'duration',
      type: 'enum',
      label: 'Duration (seconds)',
      modes: COMMON_MODES,
      values: MINIMAX_H3_MAX_DURATION_OPTIONS.map(String),
      default: '5',
      min: 5,
      max: 15,
    },
    {
      id: 'resolution',
      type: 'enum',
      label: 'Resolution',
      modes: COMMON_MODES,
      values: [...MINIMAX_H3_MAX_RESOLUTIONS],
      default: '768P',
    },
    {
      id: 'aspect_ratio',
      type: 'enum',
      label: 'Aspect ratio',
      modes: ['t2v'],
      values: [...MINIMAX_H3_MAX_TEXT_ASPECT_RATIOS],
      default: '16:9',
    },
    {
      id: 'aspect_ratio', type: 'enum', label: 'Aspect ratio', modes: ['ref2v'],
      values: [...MINIMAX_H3_MAX_TEXT_ASPECT_RATIOS, 'auto'], default: 'auto',
    },
    {
      id: 'prompt_expansion_mode',
      type: 'enum',
      label: 'Prompt expansion',
      modes: COMMON_MODES,
      values: [...MINIMAX_H3_MAX_PROMPT_EXPANSION_MODES],
      default: 'balanced',
    },
  ],
  referenceBudget: {
    fieldIds: ['reference_image_urls', 'reference_video_urls', 'reference_audio_urls'],
    modes: ['ref2v'],
    maxTotal: 12,
    countUniqueUrls: true,
  },
  constraints: {
    // MiniMax V2 media limits (video-generation-v2-create.md), enforced before billing like MiniMax-H3.
    minImageSidePx: 256,
    maxImageSizeMB: 30,
    maxVideoSizeMB: 50,
    maxAudioSizeMB: 15,
    maxCombinedVideoDurationSec: 15,
    maxCombinedAudioDurationSec: 15,
    ownedAssetModes: COMMON_MODES,
    combinedDurationModes: ['ref2v'],
    atLeastOneReferenceField: ['image_url', 'end_image_url', 'reference_image_urls', 'reference_video_urls', 'reference_audio_urls'],
    referenceAudioRequiresVisual: false,
  },
};

const modeCaps: NonNullable<EngineCaps['modeCaps']> = {
  t2v: {
    modes: ['t2v'],
    duration: { options: [...MINIMAX_H3_MAX_DURATION_OPTIONS], default: 5 },
    resolution: [...MINIMAX_H3_MAX_RESOLUTIONS],
    aspectRatio: [...MINIMAX_H3_MAX_TEXT_ASPECT_RATIOS],
    audioToggle: false,
    notes: 'Text-to-video with automatic native audio and balanced prompt expansion by default.',
  },
  i2v: {
    modes: ['i2v'],
    duration: { options: [...MINIMAX_H3_MAX_DURATION_OPTIONS], default: 5 },
    resolution: [...MINIMAX_H3_MAX_RESOLUTIONS],
    audioToggle: false,
    notes: 'Animate a start image, end image, or both, with native audio.',
  },
  ref2v: {
    modes: ['ref2v'],
    aspectRatio: [...MINIMAX_H3_MAX_TEXT_ASPECT_RATIOS, 'auto'],
    duration: { options: [...MINIMAX_H3_MAX_DURATION_OPTIONS], default: 5 },
    resolution: [...MINIMAX_H3_MAX_RESOLUTIONS],
    audioToggle: false,
    notes: 'Combine image, video, and audio references, including audio-only references.',
  },
};

export const MINIMAX_H3_MAX_ENGINE: EngineCaps = {
  id: MINIMAX_H3_MAX_ID,
  label: 'MiniMax H3 Max',
  provider: 'MiniMax',
  version: 'H3 Max',
  status: 'early_access',
  latencyTier: 'fast',
  queueDepth: 0,
  region: 'global',
  modes: [...MINIMAX_H3_MAX_MODES, 'v2v'],
  maxDurationSec: 15,
  resolutions: [...MINIMAX_H3_MAX_RESOLUTIONS],
  aspectRatios: [...MINIMAX_H3_MAX_TEXT_ASPECT_RATIOS, 'auto'],
  fps: [24],
  audio: true,
  upscale4k: false,
  extend: false,
  motionControls: false,
  keyframes: false,
  params: {},
  inputLimits: {
    videoMaxDurationSec: 15,
    promptMaxChars: 7_000,
    promptMaxCharsSource: 'official',
  },
  inputSchema,
  // PROVISIONAL MiniMax official CNY list price (pricing/overview.md, 2026-11-12) at the accounting rate of CNY 8 per
  // USD: output 480P 0.33, 768P 0.50 CNY/s. Reference video seconds (0.37 / 0.97 CNY/s) and images beyond two
  // (0.50 CNY each) are added from verified media in src/lib/minimax-h3-max-pricing.ts.
  pricingDetails: {
    currency: 'USD',
    perSecondCents: {
      default: 6.25,
      byResolution: { '480P': 4.125, '768P': 6.25 },
    },
    byMode: {
      ref2v: { perSecondCents: { default: 6.25, byResolution: { '480P': 4.125, '768P': 6.25 } } },
    },
    maxDurationSec: 15,
  },
  pricing: {
    unit: 'USD/s',
    base: 0.0625,
    byResolution: { '480P': 0.04125, '768P': 0.0625 },
    currency: 'USD',
    notes: 'MiniMax official output rates are CNY 0.33/s at 480P and CNY 0.50/s at 768P. Reference generation adds reference-video seconds (CNY 0.37/s at 480P, CNY 0.97/s at 768P) and CNY 0.50 per image beyond two, measured from verified media.',
  },
  updatedAt: '2026-11-12T00:00:00Z',
  ttlSec: 600,
  providerMeta: {
    provider: 'minimax',
    modelSlug: MINIMAX_H3_MAX_ENDPOINTS.t2v,
    clientErrorPolicy: 'opaque',
  },
  availability: 'limited',
  brandId: 'minimax',
  brandAssetPolicy: {
    logoAllowed: false,
    textOnly: true,
    usageNotes: 'Use text-only MiniMax attribution until approved H3 Max brand assets are present.',
  },
  modeCaps,
};

// Recast/Relight are Fal endpoints (minimax/h3-max/recast|relight). MiniMax's own API has no equivalent, so on Keyvo
// they route to Fal only and are not executable, offered in the workspace or sold (video-operation-tariff-inventory.ts).
// The upstream operation contracts stay defined here.
MINIMAX_H3_MAX_ENGINE.operationCaps = buildH3OperationCaps();
const recastSchema = MINIMAX_H3_MAX_ENGINE.operationCaps['h3-recast']!.inputSchema;
MINIMAX_H3_MAX_ENGINE.inputSchema = { ...inputSchema,
  required: [...(inputSchema.required ?? []), ...(recastSchema.required ?? [])],
  optional: [...(inputSchema.optional ?? []), ...(recastSchema.optional ?? [])],
  constraints: {...inputSchema.constraints, ownedAssetModes:[...MINIMAX_H3_MAX_MODES,'v2v']},
};
MINIMAX_H3_MAX_ENGINE.modeCaps = { ...modeCaps, v2v: { modes: ['v2v'], durationPolicy: 'source_video', resolution: ['768P','1080P'], audioToggle: false, notes: 'Choose Recast or Relight; these are specialized source operations.' } };

export const MINIMAX_H3_MAX_FAL_ENGINE_REGISTRY: RawFalEngineEntry[] = [{
  id: MINIMAX_H3_MAX_ID,
  marketingName: 'MiniMax H3 Max',
  cardTitle: 'MiniMax H3 Max',
  provider: 'MiniMax',
  brandId: 'minimax',
  versionLabel: 'H3 Max',
  availability: 'limited',
  logoPolicy: 'textOnly',
  billingNote: 'Review your fixed quote before generation, based on the selected mode, duration, resolution, and references.',
  engine: MINIMAX_H3_MAX_ENGINE,
  modes: [...MINIMAX_H3_MAX_MODES.map((mode) => ({
    mode,
    falModelId: MINIMAX_H3_MAX_ENDPOINTS[mode],
    ui: modeCaps[mode]!,
  })), { mode: 'v2v', falModelId: 'minimax/h3-max/recast', ui: MINIMAX_H3_MAX_ENGINE.modeCaps.v2v! }],
  defaultFalModelId: MINIMAX_H3_MAX_ENDPOINTS.t2v,
  seo: {
    title: 'MiniMax H3 Max – 768P Video, References and Audio',
    description: 'Create 5–15-second MiniMax H3 Max videos from text, frames or mixed references at 480P or 768P, with native audio.',
    canonicalPath: '/models/minimax-h3-max',
  },
  type: 'Text + Image + References · Native audio',
  seoText: 'Create MiniMax H3 Max video from text, opening or ending frames, or image, video and audio references, with native audio.',
  demoUrl: 'https://media.maxvideoai.com/renders/301cc489-d689-477f-94c4-0b051deda0bc/1b29e9b2-c68d-46a3-8415-7677deed674a.mp4',
  media: {
    videoUrl: 'https://media.maxvideoai.com/renders/301cc489-d689-477f-94c4-0b051deda0bc/1b29e9b2-c68d-46a3-8415-7677deed674a.mp4',
    imagePath: 'https://media.maxvideoai.com/renders/301cc489-d689-477f-94c4-0b051deda0bc/89562475-e134-4d26-9735-478a6fed48ec.jpg',
    altText: 'MiniMax H3 Max high-definition AI video render with native audio',
  },
  prompts: [],
}];
