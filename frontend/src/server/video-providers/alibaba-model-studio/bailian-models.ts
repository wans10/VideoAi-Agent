/**
 * Third-party video models that Alibaba Cloud Bailian (Model Studio, cn-beijing) hosts behind the same
 * async video-synthesis API as Wan (docs checked 2026-11-11):
 * - https://docs.bailian.console.aliyun.com/zh/model-studio/kling-video-generation-api-reference
 * - https://docs.bailian.console.aliyun.com/zh/model-studio/minimax-video-generation-api-reference
 *
 * Bailian is the primary route for these engines and the vendor's own API (Kling / MiniMax) the fallback;
 * the order is configurable per family (see bailian-routing.ts). This file has no imports so the router
 * and model map can read it without loading provider clients.
 */
export const BAILIAN_KLING_TURBO_MODEL = 'kling/kling-v3-turbo-video-generation' as const;
export const BAILIAN_KLING_V3_MODEL = 'kling/kling-v3-video-generation' as const;
export const BAILIAN_KLING_OMNI_MODEL = 'kling/kling-v3-omni-video-generation' as const;
export const BAILIAN_MINIMAX_H3_MODEL = 'MiniMax/MiniMax-H3' as const;

export type BailianHostedModel =
  | typeof BAILIAN_KLING_TURBO_MODEL
  | typeof BAILIAN_KLING_V3_MODEL
  | typeof BAILIAN_KLING_OMNI_MODEL
  | typeof BAILIAN_MINIMAX_H3_MODEL;

export type BailianHostedFamily = 'kling_turbo' | 'kling_v3' | 'kling_omni' | 'minimax_h3';
/** Route-order family: one env switch per vendor (KLING_ROUTE_ORDER / MINIMAX_H3_ROUTE_ORDER). */
export type BailianRouteFamily = 'kling' | 'minimax_h3';
/** Bailian Kling `parameters.mode`: std = 720P, pro = 1080P, 4k = 4K (Turbo has no 4K). */
export type BailianKlingMode = 'std' | 'pro' | '4k';
export type BailianHostedMode = 't2v' | 'i2v' | 'ref2v' | 'v2v';

export type BailianHostedEngine = {
  model: BailianHostedModel;
  family: BailianHostedFamily;
  routeFamily: BailianRouteFamily;
  modes: readonly BailianHostedMode[];
  /** Same tier as the Kling direct route for this engine, so primary and fallback render the same product. */
  klingMode?: BailianKlingMode;
};

const KLING_GENERATION_MODES = ['t2v', 'i2v'] as const;
const KLING_OMNI_MODES = ['t2v', 'i2v', 'ref2v', 'v2v'] as const;

export const BAILIAN_HOSTED_ENGINES: Readonly<Record<string, BailianHostedEngine>> = {
  'kling-3-turbo-standard': {
    model: BAILIAN_KLING_TURBO_MODEL, family: 'kling_turbo', routeFamily: 'kling', modes: KLING_GENERATION_MODES, klingMode: 'std',
  },
  'kling-3-turbo-pro': {
    model: BAILIAN_KLING_TURBO_MODEL, family: 'kling_turbo', routeFamily: 'kling', modes: KLING_GENERATION_MODES, klingMode: 'pro',
  },
  'kling-3-standard': {
    model: BAILIAN_KLING_V3_MODEL, family: 'kling_v3', routeFamily: 'kling', modes: KLING_GENERATION_MODES, klingMode: 'std',
  },
  'kling-3-pro': {
    model: BAILIAN_KLING_V3_MODEL, family: 'kling_v3', routeFamily: 'kling', modes: KLING_GENERATION_MODES, klingMode: 'pro',
  },
  'kling-3-4k': {
    model: BAILIAN_KLING_V3_MODEL, family: 'kling_v3', routeFamily: 'kling', modes: KLING_GENERATION_MODES, klingMode: '4k',
  },
  'kling-o3-standard': {
    model: BAILIAN_KLING_OMNI_MODEL, family: 'kling_omni', routeFamily: 'kling', modes: KLING_OMNI_MODES, klingMode: 'std',
  },
  'kling-o3-pro': {
    model: BAILIAN_KLING_OMNI_MODEL, family: 'kling_omni', routeFamily: 'kling', modes: KLING_OMNI_MODES, klingMode: 'pro',
  },
  'kling-o3-4k': {
    model: BAILIAN_KLING_OMNI_MODEL, family: 'kling_omni', routeFamily: 'kling', modes: KLING_OMNI_MODES, klingMode: '4k',
  },
  'minimax-h3': {
    model: BAILIAN_MINIMAX_H3_MODEL, family: 'minimax_h3', routeFamily: 'minimax_h3', modes: ['t2v', 'i2v', 'ref2v'],
  },
};

export function resolveBailianHostedEngine(engineId: string): BailianHostedEngine | null {
  return Object.hasOwn(BAILIAN_HOSTED_ENGINES, engineId) ? BAILIAN_HOSTED_ENGINES[engineId] ?? null : null;
}

export function isBailianHostedEngine(engineId: string): boolean {
  return resolveBailianHostedEngine(engineId) !== null;
}

export function isBailianHostedModeSupported(engineId: string, mode: string): boolean {
  return resolveBailianHostedEngine(engineId)?.modes.includes(mode as BailianHostedMode) === true;
}

export function isBailianHostedModel(model: string | null | undefined): model is BailianHostedModel {
  return model === BAILIAN_KLING_TURBO_MODEL || model === BAILIAN_KLING_V3_MODEL
    || model === BAILIAN_KLING_OMNI_MODEL || model === BAILIAN_MINIMAX_H3_MODEL;
}
