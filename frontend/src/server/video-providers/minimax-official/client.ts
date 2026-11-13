/**
 * MiniMax official video APIs at https://api.minimax.cn.
 * - V2 (`/v2/video_generation`) serves MiniMax-H3 and MiniMax-H3-Max: text, first/last frame, and multimodal
 *   references. H3-Max takes 5-15 s at 480P/768P and `extra.prompt_expansion_mode`.
 * - Legacy V1 (`/v1/video_generation`) serves the Hailuo models: text, first frame, first + last frame.
 * The class mirrors LlmhubVideoClient's create/status/content shapes so submission and polling need no changes.
 * Docs (checked 2026-11-11): platform.minimaxi.com/docs/api-reference/video-generation-v2-create.md,
 * -v2-query.md, video-generation-t2v.md, -i2v.md, -fl2v.md, -query.md, -download.md, errorcode.md, guides/rate-limits.md.
 */
import {
  isMinimaxLegacyVideoCombination,
  isMinimaxLegacyVideoModel,
  MINIMAX_H3_MAX_PROMPT_EXPANSION_MODES,
  MINIMAX_H3_OFFICIAL_RATIOS,
  MINIMAX_H3_PROMPT_MAX_CHARS,
  MINIMAX_H3_REFERENCE_LIMITS,
  MINIMAX_LEGACY_PROMPT_MAX_CHARS,
  MINIMAX_V2_MODEL_LIMITS,
  minimaxLegacyTask,
} from '@/lib/minimax-video-limits';
import { acquireMinimaxSlot } from '@/server/minimax-rate-limit';

const DEFAULT_BASE_URL = 'https://api.minimax.cn';

/** Models served by the V2 API. They share its 300 RPM bucket and 30 in-flight tasks. */
export const MINIMAX_OFFICIAL_MODELS = new Set(['MiniMax-H3', 'MiniMax-H3-Max']);
/** Models served by the legacy V1 API. */
export const MINIMAX_LEGACY_MODELS = new Set(['MiniMax-Hailuo-2.3', 'MiniMax-Hailuo-2.3-Fast', 'MiniMax-Hailuo-02']);

/** Documented in-flight task cap of the V2 API per account (guides/rate-limits). */
export const MINIMAX_V2_MAX_INFLIGHT_TASKS = 30;

/** Legacy task IDs are numeric too, so they are stored with this prefix to keep their query/download path. */
const LEGACY_TASK_PREFIX = 'mmv1-';

/** Canonical English job messages; lib/minimax-failure-messages.ts localizes them. */
export const MINIMAX_MESSAGES = {
  rateLimited: 'MiniMax is receiving too many requests right now. Please try again in about a minute.',
  overloaded: 'MiniMax is overloaded right now. Please try again in a few minutes.',
  inputSensitive: 'MiniMax rejected the prompt or reference media during its content review.',
  outputSensitive: 'MiniMax blocked the generated video during its content review.',
  taskExpired: 'The MiniMax task is older than 7 days and can no longer be queried.',
  invalidRequest: 'MiniMax rejected the render settings.',
  balance: 'The MiniMax service account has insufficient balance.',
} as const;

/** Official V2 task IDs are numeric strings; LLM Hub IDs always carry a letter prefix. */
export function isMinimaxOfficialTaskId(id: string): boolean {
  return /^\d{6,}$/.test(id);
}

export function isMinimaxLegacyTaskId(id: string): boolean {
  return new RegExp(`^${LEGACY_TASK_PREFIX}\\d{6,}$`).test(id);
}

export function isMinimaxOfficialEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return ['1', 'true', 'yes', 'on'].includes((env.MINIMAX_OFFICIAL_ENABLED ?? '').trim().toLowerCase())
    && Boolean(env.MINIMAX_API_KEY?.trim());
}

export function shouldUseMinimaxOfficial(model: string, env: Record<string, string | undefined> = process.env): boolean {
  return (MINIMAX_OFFICIAL_MODELS.has(model) || MINIMAX_LEGACY_MODELS.has(model)) && isMinimaxOfficialEnabled(env);
}

type TaskStatus = 'queued' | 'running' | 'completed' | 'failed';
export type MinimaxStatusResult = {
  status: TaskStatus;
  progress: number;
  raw: unknown;
  /** Canonical English reason for a failed task, when MiniMax gave one we recognise. */
  failureMessage?: string;
  errorCode?: string;
};

