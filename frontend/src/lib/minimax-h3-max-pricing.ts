import type { MinimaxH3MaxMode, MinimaxH3MaxResolution } from '@/lib/minimax-h3-max';
import { USD_TO_CNY_CUSTOMER_RATE } from './customer-currency';

/**
 * PROVISIONAL vendor cost of MiniMax-H3-Max on MiniMax's own V2 API (Keyvo's route), from the official CNY list price
 * (https://platform.minimaxi.com/docs/pricing/overview.md, "MiniMax-H3-Max（扩展模型）", checked 2026-11-12):
 * output 480P 0.33 / 768P 0.50 CNY per second; input (reference) video 480P 0.37 / 768P 0.97 CNY per second;
 * two images free per task, then 0.50 CNY per image; audio input free. Every task type has the same price.
 * Converted to the application's USD pricing facts at the accounting rate; the normal margin applies on top.
 * Input-video seconds are rounded up to whole seconds (MiniMax's own rounding is not documented) so the provisional
 * cost never falls below MiniMax's charge. The Fal reference-token functions below stay for the upstream catalogue.
 */
export const MINIMAX_H3_MAX_OFFICIAL_PRICING_SOURCE = 'minimax_official_cny_pricing_2026_11_12_provisional';
export const MINIMAX_H3_MAX_OFFICIAL_CNY = {
  outputPerSecond: { '480P': 0.33, '768P': 0.5 },
  inputVideoPerSecond: { '480P': 0.37, '768P': 0.97 },
  freeImages: 2,
  perImage: 0.5,
} as const;

export type MinimaxH3MaxOfficialCost = {
  mode: MinimaxH3MaxMode;
  durationSec: number;
  resolution: '480P' | '768P';
  outputCny: number;
  inputVideoSeconds: number;
  inputVideoCny: number;
  imageCount: number;
  paidImageCount: number;
  imageCny: number;
  totalCny: number;
  accountingCnyPerUsd: number;
  /** USD cents, exact (not rounded). */
  outputUsdCents: number;
  inputVideoUsdCents: number;
  imageUsdCents: number;
  subtotalUsdCents: number;
  ratePerSecondUsd: number;
  source: string;
};

function preciseCny(value: number): number {
  return Number(value.toFixed(6));
}

export function calculateMinimaxH3MaxOfficialCost(input: {
  mode: string;
  durationSec: number;
  resolution: string | null | undefined;
  /** Verified total seconds of reference videos (reference mode only). */
  inputVideoDurationSec?: number;
  /** Reference images (reference mode only; first/last frames never exceed the two free images). */
  referenceImageCount?: number;
}): MinimaxH3MaxOfficialCost {
  const mode = input.mode as MinimaxH3MaxMode;
  if (mode !== 't2v' && mode !== 'i2v' && mode !== 'ref2v') throw new Error(`Unsupported MiniMax H3 Max mode: ${String(input.mode)}`);
  if (!Number.isInteger(input.durationSec) || input.durationSec < 5 || input.durationSec > 15) {
    throw new Error('MiniMax H3 Max duration must be an integer from 5 through 15 seconds.');
  }
  const resolution = (input.resolution ?? '').toUpperCase();
  if (resolution !== '480P' && resolution !== '768P') throw new Error('MiniMax H3 Max resolution must be 480P or 768P.');
  const reference = mode === 'ref2v';
  const rawVideoSeconds = reference ? input.inputVideoDurationSec ?? 0 : 0;
  if (!Number.isFinite(rawVideoSeconds) || rawVideoSeconds < 0 || rawVideoSeconds > 15.05) {
    throw new Error('MiniMax H3 Max reference videos must total at most 15 seconds.');
  }
  const imageCount = reference ? input.referenceImageCount ?? 0 : 0;
  if (!Number.isInteger(imageCount) || imageCount < 0 || imageCount > 9) {
    throw new Error('MiniMax H3 Max accepts at most 9 reference images.');
  }
  const inputVideoSeconds = rawVideoSeconds > 0 ? Math.min(15, Math.ceil(rawVideoSeconds - 1e-6)) : 0;
  const paidImageCount = Math.max(0, imageCount - MINIMAX_H3_MAX_OFFICIAL_CNY.freeImages);
  const outputCny = preciseCny(MINIMAX_H3_MAX_OFFICIAL_CNY.outputPerSecond[resolution] * input.durationSec);
  const inputVideoCny = preciseCny(MINIMAX_H3_MAX_OFFICIAL_CNY.inputVideoPerSecond[resolution] * inputVideoSeconds);
  const imageCny = preciseCny(MINIMAX_H3_MAX_OFFICIAL_CNY.perImage * paidImageCount);
  const totalCny = preciseCny(outputCny + inputVideoCny + imageCny);
  const cents = (cny: number) => Number((cny * 100 / USD_TO_CNY_CUSTOMER_RATE).toFixed(6));
  return {
    mode, durationSec: input.durationSec, resolution,
    outputCny, inputVideoSeconds, inputVideoCny, imageCount, paidImageCount, imageCny, totalCny,
    accountingCnyPerUsd: USD_TO_CNY_CUSTOMER_RATE,
    outputUsdCents: cents(outputCny),
    inputVideoUsdCents: cents(inputVideoCny),
    imageUsdCents: cents(imageCny),
    subtotalUsdCents: cents(totalCny),
    ratePerSecondUsd: MINIMAX_H3_MAX_OFFICIAL_CNY.outputPerSecond[resolution] / USD_TO_CNY_CUSTOMER_RATE,
    source: MINIMAX_H3_MAX_OFFICIAL_PRICING_SOURCE,
  };
}

