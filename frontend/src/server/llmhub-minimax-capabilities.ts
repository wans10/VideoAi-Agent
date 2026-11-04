import type { EngineCaps, EngineInputField, EngineModeUiCaps, Mode } from '@/types/engines';

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

export function isLlmhubMinimaxEngine(engineId: string): boolean {
  return Object.hasOwn(NARROWINGS, engineId);
}

/** The LLM Hub model name per engine; LLM Hub accepts exactly these resolutions and durations. */
export function isSupportedLlmhubMinimaxRequest(params: {
  engineId: string;
  mode: string;
  durationSec?: unknown;
  resolution?: unknown;
}): boolean {
  const narrowing = NARROWINGS[params.engineId];
  if (!narrowing) return true;
  if (!narrowing.modes.includes(params.mode as Mode)) return false;
  if (params.durationSec !== undefined && params.durationSec !== null
    && !narrowing.durations.includes(Number(params.durationSec))) return false;
  if (typeof params.resolution === 'string'
    && !narrowing.resolutions.includes(params.resolution.toUpperCase())) return false;
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

function narrowModeCaps(caps: EngineModeUiCaps, narrowing: Narrowing): EngineModeUiCaps {
  return {
    ...caps,
    ...(caps.duration ? { duration: { ...caps.duration, options: [...narrowing.durations] } } : {}),
    ...(caps.resolution ? { resolution: [...narrowing.resolutions] } : {}),
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

export function narrowToLlmhubMinimax<T extends EngineCaps>(engine: T, env: NodeJS.ProcessEnv = process.env): T {
  const narrowing = NARROWINGS[engine.id];
  if (!narrowing || !llmhubIsMinimaxRoute(env)) return engine;
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
        .map(([mode, caps]) => [mode, narrowModeCaps(caps as EngineModeUiCaps, narrowing)]),
    ) } : {}),
  };
}
