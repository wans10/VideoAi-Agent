# MiniMax official API (MiniMax-H3, MiniMax-H3-Max and Hailuo)

MiniMax's own video APIs at `https://api.minimax.cn` serve MiniMax-H3 and MiniMax-H3-Max (V2 API) and the Hailuo
models (legacy V1 API). They are a switchable route, not a new provider: jobs keep `provider = 'llmhub'`, so polling, refunds and
geometry checks are shared with LLM Hub.

**Bailian route (2026-11-11).** MiniMax-H3 is also hosted on Alibaba Bailian (`MiniMax/MiniMax-H3`). With the
default `MINIMAX_H3_ROUTE_ORDER=bailian,direct`, Bailian is primary (job provider `alibaba_model_studio`) and this
API (or LLM Hub, whichever plan the switch selects) the fallback after a definite pre-acceptance rejection only;
content-review rejections, 500s and timeouts never fall back. `direct,bailian` swaps the order. Hailuo, H3-Max and
speech stay on MiniMax. See [the Bailian section](alibaba-model-studio-provider.md#bailian-hosted-kling-and-minimax-owner-decision-2026-11-11).

## Switch

| Variable | Meaning |
| --- | --- |
| `MINIMAX_OFFICIAL_ENABLED` | `true` sends new MiniMax-H3, MiniMax-H3-Max, Hailuo 02, Hailuo 2.3 and Hailuo 2.3 Fast submissions to MiniMax. Off by default; without it H3-Max has no route on Keyvo. |
| `MINIMAX_API_KEY` | Official API key. Both variables are required. |
| `MINIMAX_API_BASE` | Optional, default `https://api.minimax.cn` (the docs' server; the docs host platform.minimaxi.com redirects to platform.minimax.cn). |

With the switch on, LLM Hub is not needed for these engines (routing, executability and the poller accept the
MiniMax key alone). With it off, H3 and Hailuo 02 go back to LLM Hub immediately (when `LLMHUB_INFERENCE_ROUTING_ENABLED`
and `LLMHUB_API_KEY` are set) and the Hailuo 2.3 engines have no route.

## Ownership

- `frontend/src/server/video-providers/minimax-official/client.ts` owns both wire formats, the documented limits
  checks, error mapping and the local rate-limit guard.
- `frontend/src/lib/minimax-video-limits.ts` holds the documented limits (H3 / H3-Max durations, resolutions and
  reference counts in `MINIMAX_V2_MODEL_LIMITS`, the Hailuo model × task × resolution × duration matrix). The routing narrowing, the client and pricing share it.
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

- V2 (H3): 300 RPM and 30 tasks in flight; legacy Hailuo: 20 RPM; T2A speech: 20 RPM (paid account). The page lists
  "MiniMax-H3" only; H3-Max uses the same V2 interface, so it shares the `video_v2` bucket and the in-flight count
  (`MINIMAX_OFFICIAL_MODELS`). Whether MiniMax counts the two models separately is not documented (unverified).
- `frontend/src/server/minimax-rate-limit.ts` keeps a per-process sliding window per bucket; the submission also
  counts running V2 tasks in `app_jobs` and refuses the 31st before calling MiniMax. Both refusals refund and show
  "MiniMax 当前请求过多…请约一分钟后重试". Several instances can still exceed the account limit together, so
  MiniMax's own 429 / 1002 maps to the same message.

## Pricing

Since 2026-11-13 every price below is sold at 80% of the list price (`pricing-engine.md` "Keyvo official list price
rule"); the supplier facts keep the full list price.

- H3 uses the Bailian / MiniMax list price: output 768P CNY 0.50/s, 2K 0.80/s (4 s uses the same rate); reference-video
  seconds at the same rate (rounded up to whole seconds) and reference images beyond five at CNY 0.20 each
  (`src/lib/minimax-h3-pricing.ts`).
- Hailuo 2.3 / 2.3 Fast / 02 use MiniMax's per-video CNY list prices (`src/lib/minimax-hailuo-pricing.ts`; Hailuo 02
  512P is image-to-video only).

## MiniMax-H3-Max (V2, model `MiniMax-H3-Max`, 2026-11-12)

Bailian does not host it, so the official API is its only Keyvo route (`MINIMAX_OFFICIAL_ONLY_MODELS` in
`llmhub/model-map.ts`); without the switch it has no route and the workspace and MCP do not offer it.

- Modes as documented for Max (video-generation-v2-create.md, checked 2026-11-12): text (fixed ratio, never adaptive),
  image with first frame, last frame or both, multimodal reference (9 images, 3 videos, 3 audio clips, same media limits
  as H3; fixed ratio or adaptive, the adaptive restriction is documented for Lite only). Frames and references cannot be
  combined, so the engine's start/end frames belong to image mode only.
- 5-15 s (no 4 s), 480P or 768P (no 2K; Fal's 1080P refinement does not exist here). Prompt up to 7000 characters.
- `extra.prompt_expansion_mode` (`disabled`, `balanced` default, `quality`) is Max-only and is sent only when chosen;
  the schema refuses undeclared `extra` fields, so the client refuses it for MiniMax-H3 and any other value.
- Not available on this route and removed from the engine: soundtrack (`target_audio_url`), seed, middle frame,
  reference order. Fal's Recast/Relight (`minimax/h3-max/recast|relight`) have no MiniMax equivalent (the V2
  "regeneration" task only upscales MiniMax-H3 768P output to 2K): they stay defined for upstream, route to Fal only,
  are not executable without Fal, are dropped from the workspace narrowing and are not sold
  (`KEYVO_UNSERVED_VIDEO_OPERATIONS`).
- Submission, polling (numeric V2 task IDs on the llmhub job provider), refunds on definite rejections (4xx, 529,
  local validation, local rate limit) and the error mapping are shared with H3.

### H3-Max pricing (PROVISIONAL)

`src/lib/minimax-h3-max-pricing.ts` (`calculateMinimaxH3MaxOfficialCost`) uses MiniMax's CNY list price
(pricing/overview.md, "MiniMax-H3-Max（扩展模型）", checked 2026-11-12) at the accounting rate of CNY 8 per USD, then the
official-list rule (80% of the list price, since 2026-11-13):

| Resolution | Output CNY/s | Reference video CNY/s | Images |
| --- | --- | --- | --- |
| 480P | 0.33 | 0.37 | 2 free per task, then 0.50 each |
| 768P | 0.50 | 0.97 | 2 free per task, then 0.50 each |

Audio input is free. Reference-video seconds come from owned media and are rounded up to whole seconds (MiniMax's
rounding is not documented); frames never exceed the two free images. Examples (customer, CNY build): 5 s 480P
CNY 1.36, 5 s 768P CNY 2.00, 10 s 768P CNY 4.00, 15 s 768P CNY 6.00; 5 s 768P with 3 billed reference-video seconds and
4 images CNY 5.12. The manual tariff identity is exact (`referenceImageCount` 0-9 × `inputVideoDurationSec` 0-15 billed
seconds), replacing Fal's open reference-token class. The Fal reference-token budget is still computed by the shared
preflight but no longer priced.
