/**
 * Seed Audio 1.0 through the Volcengine speech API (non-streaming), used instead of fal's
 * bytedance/seed-audio-1.0 endpoint. It returns the same `{ data: { audio: { url } } }` shape the runner reads.
 * Reference voices are not supported here: audio references are refused rather than silently ignored.
 *
 * Contract (verified 2026-11-11): https://docs.volcengine.com/docs/doubao-voice/audio-generation-http
 * (POST /api/v3/tts/create, single `X-Api-Key` header from the new speech console, synchronous response with
 * top-level `audio`, `duration`, `original_duration` (billing basis, max 120 s) and a 2-hour `url`; `text_prompt`
 * up to 3000 characters). Error codes: https://docs.volcengine.com/docs/6561/2534853.
 */
import { isDoubaoSeedVoice } from '@/lib/audio-generation';

const DEFAULT_BASE_URL = 'https://openspeech.bytedance.com';
const DEFAULT_MODEL = 'seed-audio-1.0';
export const SEED_AUDIO_TEXT_PROMPT_MAX_LENGTH = 3000;
const REQUEST_TIMEOUT_MS = 300_000;
const FORMATS = new Set(['wav', 'mp3', 'pcm', 'ogg_opus']);
const RATES: Record<string, number[]> = {
  wav: [8000, 16000, 24000, 32000, 40000, 44100, 48000],
  pcm: [8000, 16000, 24000, 32000, 40000, 44100, 48000],
  mp3: [8000, 16000, 24000, 32000, 44100, 48000],
  ogg_opus: [48000],
};

type Json = Record<string, unknown>;

/** `invalid_request`, `content_rejected` and `auth` are definite rejections: nothing was generated or billed. */
export type SeedAudioFailureKind = 'invalid_request' | 'content_rejected' | 'auth' | 'rate_limited' | 'provider_error';

export class SeedAudioError extends Error {
  readonly kind: SeedAudioFailureKind;
  constructor(message: string, readonly status: number | null, readonly code: number | null, kind?: SeedAudioFailureKind) {
    super(message);
    this.name = 'SeedAudioError';
    this.kind = kind ?? classifySeedAudioFailure(status, code);
  }
}

// Documented audio-generation codes (error-code page above). 55001310/55001311 are server-side safety checks on the
// generated audio and are reported as content rejections.
const CONTENT_REJECTED_CODES = new Set([45001125, 45001104, 45001127, 45001130, 55001310, 55001311]);
const INVALID_REQUEST_CODES = new Set([45001001, 45001115, 45001116, 45001117, 45001131, 45001132, 40000020, 40402002, 45000001, 45002000, 45002001]);

export function classifySeedAudioFailure(status: number | null, code: number | null): SeedAudioFailureKind {
  if (code !== null && CONTENT_REJECTED_CODES.has(code)) return 'content_rejected';
  if (code !== null && INVALID_REQUEST_CODES.has(code)) return 'invalid_request';
  if (status === 401 || status === 403 || code === 45000030) return 'auth';
  if (status === 429) return 'rate_limited';
  if (status !== null && status >= 400 && status < 500) return 'invalid_request';
  return 'provider_error';
}

const FAILURE_LABELS: Record<SeedAudioFailureKind, string> = {
  invalid_request: 'rejected the request',
  content_rejected: 'rejected the content in review',
  auth: 'refused the API key or the service is not granted',
  rate_limited: 'is rate limited',
  provider_error: 'failed',
};

function record(value: unknown): Json | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : null;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

/** Translates the fal request (speed/volume multipliers, `voice` name) into the Volcengine one. */
export function buildSeedAudioDirectRequest(input: Json, model: string = DEFAULT_MODEL): Json {
  if (Array.isArray(input.audio_urls) && input.audio_urls.length) {
    throw new SeedAudioError('Reference voices are not available on the mainland Seed Audio API.', null, null, 'invalid_request');
  }
  if (typeof input.prompt !== 'string' || !input.prompt.trim()) {
    throw new SeedAudioError('Seed Audio needs a text prompt.', null, null, 'invalid_request');
  }
  if (input.prompt.length > SEED_AUDIO_TEXT_PROMPT_MAX_LENGTH) {
    throw new SeedAudioError(
      `Seed Audio text is limited to ${SEED_AUDIO_TEXT_PROMPT_MAX_LENGTH} characters.`, null, null, 'invalid_request');
  }
  const format = typeof input.output_format === 'string' && FORMATS.has(input.output_format) ? input.output_format : 'mp3';
  const rate = typeof input.sample_rate === 'number' && RATES[format].includes(input.sample_rate)
    ? input.sample_rate : RATES[format].includes(24000) ? 24000 : RATES[format][0];
  const audioConfig: Json = { format, sample_rate: rate };
  // Multipliers 0.5..2 map onto -50..100 (0 = unchanged).
  if (typeof input.speed === 'number' && input.speed !== 1) audioConfig.speech_rate = clamp((input.speed - 1) * 100, -50, 100);
  if (typeof input.volume === 'number' && input.volume !== 1) audioConfig.loudness_rate = clamp((input.volume - 1) * 100, -50, 100);
  if (typeof input.pitch === 'number' && input.pitch !== 0) audioConfig.pitch_rate = clamp(input.pitch, -12, 12);
  return {
    model,
    text_prompt: input.prompt,
    // fal voice names do not exist here; without a Doubao speaker the voice follows the prompt.
    ...(isDoubaoSeedVoice(input.voice) ? { speaker: input.voice } : {}),
    audio_config: audioConfig,
  };
}

export async function subscribeSeedAudio(
  input: Json,
  options: { apiKey?: string; baseUrl?: string; model?: string; fetchFn?: typeof fetch } = {},
): Promise<{ data: Json; requestId?: string | null }> {
  const apiKey = (options.apiKey ?? process.env.SEED_AUDIO_API_KEY)?.trim();
  if (!apiKey) throw new SeedAudioError('Seed Audio API key is missing.', null, null, 'auth');
  const model = (options.model ?? process.env.SEED_AUDIO_MODEL)?.trim() || DEFAULT_MODEL;
  const body = buildSeedAudioDirectRequest(input, model);
  const baseUrl = (options.baseUrl ?? process.env.SEED_AUDIO_API_BASE)?.trim().replace(/\/+$/, '') || DEFAULT_BASE_URL;
  const response = await (options.fetchFn ?? fetch)(`${baseUrl}/api/v3/tts/create`, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'X-Api-Request-Id': crypto.randomUUID(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const raw = record(await response.json().catch(() => null));
  const code = typeof raw?.code === 'number' ? raw.code : null;
  if (!response.ok || (code !== null && code !== 0 && code !== 20000000)) {
    const kind = classifySeedAudioFailure(response.status, code);
    const detail = [response.ok ? null : response.status, code !== null ? `code ${code}` : null].filter(Boolean).join(', ');
    throw new SeedAudioError(`Seed Audio ${FAILURE_LABELS[kind]} (${detail}).`, response.status, code, kind);
  }
  const url = raw?.url;
  if (typeof url !== 'string' || !/^https:\/\//i.test(url)) {
    throw new SeedAudioError('Seed Audio returned no audio URL.', response.status, code, 'provider_error');
  }
  return {
    data: { audio: { url }, duration: raw?.original_duration ?? raw?.duration ?? null },
    requestId: response.headers.get('X-Tt-Logid'),
  };
}
