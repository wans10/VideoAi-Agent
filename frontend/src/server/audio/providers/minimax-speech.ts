/**
 * MiniMax Speech through the official mainland API (T2A V2), used instead of fal's speech-02-hd endpoint.
 * It answers with the same `{ data: { audio: url } }` shape the fal runner already reads.
 * Docs: https://platform.minimaxi.com/docs/api-reference/speech-t2a-http.md (server https://api.minimax.cn).
 */
import { acquireMinimaxSlot } from '@/server/minimax-rate-limit';
import {
  isMinimaxSpeechModel,
  LEGACY_MINIMAX_SPEECH_MODEL,
  MINIMAX_SPEECH_LIMITS,
  minimaxSpeechEmotions,
  minimaxSpeechSupportsLanguage,
  type AudioMinimaxSpeechModel,
} from '@/lib/minimax-speech-models';

const DEFAULT_BASE_URL = 'https://api.minimax.cn';
/** 1002 RPM limit, 1039 TPM limit, 2045 request growth limit (errorcode page). */
const RATE_LIMIT_CODES = new Set([1002, 1039, 2045]);

type Json = Record<string, unknown>;

function record(value: unknown): Json | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : null;
}

export type MinimaxSpeechErrorKind = 'rate_limited' | 'invalid_request' | 'provider';

export class MinimaxSpeechError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: number | null,
    readonly kind: MinimaxSpeechErrorKind = 'provider',
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = 'MinimaxSpeechError';
  }
}

/** Marker kept in the provider failure message so the audio route can tell a rate limit apart. */
export const MINIMAX_SPEECH_RATE_LIMIT_MARKER = '[minimax_rate_limited]';

function resolveModel(value: unknown): AudioMinimaxSpeechModel {
  if (value == null) return LEGACY_MINIMAX_SPEECH_MODEL;
  if (!isMinimaxSpeechModel(value)) throw new MinimaxSpeechError('MiniMax speech model is unsupported.', null, null, 'invalid_request');
  return value;
}

function invalid(message: string): never {
  throw new MinimaxSpeechError(message, null, null, 'invalid_request');
}

/** Translates the request the fal builder produces into the official request, dropping fal-only fields. */
export function buildMinimaxSpeechRequest(input: Json): Json {
  const model = resolveModel(input.model);
  const voice = record(input.voice_setting) ?? {};
  const audio = record(input.audio_setting) ?? {};
  const language = typeof input.language_boost === 'string' && input.language_boost.trim() ? input.language_boost.trim() : 'auto';
  const text = typeof input.text === 'string' ? input.text : '';
  const limits = MINIMAX_SPEECH_LIMITS;
  if (!text.trim() || text.length > limits.textMaxChars) invalid('MiniMax speech text must be 1 to 9999 characters.');
  if (typeof voice.speed === 'number' && !(voice.speed >= limits.speed.min && voice.speed <= limits.speed.max)) invalid('MiniMax speech speed is out of range.');
  if (typeof voice.vol === 'number' && !(voice.vol > limits.vol.exclusiveMin && voice.vol <= limits.vol.max)) invalid('MiniMax speech volume is out of range.');
  if (typeof voice.pitch === 'number' && !(Number.isInteger(voice.pitch) && voice.pitch >= limits.pitch.min && voice.pitch <= limits.pitch.max)) {
    invalid('MiniMax speech pitch must be an integer from -12 to 12.');
  }
  const sampleRate = typeof audio.sample_rate === 'number' ? audio.sample_rate : 32000;
  if (!(limits.sampleRates as readonly number[]).includes(sampleRate)) invalid('MiniMax speech sample rate is unsupported.');
  const channel = typeof audio.channel === 'number' ? audio.channel : 1;
  if (!(limits.channels as readonly number[]).includes(channel)) invalid('MiniMax speech channel count is unsupported.');
  if (!minimaxSpeechSupportsLanguage(model, language)) invalid('This MiniMax speech model does not support the selected language.');
  // The model picks an emotion itself; an emotion the model does not accept is simply not sent.
  const emotion = typeof voice.emotion === 'string' && minimaxSpeechEmotions(model).includes(voice.emotion) ? voice.emotion : undefined;
  return {
    model,
    text,
    stream: false,
    voice_setting: {
      voice_id: voice.voice_id,
      ...(typeof voice.speed === 'number' ? { speed: voice.speed } : {}),
      ...(typeof voice.vol === 'number' ? { vol: voice.vol } : {}),
      ...(typeof voice.pitch === 'number' ? { pitch: voice.pitch } : {}),
      ...(emotion ? { emotion } : {}),
    },
    audio_setting: { format: 'mp3', sample_rate: sampleRate, channel },
    language_boost: language,
    // A 24-hour download URL; the audio pipeline copies it into our own storage straight away.
    output_format: 'url',
  };
}

export async function subscribeMinimaxSpeech(
  input: Json,
  options: { apiKey?: string; baseUrl?: string; fetchFn?: typeof fetch; now?: number } = {},
): Promise<{ data: Json; requestId?: string | null }> {
  const apiKey = (options.apiKey ?? process.env.MINIMAX_API_KEY)?.trim();
  if (!apiKey) throw new MinimaxSpeechError('MiniMax API key is missing.', null, null);
  const baseUrl = (options.baseUrl ?? process.env.MINIMAX_API_BASE)?.trim().replace(/\/+$/, '') || DEFAULT_BASE_URL;
  const body = buildMinimaxSpeechRequest(input);
  // T2A V2 allows 20 requests per minute on a paid account; refuse locally rather than burn a rejected call.
  const slot = acquireMinimaxSlot('speech_t2a', options.now);
  if (!slot.ok) {
    throw new MinimaxSpeechError(`${MINIMAX_SPEECH_RATE_LIMIT_MARKER} MiniMax speech is rate limited locally.`, 429, null, 'rate_limited', slot.retryAfterMs);
  }
  const response = await (options.fetchFn ?? fetch)(`${baseUrl}/v1/t2a_v2`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const raw = record(await response.json().catch(() => null));
  const base = record(raw?.base_resp);
  const code = typeof base?.status_code === 'number' ? base.status_code : null;
  if (response.status === 429 || (code !== null && RATE_LIMIT_CODES.has(code))) {
    throw new MinimaxSpeechError(
      `${MINIMAX_SPEECH_RATE_LIMIT_MARKER} MiniMax speech failed (${code !== null ? `code ${code}` : response.status}).`,
      response.status,
      code,
      'rate_limited',
    );
  }
  if (!response.ok || (code !== null && code !== 0)) {
    throw new MinimaxSpeechError(
      `MiniMax speech failed (${response.ok ? `code ${code}` : response.status}).`,
      response.status,
      code,
    );
  }
  const data = record(raw?.data);
  const audio = data?.audio;
  if (typeof audio !== 'string' || !/^https:\/\//i.test(audio)) {
    throw new MinimaxSpeechError('MiniMax speech returned no audio URL.', response.status, code);
  }
  return {
    data: { audio, extra_info: raw?.extra_info ?? null },
    requestId: typeof raw?.trace_id === 'string' ? raw.trace_id : null,
  };
}
