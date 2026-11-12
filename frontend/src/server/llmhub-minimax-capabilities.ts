import type { EngineCaps, EngineInputField, EngineModeUiCaps, Mode } from '@/types/engines';
import {
  isMinimaxLegacyVideoCombination,
  MINIMAX_H3_OFFICIAL_DURATIONS,
  MINIMAX_H3_OFFICIAL_RESOLUTIONS,
  minimaxLegacyTask,
} from '@/lib/minimax-video-limits';
import { isMinimaxOfficialEnabled } from '@/server/video-providers/minimax-official/client';

/**
 * Keyvo runs MiniMax through LLM Hub's hailuo task plugin, which offers less than the catalogue's
 * authored engines (written for fal). The catalogue stays as upstream wrote it so pricing coverage
 * and upstream syncs keep working; the workspace is shown only what the plugin accepts.
 */
type Narrowing = Readonly<{
  modes: readonly Mode[];
  resolutions: readonly string[];
  defaultResolution: string;
  durations: readonly number[];
  aspectRatios?: readonly string[];
  /** Presentation order only: 16:9 first, because a new form falls back to the first listed ratio. */
  aspectOrder?: readonly string[];
  /** Optional input fields the plugin has no equivalent for. */
  dropFields: readonly string[];
  /** Legacy MiniMax model whose resolution/duration/task matrix decides support (official route only). */
  legacyModel?: string;
  /** Per-mode resolution subsets shown in the mode controls. */
  resolutionsByMode?: Partial<Record<Mode, readonly string[]>>;
}>;

const H3: Narrowing = {
  modes: ['t2v', 'i2v'],
  resolutions: ['768P', '2K'],
  defaultResolution: '768P',
  // LLM Hub also takes 4 s, but the catalogue's pricing and validation start at 5 s, so a 4 s clip could not be quoted.
  durations: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  aspectOrder: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
  dropFields: ['end_image_url', 'reference_image_urls', 'reference_video_urls', 'reference_audio_urls', 'target_audio_url', 'seed', 'prompt_expansion_mode'],
};

const HAILUO_02: Narrowing = {
  modes: ['t2v', 'i2v'],
  resolutions: ['768P'],
  defaultResolution: '768P',
  durations: [6, 10],
  aspectRatios: ['16:9'],
  dropFields: ['prompt_optimizer', 'end_image_url'],
};

const NARROWINGS: Readonly<Record<string, Narrowing>> = {
  'minimax-h3': H3,
  'minimax-hailuo-02-text': HAILUO_02,
};

/**
 * What MiniMax's own API accepts (MINIMAX_OFFICIAL_ENABLED). H3 uses V2: 4-15 s, 768P/2K, first and last frame,
 * and multimodal reference; target_audio_url, seed and prompt_expansion_mode have no V2 equivalent.
 * The Hailuo models use the legacy V1 API; their per-resolution durations come from MINIMAX_LEGACY_VIDEO_MATRIX.
 * Hailuo 02 keeps the resolutions it is priced for (512P image start, 768P); 1080P has no catalogue price yet.
 */
const OFFICIAL_NARROWINGS: Readonly<Record<string, Narrowing>> = {
  'minimax-h3': {
    modes: ['t2v', 'i2v', 'ref2v'],
    resolutions: [...MINIMAX_H3_OFFICIAL_RESOLUTIONS],
    defaultResolution: '768P',
    durations: [...MINIMAX_H3_OFFICIAL_DURATIONS],
    aspectOrder: H3.aspectOrder,
    dropFields: ['target_audio_url', 'seed', 'prompt_expansion_mode'],
  },
  'minimax-hailuo-02-text': {
    modes: ['t2v', 'i2v'],
    resolutions: ['512P', '768P'],
    resolutionsByMode: { t2v: ['768P'], i2v: ['768P', '512P'] },
    defaultResolution: '768P',
    durations: [6, 10],
    aspectRatios: ['16:9'],
    dropFields: [],
    legacyModel: 'MiniMax-Hailuo-02',
  },
  'minimax-hailuo-2-3': {
    modes: ['t2v', 'i2v'],
    resolutions: ['768P', '1080P'],
    defaultResolution: '768P',
    durations: [6, 10],
    aspectRatios: ['16:9'],
    dropFields: [],
    legacyModel: 'MiniMax-Hailuo-2.3',
  },
  'minimax-hailuo-2-3-fast': {
    modes: ['i2v'],
    resolutions: ['768P', '1080P'],
    defaultResolution: '768P',
    durations: [6, 10],
    dropFields: [],
    legacyModel: 'MiniMax-Hailuo-2.3-Fast',
  },
};

