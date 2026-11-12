# Alibaba Model Studio video provider

This guide owns the operational contract for the direct Alibaba Model Studio video path. The code remains disabled by default, while the production deployment has been publicly enabled since 2026-09-14 after administrator canaries and the release gates below passed.

## Ownership and model mapping

The integration reuses the shared video-provider boundaries:

| Responsibility | Owner |
| --- | --- |
| Provider identity, model mapping, payload, response, errors, cost, and HTTP client | `frontend/src/server/video-providers/alibaba-model-studio/` |
| Provider selection and fallback policy | `frontend/src/server/video-providers/router.ts` |
| Submission and pre-acceptance Fal fallback | `frontend/app/api/generate/_lib/alibaba-model-studio-submission.ts` |
| Polling, durable output copy, completion, failure, and refund | `frontend/server/alibaba-model-studio-poll.ts` |
| Cron authentication | `frontend/app/api/cron/alibaba-model-studio-poll/route.ts` |
| Attempt lifecycle and sanitized snapshots | `frontend/src/server/video-providers/provider-attempts.ts` |
| Admin aggregate metrics | `frontend/server/admin-mcp-metrics.ts` and `frontend/server/admin-mcp-metrics-queries.ts` |

| MaxVideoAI engine | Direct model | Modes | Fal fallback-compatible modes |
| --- | --- | --- | --- |
| `wan-3` | `wan3.0-video` | T2V, I2V, Ref2V, edit, extend | T2V, I2V, Ref2V |
| `wan-3-prime` | `wan3.0-video-prime` | T2V, I2V, Ref2V, edit, extend | T2V, I2V, Ref2V |
| `happy-horse-1-1` | HappyHorse 1.1 mode-specific T2V/I2V/R2V models | T2V, I2V, Ref2V | all three |

Wan 2.5, Wan 2.6, and HappyHorse 1.0 are intentionally outside this direct route. Keyvo has no Fal
account, so Wan 2.5 and HappyHorse 1.0 are unpublished in `model-registry.json` (model page, examples,
app, pricing, sitemap; HappyHorse 1.0 also comparisons). Keep `ALIBABA_MODEL_STUDIO_FALLBACK_TO_FAL_ENABLED`
off for Keyvo.

### Parameter contract (cn-beijing API references, checked 2026-11-11)

- Wan 3 / Prime ratio: `adaptive` (default, shown as Auto), `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16`.
  Extension always sends `ratio: adaptive`, as the extension contract requires. Text-to-video needs a
  prompt. Reference video/audio clips must be 1–15 seconds each.
- HappyHorse 1.1 T2V/R2V ratio: `16:9` (default), `9:16`, `1:1`, `4:3`, `3:4`, `4:5`, `5:4`, `9:21`, `21:9`;
  there is no adaptive value, so an unset/Auto ratio sends `16:9`. I2V takes no ratio. R2V accepts 1–9
  JPEG/PNG/WEBP references; images are JPEG/PNG/WEBP only (no BMP).
- Seeds: integers 0–2147483647 (`-1` means random and is omitted).
- Qwen Image 3.0 sends `enable_thinking: true` explicitly (the documented default) with
  `prompt_extend: true` / `prompt_extend_mode: direct`.

### Wan 3 input parity

Wan 3 and Prime require at least 240 pixels on each side of an input image,
including first/last frames and optional references in Modify/Extend. The shared
`WAN_3_INPUT_SCHEMA.constraints.minImageSidePx` drives upload and library checks;
Web preflight and executable agent quotes validate owned original dimensions
before funding. Missing trusted image metadata fails closed for these models;
caller-supplied dimensions cannot qualify an original.
Executable agent requests must import image URLs first so dimensions and file
size can be verified before reservation. Non-executable budget estimates may
still describe an unverified image. Upload and library rejections use the same
localized cause, corrective action and no-debit message as Web preflight.
Live MCP/Studio image-field discovery publishes `assetRequired: true` alongside
`minImageSidePx: 240`, so clients import and measure references before quoting.
Studio preparation and executable MCP quotes preserve this specific image
rejection, including when a valid source video accompanies the image. Other
source-access failures keep their existing neutral message.