export type MinimaxH3MaxPricingInput = {
  mode: MinimaxH3MaxMode;
  durationSec: number;
  resolution: MinimaxH3MaxResolution;
  referenceTokenBudget?: number;
  verifiedReferenceTokenCount?: number;
};

export type MinimaxH3MaxProviderCost = {
  mode: MinimaxH3MaxMode;
  durationSec: number;
  resolution: MinimaxH3MaxResolution;
  referenceTokenBudget?: number;
  referencePricingBasis: string;
  ratePerSecondUsd: number;
  outputSubtotalUsd: number;
  verifiedReferenceTokenCount?: number;
  includedReferenceTokenCount: number;
  excessReferenceTokenCount: number;
  referenceTokenSubtotalUsd: number;
  providerCostUsd: number;
  providerCostExactCents: number;
  providerCostCents: number;
};

export const MINIMAX_H3_MAX_NORMAL_RATE_PER_SECOND_USD = {
  '480P': 0.05,
  '768P': 0.08,
  '1080P': 0.16,
} as const;
export const MINIMAX_H3_MAX_INCLUDED_REFERENCE_TOKENS = 4_096;
export const MINIMAX_H3_MAX_REFERENCE_USD_PER_1K_TOKENS = 0.02;
export const MINIMAX_H3_MAX_PRICING_SOURCE = 'minimax_h3_max_documented_pricing';

function precise(value: number, decimals = 8): number {
  return Number(value.toFixed(decimals));
}

