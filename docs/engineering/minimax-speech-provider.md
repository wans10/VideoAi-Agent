# Mainland voice over (MiniMax Speech and Seed Audio)

The audio workspace is reduced to **voice over with preset voices**, served by mainland APIs instead of fal:
MiniMax Speech T2A V2 (`POST https://api.minimax.cn/v1/t2a_v2`) and Seed Audio 1.0
(`POST https://openspeech.bytedance.com/api/v3/tts/create`, `X-Api-Key`). Music, songs, effects, ambience and cinematic
audio still only have fal executors and stay hidden (`config/keyvo-disabled-features.ts`).

## Switch

| Variable | Meaning |
| --- | --- |
| `MINIMAX_SPEECH_ENABLED` | `true` opens the audio page and API and routes MiniMax voice over to the mainland API. |
| `MINIMAX_API_KEY` | Same key as the official video channel (`minimax-official-provider.md`). |
| `MINIMAX_API_BASE` | Optional, default `https://api.minimax.cn`. |
| `SEED_AUDIO_ENABLED` | `true` routes `bytedance/seed-audio-1.0` to the Volcengine speech API and allows the Seed Audio choice. |
| `SEED_AUDIO_API_KEY` | Key from the speech console's API Key management (not the Ark key); the service must be granted to it. |
| `SEED_AUDIO_API_BASE` | Optional, default `https://openspeech.bytedance.com`. |
| `SEED_AUDIO_MODEL` | Optional, default `seed-audio-1.0` (the request `model` field). |

Each provider needs its own pair of variables; the page opens when either is configured and a request for an
unconfigured provider answers 404. Without any pair the page and `/api/audio/*` answer 404. The in-app navigation entry is static (it cannot
read server environment), so set the variables before deploying this change or the entry leads to a 404.

## Ownership

- `src/server/audio/providers/minimax-speech.ts` translates the existing fal request into the official one and
  returns the same `{ data: { audio } }` shape; `subscribeFalModel` routes to it, so validation, pricing, storage
  and results are unchanged. Output is requested as a 24-hour URL and copied into our own storage immediately.
- `src/server/audio/keyvo-audio-gate.ts` refuses any pack or voice model except MiniMax voice over at the quote and
  generate routes. Validation stays provider neutral.
- `applyKeyvoVoiceOnly` (`src/lib/audio-creation.ts`) steers stored drafts (ElevenLabs, Seed Audio, reference
  voice) to a MiniMax voice. `KEYVO_AUDIO_FULL_UI=1` restores the complete UI in tests only.
- Voices are listed in `AUDIO_MINIMAX_VOICE_VALUES` with display names in `AUDIO_MINIMAX_VOICE_LABELS`.

## MiniMax T2A models (web workspace)

- The voice-over workspace offers `speech-2.8-hd` (default for new drafts, as the docs recommend), `speech-2.8-turbo`,
  `speech-2.6-hd`, `speech-2.6-turbo`, `speech-02-hd` and `speech-02-turbo`. The list and labels live in
  `src/lib/minimax-speech-models.ts` and travel as the web-only request field `minimaxSpeechModel`. It is deliberately
  not part of the shared `AUDIO_*` constants, MCP schemas or Studio capabilities, so the reviewed MCP policy fingerprint
  is unchanged. A request without the field (MCP, agents, Studio, old clients, historical recreations) keeps
  `speech-02-hd` with its existing price; recreating a historical render without a recorded model uses `speech-02-hd`.
- Validation: the model must be one of the six and only with `voiceModel: 'minimax'` (`audio-generate-validation.ts`,
  before quoting and charging). The adapter re-checks the documented limits: text 1..9999 characters, speed 0.5..2,
  volume (0, 10], integer pitch -12..12, sample rate 8000/16000/22050/24000/32000/44100, 1 or 2 channels, no
  Persian/Filipino/Tamil `language_boost` on `speech-02-*`. Emotions a model does not accept (`fluent`/`whisper`
  outside `speech-2.6-*`) are not sent; the workspace sends none.
- Price: every model, including `speech-02-hd` (MCP, agents, Studio), uses the official CNY list price: HD 3.50 and
  Turbo 2.00 CNY per 10,000 billing characters (a CJK character counts as 2), converted with `USD_TO_CNY_CUSTOMER_RATE`.
  Seed Audio 1.0 costs CNY 1.00 per output minute (owner-supplied; not on the Ark price page). Since 2026-11-13 voice
  over is sold at 80% of these list prices (`pricing-engine.md` "Keyvo official list price rule") instead of the 3×
  audio margin. Source: `https://platform.minimaxi.com/docs/pricing/overview.md`, checked 2026-11-13.
- Rate limit: T2A V2 allows 20 requests per minute on a paid account. `src/server/minimax-rate-limit.ts` refuses the
  21st call in a sliding minute per process before contacting MiniMax; a MiniMax `429` or `1002`/`1039`/`2045` answer is
  treated the same. Both refund the charge and answer `429 provider_rate_limited`, which the workspace shows as
  “请求过于频繁，请稍后再试，本次费用已退回。”. The guard is per instance; the provider answer stays authoritative.
- fal only knows `speech-02-hd`: with the mainland API off, a newer model is refused instead of falling back.

## Seed Audio details

- `seed-audio-direct.ts` maps the fal request to Volcengine: the existing English prompt wrapper is passed as
  `text_prompt` (measured: it is not read aloud), `speed`/`volume` multipliers 0.5..2 become `speech_rate`/
  `loudness_rate` -50..100, pitch is -12..12, and ogg_opus is forced to 48 kHz.
- `speaker` is sent only for Doubao voice IDs (`AUDIO_DOUBAO_SEED_VOICE_LABELS`, 20 curated voices). fal voice names
  have no equivalent, so without a Doubao voice the voice follows the prompt. Voices that are IP characters or
  customer-service/roleplay styles are deliberately left out; verify a voice before adding it.
- The response carries a Base64 body and a 2-hour URL; the URL is used and the audio is copied into our own storage.
- A freshly granted service can answer `403 45000030 requested resource not granted` for a few minutes.
- Reference audio is refused (no mainland upload path yet), at the API gate and in the adapter.
- Contract verified 2026-11-11 against the official page
  (https://docs.volcengine.com/docs/doubao-voice/audio-generation-http): synchronous `POST /api/v3/tts/create`,
  one `X-Api-Key` header from the new speech console (the legacy `X-Api-App-Id` + `X-Api-Access-Key` pair belongs
  to the console being retired and is not supported), no `X-Api-Resource-Id`, `text_prompt` up to 3000 characters
  (longer text is refused before the call), output up to 120 s with `original_duration` as the billing basis.
  The adapter waits up to 300 s, matching the documented example and the `tts` role timeout.
- Failures are classified from the documented codes (https://docs.volcengine.com/docs/6561/2534853):
  `content_rejected` (45001125, 45001104, 45001127, 45001130, 55001310, 55001311), `invalid_request`
  (45001001, 45001115-45001117, 45001131/2, 40000020, 40402002 and other 4xx), `auth` (401/403, 45000030),
  `rate_limited` (429) and `provider_error`. The call is synchronous, so every failure (including a timeout) marks
  the job failed and `generate-audio.ts` refunds the wallet charge; nothing is charged for a failed call.
- Not confirmed by the docs: the success value of `code` (the example has none; 0 and 20000000 are accepted) and
  whether `seed-audio-1.0` API access needs an allow-list on a given account (the Ark model card only says "支持体验").

## Not available yet

- Reference voices, ElevenLabs, music, effects and ambience.
