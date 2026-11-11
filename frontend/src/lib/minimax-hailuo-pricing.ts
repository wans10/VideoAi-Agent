import { USD_TO_CNY_CUSTOMER_RATE } from './customer-currency';
import { isMinimaxLegacyVideoCombination, minimaxLegacyTask } from './minimax-video-limits';

/**
 * PROVISIONAL vendor cost of the Hailuo 2.3 engines on MiniMax's own legacy video API, from the official CNY
 * list price per video (https://platform.minimaxi.com/docs/pricing/overview.md, "历史模型", checked 2026-11-11).
 * Converted to the application's USD pricing facts at the accounting rate; the normal margin applies on top.
 * Hailuo 02 keeps its existing catalogue price.
 */
export const MINIMAX_HAILUO_PRICING_SOURCE = 'minimax_official_cny_list_2026_11_11_provisional';

export const MINIMAX_HAILUO_ENGINE_MODELS = {
  'minimax-hailuo-2-3': 'MiniMax-Hailuo-2.3',
  'minimax-hailuo-2-3-fast': 'MiniMax-Hailuo-2.3-Fast',
} as const;

type HailuoEngineId = keyof typeof MINIMAX_HAILUO_ENGINE_MODELS;

/** CNY per video by resolution and duration. */
const CNY_PER_VIDEO: Readonly<Record<HailuoEngineId, Readonly<Record<string, Readonly<Record<number, number>>>>>> = {
  'minimax-hailuo-2-3': { '768P': { 6: 2.0, 10: 4.0 }, '1080P': { 6: 3.5 } },
  'minimax-hailuo-2-3-fast': { '768P': { 6: 1.35, 10: 2.25 }, '1080P': { 6: 2.31 } },
};

export function isMinimaxHailuoOfficialEngineId(engineId: string): engineId is HailuoEngineId {
  return Object.hasOwn(MINIMAX_HAILUO_ENGINE_MODELS, engineId);
}

/** Whether the official legacy API accepts (and the per-video list prices) this mode / resolution / duration. */
export function isMinimaxHailuoPricedCombination(input: {
  engineId: string;
  mode: string;
  resolution: string | null | undefined;
  durationSec: number;
}): boolean {
  if (!isMinimaxHailuoOfficialEngineId(input.engineId)) return false;
  if (input.mode !== 't2v' && input.mode !== 'i2v') return false;
  return isMinimaxLegacyVideoCombination({
    model: MINIMAX_HAILUO_ENGINE_MODELS[input.engineId],
    task: minimaxLegacyTask({ hasStartImage: input.mode === 'i2v', hasEndImage: false }),
    resolution: (input.resolution ?? '').toUpperCase(),
    durationSec: input.durationSec,
  });
}

export function calculateMinimaxHailuoCost(input: {
  engineId: string;
  mode: string;
  resolution: string | null | undefined;
  durationSec: number;
}): { outputCny: number; subtotalUsdCents: number; ratePerSecondUsd: number; accountingCnyPerUsd: number; source: string } {
  if (!isMinimaxHailuoOfficialEngineId(input.engineId)) throw new Error('Unsupported MiniMax Hailuo engine.');
  const resolution = (input.resolution ?? '').toUpperCase();
  const model = MINIMAX_HAILUO_ENGINE_MODELS[input.engineId];
  if (input.mode !== 't2v' && input.mode !== 'i2v') throw new Error(`${model} supports text and image starts only.`);
  const task = minimaxLegacyTask({ hasStartImage: input.mode === 'i2v', hasEndImage: false });
  if (!isMinimaxLegacyVideoCombination({ model, task, resolution, durationSec: input.durationSec })) {
    throw new Error(`${model} does not offer ${input.durationSec} s at ${resolution || 'this resolution'}; 1080P is 6 s only.`);
  }
  const outputCny = CNY_PER_VIDEO[input.engineId][resolution]![input.durationSec]!;
  const subtotalUsdCents = outputCny * 100 / USD_TO_CNY_CUSTOMER_RATE;
  return {
    outputCny,
    subtotalUsdCents,
    ratePerSecondUsd: subtotalUsdCents / 100 / input.durationSec,
    accountingCnyPerUsd: USD_TO_CNY_CUSTOMER_RATE,
    source: MINIMAX_HAILUO_PRICING_SOURCE,
  };
}
