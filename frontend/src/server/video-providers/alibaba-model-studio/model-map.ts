import {
  resolveBailianHostedEngine,
  type BailianHostedFamily,
  type BailianHostedModel,
  type BailianHostedMode,
  type BailianKlingMode,
} from './bailian-models';

export const ALIBABA_MODEL_STUDIO_PROVIDER = 'alibaba_model_studio' as const;

export type AlibabaVideoMode = 't2v' | 'i2v' | 'ref2v' | 'v2v' | 'extend';

export type AlibabaModelRoute = {
  model:
    | 'wan3.0-video'
    | 'wan3.0-video-prime'
    | 'happyhorse-1.1-t2v'
    | 'happyhorse-1.1-i2v'
    | 'happyhorse-1.1-r2v'
    | BailianHostedModel;
  family: 'wan3' | 'happyhorse11' | BailianHostedFamily;
  mode: AlibabaVideoMode;
  fallbackCompatible: boolean;
  /** Bailian-hosted Kling tier (std 720P / pro 1080P / 4k). */
  klingMode?: BailianKlingMode;
};

const WAN_MODELS = new Map<string, AlibabaModelRoute['model']>([
  ['wan-3', 'wan3.0-video'],
  ['wan-3-prime', 'wan3.0-video-prime'],
]);

const WAN_MODES = new Set<AlibabaVideoMode>(['t2v', 'i2v', 'ref2v', 'v2v', 'extend']);
const HAPPY_HORSE_MODELS: Partial<Record<AlibabaVideoMode, AlibabaModelRoute['model']>> = {
  t2v: 'happyhorse-1.1-t2v',
  i2v: 'happyhorse-1.1-i2v',
  ref2v: 'happyhorse-1.1-r2v',
};

export function resolveAlibabaModelRoute(engineId: string, mode: string): AlibabaModelRoute | null {
  const normalizedMode = mode as AlibabaVideoMode;
  const wanModel = WAN_MODELS.get(engineId);
  if (wanModel && WAN_MODES.has(normalizedMode)) {
    return {
      model: wanModel,
      family: 'wan3',
      mode: normalizedMode,
      fallbackCompatible: normalizedMode === 't2v' || normalizedMode === 'i2v' || normalizedMode === 'ref2v',
    };
  }

  if (engineId === 'happy-horse-1-1') {
    const model = HAPPY_HORSE_MODELS[normalizedMode];
    if (model) {
      return {
        model,
        family: 'happyhorse11',
        mode: normalizedMode,
        fallbackCompatible: true,
      };
    }
  }

  // Bailian-hosted third-party models (Kling, MiniMax). Their fallback is the vendor's own API, never Fal.
  const hosted = resolveBailianHostedEngine(engineId);
  if (hosted && hosted.modes.includes(normalizedMode as BailianHostedMode)) {
    return {
      model: hosted.model,
      family: hosted.family,
      mode: normalizedMode,
      fallbackCompatible: false,
      ...(hosted.klingMode ? { klingMode: hosted.klingMode } : {}),
    };
  }

  return null;
}

/** Bailian-hosted third-party route (Kling / MiniMax on Model Studio); not a Wan/HappyHorse engine. */
export function isAlibabaThirdPartyRoute(route: Pick<AlibabaModelRoute, 'family'> | null | undefined): boolean {
  return route?.family === 'kling_turbo' || route?.family === 'kling_v3' || route?.family === 'kling_omni'
    || route?.family === 'minimax_h3';
}

/** First-party Alibaba engines (Wan 3, HappyHorse 1.1). Bailian-hosted Kling/MiniMax are routed by bailian-routing. */
export function isAlibabaDirectEngine(engineId: string): boolean {
  return WAN_MODELS.has(engineId) || engineId === 'happy-horse-1-1';
}

export function isAlibabaDirectModeSupported(engineId: string, mode: string): boolean {
  return isAlibabaDirectEngine(engineId) && resolveAlibabaModelRoute(engineId, mode) !== null;
}

export function isAlibabaFalFallbackCompatible(engineId: string, mode: string): boolean {
  return resolveAlibabaModelRoute(engineId, mode)?.fallbackCompatible === true;
}
