/**
 * Seed Audio 1.0 through the Volcengine speech API (non-streaming), used instead of fal's
 * bytedance/seed-audio-1.0 endpoint. It returns the same `{ data: { audio: { url } } }` shape the runner reads.
 * Reference voices are not supported here: audio references are refused rather than silently ignored.
 */
import { isDoubaoSeedVoice } from '@/lib/audio-generation';

const DEFAULT_BASE_URL = 'https://openspeech.bytedance.com';
const FORMATS = new Set(['wav', 'mp3', 'pcm', 'ogg_opus']);
const RATES: Record<string, number[]> = {
  wav: [8000, 16000, 24000, 32000, 40000, 44100, 48000],
  pcm: [8000, 16000, 24000, 32000, 40000, 44100, 48000],
  mp3: [8000, 16000, 24000, 32000, 44100, 48000],
  ogg_opus: [48000],
};

type Json = Record<string, unknown>;

export class SeedAudioError extends Error {
  constructor(message: string, readonly status: number | null, readonly code: number | null) {
    super(message);
    this.name = 'SeedAudioError';
  }
}

function record(value: unknown): Json | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : null;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

/** Translates the fal request (speed/volume multipliers, `voice` name) into the Volcengine one. */
export function buildSeedAudioDirectRequest(input: Json): Json {
  if (Array.isArray(input.audio_urls) && input.audio_urls.length) {
    throw new SeedAudioError('Reference voices are not available on the mainland Seed Audio API.', null, null);
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
    model: 'seed-audio-1.0',
    text_prompt: input.prompt,
    // fal voice names do not exist here; without a Doubao speaker the voice follows the prompt.
    ...(isDoubaoSeedVoice(input.voice) ? { speaker: input.voice } : {}),
    audio_config: audioConfig,
  };
}

export async function subscribeSeedAudio(
  input: Json,
  options: { apiKey?: string; baseUrl?: string; fetchFn?: typeof fetch } = {},
): Promise<{ data: Json; requestId?: string | null }> {
  const apiKey = (options.apiKey ?? process.env.SEED_AUDIO_API_KEY)?.trim();
  if (!apiKey) throw new SeedAudioError('Seed Audio API key is missing.', null, null);
  const body = buildSeedAudioDirectRequest(input);
  const baseUrl = (options.baseUrl ?? process.env.SEED_AUDIO_API_BASE)?.trim().replace(/\/+$/, '') || DEFAULT_BASE_URL;
  const response = await (options.fetchFn ?? fetch)(`${baseUrl}/api/v3/tts/create`, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'X-Api-Request-Id': crypto.randomUUID(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });
  const raw = record(await response.json().catch(() => null));
  const code = typeof raw?.code === 'number' ? raw.code : null;
  if (!response.ok || (code !== null && code !== 0 && code !== 20000000)) {
    throw new SeedAudioError(`Seed Audio failed (${response.ok ? `code ${code}` : response.status}).`, response.status, code);
  }
  const url = raw?.url;
  if (typeof url !== 'string' || !/^https:\/\//i.test(url)) {
    throw new SeedAudioError('Seed Audio returned no audio URL.', response.status, code);
  }
  return {
    data: { audio: { url }, duration: raw?.original_duration ?? raw?.duration ?? null },
    requestId: response.headers.get('X-Tt-Logid'),
  };
}
