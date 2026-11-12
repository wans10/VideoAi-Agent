import type { ProviderCostEstimate, ProviderCostInput } from '../types';
import { isAlibabaThirdPartyRoute, resolveAlibabaModelRoute, type AlibabaModelRoute } from './model-map';

// Bailian cn-beijing CNY list prices (wan3-0-video.md, wan3-0-video-prime.md, happyhorse-1-1-*.md, checked
// 2026-11-13) recorded in USD at 8 CNY/USD; promotions and free quotas are not applied.
const SOURCE = 'bailian_cn_beijing_list_2026-11-13';

const RATES_BY_ENGINE: Record<string, Record<string, number>> = {
  'wan-3': { '480p': 0.0375, '720p': 0.075, '1080p': 0.15 },
  'wan-3-prime': { '480p': 0.05625, '720p': 0.1125, '1080p': 0.225 },
  'happy-horse-1-1': { '480p': 0.05625, '720p': 0.1125, '1080p': 0.15 },
};

function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

/**
 * PROVISIONAL vendor cost of the Kling / MiniMax models Bailian hosts (cn-beijing CNY list prices, checked
 * 2026-11-11; not a customer price). Recorded in USD at the fixed policy rate 1 USD = 8 CNY
 * (docs/engineering/cny-migration.md). Account discounts are unknown.
 * - kling-v3-turbo-video-generation: 720P 0.8, 1080P 1.0 CNY/s (audio always on).
 * - kling-v3-video-generation / kling-v3-omni-video-generation: 720P 0.9 (silent 0.6), 1080P 1.2 (silent 0.8),
 *   4K 3.0 CNY/s; with a reference video 0.9 / 1.2 / 3.0.
 * - MiniMax-H3: 768P 0.50, 2K 0.80 CNY/s over input video + output seconds; images beyond 5 cost 0.20 each;
 *   audio references are free.
 */
export const BAILIAN_HOSTED_COST_SOURCE = 'bailian_cn_beijing_list_price_2026_11_11_provisional';
export const BAILIAN_CNY_PER_USD = 8;
const KLING_TURBO_CNY: Record<string, number> = { std: 0.8, pro: 1.0 };
const KLING_V3_CNY = {
  audio: { std: 0.9, pro: 1.2, '4k': 3.0 } as Record<string, number>,
  silent: { std: 0.6, pro: 0.8, '4k': 3.0 } as Record<string, number>,
};
const MINIMAX_H3_CNY: Record<string, number> = { '768p': 0.5, '2k': 0.8 };
const MINIMAX_H3_INCLUDED_IMAGES = 5;
const MINIMAX_H3_EXTRA_IMAGE_CNY = 0.2;

export type BailianHostedCostInput = ProviderCostInput & {
  /** MiniMax-H3 reference images (frames are not billed separately). */
  referenceImageCount?: number;
  /** Provider-reported billable seconds (usage.duration) when known. */
  billedSeconds?: number | null;
};

function cnyToUsd(cny: number): number {
  return roundUsd(cny / BAILIAN_CNY_PER_USD);
}

export function estimateBailianHostedCost(route: AlibabaModelRoute, input: BailianHostedCostInput): ProviderCostEstimate {
  const output = Math.max(0, input.durationSec);
  const inputVideo = Math.max(0, input.inputVideoDurationSec ?? 0);
  if (route.family === 'minimax_h3') {
    const resolution = (input.resolution ?? '768P').toLowerCase();
    const rate = MINIMAX_H3_CNY[resolution];
    const seconds = input.billedSeconds ?? output + inputVideo;
    const extraImages = Math.max(0, Math.floor(input.referenceImageCount ?? 0) - MINIMAX_H3_INCLUDED_IMAGES);
    return {
      providerCostUnits: seconds,
      // An unknown tier yields no estimate instead of blocking submission or completion bookkeeping.
      providerCostUsd: rate === undefined ? null : cnyToUsd(seconds * rate + extraImages * MINIMAX_H3_EXTRA_IMAGE_CNY),
      source: BAILIAN_HOSTED_COST_SOURCE,
    };
  }
  const tier = route.klingMode ?? 'pro';
  const seconds = input.billedSeconds ?? output;
  const rate = route.family === 'kling_turbo'
    ? KLING_TURBO_CNY[tier]
    : (input.audioEnabled === true || inputVideo > 0 || input.mode === 'v2v' ? KLING_V3_CNY.audio : KLING_V3_CNY.silent)[tier];
  return {
    providerCostUnits: seconds,
    providerCostUsd: rate === undefined ? null : cnyToUsd(seconds * rate),
    source: BAILIAN_HOSTED_COST_SOURCE,
  };
}

export function estimateAlibabaProviderCost(input: BailianHostedCostInput): ProviderCostEstimate {
  const mode = input.mode ?? 't2v';
  const route = resolveAlibabaModelRoute(input.engineId, mode);
  if (!route) {
    throw new Error(`${input.engineId}/${mode} is not mapped to Alibaba Model Studio.`);
  }
  if (isAlibabaThirdPartyRoute(route)) return estimateBailianHostedCost(route, input);

  const resolution = (input.resolution ?? '1080p').toLowerCase();
  const rate = RATES_BY_ENGINE[input.engineId]?.[resolution];
  if (rate === undefined) {
    throw new Error(`Unsupported Alibaba resolution: ${input.resolution ?? 'null'}.`);
  }

  const outputSeconds = Math.max(0, input.durationSec);
  const inputSeconds = input.engineId.startsWith('wan-3')
    ? Math.max(0, input.inputVideoDurationSec ?? 0)
    : 0;
  const billableSeconds = outputSeconds + inputSeconds;

  return {
    providerCostUnits: billableSeconds,
    providerCostUsd: roundUsd(billableSeconds * rate),
    source: SOURCE,
  };
}
