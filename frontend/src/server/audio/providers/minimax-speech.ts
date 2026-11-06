/**
 * MiniMax Speech through the official mainland API (T2A V2), used instead of fal's speech-02-hd endpoint.
 * It answers with the same `{ data: { audio: url } }` shape the fal runner already reads.
 */
const DEFAULT_BASE_URL = 'https://api.minimax.cn';

const SPEECH_MODEL = 'speech-02-hd';
const EMOTIONS = new Set(['happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised', 'calm', 'fluent', 'whisper']);

type Json = Record<string, unknown>;

function record(value: unknown): Json | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : null;
}

/** Translates the request the fal builder produces into the official request, dropping fal-only fields. */
export function buildMinimaxSpeechRequest(input: Json): Json {
  const voice = record(input.voice_setting) ?? {};
  const audio = record(input.audio_setting) ?? {};
  const language = typeof input.language_boost === 'string' && input.language_boost.trim() ? input.language_boost.trim() : 'auto';
  const emotion = typeof voice.emotion === 'string' && EMOTIONS.has(voice.emotion) ? voice.emotion : undefined;
  return {
    model: SPEECH_MODEL,
    text: input.text,
    stream: false,
    voice_setting: {
      voice_id: voice.voice_id,
      ...(typeof voice.speed === 'number' ? { speed: voice.speed } : {}),
      ...(typeof voice.vol === 'number' ? { vol: voice.vol } : {}),
      ...(typeof voice.pitch === 'number' ? { pitch: voice.pitch } : {}),
      ...(emotion ? { emotion } : {}),
    },
    audio_setting: {
      format: 'mp3',
      sample_rate: typeof audio.sample_rate === 'number' ? audio.sample_rate : 32000,
      channel: typeof audio.channel === 'number' ? audio.channel : 1,
    },
    language_boost: language,
    // A 24-hour download URL; the audio pipeline copies it into our own storage straight away.
    output_format: 'url',
  };
}

export class MinimaxSpeechError extends Error {
  constructor(message: string, readonly status: number | null, readonly code: number | null) {
    super(message);
    this.name = 'MinimaxSpeechError';
  }
}

export async function subscribeMinimaxSpeech(
  input: Json,
  options: { apiKey?: string; baseUrl?: string; fetchFn?: typeof fetch } = {},
): Promise<{ data: Json; requestId?: string | null }> {
  const apiKey = (options.apiKey ?? process.env.MINIMAX_API_KEY)?.trim();
  if (!apiKey) throw new MinimaxSpeechError('MiniMax API key is missing.', null, null);
  const baseUrl = (options.baseUrl ?? process.env.MINIMAX_API_BASE)?.trim().replace(/\/+$/, '') || DEFAULT_BASE_URL;
  const response = await (options.fetchFn ?? fetch)(`${baseUrl}/v1/t2a_v2`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildMinimaxSpeechRequest(input)),
    signal: AbortSignal.timeout(120_000),
  });
  const raw = record(await response.json().catch(() => null));
  const base = record(raw?.base_resp);
  const code = typeof base?.status_code === 'number' ? base.status_code : null;
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
