# Mainland voice over (MiniMax Speech and Seed Audio)

The audio workspace is reduced to **voice over with preset voices**, served by mainland APIs instead of fal:
MiniMax Speech-02 HD (`POST https://api.minimax.cn/v1/t2a_v2`) and Seed Audio 1.0
(`POST https://openspeech.bytedance.com/api/v3/tts/create`, `X-Api-Key`). Music, songs, effects, ambience and cinematic
audio still only have fal executors and stay hidden (`config/keyvo-disabled-features.ts`).

## Switch

| Variable | Meaning |
| --- | --- |
| `MINIMAX_SPEECH_ENABLED` | `true` opens the audio page and API and routes `speech-02-hd` to the mainland API. |
| `MINIMAX_API_KEY` | Same key as the official video channel (`minimax-official-provider.md`). |
| `MINIMAX_API_BASE` | Optional, default `https://api.minimax.cn`. |
| `SEED_AUDIO_ENABLED` | `true` routes `bytedance/seed-audio-1.0` to the Volcengine speech API and allows the Seed Audio choice. |
| `SEED_AUDIO_API_KEY` | Key from the speech console's API Key management (not the Ark key); the service must be granted to it. |
| `SEED_AUDIO_API_BASE` | Optional, default `https://openspeech.bytedance.com`. |

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

## Not available yet

- Reference voices, ElevenLabs, music, effects and ambience.