export function isLlmhubMinimaxEngine(engineId: string): boolean {
  return Object.hasOwn(NARROWINGS, engineId) || Object.hasOwn(OFFICIAL_NARROWINGS, engineId);
}

/** Whether this engine's requests go to MiniMax's own API under the current switch. */
export function isMinimaxOfficialEngineRoute(engineId: string, env: Record<string, string | undefined> = process.env): boolean {
  return Object.hasOwn(OFFICIAL_NARROWINGS, engineId) && isMinimaxOfficialEnabled(env);
}

function narrowingFor(engineId: string, official: boolean): Narrowing | undefined {
  return official ? OFFICIAL_NARROWINGS[engineId] : NARROWINGS[engineId];
}

/** LLM Hub (or, with `official`, MiniMax's own API) accepts exactly these modes, resolutions and durations. */
export function isSupportedLlmhubMinimaxRequest(params: {
  engineId: string;
  mode: string;
  durationSec?: unknown;
  resolution?: unknown;
  official?: boolean;
  hasEndImage?: boolean;
}): boolean {
  const narrowing = narrowingFor(params.engineId, params.official === true);
  if (!narrowing) return !isLlmhubMinimaxEngine(params.engineId);
  if (!narrowing.modes.includes(params.mode as Mode)) return false;
  if (params.durationSec !== undefined && params.durationSec !== null
    && !narrowing.durations.includes(Number(params.durationSec))) return false;
  if (typeof params.resolution === 'string'
    && !narrowing.resolutions.includes(params.resolution.toUpperCase())) return false;
  if (narrowing.legacyModel) {
    const task = minimaxLegacyTask({ hasStartImage: params.mode === 'i2v', hasEndImage: params.hasEndImage === true });
    return isMinimaxLegacyVideoCombination({
      model: narrowing.legacyModel,
      task,
      resolution: typeof params.resolution === 'string' ? params.resolution : narrowing.defaultResolution,
      durationSec: params.durationSec === undefined || params.durationSec === null
        ? narrowing.durations[0] : Number(params.durationSec),
    });
  }
  return true;
}

const present = (value: unknown): boolean =>
  typeof value === 'string' ? value.trim().length > 0
    : Array.isArray(value) ? value.length > 0
      : value && typeof value === 'object' ? Object.keys(value).length > 0
        : value !== null && value !== undefined && value !== false;

const START_SLOTS = ['image_url', 'input_image', 'image', 'first_frame_url', 'start_image_url'];
const END_SLOTS = ['end_image_url', 'last_frame_url'];
const REFERENCE_SLOTS: Readonly<Record<string, 'image' | 'video' | 'audio'>> = {
  reference_image_urls: 'image',
  reference_images: 'image',
  image_urls: 'image',
  reference_video_urls: 'video',
  reference_audio_urls: 'audio',
};

/** Whether a request carries an end frame (request body or attachment). */
export function minimaxRequestHasEndImage(body: Record<string, unknown>): boolean {
  if (['endImageUrl', 'lastFrameUrl', 'last_frame_url', 'end_image_url'].some((field) => present(body[field]))) return true;
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  return attachments.some((item) => {
    const attachment = item && typeof item === 'object' ? item as { slotId?: unknown; fieldId?: unknown } : null;
    return END_SLOTS.includes(String(attachment?.slotId ?? attachment?.fieldId ?? '').toLowerCase());
  });
}

