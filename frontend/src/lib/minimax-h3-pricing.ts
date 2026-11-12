import { USD_TO_CNY_CUSTOMER_RATE } from './customer-currency';

export type MinimaxH3PricingInput = {
  durationSec: number;
  resolution: '480P' | '768P' | '2K' | '4K';
  referenceImageCount?: number;
  /** Verified total seconds of reference videos (multimodal reference mode). */
  inputVideoDurationSec?: number;
};

const RATE_PER_SECOND_USD: Record<MinimaxH3PricingInput['resolution'], number> = {
  '480P': 0.05,
  '768P': 0.06,
  '2K': 0.13,
  '4K': 0.16,
};

const INCLUDED_REFERENCE_IMAGES = 5;
const REFERENCE_IMAGE_SURCHARGE_USD = 0.08;

/**
 * PROVISIONAL (2026-11-11): MiniMax bills reference-video input per second at the output resolution's rate,
 * CNY 0.50 (768P) / 0.80 (2K), https://platform.minimaxi.com/docs/pricing/overview.md. Converted at the
 * accounting rate; the normal margin applies on top. Audio input is free.
 */
export const MINIMAX_H3_INPUT_VIDEO_CNY_PER_SECOND: Readonly<Record<string, number>> = { '768P': 0.5, '2K': 0.8 };
export const MINIMAX_H3_INPUT_VIDEO_PRICING_SOURCE = 'minimax_official_cny_pricing_2026_11_11_provisional';

function roundUsd(value: number): number {
  return Number(value.toFixed(2));
}

export function calculateMinimaxH3ProviderPrice(input: MinimaxH3PricingInput): {
  subtotalUsd: number;
  breakdown: {
    durationSec: number;
    resolution: string;
    ratePerSecondUsd: number;
    baseSubtotalUsd: number;
    referenceImageCount: number;
    includedReferenceImages: number;
    paidReferenceImages: number;
    referenceImageSurchargeUsd: number;
    /** Present only when reference videos are billed. */
    inputVideoSeconds?: number;
    inputVideoSurchargeUsd?: number;
  };
} {
  if (!Number.isInteger(input.durationSec) || input.durationSec < 4 || input.durationSec > 15) {
    throw new Error('MiniMax H3 duration must be an integer from 4 through 15 seconds.');
  }
  const ratePerSecondUsd = RATE_PER_SECOND_USD[input.resolution];
  if (typeof ratePerSecondUsd !== 'number') {
    throw new Error(`Unsupported MiniMax H3 resolution: ${input.resolution}`);
  }
  const referenceImageCount = Math.max(0, Math.floor(input.referenceImageCount ?? 0));
  const paidReferenceImages = Math.max(0, referenceImageCount - INCLUDED_REFERENCE_IMAGES);
  const baseSubtotalUsd = roundUsd(input.durationSec * ratePerSecondUsd);
  const referenceImageSurchargeUsd = roundUsd(paidReferenceImages * REFERENCE_IMAGE_SURCHARGE_USD);
  const rawVideoSeconds = input.inputVideoDurationSec ?? 0;
  if (!Number.isFinite(rawVideoSeconds) || rawVideoSeconds < 0 || rawVideoSeconds > 15.05) {
    throw new Error('MiniMax H3 reference videos must total at most 15 seconds.');
  }
  const inputVideoSeconds = Math.min(15, Math.ceil(rawVideoSeconds - 1e-6));
  let inputVideoSurchargeUsd = 0;
  if (inputVideoSeconds > 0) {
    const cnyPerSecond = MINIMAX_H3_INPUT_VIDEO_CNY_PER_SECOND[input.resolution];
    if (typeof cnyPerSecond !== 'number') throw new Error(`MiniMax H3 reference video is unavailable at ${input.resolution}.`);
    // Round up so the provisional cost never falls below MiniMax's own charge.
    inputVideoSurchargeUsd = Math.ceil(inputVideoSeconds * cnyPerSecond * 100 / USD_TO_CNY_CUSTOMER_RATE) / 100;
  }
  const subtotalUsd = roundUsd(baseSubtotalUsd + referenceImageSurchargeUsd + inputVideoSurchargeUsd);

  return {
    subtotalUsd,
    breakdown: {
      durationSec: input.durationSec,
      resolution: input.resolution,
      ratePerSecondUsd,
      baseSubtotalUsd,
      referenceImageCount,
      includedReferenceImages: INCLUDED_REFERENCE_IMAGES,
      paidReferenceImages,
      referenceImageSurchargeUsd,
      ...(inputVideoSeconds > 0 ? { inputVideoSeconds, inputVideoSurchargeUsd } : {}),
    },
  };
}