export function calculateMinimaxH3MaxProviderCost(
  input: MinimaxH3MaxPricingInput,
): MinimaxH3MaxProviderCost {
  if (input.mode !== 't2v' && input.mode !== 'i2v' && input.mode !== 'ref2v') {
    throw new Error(`Unsupported MiniMax H3 Max mode: ${String(input.mode)}`);
  }
  if (!Number.isInteger(input.durationSec) || input.durationSec < 5 || input.durationSec > 15) {
    throw new Error('MiniMax H3 Max duration must be an integer from 5 through 15 seconds.');
  }
  if (input.resolution !== '480P' && input.resolution !== '768P' && input.resolution !== '1080P') {
    throw new Error('MiniMax H3 Max resolution must be 480P, 768P, or 1080P.');
  }
  const tokenCount = input.referenceTokenBudget ?? input.verifiedReferenceTokenCount;
  if (input.mode === 'ref2v' && (
    typeof tokenCount !== 'number'
    || !Number.isInteger(tokenCount)
    || tokenCount < 0
  )) {
    throw new Error('MiniMax H3 Max exact reference pricing requires a trusted reference token count.');
  }
  if (input.mode !== 'ref2v' && tokenCount !== undefined) {
    throw new Error('MiniMax H3 Max reference token count is only valid for reference-to-video pricing.');
  }

  const ratePerSecondUsd = MINIMAX_H3_MAX_NORMAL_RATE_PER_SECOND_USD[input.resolution];
  const verifiedReferenceTokenCount = input.mode === 'ref2v'
    ? tokenCount!
    : 0;
  const excessReferenceTokenCount = Math.max(
    0,
    verifiedReferenceTokenCount - MINIMAX_H3_MAX_INCLUDED_REFERENCE_TOKENS,
  );
  const outputSubtotalUsd = precise(ratePerSecondUsd * input.durationSec);
  const referenceTokenSubtotalUsd = precise(
    excessReferenceTokenCount * MINIMAX_H3_MAX_REFERENCE_USD_PER_1K_TOKENS / 1_000,
  );
  const providerCostUsd = precise(outputSubtotalUsd + referenceTokenSubtotalUsd);
  const providerCostExactCents = precise(providerCostUsd * 100, 6);

  return {
    mode: input.mode,
    durationSec: input.durationSec,
    resolution: input.resolution,
    referencePricingBasis: input.referenceTokenBudget === undefined ? 'verified-provider-tokens' : MINIMAX_H3_MAX_REFERENCE_BUDGET_VERSION,
    ...(input.referenceTokenBudget !== undefined ? { referenceTokenBudget: input.referenceTokenBudget } : {}),
    ratePerSecondUsd,
    outputSubtotalUsd,
    ...(input.referenceTokenBudget === undefined ? { verifiedReferenceTokenCount } : {}),
    includedReferenceTokenCount: MINIMAX_H3_MAX_INCLUDED_REFERENCE_TOKENS,
    excessReferenceTokenCount,
    referenceTokenSubtotalUsd,
    providerCostUsd,
    providerCostExactCents,
    providerCostCents: Math.round(providerCostExactCents),
  };
}

export function calculateMinimaxH3MaxProviderCostCents(input: MinimaxH3MaxPricingInput): number {
  return calculateMinimaxH3MaxProviderCost(input).providerCostCents;
}

export type MinimaxH3MaxPricingReference = {
  fps?: number; decodedFrameCount?: number; constantFrameRate?: boolean; sourceSha256?: string;
  kind: 'image' | 'video' | 'audio';
  fieldId?: string;
  url: string;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
};

export const MINIMAX_H3_MAX_REFERENCE_BUDGET_VERSION = 'normalized-media-budget-2026-09-22';

/**
 * MaxVideoAI's fixed customer quote uses this conservative supplier-cost budget,
 * not a claim about Fal's exact billed token count. See the dated engineering guide.
 * Call only after ownership and persisted media metadata have been verified.
 */
export function calculateMinimaxH3MaxReferenceTokenBudget(input: {
  resolution: string;
  durationSec: number;
  references: readonly MinimaxH3MaxPricingReference[];
}): number {
  if (!['480P', '768P', '1080P'].includes(input.resolution)) throw new Error('Unsupported reference budget resolution.');
  if (!Number.isFinite(input.durationSec) || input.durationSec <= 0 || input.durationSec > 15) throw new Error('Invalid reference budget duration.');
  const positive = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
  const seen = new Set<string>();
  let tokens = 0;
  for (const reference of input.references) {
    const key = `${reference.kind}:${reference.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (reference.kind === 'audio') {
      if (!positive(reference.durationSec)) throw new Error('Trusted audio duration metadata is required.');
      // Fal documents approximately 80 tokens/s; budget 96, including a 20% buffer.
      tokens += Math.ceil(reference.durationSec * 96);
      continue;
    }
    if (!positive(reference.width) || !positive(reference.height)) throw new Error('Trusted visual dimension metadata is required.');
    const shortEdge = reference.kind === 'image' ? 1024 : input.resolution === '480P' ? 480 : 768;
    const scale = shortEdge / Math.min(reference.width, reference.height);
    const spatialTokens = Math.ceil(reference.width * scale / 32) * Math.ceil(reference.height * scale / 32);
    if (reference.kind === 'image') tokens += spatialTokens;
    else {
      if (!positive(reference.durationSec)) throw new Error('Trusted video duration metadata is required.');
      // Eight temporal units/s with upward spatial rounding budgets above the
      // published 24fps examples. 1080P refines a native 768P generation.
      tokens += Math.ceil(Math.min(reference.durationSec, input.durationSec) * 8) * spatialTokens;
    }
  }
  if (!Number.isSafeInteger(tokens) || tokens < 0) throw new Error('Invalid reference pricing metadata.');
  return tokens;
}