/**
 * Inputs MiniMax's own API cannot take for this engine and mode. Counts and media limits are enforced by the
 * engine schema before billing and again by the provider client.
 */
export function hasUnsupportedMinimaxOfficialInputs(body: Record<string, unknown>, mode: string, engineId: string): boolean {
  const narrowing = OFFICIAL_NARROWINGS[engineId];
  if (!narrowing) return true;
  if (body.audio === false || body.generate_audio === false) return true;
  const alwaysUnsupported = [
    'videoUrl', 'video_url', 'audioUrl', 'audio_url', 'multiPrompt', 'elements', 'voiceIds',
    'voiceControl', 'seed', 'cameraFixed', 'safetyChecker', 'cfgScale', 'negativePrompt', 'shotType', 'loop',
  ];
  if (alwaysUnsupported.some((field) => present(body[field]))) return true;
  const extra = body.extraInputValues && typeof body.extraInputValues === 'object'
    ? Object.keys(body.extraInputValues as Record<string, unknown>) : [];
  const allowedExtra = narrowing.legacyModel ? ['prompt_optimizer'] : [];
  if (extra.some((key) => !allowedExtra.includes(key))) return true;
  const endImage = minimaxRequestHasEndImage(body);
  const topLevelReferences = ['referenceImages', 'reference_images', 'imageUrls', 'image_urls'].some((field) => present(body[field]));
  const directImage = present(body.imageUrl) || present(body.image_url);
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  if (mode === 't2v') return endImage || topLevelReferences || directImage || attachments.length > 0;
  if (mode === 'i2v') {
    // Hailuo 2.3 / 2.3 Fast have no last-frame task; only Hailuo 02 (fl2v) and H3 take one.
    if (endImage && narrowing.legacyModel && narrowing.legacyModel !== 'MiniMax-Hailuo-02') return true;
    if (topLevelReferences) return true;
    return attachments.some((item) => {
      if (!item || typeof item !== 'object') return true;
      const attachment = item as { kind?: unknown; slotId?: unknown; fieldId?: unknown };
      const slot = String(attachment.slotId ?? attachment.fieldId ?? '').toLowerCase();
      return (attachment.kind !== 'image' && attachment.kind !== undefined)
        || ![...START_SLOTS, ...END_SLOTS].includes(slot);
    });
  }
  if (mode === 'ref2v') {
    if (endImage || directImage) return true;
    return attachments.some((item) => {
      if (!item || typeof item !== 'object') return true;
      const attachment = item as { kind?: unknown; slotId?: unknown; fieldId?: unknown };
      const slot = String(attachment.slotId ?? attachment.fieldId ?? '').toLowerCase();
      const kind = REFERENCE_SLOTS[slot];
      return !kind || (attachment.kind !== undefined && attachment.kind !== kind);
    });
  }
  return true;
}

function orderAspect<T extends string>(values: readonly T[], order: readonly string[] | undefined): T[] {
  if (!order) return [...values];
  const rank = (value: string) => { const index = order.indexOf(value); return index === -1 ? -1 : index; };
  // Ratios the order does not name (such as 'auto' for a start image) keep their place at the front.
  return [...values].sort((left, right) => rank(left) - rank(right));
}

function narrowField(field: EngineInputField, narrowing: Narrowing): EngineInputField {
  if (field.id === 'resolution') {
    return { ...field, values: [...narrowing.resolutions], default: narrowing.defaultResolution };
  }
  if (field.id === 'duration') {
    const values = narrowing.durations.map(String);
    const requested = typeof field.default === 'string' ? Number(field.default) : NaN;
    return {
      ...field,
      values,
      default: narrowing.durations.includes(requested) ? field.default : values[0],
      min: narrowing.durations[0],
      max: narrowing.durations[narrowing.durations.length - 1],
    };
  }
  if (field.id === 'aspect_ratio' && narrowing.aspectRatios) {
    return { ...field, values: [...narrowing.aspectRatios], default: narrowing.aspectRatios[0] };
  }
  if (field.id === 'aspect_ratio' && narrowing.aspectOrder && field.values) {
    const ordered = orderAspect(field.values as string[], narrowing.aspectOrder);
    return { ...field, values: ordered, default: field.default && ordered.includes(String(field.default)) ? field.default : ordered[0] };
  }
  return field;
}

