/**
 * Documented request limits of MiniMax's own video APIs (https://api.minimax.cn), checked 2026-11-11:
 * - V2 (MiniMax-H3, MiniMax-H3-Max): https://platform.minimaxi.com/docs/api-reference/video-generation-v2-create.md
 * - legacy V1 (Hailuo): https://platform.minimaxi.com/docs/api-reference/video-generation-t2v.md, -i2v.md, -fl2v.md
 * Pure data, shared by the provider client, the routing narrowing and pricing.
 */

export const MINIMAX_H3_OFFICIAL_RESOLUTIONS = ['768P', '2K'] as const;
export const MINIMAX_H3_OFFICIAL_DURATIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;
export const MINIMAX_H3_OFFICIAL_RATIOS = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'] as const;
export const MINIMAX_H3_PROMPT_MAX_CHARS = 7000;
export const MINIMAX_H3_REFERENCE_LIMITS = { image: 9, video: 3, audio: 3 } as const;

/**
 * MiniMax-H3-Max on the same V2 endpoint (checked 2026-11-12): 5-15 s (no 4 s), 480P or 768P (no 2K), the same
 * modes, ratios, prompt and reference limits as MiniMax-H3, plus `extra.prompt_expansion_mode` (Max only).
 */
export const MINIMAX_H3_MAX_OFFICIAL_RESOLUTIONS = ['480P', '768P'] as const;
export const MINIMAX_H3_MAX_OFFICIAL_DURATIONS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;
export const MINIMAX_H3_MAX_PROMPT_EXPANSION_MODES = ['disabled', 'balanced', 'quality'] as const;

/** V2 limits per model: durations and resolutions differ, everything else is shared. */
export const MINIMAX_V2_MODEL_LIMITS: Readonly<Record<'MiniMax-H3' | 'MiniMax-H3-Max', {
  durations: readonly number[];
  resolutions: readonly string[];
}>> = {
  'MiniMax-H3': { durations: MINIMAX_H3_OFFICIAL_DURATIONS, resolutions: MINIMAX_H3_OFFICIAL_RESOLUTIONS },
  'MiniMax-H3-Max': { durations: MINIMAX_H3_MAX_OFFICIAL_DURATIONS, resolutions: MINIMAX_H3_MAX_OFFICIAL_RESOLUTIONS },
};

export type MinimaxLegacyVideoModel = 'MiniMax-Hailuo-2.3' | 'MiniMax-Hailuo-2.3-Fast' | 'MiniMax-Hailuo-02';
/** t2v, i2v (first frame) and fl2v (first and last frame, Hailuo 02 only). */
export type MinimaxLegacyVideoTask = 't2v' | 'i2v' | 'fl2v';

/** Resolution -> allowed durations, per model and task, exactly as the docs' tables state. */
export const MINIMAX_LEGACY_VIDEO_MATRIX: Readonly<Record<
  MinimaxLegacyVideoModel,
  Partial<Record<MinimaxLegacyVideoTask, Readonly<Record<string, readonly number[]>>>>
>> = {
  'MiniMax-Hailuo-2.3': {
    t2v: { '768P': [6, 10], '1080P': [6] },
    i2v: { '768P': [6, 10], '1080P': [6] },
  },
  'MiniMax-Hailuo-2.3-Fast': {
    i2v: { '768P': [6, 10], '1080P': [6] },
  },
  'MiniMax-Hailuo-02': {
    t2v: { '768P': [6, 10], '1080P': [6] },
    i2v: { '512P': [6, 10], '768P': [6, 10], '1080P': [6] },
    fl2v: { '768P': [6, 10], '1080P': [6] },
  },
};

export const MINIMAX_LEGACY_PROMPT_MAX_CHARS = 2000;

export function isMinimaxLegacyVideoModel(model: string): model is MinimaxLegacyVideoModel {
  return Object.hasOwn(MINIMAX_LEGACY_VIDEO_MATRIX, model);
}

export function minimaxLegacyTask(params: { hasStartImage: boolean; hasEndImage: boolean }): MinimaxLegacyVideoTask {
  if (params.hasEndImage) return 'fl2v';
  return params.hasStartImage ? 'i2v' : 't2v';
}

/** Whether the legacy API accepts this model / task / resolution / duration combination. */
export function isMinimaxLegacyVideoCombination(params: {
  model: string;
  task: MinimaxLegacyVideoTask;
  resolution: string;
  durationSec: number;
}): boolean {
  if (!isMinimaxLegacyVideoModel(params.model)) return false;
  const durations = MINIMAX_LEGACY_VIDEO_MATRIX[params.model][params.task]?.[params.resolution.toUpperCase()];
  return Boolean(durations?.includes(params.durationSec));
}
