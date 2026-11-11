# MiniMax official API (MiniMax-H3 and Hailuo)

MiniMax's own video APIs at `https://api.minimax.cn` serve MiniMax-H3 (V2 API) and the Hailuo models (legacy V1
API). They are a switchable route, not a new provider: jobs keep `provider = 'llmhub'`, so polling, refunds and
geometry checks are shared with LLM Hub.

**Bailian route (2026-11-11).** MiniMax-H3 is also hosted on Alibaba Bailian (`MiniMax/MiniMax-H3`). With the
default `MINIMAX_H3_ROUTE_ORDER=bailian,direct`, Bailian is primary (job provider `alibaba_model_studio`) and this
API (or LLM Hub, whichever plan the switch selects) the fallback after a definite pre-acceptance rejection only;
content-review rejections, 500s and timeouts never fall back. `direct,bailian` swaps the order. Hailuo, H3-Max and
speech stay on MiniMax. See [the Bailian section](alibaba-model-studio-provider.md#bailian-hosted-kling-and-minimax-owner-decision-2026-11-11).

## Switch

| Variable | Meaning |
| --- | --- |
| `MINIMAX_OFFICIAL_ENABLED` | `true` sends new MiniMax-H3, Hailuo 02, Hailuo 2.3 and Hailuo 2.3 Fast submissions to MiniMax. Off by default. |
| `MINIMAX_API_KEY` | Official API key. Both variables are required. |
| `MINIMAX_API_BASE` | Optional, default `https://api.minimax.cn` (the docs' server; the docs host platform.minimaxi.com redirects to platform.minimax.cn). |

With the switch on, LLM Hub is not needed for these engines (routing, executability and the poller accept the
MiniMax key alone). With it off, H3 and Hailuo 02 go back to LLM Hub immediately (when `LLMHUB_INFERENCE_ROUTING_ENABLED`
and `LLMHUB_API_KEY` are set) and the Hailuo 2.3 engines have no route.

## Ownership

- `frontend/src/server/video-providers/minimax-official/client.ts` owns both wire formats, the documented limits
  checks, error mapping and the local rate-limit guard.
- `frontend/src/lib/minimax-video-limits.ts` holds the documented limits (H3 durations/resolutions/reference counts,
  the Hailuo model × task × resolution × duration matrix). The routing narrowing, the client and pricing share it.
- `frontend/src/server/llmhub-minimax-capabilities.ts` decides what the workspace sees and what routing accepts:
  `OFFICIAL_NARROWINGS` with the switch on, the LLM Hub narrowing otherwise.
- `LlmhubVideoClient` delegates `create` when `shouldUseMinimaxOfficial(model)`, and `status` / `content` by task ID:
  V2 IDs are numeric, legacy IDs are stored as `mmv1-<numeric>`, LLM Hub IDs always carry a letter prefix.
- `frontend/app/api/generate/_lib/minimax-official-media.ts` collects the last frame, references and the prompt
  optimiser from the generate payload.
- Canonical English failure texts are `MINIMAX_MESSAGES`; `frontend/lib/minimax-failure-messages.ts` localizes them.

## MiniMax-H3 (V2, `POST /v2/video_generation`, `GET /v2/query/video_generation/{task_id}`)

- Modes: text (ratio required, never adaptive; `16:9` when none is given), image with first frame, last frame or
  both (ratio follows the image), multimodal reference (up to 9 images, 3 videos, 3 audio clips; fixed ratio or
  adaptive). Frames and references cannot be combined.
- 4-15 s, 768P or 2K. The catalogue no longer lists 480P or 4K (not MiniMax-H3 tiers). Prompt up to 7000 characters.
- Reference media limits (image 30 MB, 256-5760 px, ratio 0.4-2.5; video MP4/MOV 50 MB, 2-15 s each and 15 s in
  total; audio WAV/MP3 15 MB, 2-15 s each and 15 s in total) are enforced by the engine schema before billing.
- Reference-video seconds are billed (see Pricing). Audio input is free; images beyond five keep the existing surcharge.
- `target_audio_url`, `seed` and `prompt_expansion_mode` have no V2 equivalent and are hidden on this route.
- Status `queued`, `running`, `succeeded`, `failed`, `cancelled`; no progress number. A failed task's
  `error.code` is mapped (1026 input review, 1027 output review, 1002 rate limit...) into the job message.
- Tasks are queryable for 7 days only (`invalid task_id` afterwards). The poller stalls jobs after about 3 hours, so
  this only matters for manual review; an expired task fails and refunds.

## Hailuo (legacy V1, `POST /v1/video_generation`, `GET /v1/query/video_generation`, `GET /v1/files/retrieve`)

| Model (engine) | Tasks | 768P | 1080P | 512P |
| --- | --- | --- | --- | --- |
| MiniMax-Hailuo-2.3 (`minimax-hailuo-2-3`) | text, first frame | 6 / 10 s | 6 s | - |
| MiniMax-Hailuo-2.3-Fast (`minimax-hailuo-2-3-fast`) | first frame | 6 / 10 s | 6 s | - |
| MiniMax-Hailuo-02 (`minimax-hailuo-02-text`) | text, first frame, first + last frame | 6 / 10 s | 6 s (not offered: no catalogue price) | first frame only |

- Prompt up to 2000 characters; `prompt_optimizer` is passed through. Start/end image JPG/PNG/WebP under 20 MB.
- Business errors arrive as HTTP 200 with `base_resp.status_code` != 0; none of them creates a task.
- Status `Preparing`/`Queueing`/`Processing`/`Success`/`Fail`; the file download URL is valid for one hour and is
  copied straight away. The download's content type is assumed to be `video/mp4` (not verified on a live task).
- Decision (2026-11-11): Hailuo 02 moves to this route when the switch is on, because MiniMax's own API offers the
  last frame, 512P and the prompt optimiser that the LLM Hub plugin lacks, at an official cost below its existing
  price (768P 6 s CNY 2.00, 10 s CNY 4.00, 512P 6 s CNY 0.60).

## Submission outcome

There is no idempotency key. 4xx (400 parameters, 401 key, 402 balance, 422 content review, 429 rate limit) and
529 overloaded mean no task exists: the charge is refunded and the job message names the reason. A 500 or timeout
leaves the outcome unknown and the job stalls for manual review.

## Rate limits (guides/rate-limits.md)

- V2 (H3): 300 RPM and 30 tasks in flight; legacy Hailuo: 20 RPM; T2A speech: 20 RPM (paid account).
- `frontend/src/server/minimax-rate-limit.ts` keeps a per-process sliding window per bucket; the submission also
  counts running V2 tasks in `app_jobs` and refuses the 31st before calling MiniMax. Both refusals refund and show
  "MiniMax 当前请求过多…请约一分钟后重试". Several instances can still exceed the account limit together, so
  MiniMax's own 429 / 1002 maps to the same message.

## Pricing

- H3 keeps its existing per-second price; 4 s uses the same rate. Reference-video seconds are added PROVISIONALLY at
  MiniMax's CNY rate (768P 0.50, 2K 0.80 per second, rounded up to whole seconds) converted at
  `USD_TO_CNY_CUSTOMER_RATE`, before margin (`src/lib/minimax-h3-pricing.ts`).
- Hailuo 2.3 / 2.3 Fast are PROVISIONAL per-video CNY list prices (`src/lib/minimax-hailuo-pricing.ts`).
- Hailuo 02 keeps its existing price.

## MiniMax-H3-Max

Not served on Keyvo: MiniMax's H3-Max has 480P/768P only, its own input pricing (video CNY 0.37/0.97 per second,
images 0.50 beyond two) and none of the fal-only controls (1080P, middle frame, Recast/Relight). The registry keeps
upstream's publication; Keyvo hides it on every surface, including the app and pricing, through
`KEYVO_HIDDEN_MODEL_IDS` in `frontend/config/keyvo-model-visibility.ts` until a dedicated route and price exist.
