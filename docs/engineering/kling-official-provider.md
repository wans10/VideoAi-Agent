# Kling official API (Kling 4.0, 4.0 Flash and 3.0 Turbo)

`kling-v4`, `kling-v4-flash`, `kling-3-turbo-standard` and `kling-3-turbo-pro` run on Kling's official
"new design" API (model version in the path). Keyvo has no Fal, so these engines never fall back to it. Legacy
Kling 3.0 / O3 engines keep the legacy `/v1/videos/*` + `model_name` route unchanged.

**Bailian route (2026-11-11).** Kling 3.0, 3.0 Omni and 3.0 Turbo are also hosted on Alibaba Bailian. With the
default `KLING_ROUTE_ORDER=bailian,direct`, Bailian is the primary route and this legacy API the fallback after a
definite pre-acceptance rejection only (`direct,bailian` swaps them; `bailian` / `direct` disables the fallback).
Requests with Keyvo-registered subjects, voice IDs, camera control or motion brush stay on this API alone.
Turbo's direct leg is the real Kling 3.0 Turbo model on the new design (below), never plain `kling-v3`.
See [the Bailian section](alibaba-model-studio-provider.md#bailian-hosted-kling-and-minimax-owner-decision-2026-11-11).

Docs (fetched 2026-11-11): `https://klingai.com/document-api/api/video/4-0/{text-to-video,image-to-video,video-omni,elements}.md`,
the `4-0-flash/*` equivalents, `api/get-started/{authentication,error-codes,concurrency-rules}.md` and
`pricing/base/video.md`.

## Kling 3.0 Turbo (2026-11-12)

Docs (fetched 2026-11-12): `https://klingai.com/document-api/api/video/3-0-turbo/{text-to-video,image-to-video}.md`.

- Paths: `POST /text-to-video/kling-3.0-turbo` (top-level `prompt`, `settings.resolution` / `aspect_ratio` /
  `duration`) and `POST /image-to-video/kling-3.0-turbo` (`contents` = prompt + one `first_frame`, no aspect ratio,
  no last frame). Polling is the unified `GET /tasks`. `options.external_task_id` is the job id, watermark off.
- Tier = resolution: standard 720p, pro 1080p (`route.resolution` in `model-map.ts`). Ratios 16:9 / 9:16 / 1:1,
  3–15 s. There is no negative prompt, sound, cfg or `multi_prompt` field; audio is always rendered (the price
  table lists only "有声"), matching Bailian. Subjects, ref2v and v2v are refused.
- Shots are written into the prompt as `镜头 n, m, words;` (1–6 shots, ≥1 s each, summing to the duration, words
  ≤512; a `;` inside a shot becomes `；`). The text sent may hold 3,072 characters (t2v) / 2,500 (i2v), the
  folded shot plan included (`frontend/src/lib/kling-3-turbo-official-limits.ts`).
- Request builder: `payload-v2.ts` (`buildKling3TurboDirectPayload`) reuses the reviewed Turbo contract
  (`normalizeKling3TurboRequest`). Image constraints (jpg/jpeg/png, ≤50 MB, sides ≥300 px) are the engine's
  pre-charge checks; the official 1:2.5–2.5:1 frame ratio is not checked locally (Kling rejects it with a 1xxx
  code, which is refunded or handed to Bailian).
- Before charging, the router drops the direct leg when the folded shot plan exceeds the limit
  (`isKling3TurboRequestWithinOfficialLimits`): Bailian alone takes it, or, with Bailian unusable, the request is
  refused with HTTP 400 `ENGINE_CONSTRAINT` and no charge (`kling_direct_unavailable` / `unsupported_request`).
  The same check runs again in the builder (definite rejection, refunded, stored message localized in
  `lib/kling-failure-messages.ts`).
- Routing (`KLING_ROUTE_ORDER`): `bailian,direct` = Bailian primary, this route after a definite Bailian rejection
  (attempt 2, linked); `direct,bailian` = this route first, Bailian after a definite pre-acceptance rejection
  (`shouldFallbackFromKlingDirectToBailian`; the charge moves, no refund); `direct` / `bailian` single leg. When
  Bailian is unusable (disabled, no key, admin-only, public off) this route serves alone. It needs `KLING_API_KEY`;
  an AK/SK pair alone leaves Turbo on Bailian. Neither leg usable: refused before any charge.
- Jobs accepted on the old legacy `kling-v3` path keep their stored poll path and legacy costing.
- Vendor cost (PROVISIONAL, same assumption as 4.0): 0.8 credits/s (720p) and 1.0 credits/s (1080p) from
  `pricing/base/video.md`, 1 credit = CNY 1, 1 USD = 8 CNY. Since 2026-11-13 the customer price is 80% of the
  list price (`pricing-engine.md` "Keyvo official list price rule").

## Switch

| Variable | Meaning |
| --- | --- |
| `KLING_DIRECT_ENABLED` | `true` enables the direct Kling route (shared with 3.0 / O3). |
| `KLING_API_KEY` | Required for 4.0 and 3.0 Turbo: the new design accepts only `Authorization: Bearer <API Key>`; an AK/SK JWT is legacy-only. |
| `KLING_API_BASE_URL` | Optional; default `https://api-beijing.klingai.com` (mainland endpoint). |
| `KLING_DIRECT_PUBLIC_ROUTING_ENABLED`, `KLING_DIRECT_ADMIN_ONLY` | Same gates as 3.0 (`ADMIN_ONLY` defaults to `true`). |
| `KLING_DIRECT_ELEMENT_REGISTRATION_ENABLED` | Required for subjects (`elements`); without it a subject request is refused and refunded. |

When the route is not ready, `resolveVideoProviderRoutingPlan` returns `kling_direct_unavailable` (no charge) unless a
Fal key is configured, in which case upstream's Fal route is kept.

## Ownership

- `frontend/src/server/video-providers/kling-direct/model-map.ts`: paths (`/text-to-video|/image-to-video|/omni-video/kling-4.0[-flash]`,
  `/text-to-video|/image-to-video/kling-3.0-turbo`), `apiDesign: 'v2'`, polling via `/tasks`.
- `.../kling-direct/payload-v2.ts`: request body. It first runs the reviewed V4 / Flash input contract
  (`buildKlingV4FalRequest` / `buildKlingV4FlashFalRequest`, pure functions) and translates the result:
  t2v uses a top-level `prompt`; i2v uses `contents` with `first_frame` / `last_frame` (no aspect ratio);
  ref2v and v2v use omni `contents` (`refer_image` ids `Image1..`, `feature_video` `Video1..`, `base_video` `Video1`,
  `element` `Element1..`). `auto` becomes `adaptive`. A shot plan is folded into the prompt as `镜头N:Ds。...`
  (the new API has no `multi_prompt`). `options.external_task_id` is the job id.
- `frontend/src/lib/kling-v4-official-limits.ts`: prompt proration (26,000 English / 11,000 other characters),
  10 images, 5 videos incl. video subjects, 7 subjects (3 video), 15 items in total. Checked before charging
  (`execution-constraints.ts`) and again before submission.
- `frontend/app/api/generate/_lib/kling-direct-v2-submission.ts`: submission and refund policy.
- `frontend/server/kling-direct-poll.ts`: polling, output copy to Keyvo storage (Kling deletes outputs after 30 days),
  cost breakdown.

## Behaviour

- Private owned media is sent as one-hour read grants (`createFalMediaTransport`, a signer only; it does not call Fal).
  Subjects are registered through `/v1/general/advanced-custom-elements` (cached by source fingerprint) and sent as
  `element_id`; an image subject's voice is bound with `element_voice_id`.
- 1302 / 1303 (rate or parallel-task limit) are retried after 1 s, 2 s and 4 s; if still busy the job fails with the
  localized "busy" message and is refunded. Other 1xxx codes and local validation failures are definite rejections
  and are refunded. 1100 is `provider_account_error`, 1304 (IP whitelist) `provider_access_denied`.
- Transport errors and 5xxx are ambiguous: the job id is looked up with `GET /tasks?external_task_ids=`. A found task is
  accepted, a confirmed absence is refunded, an unanswerable lookup leaves the job `provider_polling_stalled` for
  manual review (no second paid task, no refund).
- Vendor cost is PROVISIONAL: official list credits (1 credit = CNY 1 per the pricing page), converted at
  1 USD = 8 CNY; `billing[].amount` is used when the task reports it. Since 2026-11-13 Kling 4.0 / Flash quote
  on the rule path at 80% of that list price (no customer tariff needed; `pricing-engine.md`).
