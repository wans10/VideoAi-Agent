# MiniMax official API (MiniMax-H3)

`MiniMax-H3` can run on MiniMax's own V2 video API instead of LLM Hub. It is a switchable alternative, not a new
provider: jobs keep `provider = 'llmhub'`, so routing, polling, refunds and geometry checks are unchanged.

## Switch

| Variable | Meaning |
| --- | --- |
| `MINIMAX_OFFICIAL_ENABLED` | `true` sends new `MiniMax-H3` submissions to the official API. Off by default. |
| `MINIMAX_API_KEY` | Official API key. Both variables are required. |
| `MINIMAX_API_BASE` | Optional, default `https://api.minimax.cn`. |

`LLMHUB_INFERENCE_ROUTING_ENABLED` and `LLMHUB_API_KEY` must stay on: they decide that H3 is routed through this
client at all, and `llmhub-minimax-capabilities.ts` still narrows the workspace form. Turning the switch off sends
new jobs back to LLM Hub immediately.

## Ownership

- `frontend/src/server/video-providers/minimax-official/client.ts` owns the wire format and the safety rules.
- `LlmhubVideoClient` delegates `create` for `MiniMax-H3` when the switch is on, and `status` / `content` whenever
  the task ID is numeric. Official IDs are numeric; LLM Hub IDs always have a letter prefix, so jobs accepted by
  LLM Hub before the switch keep polling LLM Hub.
- `MiniMax-Hailuo-02` is not on the V2 API and always stays on LLM Hub.

## Behaviour to know

- Submission returns only `task_id`; there is no idempotency key. A 5xx or timeout therefore leaves the outcome
  unknown and the job stalls for manual review, exactly like LLM Hub. A 4xx (400 parameters, 402 balance,
  422 sensitive content, 429 rate limit) means no task exists and the charge is refunded automatically.
- Status values are `queued`, `running`, `succeeded`, `failed`, `cancelled`; there is no progress number.
- The video URL in `task.content.url` is time limited and is downloaded straight after completion by the existing
  copy step. Only HTTPS on a named host is accepted.
- A first-frame render takes its ratio from the image and the official `ratio` field comes back empty; the existing
  pixel-count check on the resolution tier still applies (768P is 1344x768, 1,032,192 pixels).
- Real output lasts slightly longer than requested (4.46 s for 4 s); the existing 10% duration tolerance covers it.
- Official H3 also accepts 4 s, last frame and reference image/video/audio. The workspace still offers only what the
  LLM Hub narrowing allows; widening that is a separate change.