`frontend/lib/wan-image-failure-messages.ts` owns the precise resolution-rejection
projection. Only validated integer measurements from the known diagnostic enter
the public English message; provider URLs, JSON and credentials remain private.
That canonical message survives job/refund persistence and is localized for Web
history and Billing. Preflight confirms that no credits were charged for video
generation; Studio assistance has separate accounting. A terminal failure
uses persisted payment state: `refunded_wallet` confirms the amount returned,
while a failed `paid_wallet` job says its wallet refund is not yet confirmed.
This projection does not change refunds or rewrite historical generic messages.
The Wan image validation/guidance and Alibaba poll tests cover these boundaries.

Wan 3 Standard and Prime share the same authored capability schema. Reference mode accepts image, video, audio, one public HTTPS document URL, or one public HTTPS webpage URL. Document and webpage references are mutually exclusive and require prompt expansion. The direct adapter maps them to Alibaba `file` and `link` media; the Fal pre-acceptance fallback adds Fal's required `enable_thinking=true` internally, so that transport-specific switch is not exposed as a MaxVideoAI product control.

Reference audio is limited to MP3 and WAV. Keep the authored field formats aligned with the direct adapter so M4A and other unsupported uploads fail with a clear format message before wallet reservation. The adapter retains a specific MP3/WAV message for requests that bypass that early check.

The workspace prompt-expansion control maps to Alibaba `prompt_extend`. Wan 3 and Prime default this control to off in Modify (`v2v`) so editing uses the authored prompt without automatic rewriting. Explicit on/off choices remain authoritative; creation, reference generation and extension retain their existing on default. The direct adapter applies the same Modify default when a caller omits the control. Fal's `enable_safety_checker` has no documented direct Alibaba equivalent and remains transport-specific rather than a public cross-provider option.

Alibaba's smart duration (`duration=-1`) is deliberately not exposed. MaxVideoAI quotes and reserves an exact customer amount before submission, while smart duration makes the billed output length unknown at quote time. Keep the explicit 2–30 second duration until a separately reviewed estimate-and-reconciliation billing contract exists.

### Private Wan source delivery

Wan 3 and Prime resolve owned image/video/audio inputs in the validated Alibaba payload through `media-access.ts` immediately before submission. This transport reuses `createOwnedMediaReadUrl` with the authenticated owner and a one-hour GET grant. It clones the payload, deduplicates reads, and leaves canonical library, reuse and fallback inputs intact. No object ACL, storage policy, pricing, duration or capability changes are involved. Public document/webpage references and HappyHorse transport remain unchanged.

An ownership refusal or signing failure stops before any provider call or Fal fallback. Submission snapshots and polled Wan diagnostics remove temporary grants, including URLs embedded in error messages. Signed provider output URLs remain intact until the durable output copy. Wan `InvalidParameter` / `Failed to download` failures are reported as unreadable reference media, not as a completed render with an output-copy failure. The grant supports initial provider access; it is not a guarantee against an indefinitely queued provider task.

Regression coverage lives in `wan-private-media-transport.test.ts`, the Alibaba submission/poll suites, and the shared owned-media, Fal and Luma private transport suites. A no-spend qualification may read an existing owned source through the transport grant and confirm anonymous 403; it must not submit a generation.

## Environment contract

All routing switches are server-only. Never create `NEXT_PUBLIC_` aliases for them.

