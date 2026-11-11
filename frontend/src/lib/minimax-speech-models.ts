import { USD_TO_CNY_CUSTOMER_RATE } from './customer-currency';

/**
 * MiniMax T2A V2 models offered by the web voice-over workspace (POST https://api.minimax.cn/v1/t2a_v2).
 * Web-only: MCP, agents and Studio do not send a model and keep the historical speech-02-hd route and price,
 * so this list is not part of the reviewed MCP policy fingerprint.
 * Source: https://platform.minimaxi.com/docs/api-reference/speech-t2a-http.md (checked 2026-11-11).
 */
export const AUDIO_MINIMAX_WORKSPACE_SPEECH_MODEL_VALUES = [
  'speech-2.8-hd',
  'speech-2.8-turbo',
  'speech-2.6-hd',
  'speech-2.6-turbo',
  'speech-02-hd',
  'speech-02-turbo',
] as const;
export type AudioMinimaxSpeechModel = (typeof AUDIO_MINIMAX_WORKSPACE_SPEECH_MODEL_VALUES)[number];

/** The docs recommend speech-2.8-hd; a new workspace draft starts there. */
export const DEFAULT_MINIMAX_WORKSPACE_SPEECH_MODEL: AudioMinimaxSpeechModel = 'speech-2.8-hd';
/** Requests without a model (MCP, agents, Studio, older clients) keep the model they always used. */
export const LEGACY_MINIMAX_SPEECH_MODEL: AudioMinimaxSpeechModel = 'speech-02-hd';

export const AUDIO_MINIMAX_SPEECH_MODEL_LABELS: Record<AudioMinimaxSpeechModel, string> = {
  'speech-2.8-hd': 'MiniMax Speech 2.8 HD',
  'speech-2.8-turbo': 'MiniMax Speech 2.8 Turbo',
  'speech-2.6-hd': 'MiniMax Speech 2.6 HD',
  'speech-2.6-turbo': 'MiniMax Speech 2.6 Turbo',
  'speech-02-hd': 'MiniMax Speech-02 HD',
  'speech-02-turbo': 'MiniMax Speech-02 Turbo',
};

export function isMinimaxSpeechModel(value: unknown): value is AudioMinimaxSpeechModel {
  return typeof value === 'string' && (AUDIO_MINIMAX_WORKSPACE_SPEECH_MODEL_VALUES as readonly string[]).includes(value);
}

/** Documented request limits shared by all six models. */
export const MINIMAX_SPEECH_LIMITS = {
  /** "长度限制小于 10000 字符". */
  textMaxChars: 9_999,
  speed: { min: 0.5, max: 2 },
  /** (0, 10]. */
  vol: { exclusiveMin: 0, max: 10 },
  pitch: { min: -12, max: 12 },
  sampleRates: [8000, 16000, 22050, 24000, 32000, 44100],
  channels: [1, 2],
} as const;

const BASE_EMOTIONS = ['happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised', 'calm'] as const;

/**
 * "选项 fluent, whisper 仅对 speech-2.6-turbo, speech-2.6-hd 模型生效，speech-2.8-* 不支持 whisper".
 * Whether 2.8 honours fluent is ambiguous, so it is not sent there; the model picks an emotion itself when none is sent.
 */
export function minimaxSpeechEmotions(model: AudioMinimaxSpeechModel): readonly string[] {
  if (model.startsWith('speech-2.6-')) return [...BASE_EMOTIONS, 'fluent', 'whisper'];
  return BASE_EMOTIONS;
}

/** "speech-01 和 speech-02 系列模型暂不支持 Persian、Filipino、Tamil". */
export function minimaxSpeechSupportsLanguage(model: AudioMinimaxSpeechModel, languageBoost: string): boolean {
  return !(model.startsWith('speech-02-') && ['Persian', 'Filipino', 'Tamil'].includes(languageBoost));
}

/**
 * MiniMax bills 10,000 characters at a time: one CJK character counts as 2, everything else as 1.
 * https://platform.minimaxi.com/docs/pricing/overview.md (语音合成 TTS), checked 2026-11-11.
 */
export function countMinimaxBillingCharacters(text: string | null | undefined): number {
  let count = 0;
  for (const char of Array.from(text?.trim() ?? '')) {
    count += /[㐀-鿿豈-﫿\u{20000}-\u{2ffff}]/u.test(char) ? 2 : 1;
  }
  return count;
}

/** PROVISIONAL official list prices, CNY per 10,000 billing characters. */
export const MINIMAX_SPEECH_CNY_PER_10K_CHARS: Record<AudioMinimaxSpeechModel, number> = {
  'speech-2.8-hd': 3.5,
  'speech-2.8-turbo': 2,
  'speech-2.6-hd': 3.5,
  'speech-2.6-turbo': 2,
  'speech-02-hd': 3.5,
  'speech-02-turbo': 2,
};
export const MINIMAX_SPEECH_PRICING_SOURCE = 'minimax-cn-pricing-overview-2026-11-11-provisional';

/** Vendor cost in USD cents through the application's explicit CNY accounting rate. */
export function minimaxSpeechVendorCostUsdCents(model: AudioMinimaxSpeechModel, script: string | null | undefined) {
  const billingCharacters = countMinimaxBillingCharacters(script);
  const cny = billingCharacters * MINIMAX_SPEECH_CNY_PER_10K_CHARS[model] / 10_000;
  return { billingCharacters, cny, usdCents: cny * 100 / USD_TO_CNY_CUSTOMER_RATE };
}
