import type { Mode } from '@/types/engines';

export const KLING_DIRECT_PROVIDER = 'kling_direct' as const;

export type KlingDirectEngineId =
  | 'kling-3-standard'
  | 'kling-3-pro'
  | 'kling-3-4k'
  | 'kling-3-turbo-standard'
  | 'kling-3-turbo-pro'
  | 'kling-o3-standard'
  | 'kling-o3-pro'
  | 'kling-o3-4k'
  | 'kling-v4'
  | 'kling-v4-flash';
/** `per_request`: the new-design API takes the resolution from `settings.resolution`, not a tier. */
export type KlingDirectMode = 'std' | 'pro' | '4k' | 'per_request';
export type KlingDirectEndpointFamily = 'video-v3' | 'video-o3-omni' | 'video-v4' | 'video-v4-flash';
export type KlingDirectSubmitMode = 't2v' | 'i2v' | 'ref2v' | 'v2v';
export type KlingDirectEndpointPath =
  | '/v1/videos/text2video'
  | '/v1/videos/image2video'
  | '/v1/videos/omni-video'
  | KlingDirectV2EndpointPath;
/** New-design ("model version in the path") endpoints; they accept only `Authorization: Bearer <API Key>`. */
export type KlingDirectV2EndpointPath =
  | '/text-to-video/kling-4.0'
  | '/image-to-video/kling-4.0'
  | '/omni-video/kling-4.0'
  | '/text-to-video/kling-4.0-flash'
  | '/image-to-video/kling-4.0-flash'
  | '/omni-video/kling-4.0-flash'
  | typeof KLING_DIRECT_V2_TASKS_PATH;
/** Unified new-design task query: `GET /tasks?task_ids=` or `?external_task_ids=`. */
export const KLING_DIRECT_V2_TASKS_PATH = '/tasks' as const;

export type KlingDirectModelRoute = {
  engineId: KlingDirectEngineId;
  endpointFamily: KlingDirectEndpointFamily;
  createPaths: Partial<Record<KlingDirectSubmitMode, KlingDirectEndpointPath>>;
  pollPathPrefixes: Partial<Record<KlingDirectSubmitMode, KlingDirectEndpointPath>>;
  providerModel: 'kling-v3' | 'kling-v3-omni' | 'kling-4.0' | 'kling-4.0-flash';
  mode: KlingDirectMode;
  /** Absent for the legacy `/v1/videos/*` + `model_name` design. */
  apiDesign?: 'v2';
};

const KLING_V3_ENDPOINTS: Partial<Record<KlingDirectSubmitMode, KlingDirectEndpointPath>> = {
  t2v: '/v1/videos/text2video',
  i2v: '/v1/videos/image2video',
};

const KLING_O3_OMNI_ENDPOINTS: Partial<Record<KlingDirectSubmitMode, KlingDirectEndpointPath>> = {
  t2v: '/v1/videos/omni-video',
  i2v: '/v1/videos/omni-video',
  ref2v: '/v1/videos/omni-video',
  v2v: '/v1/videos/omni-video',
};

const KLING_O3_OMNI_4K_ENDPOINTS: Partial<Record<KlingDirectSubmitMode, KlingDirectEndpointPath>> = {
  t2v: '/v1/videos/omni-video',
  i2v: '/v1/videos/omni-video',
  ref2v: '/v1/videos/omni-video',
};

// Kling 4.0 / 4.0 Flash official docs (klingai.com/document-api/api/video/4-0*/), fetched 2026-11-11.
// Generation and editing (base_video) both use the omni path; Flash has no editing mode in the engine.
const KLING_V4_ENDPOINTS: Partial<Record<KlingDirectSubmitMode, KlingDirectEndpointPath>> = {
  t2v: '/text-to-video/kling-4.0',
  i2v: '/image-to-video/kling-4.0',
  ref2v: '/omni-video/kling-4.0',
  v2v: '/omni-video/kling-4.0',
};

const KLING_V4_FLASH_ENDPOINTS: Partial<Record<KlingDirectSubmitMode, KlingDirectEndpointPath>> = {
  t2v: '/text-to-video/kling-4.0-flash',
  i2v: '/image-to-video/kling-4.0-flash',
  ref2v: '/omni-video/kling-4.0-flash',
};

const KLING_V4_POLL_PATHS: Partial<Record<KlingDirectSubmitMode, KlingDirectEndpointPath>> = {
  t2v: KLING_DIRECT_V2_TASKS_PATH,
  i2v: KLING_DIRECT_V2_TASKS_PATH,
  ref2v: KLING_DIRECT_V2_TASKS_PATH,
  v2v: KLING_DIRECT_V2_TASKS_PATH,
};

