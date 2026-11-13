import type { AspectRatio, EngineAvailability, EnginePricingDetails, Resolution, TokenVideoPricingDimensions } from '../../../types/engines';

type TokenVideoPricingDimensionsByResolution = Partial<Record<Resolution, Partial<Record<AspectRatio, TokenVideoPricingDimensions>>>>;

// single confirmation pass when Fal publishes the final stable IDs.
export const SEEDANCE_2_ENDPOINTS = {
  standard: {
    t2v: 'bytedance/seedance-2.0/text-to-video',
    i2v: 'bytedance/seedance-2.0/image-to-video',
    ref2v: 'bytedance/seedance-2.0/reference-to-video',
    v2v: 'byteplus/dreamina-seedance-2.0/video-to-video',
    extend: 'byteplus/dreamina-seedance-2.0/extend',
  },
  fast: {
    t2v: 'bytedance/seedance-2.0/fast/text-to-video',
    i2v: 'bytedance/seedance-2.0/fast/image-to-video',
    ref2v: 'bytedance/seedance-2.0/fast/reference-to-video',
    v2v: 'byteplus/dreamina-seedance-2.0-fast/video-to-video',
    extend: 'byteplus/dreamina-seedance-2.0-fast/extend',
  },
} as const;

export const BYTEPLUS_SEEDANCE_2_FAST_MODEL_ID = 'doubao-seedance-2-0-fast-260128';
export const BYTEPLUS_SEEDANCE_2_FAST_CAPS_ID = 'byteplus/dreamina-seedance-2.0-fast/text-to-video';
export const BYTEPLUS_SEEDANCE_2_MINI_MODEL_ID = 'doubao-seedance-2-0-mini-260615';
export const BYTEPLUS_SEEDANCE_2_MINI_ENDPOINTS = {
  t2v: 'byteplus/dreamina-seedance-2.0-mini/text-to-video',
  i2v: 'byteplus/dreamina-seedance-2.0-mini/image-to-video',
  ref2v: 'byteplus/dreamina-seedance-2.0-mini/reference-to-video',
  v2v: 'byteplus/dreamina-seedance-2.0-mini/video-to-video',
  extend: 'byteplus/dreamina-seedance-2.0-mini/extend',
} as const;
export const BYTEPLUS_SEEDANCE_2_5_MODEL_ID = 'doubao-seedance-2-5-260628';
export const BYTEPLUS_SEEDANCE_2_5_ENDPOINTS = {
  t2v: 'byteplus/dreamina-seedance-2.5/text-to-video',
  i2v: 'byteplus/dreamina-seedance-2.5/image-to-video',
  ref2v: 'byteplus/dreamina-seedance-2.5/reference-to-video',
  v2v: 'byteplus/dreamina-seedance-2.5/video-to-video',
  extend: 'byteplus/dreamina-seedance-2.5/extend',
} as const;

export const HAPPY_HORSE_ENDPOINTS = {
  t2v: 'alibaba/happy-horse/text-to-video',
  i2v: 'alibaba/happy-horse/image-to-video',
  ref2v: 'alibaba/happy-horse/reference-to-video',
  v2v: 'alibaba/happy-horse/video-edit',
} as const;

export const HAPPY_HORSE_1_1_ENDPOINTS = {
  t2v: 'alibaba/happy-horse/v1.1/text-to-video',
  i2v: 'alibaba/happy-horse/v1.1/image-to-video',
  ref2v: 'alibaba/happy-horse/v1.1/reference-to-video',
} as const;

export const HAPPY_HORSE_DURATION_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;
export const HAPPY_HORSE_ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4'] as const;
export const HAPPY_HORSE_1_1_ASPECT_RATIOS = [
  '16:9',
  '9:16',
  '1:1',
  '4:3',
  '3:4',
  '21:9',
  '9:21',
  '5:4',
  '4:5',
] as const;

export const SEEDANCE_2_TOKEN_DIMENSIONS = {
  '480p': {
    auto: { width: 854, height: 480 },
    '21:9': { width: 1120, height: 480 },
    '16:9': { width: 854, height: 480 },
    '4:3': { width: 640, height: 480 },
    '1:1': { width: 480, height: 480 },
    '3:4': { width: 480, height: 640 },
    '9:16': { width: 480, height: 854 },
  },
  '720p': {
    auto: { width: 1280, height: 720 },
    '21:9': { width: 1680, height: 720 },
    '16:9': { width: 1280, height: 720 },
    '4:3': { width: 960, height: 720 },
    '1:1': { width: 720, height: 720 },
    '3:4': { width: 720, height: 960 },
    '9:16': { width: 720, height: 1280 },
  },
  '1080p': {
    auto: { width: 1920, height: 1080 },
    '21:9': { width: 2520, height: 1080 },
    '16:9': { width: 1920, height: 1080 },
    '4:3': { width: 1440, height: 1080 },
    '1:1': { width: 1080, height: 1080 },
    '3:4': { width: 1080, height: 1440 },
    '9:16': { width: 1080, height: 1920 },
  },
  '4k': {
    auto: { width: 3840, height: 2160 },
    '21:9': { width: 4398, height: 1886 },
    '16:9': { width: 3840, height: 2160 },
    '4:3': { width: 3326, height: 2494 },
    '1:1': { width: 2880, height: 2880 },
    '3:4': { width: 2494, height: 3326 },
    '9:16': { width: 2160, height: 3840 },
  },
} as const;

