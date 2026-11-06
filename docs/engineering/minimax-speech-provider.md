# MiniMax Speech voice over (mainland API)

The audio workspace is reduced to **voice over with MiniMax Speech-02 HD**, served by the MiniMax API in mainland
China (`POST https://api.minimax.cn/v1/t2a_v2`) instead of fal. Music, songs, effects, ambience and cinematic
audio still only have fal executors and stay hidden (`config/keyvo-disabled-features.ts`).

## Switch

| Variable | Meaning |
| --- | --- |
| `MINIMAX_SPEECH_ENABLED` | `true` opens the audio page and API and routes `speech-02-hd` to the mainland API. |
| `MINIMAX_API_KEY` | Same key as the official video channel (`minimax-official-provider.md`). |
| `MINIMAX_API_BASE` | Optional, default `https://api.minimax.cn`. |

Without both variables the page and `/api/audio/*` answer 404. The in-app navigation entry is static (it cannot
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

## Not available yet

- **Seed Audio 1.0** has a mainland API (`POST https://openspeech.bytedance.com/api/v3/tts/create`, `X-Api-Key`,
  model `seed-audio-1.0`) but needs the service granted to the account (`45000030 requested resource not granted`
  until then) and a mapping from fal voice names to Doubao speaker IDs.
- Reference voices, ElevenLabs, music, effects and ambience.