const KLING_DIRECT_MODEL_ROUTES: Record<KlingDirectEngineId, KlingDirectModelRoute> = {
  'kling-3-standard': {
    engineId: 'kling-3-standard',
    endpointFamily: 'video-v3',
    createPaths: KLING_V3_ENDPOINTS,
    pollPathPrefixes: KLING_V3_ENDPOINTS,
    providerModel: 'kling-v3',
    mode: 'std',
  },
  'kling-3-pro': {
    engineId: 'kling-3-pro',
    endpointFamily: 'video-v3',
    createPaths: KLING_V3_ENDPOINTS,
    pollPathPrefixes: KLING_V3_ENDPOINTS,
    providerModel: 'kling-v3',
    mode: 'pro',
  },
  'kling-3-4k': {
    engineId: 'kling-3-4k',
    endpointFamily: 'video-v3',
    createPaths: KLING_V3_ENDPOINTS,
    pollPathPrefixes: KLING_V3_ENDPOINTS,
    providerModel: 'kling-v3',
    mode: '4k',
  },
  'kling-3-turbo-standard': {
    engineId: 'kling-3-turbo-standard',
    endpointFamily: 'video-v3',
    createPaths: KLING_V3_ENDPOINTS,
    pollPathPrefixes: KLING_V3_ENDPOINTS,
    providerModel: 'kling-v3',
    mode: 'std',
  },
  'kling-3-turbo-pro': {
    engineId: 'kling-3-turbo-pro',
    endpointFamily: 'video-v3',
    createPaths: KLING_V3_ENDPOINTS,
    pollPathPrefixes: KLING_V3_ENDPOINTS,
    providerModel: 'kling-v3',
    mode: 'pro',
  },
  'kling-o3-standard': {
    engineId: 'kling-o3-standard',
    endpointFamily: 'video-o3-omni',
    createPaths: KLING_O3_OMNI_ENDPOINTS,
    pollPathPrefixes: KLING_O3_OMNI_ENDPOINTS,
    providerModel: 'kling-v3-omni',
    mode: 'std',
  },
  'kling-o3-pro': {
    engineId: 'kling-o3-pro',
    endpointFamily: 'video-o3-omni',
    createPaths: KLING_O3_OMNI_ENDPOINTS,
    pollPathPrefixes: KLING_O3_OMNI_ENDPOINTS,
    providerModel: 'kling-v3-omni',
    mode: 'pro',
  },
  'kling-o3-4k': {
    engineId: 'kling-o3-4k',
    endpointFamily: 'video-o3-omni',
    createPaths: KLING_O3_OMNI_4K_ENDPOINTS,
    pollPathPrefixes: KLING_O3_OMNI_4K_ENDPOINTS,
    providerModel: 'kling-v3-omni',
    mode: '4k',
  },
  'kling-v4': {
    engineId: 'kling-v4',
    endpointFamily: 'video-v4',
    createPaths: KLING_V4_ENDPOINTS,
    pollPathPrefixes: KLING_V4_POLL_PATHS,
    providerModel: 'kling-4.0',
    mode: 'per_request',
    apiDesign: 'v2',
  },
  'kling-v4-flash': {
    engineId: 'kling-v4-flash',
    endpointFamily: 'video-v4-flash',
    createPaths: KLING_V4_FLASH_ENDPOINTS,
    pollPathPrefixes: { t2v: KLING_DIRECT_V2_TASKS_PATH, i2v: KLING_DIRECT_V2_TASKS_PATH, ref2v: KLING_DIRECT_V2_TASKS_PATH },
    providerModel: 'kling-4.0-flash',
    mode: 'per_request',
    apiDesign: 'v2',
  },
};

export function isKlingDirectV2Route(route: Pick<KlingDirectModelRoute, 'apiDesign'>): boolean {
  return route.apiDesign === 'v2';
}

export function isKlingDirectV2Engine(engineId: string | null | undefined): boolean {
  return isKlingDirectEngine(engineId) && isKlingDirectV2Route(KLING_DIRECT_MODEL_ROUTES[engineId]);
}

export function isKlingDirectEngine(engineId: string | null | undefined): engineId is KlingDirectEngineId {
  return Boolean(engineId && engineId in KLING_DIRECT_MODEL_ROUTES);
}

export function isKlingDirectModeSupported(
  engineId: string | null | undefined,
  mode: Mode | string | null | undefined
): boolean {
  if (!isKlingDirectEngine(engineId) || !mode) return false;
  const submitMode = toKlingDirectSubmitMode(mode);
  return Boolean(submitMode && KLING_DIRECT_MODEL_ROUTES[engineId].createPaths[submitMode]);
}

export function resolveKlingDirectModelRoute(engineId: string): KlingDirectModelRoute {
  if (!isKlingDirectEngine(engineId)) {
    throw new Error(`Unsupported Kling direct engine: ${engineId}`);
  }
  return KLING_DIRECT_MODEL_ROUTES[engineId];
}

export function resolveKlingDirectSubmitMode(mode: Mode | string): KlingDirectSubmitMode {
  if (mode === 'i2v') return 'i2v';
  if (mode === 't2v') return 't2v';
  if (mode === 'ref2v') return 'ref2v';
  if (mode === 'v2v') return 'v2v';
  throw new Error(`Unsupported Kling direct submit mode: ${mode}`);
}

function toKlingDirectSubmitMode(mode: Mode | string): KlingDirectSubmitMode | null {
  try {
    return resolveKlingDirectSubmitMode(mode);
  } catch {
    return null;
  }
}

export function resolveKlingDirectCreatePath(route: KlingDirectModelRoute, mode: Mode | string): KlingDirectEndpointPath {
  const submitMode = resolveKlingDirectSubmitMode(mode);
  const path = route.createPaths[submitMode];
  if (!path) {
    throw new Error(`Kling direct route ${route.engineId} does not support ${submitMode}.`);
  }
  return path;
}

export function resolveKlingDirectPollPathPrefix(
  route: KlingDirectModelRoute,
  mode: Mode | string
): KlingDirectEndpointPath {
  const submitMode = resolveKlingDirectSubmitMode(mode);
  const path = route.pollPathPrefixes[submitMode];
  if (!path) {
    throw new Error(`Kling direct route ${route.engineId} does not support ${submitMode}.`);
  }
  return path;
}