export type MinimaxOfficialError = Error & {
  status: number;
  detail?: string;
  code?: string;
  /** No task exists after this error, so the charge can be refunded. */
  definiteRejection?: boolean;
  userMessage?: string;
};

function minimaxError(message: string, status: number, extra: Partial<MinimaxOfficialError> = {}): MinimaxOfficialError {
  const error = new Error(message) as MinimaxOfficialError;
  error.status = status;
  Object.assign(error, extra);
  return error;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/** Internal error code: V2 puts it in parentheses at the end of the message, V1 in base_resp.status_code. */
function internalCode(message: string | undefined): string | undefined {
  return message?.match(/\((\d{4,5})\)\s*$/)?.[1];
}

/** Message by internal code (errorcode.md). */
function messageForCode(code: string | undefined, status?: number): string | undefined {
  if (code === '1002' || code === '1039' || code === '1041' || code === '1045' || code === '2045' || status === 429) {
    return MINIMAX_MESSAGES.rateLimited;
  }
  if (status === 529 || code === '2064') return MINIMAX_MESSAGES.overloaded;
  if (code === '1026' || code === '1040' || code === '1046') return MINIMAX_MESSAGES.inputSensitive;
  if (code === '1027') return MINIMAX_MESSAGES.outputSensitive;
  if (code === '1008' || status === 402) return MINIMAX_MESSAGES.balance;
  if (code === '2013' || code === '2014' || status === 400) return MINIMAX_MESSAGES.invalidRequest;
  return undefined;
}

/**
 * HTTP answers after which no task exists: 4xx (400 parameters, 401 key, 402 balance, 422 sensitive content,
 * 429 rate limit) and 529 overloaded. A 500 or timeout stays ambiguous because there is no idempotency key.
 */
function isDefiniteHttpRejection(status: number): boolean {
  return (status >= 400 && status < 500) || status === 529;
}

function localRateLimit(bucket: 'video_v2' | 'video_v1'): void {
  const slot = acquireMinimaxSlot(bucket);
  if (!slot.ok) {
    throw minimaxError('MiniMax request rate limit reached locally.', 429, {
      code: 'local_rate_limit', definiteRejection: true, userMessage: MINIMAX_MESSAGES.rateLimited,
    });
  }
}

function invalid(message: string): MinimaxOfficialError {
  return minimaxError(message, 400, { code: 'local_validation', definiteRejection: true, userMessage: MINIMAX_MESSAGES.invalidRequest });
}

export type MinimaxOfficialCreateInput = {
  model: string;
  prompt: string;
  seconds: number;
  resolution?: string | null;
  aspectRatio?: string | null;
  imageUrl?: string | null;
  endImageUrl?: string | null;
  referenceImageUrls?: readonly string[];
  referenceVideoUrls?: readonly string[];
  referenceAudioUrls?: readonly string[];
  /** Legacy API only; MiniMax defaults it to true. */
  promptOptimizer?: boolean | null;
  /** MiniMax-H3-Max only (`extra.prompt_expansion_mode`); MiniMax defaults it to `balanced`. */
  promptExpansionMode?: string | null;
};

export class MinimaxOfficialVideoClient {
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey = process.env.MINIMAX_API_KEY,
    private readonly fetchFn: typeof fetch = fetch,
    /** Turns a stored media URL into one MiniMax can fetch (a signed URL for our storage). */
    private readonly resolveMediaUrl: (url: string) => Promise<string> = async (url) => url,
    baseUrl = process.env.MINIMAX_API_BASE,
  ) {
    this.baseUrl = (baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  private auth(): Record<string, string> {
    if (!this.apiKey?.trim()) throw new Error('MiniMax API key is missing.');
    return { Authorization: `Bearer ${this.apiKey.trim()}` };
  }

  async create(input: MinimaxOfficialCreateInput): Promise<{ id: string; raw: unknown }> {
    if (isMinimaxLegacyVideoModel(input.model)) return this.createLegacy(input);
    if (!MINIMAX_OFFICIAL_MODELS.has(input.model)) throw invalid(`Unsupported MiniMax video model: ${input.model}`);
    return this.createV2(input);
  }

  private async createV2(input: MinimaxOfficialCreateInput): Promise<{ id: string; raw: unknown }> {
    const model = input.model as keyof typeof MINIMAX_V2_MODEL_LIMITS;
    const limits = MINIMAX_V2_MODEL_LIMITS[model];
    const prompt = input.prompt?.trim() ?? '';
    if (!prompt) throw invalid(`${model} needs a prompt.`);
    if ([...prompt].length > MINIMAX_H3_PROMPT_MAX_CHARS) throw invalid(`${model} prompts are limited to ${MINIMAX_H3_PROMPT_MAX_CHARS} characters.`);
    if (!limits.durations.includes(input.seconds)) {
      throw invalid(`${model} duration must be an integer from ${limits.durations[0]} through 15 seconds.`);
    }
    const resolution = (input.resolution ?? '768P').toUpperCase();
    if (!limits.resolutions.includes(resolution)) {
      throw invalid(`${model} accepts only ${limits.resolutions.join(' and ')}.`);
    }
    const promptExpansionMode = input.promptExpansionMode?.trim() || null;
    if (promptExpansionMode && (model !== 'MiniMax-H3-Max'
      || !(MINIMAX_H3_MAX_PROMPT_EXPANSION_MODES as readonly string[]).includes(promptExpansionMode))) {
      // The schema refuses undeclared `extra` fields and values (additionalProperties: false).
      throw invalid(`${model} does not accept prompt expansion mode ${promptExpansionMode}.`);
    }
    const images = input.referenceImageUrls ?? [];
    const videos = input.referenceVideoUrls ?? [];
    const audio = input.referenceAudioUrls ?? [];
    const hasReferences = images.length + videos.length + audio.length > 0;
    const hasFrames = Boolean(input.imageUrl || input.endImageUrl);
    // Image-to-video and multimodal reference are mutually exclusive in one request.
    if (hasReferences && hasFrames) throw invalid('MiniMax-H3 cannot combine start/end frames with references.');
    if (images.length > MINIMAX_H3_REFERENCE_LIMITS.image) throw invalid('MiniMax-H3 accepts at most 9 reference images.');
    if (videos.length > MINIMAX_H3_REFERENCE_LIMITS.video) throw invalid('MiniMax-H3 accepts at most 3 reference videos.');
    if (audio.length > MINIMAX_H3_REFERENCE_LIMITS.audio) throw invalid('MiniMax-H3 accepts at most 3 reference audio clips.');

    const content: Array<Record<string, unknown>> = [{ type: 'text', text: prompt }];
    if (input.imageUrl) {
      content.push({ type: 'image_url', image_url: { url: await this.resolveMediaUrl(input.imageUrl) }, role: 'first_frame' });
    }
    if (input.endImageUrl) {
      content.push({ type: 'image_url', image_url: { url: await this.resolveMediaUrl(input.endImageUrl) }, role: 'last_frame' });
    }
    for (const url of images) {
      content.push({ type: 'image_url', image_url: { url: await this.resolveMediaUrl(url) }, role: 'reference_image' });
    }
    for (const url of videos) {
      content.push({ type: 'video_url', video_url: { url: await this.resolveMediaUrl(url) }, role: 'reference_video' });
    }
    for (const url of audio) {
      content.push({ type: 'audio_url', audio_url: { url: await this.resolveMediaUrl(url) }, role: 'reference_audio' });
    }
    const requested = input.aspectRatio?.trim();
    const fixedRatio = requested && (MINIMAX_H3_OFFICIAL_RATIOS as readonly string[]).includes(requested) ? requested : null;
    // Text-to-video needs a fixed ratio (adaptive is refused); frames decide the ratio themselves;
    // references take a fixed ratio or default to adaptive.
    const ratio = hasFrames ? null : hasReferences ? fixedRatio : fixedRatio ?? '16:9';
    const body: Record<string, unknown> = {
      model: input.model,
      content,
      resolution,
      duration: input.seconds,
      ...(ratio ? { ratio } : {}),
      ...(promptExpansionMode ? { extra: { prompt_expansion_mode: promptExpansionMode } } : {}),
    };
    localRateLimit('video_v2');
    const response = await this.fetchFn(`${this.baseUrl}/v2/video_generation`, {
      method: 'POST',
      headers: { ...this.auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const raw = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = record(record(raw)?.error);
      const message = typeof detail?.message === 'string' ? detail.message.trim().slice(0, 300) : undefined;
      const code = internalCode(message);
      throw minimaxError(`MiniMax video submission failed (${response.status}).`, response.status, {
        detail: message,
        code: code ?? (typeof detail?.type === 'string' ? detail.type : undefined),
        definiteRejection: isDefiniteHttpRejection(response.status),
        userMessage: messageForCode(code, response.status),
      });
    }
    const id = record(raw)?.task_id;
    if (typeof id !== 'string' || !id.trim()) throw new Error('MiniMax video response has no task ID.');
    return { id, raw };
  }

  private async createLegacy(input: MinimaxOfficialCreateInput): Promise<{ id: string; raw: unknown }> {
    const prompt = input.prompt?.trim() ?? '';
    if ([...prompt].length > MINIMAX_LEGACY_PROMPT_MAX_CHARS) {
      throw invalid(`${input.model} prompts are limited to ${MINIMAX_LEGACY_PROMPT_MAX_CHARS} characters.`);
    }
    if (input.referenceImageUrls?.length || input.referenceVideoUrls?.length || input.referenceAudioUrls?.length) {
      throw invalid(`${input.model} does not take reference media.`);
    }
    if (input.endImageUrl && !input.imageUrl) throw invalid('A last frame needs a first frame.');
    const task = minimaxLegacyTask({ hasStartImage: Boolean(input.imageUrl), hasEndImage: Boolean(input.endImageUrl) });
    const resolution = (input.resolution ?? '768P').toUpperCase();
    if (!isMinimaxLegacyVideoCombination({ model: input.model, task, resolution, durationSec: input.seconds })) {
      throw invalid(`${input.model} does not support ${task} at ${resolution} for ${input.seconds} s.`);
    }
    if (task === 't2v' && !prompt) throw invalid(`${input.model} needs a prompt.`);
    const body: Record<string, unknown> = {
      model: input.model,
      ...(prompt ? { prompt } : {}),
      ...(input.imageUrl ? { first_frame_image: await this.resolveMediaUrl(input.imageUrl) } : {}),
      ...(input.endImageUrl ? { last_frame_image: await this.resolveMediaUrl(input.endImageUrl) } : {}),
      duration: input.seconds,
      resolution,
      ...(typeof input.promptOptimizer === 'boolean' ? { prompt_optimizer: input.promptOptimizer } : {}),
    };
    localRateLimit('video_v1');
    const response = await this.fetchFn(`${this.baseUrl}/v1/video_generation`, {
      method: 'POST',
      headers: { ...this.auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const raw = await response.json().catch(() => null);
    const base = record(record(raw)?.base_resp);
    const statusCode = typeof base?.status_code === 'number' ? base.status_code : null;
    if (!response.ok || (statusCode !== null && statusCode !== 0)) {
      const code = statusCode !== null ? String(statusCode) : undefined;
      // V1 answers business errors with HTTP 200 and a non-zero status_code; none of them creates a task.
      const definite = response.ok ? true : isDefiniteHttpRejection(response.status);
      const status = response.ok ? (code === '1002' || code === '1039' ? 429 : 400) : response.status;
      throw minimaxError(`MiniMax video submission failed (${response.ok ? `code ${code}` : response.status}).`, status, {
        detail: typeof base?.status_msg === 'string' ? base.status_msg.slice(0, 300) : undefined,
        code,
        definiteRejection: definite,
        userMessage: messageForCode(code, status),
      });
    }
    const id = record(raw)?.task_id;
    if (typeof id !== 'string' || !/^\d{6,}$/.test(id.trim())) throw new Error('MiniMax video response has no task ID.');
    return { id: `${LEGACY_TASK_PREFIX}${id.trim()}`, raw };
  }

  private async task(id: string): Promise<{ task: Record<string, unknown>; raw: unknown }> {
    const response = await this.fetchFn(`${this.baseUrl}/v2/query/video_generation/${encodeURIComponent(id)}`, {
      headers: this.auth(),
      signal: AbortSignal.timeout(30_000),
    });
    const raw = await response.json().catch(() => null);
    if (!response.ok) {
      const message = record(record(raw)?.error)?.message;
      // Tasks are queryable for 7 days only; older IDs answer "invalid task_id".
      if (typeof message === 'string' && /invalid task_?id/i.test(message)) {
        throw minimaxError(MINIMAX_MESSAGES.taskExpired, response.status, { code: 'task_expired' });
      }
      throw minimaxError(`MiniMax video status failed (${response.status}).`, response.status);
    }
    const task = record(record(raw)?.task);
    if (!task) throw new Error('MiniMax video status has no task.');
    return { task, raw };
  }

  private async legacyTask(id: string): Promise<{ task: Record<string, unknown>; raw: unknown }> {
    const taskId = id.slice(LEGACY_TASK_PREFIX.length);
    const response = await this.fetchFn(
      `${this.baseUrl}/v1/query/video_generation?task_id=${encodeURIComponent(taskId)}`,
      { headers: this.auth(), signal: AbortSignal.timeout(30_000) },
    );
    const raw = await response.json().catch(() => null);
    const task = record(raw);
    if (!response.ok || !task) throw minimaxError(`MiniMax video status failed (${response.status}).`, response.status);
    return { task, raw };
  }

  async status(id: string): Promise<MinimaxStatusResult> {
    if (isMinimaxLegacyTaskId(id)) return this.legacyStatus(id);
    const { task, raw } = await this.task(id);
    const status = typeof task.status === 'string' ? task.status.toLowerCase() : '';
    switch (status) {
      case 'queued': return { status: 'queued', progress: 0, raw };
      case 'running': return { status: 'running', progress: 0, raw };
      case 'succeeded': return { status: 'completed', progress: 100, raw };
      case 'failed':
      case 'cancelled': {
        const error = record(task.error);
        const code = typeof error?.code === 'string' ? error.code : typeof error?.code === 'number' ? String(error.code) : undefined;
        const failureMessage = messageForCode(code);
        return { status: 'failed', progress: 0, raw, ...(code ? { errorCode: code } : {}), ...(failureMessage ? { failureMessage } : {}) };
      }
      default: throw new Error('MiniMax video status is unknown.');
    }
  }

  private async legacyStatus(id: string): Promise<MinimaxStatusResult> {
    const { task, raw } = await this.legacyTask(id);
    const base = record(task.base_resp);
    const code = typeof base?.status_code === 'number' ? base.status_code : 0;
    const status = typeof task.status === 'string' ? task.status.toLowerCase() : '';
    if (status === 'fail' || (code !== 0 && code !== 1002 && code !== 1039 && !status)) {
      const errorCode = code ? String(code) : undefined;
      const failureMessage = messageForCode(errorCode);
      return { status: 'failed', progress: 0, raw, ...(errorCode ? { errorCode } : {}), ...(failureMessage ? { failureMessage } : {}) };
    }
    switch (status) {
      case 'preparing':
      case 'queueing': return { status: 'queued', progress: 0, raw };
      case 'processing': return { status: 'running', progress: 0, raw };
      case 'success': return { status: 'completed', progress: 100, raw };
      default: throw new Error('MiniMax video status is unknown.');
    }
  }

  async content(id: string): Promise<Response> {
    let url: unknown;
    if (isMinimaxLegacyTaskId(id)) {
      const { task } = await this.legacyTask(id);
      const fileId = task.file_id;
      if (String(task.status).toLowerCase() !== 'success' || (typeof fileId !== 'string' && typeof fileId !== 'number')) {
        throw new Error('MiniMax video content is unavailable.');
      }
      // The download URL is valid for one hour; it is fetched straight away and copied into our storage.
      const response = await this.fetchFn(`${this.baseUrl}/v1/files/retrieve?file_id=${encodeURIComponent(String(fileId))}`, {
        headers: this.auth(),
        signal: AbortSignal.timeout(30_000),
      });
      const raw = record(await response.json().catch(() => null));
      url = record(raw?.file)?.download_url;
      if (!response.ok) throw new Error(`MiniMax video file lookup failed (${response.status}).`);
    } else {
      const { task } = await this.task(id);
      url = record(task.content)?.url;
      if (task.status !== 'succeeded') throw new Error('MiniMax video content is unavailable.');
    }
    if (typeof url !== 'string') throw new Error('MiniMax video content is unavailable.');
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new Error('MiniMax video content URL is invalid.'); }
    // The URL is time limited and signed; accept only HTTPS on a named host, never an IP literal.
    if (parsed.protocol !== 'https:' || /^[\d.]+$|^\[/.test(parsed.hostname)) {
      throw new Error('MiniMax video content URL is not allowed.');
    }
    const response = await this.fetchFn(url, { signal: AbortSignal.timeout(300_000) });
    if (!response.ok || !response.headers.get('content-type')?.toLowerCase().includes('video/mp4')) {
      throw new Error(`MiniMax video content is unavailable (${response.status}).`);
    }
    return response;
  }
}
