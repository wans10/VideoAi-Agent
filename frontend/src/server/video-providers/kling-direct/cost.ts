import { isKlingDirectV2Route, resolveKlingDirectModelRoute, type KlingDirectModelRoute } from './model-map';
import type { ProviderCostEstimate, ProviderCostInput } from '../types';

const KLING_UNIT_PRICE_USD = 0.14;

/**
 * PROVISIONAL Kling 4.0 / 4.0 Flash / 3.0 Turbo vendor cost (not a customer price).
 * Source: https://klingai.com/document-api/pricing/base/video.md (fetched 2026-11-11), which lists
 * "1.0积分（¥1.0）/秒" etc., i.e. 1 credit = CNY 1 at list price. The account's actual pack/contract price
 * may be lower; `billing[].amount` in the task response is preferred when present.
 * Vendor costs are recorded in USD (docs/engineering/cny-migration.md), converted at the fixed
 * launch policy rate of 1 USD = 8 CNY.
 */
export const KLING_V2_PROVISIONAL_CNY_PER_CREDIT = 1;
export const KLING_V2_PROVISIONAL_CNY_PER_USD = 8;
export const KLING_V2_COST_SOURCE = 'kling_cn_list_price_2026_11_11_provisional';

type KlingV2CostEngineId = 'kling-v4' | 'kling-v4-flash' | 'kling-3-turbo-standard' | 'kling-3-turbo-pro';

/**
 * Credits per second, keyed by input class then resolution (official CNY list). Kling 3.0 Turbo lists only
 * "有声" (audio always on, no video input): 0.8 (720P) / 1.0 (1080P); each Turbo tier has one resolution.
 */
const KLING_V2_CREDITS_PER_SECOND: Record<KlingV2CostEngineId, Partial<Record<'none' | 'video', Record<string, number>>>> = {
  'kling-v4': { none: { '720p': 1.0, '1080p': 1.5 }, video: { '720p': 0.6, '1080p': 0.9 } },
  'kling-v4-flash': { none: { '720p': 0.6 }, video: { '720p': 0.4 } },
  'kling-3-turbo-standard': { none: { '720p': 0.8 } },
  'kling-3-turbo-pro': { none: { '1080p': 1.0 } },
};

const KLING_V2_DEFAULT_RESOLUTION: Record<KlingV2CostEngineId, string> = {
  'kling-v4': '1080p',
  'kling-v4-flash': '720p',
  'kling-3-turbo-standard': '720p',
  'kling-3-turbo-pro': '1080p',
};

export function computeKlingDirectProviderCostUsd(units: number | null | undefined): number | null {
  if (typeof units !== 'number' || !Number.isFinite(units)) return null;
  return Number((units * KLING_UNIT_PRICE_USD).toFixed(6));
}

export function computeKlingDirectV2ProviderCostUsd(credits: number | null | undefined): number | null {
  if (typeof credits !== 'number' || !Number.isFinite(credits)) return null;
  return Number(((credits * KLING_V2_PROVISIONAL_CNY_PER_CREDIT) / KLING_V2_PROVISIONAL_CNY_PER_USD).toFixed(6));
}

/**
 * Billable seconds per the docs: with input video (reference videos, edited video and video
 * subjects), input > output bills input + output, otherwise output x 2. No input video bills output.
 */
export function computeKlingDirectV2Credits(params: {
  engineId: string;
  resolution: string | null | undefined;
  outputDurationSec: number;
  inputVideoDurationSec?: number | null;
}): number | null {
  const engineId = params.engineId as KlingV2CostEngineId;
  const rates = Object.hasOwn(KLING_V2_CREDITS_PER_SECOND, engineId) ? KLING_V2_CREDITS_PER_SECOND[engineId] : null;
  if (!rates || !Number.isFinite(params.outputDurationSec) || params.outputDurationSec <= 0) return null;
  const input = Math.max(0, Number(params.inputVideoDurationSec ?? 0) || 0);
  const hasVideoInput = input > 0;
  const resolution = (params.resolution ?? KLING_V2_DEFAULT_RESOLUTION[engineId]).toLowerCase();
  const rate = rates[hasVideoInput ? 'video' : 'none']?.[resolution];
  if (rate === undefined) return null;
  const output = params.outputDurationSec;
  const billableSeconds = !hasVideoInput ? output : input > output ? input + output : output * 2;
  return Number((billableSeconds * rate).toFixed(6));
}

function estimateKlingDirectV2Cost(route: KlingDirectModelRoute, input: ProviderCostInput): ProviderCostEstimate {
  const credits = computeKlingDirectV2Credits({
    engineId: route.engineId,
    // A fixed-tier route (Turbo) ignores the requested resolution.
    resolution: route.resolution ?? input.resolution,
    outputDurationSec: Math.max(0, input.durationSec),
    inputVideoDurationSec: input.inputVideoDurationSec ?? null,
  });
  return {
    providerCostUnits: credits,
    providerCostUsd: computeKlingDirectV2ProviderCostUsd(credits),
    source: KLING_V2_COST_SOURCE,
  };
}

export function estimateKlingDirectCost(input: ProviderCostInput): ProviderCostEstimate {
  const route = resolveKlingDirectModelRoute(input.engineId);
  if (isKlingDirectV2Route(route)) return estimateKlingDirectV2Cost(route, input);
  const duration = Math.max(0, Math.trunc(input.durationSec));
  let unitsPerSecond: number;
  if (route.mode === '4k') {
    unitsPerSecond = 3;
  } else if (input.mode === 'v2v' && route.endpointFamily === 'video-o3-omni') {
    unitsPerSecond = route.mode === 'pro' ? 1.2 : 0.9;
  } else if (route.mode === 'pro') {
    unitsPerSecond = input.audioEnabled === true ? 1.2 : 0.8;
  } else {
    unitsPerSecond = input.audioEnabled === true ? 0.9 : 0.6;
  }
  const providerCostUnits = Number((duration * unitsPerSecond).toFixed(6));
  return {
    providerCostUnits,
    providerCostUsd: computeKlingDirectProviderCostUsd(providerCostUnits),
    source: 'kling_visible_pricing_2026_05_14',
  };
}