Keyvo runs on the mainland **cn-beijing** account (2026-11-11). Without an override the client
uses `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com` when `ALIBABA_MODEL_STUDIO_WORKSPACE_ID`
is set, otherwise the public Beijing endpoint `https://dashscope.aliyuncs.com` (the DashScope domain
receives no new features after 2026-09-30, so production sets the workspace host explicitly).
Explicit `ALIBABA_MODEL_STUDIO_BASE_URL` values, including the international
`https://dashscope-intl.aliyuncs.com` and other regional workspace hosts, remain accepted.
Do not insert the region into the public DashScope hostname: the former
`dashscope-intl.ap-southeast-1.aliyuncs.com` default did not resolve in the
2026-11-04 Character Studio preview canary.

| Variable | Default | Purpose |
| --- | --- | --- |
| `ALIBABA_MODEL_STUDIO_API_KEY` | unset | DashScope API credential; secret |
| `ALIBABA_MODEL_STUDIO_BASE_URL` | unset → Beijing workspace host from `_WORKSPACE_ID`, else `https://dashscope.aliyuncs.com` | Optional DashScope public endpoint (`dashscope.aliyuncs.com`, `dashscope-intl.ap-southeast-1.aliyuncs.com`) or workspace host (`*.maas.aliyuncs.com`); treat a workspace hostname as private configuration |
| `ALIBABA_MODEL_STUDIO_WORKSPACE_ID` | unset | Optional workspace ID used to build the regional MaaS host when no base URL is set; private configuration |
| `ALIBABA_MODEL_STUDIO_REGION` | `cn-beijing` | Configured region coupling (`cn-beijing`, `ap-southeast-1`, `us-east-1`, `eu-central-1`, `cn-hongkong`, `ap-northeast-1`) |
| `ALIBABA_MODEL_STUDIO_ENABLED` | `false` | Master direct-provider switch |
| `ALIBABA_MODEL_STUDIO_PUBLIC_ROUTING_ENABLED` | `false` | Allows non-admin routing only after a separate launch decision |
| `ALIBABA_MODEL_STUDIO_ADMIN_ONLY` | `true` | Keeps the enabled route restricted to administrators |
| `ALIBABA_MODEL_STUDIO_FALLBACK_TO_FAL_ENABLED` | `false` | Enables eligible pre-acceptance fallback |
| `ALIBABA_MODEL_STUDIO_SUBMIT_TIMEOUT_MS` | `30000` | Submission timeout |
| `ALIBABA_MODEL_STUDIO_POLL_TIMEOUT_MS` | `30000` | Individual poll timeout |
| `ALIBABA_MODEL_STUDIO_POLL_MAX_MINUTES` | `185` | Local manual-review threshold |
| `ALIBABA_MODEL_STUDIO_POLL_TOKEN` | unset | Optional local cron token; secret |
| `CRON_SECRET` | unset | Shared production cron authorization; secret |

The API key, region, and base URL must belong to the same deployment. The client rejects non-HTTPS, unsupported domain, credential-bearing, path-bearing, query-bearing, or fragment-bearing base URLs. Do not copy a private workspace hostname into logs, tickets, tests, or documentation.

## Routing and fallback invariants

With the master switch off, existing Fal-compatible modes continue through Fal. Direct-only Wan edit and extend fail closed because no equivalent Fal route exists.

With the master switch on, an administrator may use the direct route while public routing remains off. A non-admin remains on Fal for compatible modes and cannot use direct-only modes.

Fallback is permitted only when all of these are true:

- the fallback flag is enabled;
- the mode has an equivalent Fal contract;
- submission failed with a transient, timeout, rate-limit, or invalid-response classification;
- Alibaba has not returned a provider task ID.

Once a provider task ID has been accepted, Alibaba remains authoritative. Never submit the same paid job to Fal after acceptance; polling must reconcile the accepted task instead.

