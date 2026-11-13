import { USD_TO_CNY_CUSTOMER_RATE } from './customer-currency';

export type MinimaxH3PricingInput = {
  durationSec: number;
  resolution: '480P' | '768P' | '2K' | '4K';
  referenceImageCount?: number;
  /** Verified total seconds of reference videos (multimodal reference mode). */
  inputVideoDurationSec?: number;
};

/**
 * Official mainland list (Bailian, the primary route, https://docs.bailian.console.aliyun.com/zh/model-studio/minimax-h3.md;
 * MiniMax's own list https://platform.minimaxi.com/docs/pricing/overview.md is equal; checked 2026-11-13):
 * output 768P CNY 0.50/s, 2K 0.80/s; input (reference) video billed per second at the output resolution's rate;
 * images beyond 5 per task CNY 0.20 each; audio free. Recorded in USD at the fixed 8 CNY/USD rate. 480P/4K are no
 * longer offered (Keyvo 2026-11-11) and keep their former fal rates for historical evidence only.
 */
export const MINIMAX_H3_OUTPUT_CNY_PER_SECOND: Readonly<Record<string, number>> = { '768P': 0.5, '2K': 0.8 };
const RATE_PER_SECOND_USD: Record<MinimaxH3PricingInput['resolution'], number> = {
  '480P': 0.05,
  '768P': MINIMAX_H3_OUTPUT_CNY_PER_SECOND['768P']! / USD_TO_CNY_CUSTOMER_RATE,
  '2K': MINIMAX_H3_OUTPUT_CNY_PER_SECOND['2K']! / USD_TO_CNY_CUSTOMER_RATE,
  '4K': 0.16,
};

const INCLUDED_REFERENCE_IMAGES = 5;
export const MINIMAX_H3_EXTRA_IMAGE_CNY = 0.2;
const REFERENCE_IMAGE_SURCHARGE_USD = MINIMAX_H3_EXTRA_IMAGE_CNY / USD_TO_CNY_CUSTOMER_RATE;

/** Reference-video seconds are billed at the output resolution's per-second list rate. */
export const MINIMAX_H3_INPUT_VIDEO_CNY_PER_SECOND: Readonly<Record<string, number>> = MINIMAX_H3_OUTPUT_CNY_PER_SECOND;
export const MINIMAX_H3_PRICING_SOURCE = 'bailian_cn_beijing_minimax_h3_list_2026_11_13';
export const MINIMAX_H3_INPUT_VIDEO_PRICING_SOURCE = MINIMAX_H3_PRICING_SOURCE;

/** Exact supplier amounts (no cent rounding): the canonical kernel owns customer rounding. */
function roundUsd(value: number): number {
  return Number(value.toFixed(6));
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
    // Started seconds are billed (conservative: the docs bill by input-video duration without a rounding rule).
    inputVideoSurchargeUsd = roundUsd(inputVideoSeconds * cnyPerSecond / USD_TO_CNY_CUSTOMER_RATE);
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