export const SEEDANCE_2_MINI_TOKEN_DIMENSIONS = {
  '480p': SEEDANCE_2_TOKEN_DIMENSIONS['480p'],
  '720p': SEEDANCE_2_TOKEN_DIMENSIONS['720p'],
} as const;
export const SEEDANCE_2_5_TOKEN_DIMENSIONS = {
  '480p': {
    '21:9': SEEDANCE_2_TOKEN_DIMENSIONS['480p']['21:9'],
    '16:9': SEEDANCE_2_TOKEN_DIMENSIONS['480p']['16:9'],
    '4:3': SEEDANCE_2_TOKEN_DIMENSIONS['480p']['4:3'],
    '1:1': SEEDANCE_2_TOKEN_DIMENSIONS['480p']['1:1'],
    '3:4': SEEDANCE_2_TOKEN_DIMENSIONS['480p']['3:4'],
    '9:16': SEEDANCE_2_TOKEN_DIMENSIONS['480p']['9:16'],
  },
  '720p': {
    '21:9': SEEDANCE_2_TOKEN_DIMENSIONS['720p']['21:9'],
    '16:9': SEEDANCE_2_TOKEN_DIMENSIONS['720p']['16:9'],
    '4:3': SEEDANCE_2_TOKEN_DIMENSIONS['720p']['4:3'],
    '1:1': SEEDANCE_2_TOKEN_DIMENSIONS['720p']['1:1'],
    '3:4': SEEDANCE_2_TOKEN_DIMENSIONS['720p']['3:4'],
    '9:16': SEEDANCE_2_TOKEN_DIMENSIONS['720p']['9:16'],
  },
  '1080p': {
    '21:9': SEEDANCE_2_TOKEN_DIMENSIONS['1080p']['21:9'],
    '16:9': SEEDANCE_2_TOKEN_DIMENSIONS['1080p']['16:9'],
    '4:3': SEEDANCE_2_TOKEN_DIMENSIONS['1080p']['4:3'],
    '1:1': SEEDANCE_2_TOKEN_DIMENSIONS['1080p']['1:1'],
    '3:4': SEEDANCE_2_TOKEN_DIMENSIONS['1080p']['3:4'],
    '9:16': SEEDANCE_2_TOKEN_DIMENSIONS['1080p']['9:16'],
  },
} as const;

const SEEDANCE_2_PUBLIC_MARKUP_MULTIPLIER = 2.5;
const SEEDANCE_2_DEFAULT_PRICING_MARGIN_FACTOR = 1.3;

function normalizeSeedance2PublicUnitPrice(byteplusNoVideoUnitPriceUsdPer1kTokens: number): number {
  // Pricing snapshots apply the default 30% MaxVideoAI margin after token pricing.
  // These rates make the visible member quote equal BytePlus no-video list price * 2.5.
  return byteplusNoVideoUnitPriceUsdPer1kTokens * SEEDANCE_2_PUBLIC_MARKUP_MULTIPLIER / SEEDANCE_2_DEFAULT_PRICING_MARGIN_FACTOR;
}

export const SEEDANCE_2_NORMALIZED_UNIT_PRICE_USD_PER_1K_TOKENS = {
  standard: normalizeSeedance2PublicUnitPrice(0.007),
  standard1080p: normalizeSeedance2PublicUnitPrice(0.0077),
  standard4k: normalizeSeedance2PublicUnitPrice(0.004),
  fast: normalizeSeedance2PublicUnitPrice(0.0056),
  mini: normalizeSeedance2PublicUnitPrice(0.0035),
  seedance25NoVideo: normalizeSeedance2PublicUnitPrice(0.0107),
  seedance25Video: normalizeSeedance2PublicUnitPrice(0.0064),
} as const;

type Seedance2PricingDetailsOptions = Pick<
  NonNullable<EnginePricingDetails['tokenPricing']>,
  'unitPriceUsdPer1kTokensByResolution' | 'unitPriceUsdPer1kTokensByResolutionAndInputType'
>;