Local snapshot, persistence or metric errors after that acknowledgement do not
turn it into a failed submission. The video owner uses the shared
`direct-provider-acceptance.ts` boundary outside its rejection catch, with
independent identity writes and a durable read preserving terminal winners. A
failed diagnostic sanitizer omits the snapshot rather than saving raw grants.
Polling requires the ID in `app_jobs`; an ID retained only in a response or attempt
record is not an automatic recovery guarantee. See the [acceptance contract](fal-job-failures.md#direct-acknowledgements-and-fallback-outcome-projection-30-october-2026).

## Bailian-hosted Kling and MiniMax (owner decision 2026-11-11)

Bailian (this Model Studio account, cn-beijing) also hosts third-party models on the same async
`video-synthesis` endpoint, task polling, output copy, UNKNOWN handling and refund path as Wan:

| Engine | Bailian model | Modes | Tier / limits |
| --- | --- | --- | --- |
| `kling-3-turbo-standard` / `-pro` | `kling/kling-v3-turbo-video-generation` | t2v, i2v (first frame only) | std 720P / pro 1080P, 16:9 9:16 1:1, 3–15 s, audio always on, no negative prompt, no subjects |
| `kling-3-standard` / `-pro` / `-4k` | `kling/kling-v3-video-generation` | t2v, i2v (first or first+last) | std / pro / 4k, 16:9 9:16 1:1, 3–15 s, audio flag |
| `kling-o3-standard` / `-pro` / `-4k` | `kling/kling-v3-omni-video-generation` | t2v, i2v, ref2v (`refer` ≤7, `feature` video + `refer` ≤4, `feature` + first frame), v2v (`feature` + `refer` ≤4, 3–10 s, audio off, `keep_original_sound`) | std / pro / 4k |
| `minimax-h3` | `MiniMax/MiniMax-H3` | t2v (fixed ratio), i2v (first / last / both), ref2v (`image_url` ≤9, `feature` ≤3, `driving_audio` ≤3, 2–15 s each, ≤15 s total) | 768P / 2K, 4–15 s, prompt ≤7000 |

Files: `bailian-models.ts` (engine → model/tier table, no imports), `bailian-payload.ts` (bodies and every
limit above, enforced before the paid call), `bailian-routing.ts` (route order, Bailian compatibility, fallback
decision tables). `resolveAlibabaModelRoute` returns these routes (families `kling_turbo`, `kling_v3`,
`kling_omni`, `minimax_h3`); `isAlibabaDirectEngine` stays Wan/HappyHorse only. The Kling tier is the same one
the Kling direct route uses, so primary and fallback render the same product. `watermark` is always false.
Media is sent as one-hour owner-checked read grants (`createWanMediaTransport`), diagnostics are sanitized.

### Route order and fallback

`KLING_ROUTE_ORDER` (all Kling 3 / Omni / Turbo engines) and `MINIMAX_H3_ROUTE_ORDER` take `bailian,direct`
(default), `direct,bailian`, `bailian` or `direct`. `resolveVideoProviderRoutingPlan` wraps the vendor plan in
`applyBailianRouteOrder`: a leg is usable when its gates pass (Bailian: `ALIBABA_MODEL_STUDIO_ENABLED`, key,
admin-only/public routing; direct: the existing `kling_direct_primary` plan — legacy for Kling 3 / Omni, new design
for 3.0 Turbo (`kling-official-provider.md`) — or the MiniMax `llmhub_primary` plan) and, for Bailian, when the request is portable (`isBailianHostedRequestCompatible`: no Kling subjects,
voice IDs, camera control or motion brush — Bailian element IDs are a separate catalogue; H3 exactly the
official V2 inputs). With neither leg usable, the vendor plan is returned unchanged. Kling 4.0 / 4.0 Flash and
H3-Max are not hosted here. `cfg_scale` has no Bailian parameter and is dropped on that leg.

The order is fixed before any provider task exists. The second leg is attempted only after a **definite
pre-acceptance** rejection of the first:

| First leg | Falls back on | Never falls back on |
| --- | --- | --- |
| Bailian (`shouldFallbackFromBailianSubmit`) | local validation or capacity guard, HTTP 400/404/422, 401/403 (key, model not activated), 402/quota, 413, 429, region mismatch | any task ID; timeout, network, 5xx, missing task ID (ambiguous); moderation; Keyvo media-access failures |
| Kling direct (`shouldFallbackFromKlingDirectToBailian`) | 401, 1xxx account/credit/access/parameter codes, 429 (1302/1303/none) | 1300/1301 content review, 5xxx, timeout/network, any task ID |
| MiniMax official (`shouldFallbackFromMinimaxDirectToBailian`) | the client's definite rejections (4xx, 529, local limits) | content review, 500/timeout (stall), any task ID |

The single wallet charge is reserved once before the first leg. A fallback does not refund; the second leg
owns acceptance and refund (exactly one refund if it fails too). An ambiguous Bailian failure keeps the
existing Alibaba behaviour (job failed and refunded, no second task; a task created by an unanswered request
cannot be found because the API has no idempotency key). Attempts: first leg `attempt_index` 1, second leg 2
linked by `fallback_to_attempt_id`; `request_snapshot.route` = `bailian` / `direct` and `routeRole` =
`primary` / `fallback`. The accepting leg writes `app_jobs.provider` + `provider_job_id`
(`alibaba_model_studio`, `kling_direct` or `llmhub`), so the matching poller owns the job. A second leg never
chains Fal or a third provider.

Capacity: 300 RPM per hosted model (`capacity.ts`, per process); an exhausted window is a definite rejection.

Vendor cost (PROVISIONAL, `bailian_cn_beijing_list_price_2026_11_11_provisional`, CNY list / 8 = USD; customer
prices unchanged): Turbo 0.8 / 1.0 CNY/s; Kling 3.0 and Omni 0.9 / 1.2 / 3.0 with audio or a reference video,
0.6 / 0.8 / 3.0 silent; H3 0.50 (768P) / 0.80 (2K) CNY/s over `usage.duration` (input video + output seconds),
images beyond 5 at 0.20 each, audio free. Completion uses `usage.duration` when Bailian reports it.

The workspace engine guide shows Turbo's limits in zh (`workspace.generate.engineSelect.guides`).

## Capacity, polling, and output ownership

The documented Beijing limits ([rate-limit](https://docs.bailian.console.aliyun.com/zh/model-studio/rate-limit),
checked 2026-11-11) are 5 requests per second and 5 tasks in progress per model for `wan3.0-video`,
`wan3.0-video-prime` and each `happyhorse-1.1-*` model; `qwen-image-3.0-pro` allows 5 and
`qwen-image-3.0` 20 submissions per minute. `alibaba-model-studio/capacity.ts` enforces them before
any paid call: video submissions reserve a slot (accepted in-progress tasks from `provider_attempts`
plus in-process in-flight submissions, serialized per model) and wait at most 2 seconds for a
per-second window; Qwen image fails immediately when its minute window is full. A full model, or
an Alibaba HTTP 429 (`Throttling.*`), fails before acceptance with the localized busy message and
the reservation is rolled back. Windows are per process, so a multi-instance deployment still
relies on Alibaba's 429 as the final backstop.

Alibaba reports `task_status: UNKNOWN` for a task that does not exist or whose 24-hour task ID has
expired. The poller records the first UNKNOWN observation in `settings_snapshot.alibabaUnknownStatus`;
after at least 3 consecutive UNKNOWN polls spanning 15 minutes (or once the job is 24 hours old) the
job fails with `ALIBABA_TASK_UNKNOWN` and the paid wallet is refunded once. Any other status clears
the marker.

Alibaba task results are retained by the provider for approximately 24 hours. The application poller must therefore run continuously while direct routing is active. It polls only Alibaba-owned active jobs, records progress in the shared attempt ledger, and marks locally over-age jobs `polling_stalled` for manual review instead of blindly refunding them.

Batch ordering uses `app_jobs.updated_at`, so failed retrievals advance that
timestamp conditionally on the job still being active. This allows newer jobs
through after a full failing batch. Successful observation freshness remains
in `generation_poll_state.checked_at`; `created_at` still controls maximum age.
The shared claim, individual-job selection and concurrent terminal states are
preserved. The [shared direct-poller contract](luma-agents-provider.md#polling-and-output-copy)
and `tests/provider-poll-fairness-postgres.test.ts` cover Alibaba, Luma, Kling
and Veo together.

A provider success is not an application completion. The output video is first copied through the shared durable media path. The job becomes complete only after the owned video URL is stored and the shared media-library projection is updated. A failed copy remains retryable and must not publish an expiring provider URL as the completed asset.

## Pricing and observability

Customer quotes come from the canonical MaxVideoAI pricing pipeline. For Wan 3 and Prime, `wan3-pricing.ts` adds verified input-video seconds to output cost at the same resolved per-second rate, before the existing commercial policy applies. This follows [Alibaba's input-plus-output billing rule](https://www.alibabacloud.com/help/en/model-studio/model-pricing), including video-bearing reference mode, editing and extension. Owned metadata supplies input duration; repeated URLs count once, using the largest persisted duration when aliases disagree. Missing video duration fails closed. The output base remains the requested output duration and an `input_video_duration` addon itemizes the source cost. Explicit provider-rate overrides remain authoritative.

The [Wan API duration contract](https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-api-reference) caps input videos at 15 seconds combined and input plus output at 30 seconds whenever videos are supplied, including reference mode. Quotes and generation enforce that contract before billing. Images, audio, document and webpage references add no video-duration charge.

The attempt ledger separately stores a catalog-rate provider-cost estimate for margin and operational reporting:

- Wan 3 and Wan 3 Prime count source-video plus generated duration where applicable;
- HappyHorse 1.1 counts generated output duration;
- returned provider usage units replace estimated units when available.

Keyvo (2026-11-13): the adapter now records the Bailian cn-beijing CNY list (source `bailian_cn_beijing_list_2026-11-13`, converted at 8 CNY/USD): Wan 3 0.3/0.6/1.2, Prime 0.45/0.9/1.8, HappyHorse 1.1 0.45/0.9/1.2 CNY/s at 480p/720p/1080p. The Singapore figures below are historical. This estimate uses the dated catalog rates encoded in the adapter. It does not know the Alibaba account's remaining free quota, temporary promotions, negotiated discounts, credits, taxes, or final invoice adjustments. Alibaba billing is therefore authoritative for cash cost and reconciliation; do not present `provider_cost_usd` as an invoiced amount when one of those account-level adjustments applies.

October 1 verification: Singapore LIST remains $0.05/$0.10/$0.20 per second for
Wan 3 at 480p/720p/1080p, and $0.068/$0.14/$0.28 for Prime. Both input and output
consume seconds. The private active manual grid quotes a 10-second source plus a
5-second 720p output at $1.95/$2.73 customer, against $1.50/$2.10 LIST estimates.
This is a price/quote check, not a new paid generation or invoice reconciliation.

`server/alibaba-job-accounting.ts` owns polling cost projection. A complete
provider-reported duration replaces the forecast. If provider usage is partial,
it combines reported output duration (or requested output) with the source
duration stored in the server's immutable pricing snapshot. Unknown source
duration leaves full cost unavailable. The poller stores input/output seconds,
the aggregate units and estimate status; it never marks the dated LIST rate as
account-effective cost. Customer receipts are not repriced at completion.

The [savings-plan guide](https://www.alibabacloud.com/help/en/model-studio/savings-plan-and-resource-package)
distinguishes eligible video usage under the AI General-purpose plan from the
LLM-only plan, which does not cover Wan. Plan coverage, remaining quota and
settlement must be confirmed for the actual account before applying a discount.
No assumed plan discount is included in these LIST estimates.

Admin metrics group the shared attempt ledger by provider and report only aggregate attempts, acceptances, completions, failures, fallbacks, stalled polls, cost coverage, and latency. They never select raw request/response snapshots, task IDs, URLs, prompts, or user identities.

Snapshots written by the common helper redact credential-like keys, workspace identifiers, signed URLs, oversized strings, and inline binary data. Provider errors shown to customers must stay provider-neutral.

## Production launch evidence

The public launch completed on 2026-09-14 with the Singapore account supplied for the Alibaba PoC:

- four Wan 3 calls completed successfully: two Wan 3 Prime and two Wan 3 Standard renders, each 15 seconds at 1080p;
- all four outputs were copied into durable MaxVideoAI storage and appeared in the Camgraph Admin library;
- the Alibaba console reported four HTTP 200 calls and no failure;
- MaxVideoAI charged $18.72 in total, moving the test wallet from $78.13 to $59.41;
- the Alibaba billing console showed $0 total, pre-tax, and bill cost because the calls consumed the Singapore free PoC quotas;
- the catalog-rate supplier value was $12.60 with the then-current Wan 3 Standard promotion, so the observed customer sale represented $6.12 nominal gross profit, or 32.7%, before taxes and other costs.

Happy Horse 1.1 is part of the same Alibaba direct adapter. Its public T2V contract was revalidated without spending: 3 seconds at 720p quoted successfully at $0.55, and 5 seconds at 480p quoted successfully at $0.46. A paid Happy Horse provider canary remains a separately approved spend.

## Post-deploy operating checklist

1. Run the provider, routing, polling, MCP, Studio, architecture, registry, pricing, lint, type, build, and diff checks under Node 22. Direct `tsx` test commands must include `--tsconfig frontend/tsconfig.json` so `@/` aliases resolve.
2. Open the authenticated `/admin/engines` surface once after deploying changed engine capabilities. Its existing seed owner refreshes system-owned `engine_settings` rows; administrator-owned rows remain authoritative.
3. Re-read each affected model through the public MCP catalog and prepare one zero-spend quote at the capability boundary. A published option that cannot be quoted is not launch-ready.
4. Verify production storage and the Alibaba cron independently, then keep monitoring accepted jobs until they reach a durable local terminal state.
5. Reconcile attempt-ledger estimates with Alibaba billing. Record free quota, promotion, discount, credit, and invoice differences outside `provider_cost_usd`.
6. Keep the fallback flag explicit and verify Fal credentials before deployment. Production enables only the eligible pre-acceptance path; do not broaden the compatible modes or error classes without a separate review.

Production currently uses the master switch, public routing, and the narrowly scoped Fal fallback described above. The defaults stay fail-closed for every unconfigured environment. The fallback was enabled on 2026-09-14 after the focused routing, submission, polling, refund, and architecture suite passed; no synthetic provider outage was introduced on the public route to force a live fallback.

## Rollback and release gates

The immediate rollback is to set `ALIBABA_MODEL_STUDIO_ENABLED=false`. Also keep `ALIBABA_MODEL_STUDIO_PUBLIC_ROUTING_ENABLED=false` and `ALIBABA_MODEL_STUDIO_FALLBACK_TO_FAL_ENABLED=false`. Continue polling already accepted Alibaba task IDs until they reach a durable local terminal state; disabling new routing does not cancel accepted work.

Before any later deployment or routing change, require:

- `pnpm model:registry:check`;
- the focused Alibaba provider, routing, submission, polling, storage-copy, refund, MCP, Studio, admin-metrics, and architecture tests;
- frontend TypeScript and lint checks plus `git diff --check`;
- a secret scan confirming that no key, workspace identifier, signed URL, or raw provider payload entered the branch;
- explicit approval for new provider spend and any materially broader routing or fallback change.

## Qwen image integration

The separate direct image adapter and Docker configuration are documented in
[Qwen Image deployment](../deployment/qwen-image.md). It uses synchronous image
generation; the video polling endpoint does not poll image requests.