function narrowModeCaps(caps: EngineModeUiCaps, narrowing: Narrowing, mode: Mode): EngineModeUiCaps {
  return {
    ...caps,
    ...(caps.duration ? { duration: { ...caps.duration, options: [...narrowing.durations] } } : {}),
    ...(caps.resolution ? { resolution: [...(narrowing.resolutionsByMode?.[mode] ?? narrowing.resolutions)] } : {}),
    ...(caps.aspectRatio && narrowing.aspectRatios ? { aspectRatio: [...narrowing.aspectRatios] } : {}),
    ...(caps.aspectRatio && !narrowing.aspectRatios && narrowing.aspectOrder
      ? { aspectRatio: orderAspect(caps.aspectRatio, narrowing.aspectOrder) } : {}),
  };
}

/** The narrowing applies only while LLM Hub is the way MiniMax runs; with fal configured the full engine is offered. */
export function llmhubIsMinimaxRoute(env: NodeJS.ProcessEnv = process.env): boolean {
  const on = (value: string | undefined) => ['1', 'true', 'yes', 'on'].includes((value ?? '').trim().toLowerCase());
  return on(env.LLMHUB_INFERENCE_ROUTING_ENABLED) && Boolean(env.LLMHUB_API_KEY?.trim())
    && !(env.FAL_KEY?.trim() || env.FAL_API_KEY?.trim());
}

/**
 * The workspace sees what the active MiniMax route accepts: MiniMax's own API when MINIMAX_OFFICIAL_ENABLED is on
 * (it wins over fal, which Keyvo does not configure), otherwise LLM Hub when it is the only route.
 */
export function narrowToLlmhubMinimax<T extends EngineCaps>(engine: T, env: NodeJS.ProcessEnv = process.env): T {
  const official = isMinimaxOfficialEngineRoute(engine.id, env);
  const narrowing = official ? OFFICIAL_NARROWINGS[engine.id] : NARROWINGS[engine.id];
  if (!narrowing || (!official && !llmhubIsMinimaxRoute(env))) return engine;
  const modes = engine.modes.filter((mode) => narrowing.modes.includes(mode));
  const schema = engine.inputSchema;
  return {
    ...engine,
    modes,
    maxDurationSec: narrowing.durations[narrowing.durations.length - 1],
    resolutions: engine.resolutions.filter((value) => narrowing.resolutions.includes(String(value).toUpperCase())),
    ...(narrowing.aspectRatios ? { aspectRatios: engine.aspectRatios.filter((value) => narrowing.aspectRatios!.includes(value)) }
      : narrowing.aspectOrder ? { aspectRatios: orderAspect(engine.aspectRatios, narrowing.aspectOrder) } : {}),
    ...(schema ? { inputSchema: {
      ...schema,
      optional: schema.optional
        ?.filter((field) => !narrowing.dropFields.includes(field.id))
        .filter((field) => !field.modes || field.modes.some((mode) => narrowing.modes.includes(mode)))
        .map((field) => narrowField(field, narrowing)),
      required: schema.required?.map((field) => narrowField(field, narrowing)),
    } } : {}),
    ...(engine.modeCaps ? { modeCaps: Object.fromEntries(
      Object.entries(engine.modeCaps)
        .filter(([mode]) => narrowing.modes.includes(mode as Mode))
        .map(([mode, caps]) => [mode, narrowModeCaps(caps as EngineModeUiCaps, narrowing, mode as Mode)]),
    ) } : {}),
  };
}