export function buildSeedance2PricingDetails(
  unitPriceUsdPer1kTokens: number,
  options?: Partial<Seedance2PricingDetailsOptions>
): EnginePricingDetails {
  return {
    currency: 'USD',
    tokenPricing: {
      model: 'byteplus_tokens',
      unitPriceUsdPer1kTokens,
      unitPriceUsdPer1kTokensByResolution: options?.unitPriceUsdPer1kTokensByResolution,
      unitPriceUsdPer1kTokensByResolutionAndInputType:
        options?.unitPriceUsdPer1kTokensByResolutionAndInputType,
      framesPerSecond: 24,
      defaultAspectRatio: '16:9',
      dimensions: SEEDANCE_2_TOKEN_DIMENSIONS,
      rounding: 'ceil_cent',
    },
  };
}

/**
 * Volcengine Ark cn-beijing list prices in CNY per million tokens, "输入不含视频" / "输入包含视频"
 * (https://ark.volcengine.com/region:cn-beijing/docs/model-pricing.md, checked 2026-11-13). These are the true
 * supplier facts of Keyvo's Seedance engines; Keyvo sells at 80% of them (official-list-pricing.ts). The minimum-token
 * rule for requests with video input is published only as an external table and is NOT modelled.
 */
export const SEEDANCE_ARK_LIST_CNY_PER_MILLION_TOKENS = {
  standard: {
    '480p': { no_video_input: 46, video_input: 28 },
    '720p': { no_video_input: 46, video_input: 28 },
    '1080p': { no_video_input: 51, video_input: 31 },
    '4k': { no_video_input: 26, video_input: 16 },
  },
  fast: {
    '480p': { no_video_input: 37, video_input: 22 },
    '720p': { no_video_input: 37, video_input: 22 },
  },
  mini: {
    '480p': { no_video_input: 23, video_input: 14 },
    '720p': { no_video_input: 23, video_input: 14 },
  },
  seedance25: {
    '480p': { no_video_input: 70, video_input: 42 },
    '720p': { no_video_input: 70, video_input: 42 },
    '1080p': { no_video_input: 77, video_input: 46 },
  },
} as const;
export const SEEDANCE_ARK_LIST_PRICING_SOURCE = 'volcengine_ark_cn_beijing_list_2026_11_13';
const ARK_CNY_PER_USD = 8;

type SeedanceArkListTier = keyof typeof SEEDANCE_ARK_LIST_CNY_PER_MILLION_TOKENS;

/** CNY per million tokens -> USD per 1,000 tokens at the fixed 8 CNY/USD accounting rate. */
function arkCnyPerMillionToUsdPer1k(cny: number): number {
  return cny / ARK_CNY_PER_USD / 1000;
}

export function buildSeedanceArkListPricingDetails(
  tier: SeedanceArkListTier,
  dimensions: TokenVideoPricingDimensionsByResolution = SEEDANCE_2_TOKEN_DIMENSIONS,
): EnginePricingDetails {
  const table = SEEDANCE_ARK_LIST_CNY_PER_MILLION_TOKENS[tier] as Readonly<Record<string, { no_video_input: number; video_input: number }>>;
  const byResolution: Partial<Record<Resolution, number>> = {};
  const byResolutionAndInputType: Partial<Record<Resolution, Partial<Record<'no_video_input' | 'video_input', number>>>> = {};
  for (const [resolution, rates] of Object.entries(table)) {
    byResolution[resolution as Resolution] = arkCnyPerMillionToUsdPer1k(rates.no_video_input);
    byResolutionAndInputType[resolution as Resolution] = {
      no_video_input: arkCnyPerMillionToUsdPer1k(rates.no_video_input),
      video_input: arkCnyPerMillionToUsdPer1k(rates.video_input),
    };
  }
  const reference = table['720p']!;
  return {
    currency: 'USD',
    tokenPricing: {
      model: 'byteplus_tokens',
      unitPriceUsdPer1kTokens: arkCnyPerMillionToUsdPer1k(reference.no_video_input),
      unitPriceUsdPer1kTokensByInputType: {
        no_video_input: arkCnyPerMillionToUsdPer1k(reference.no_video_input),
        video_input: arkCnyPerMillionToUsdPer1k(reference.video_input),
      },
      unitPriceUsdPer1kTokensByResolution: byResolution,
      unitPriceUsdPer1kTokensByResolutionAndInputType: byResolutionAndInputType,
      pricingSource: SEEDANCE_ARK_LIST_PRICING_SOURCE,
      inputVideoTokenBasis: 'input_plus_output',
      framesPerSecond: 24,
      defaultAspectRatio: '16:9',
      dimensions,
      rounding: 'ceil_cent',
    },
  };
}

export function buildSeedance2MiniPricingDetails(): EnginePricingDetails {
  return buildSeedanceArkListPricingDetails('mini', SEEDANCE_2_MINI_TOKEN_DIMENSIONS);
}

export function buildSeedance25PricingDetails(): EnginePricingDetails {
  return buildSeedanceArkListPricingDetails('seedance25', SEEDANCE_2_5_TOKEN_DIMENSIONS);
}

export const SEEDANCE_2_LAUNCH_CONFIG = {
  availability: 'available' as EngineAvailability,
} as const;
