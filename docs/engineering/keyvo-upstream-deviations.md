# Keyvo deviations from upstream MaxVideoAI

Keyvo (`feat/white-label-keyvo`) deliberately differs from the upstream `MaxVideoAI` branch in the places below. When syncing a new upstream snapshot, keep these behaviours and update the pinned tests rather than reverting to upstream.

## Scope of the Keyvo customizations

The deliberate customizations are: (1) Simplified Chinese with the other languages hidden, (2) 聚合易支付 (LLM Hub Pay), (3) model prices shown in CNY instead of USD, (4) the redesigned pages, (5) the LLM Hub API, (6) the Alibaba Cloud and Volcengine Ark domestic APIs, and (7) the white-label Keyvo brand. Everything else should stay identical to upstream. Anything outside this list that differs from upstream must be listed in this file with the reason it stays. Seedance 2.5 video editing (v2v) is an upstream feature and is not a Keyvo customization.

## Unselected watch pages (`/video/[id]`)

- **Upstream:** a video that is not an editorially selected watch page has `isEligible === false` (no indexable watch page, no VideoObject JSON-LD).
- **Keyvo:** an unselected video that is public and indexable stays eligible (`isEligible === true`). Rollout-excluded editorial rows and local examples remain ineligible.
- **Why:** the bundled public examples fallback (`b12cb276f`, 2026-09-20) must be able to open as a public watch page; `tests/fallback-video-resolution.test.ts` pins this.
- **Guard that keeps the upstream price boundary:** being eligible never triggers a price read. `tests/video-seo-no-unused-price.test.ts` asserts that for an unselected-but-eligible page the mocked current-price reader is never called, that `currentPrice` is absent from the page data, and that neither `frontend/server/video-seo.ts` nor anything under `frontend/app/(public-watch)/video` can import `current-example-price`.
- **Source of truth:** `frontend/server/video-seo.ts` (`isEligibleSeoWatchVideo`, selection logic) and `frontend/server/videos.ts` (`PUBLIC_VIDEO_SOURCE_ELIGIBILITY`, which also gates `getPublicVideoIds` so deleted or unplayable media is never public).

## Upstream CodeBuild leftovers (`buildspec.timeline-worker.yml`, `Dockerfile.timeline-worker`)

- This repository does **not** use AWS CodeBuild. Keyvo images are built by GitHub Actions (`.github/workflows/docker-build-push.yml`) and pushed to Docker Hub.
- `buildspec.timeline-worker.yml` and the `org.opencontainers.image.source` LABEL in `Dockerfile.timeline-worker` are **upstream leftovers** kept only so future upstream merges stay conflict-free. The buildspec hard-codes the upstream's AWS account and ECR repository, and the LABEL points at the upstream repository.
- **Do not publish anything based on them**: never wire these files into a CodeBuild project or any release step, and never treat their repository names as Keyvo's. If timeline-export worker images ever need another pipeline, create a Keyvo-owned one with its own account/repository supplied through the build environment rather than editing these files.

## Header navigation: no examples menu

- **Upstream:** the marketing header exposes an `examples` dropdown, and `tests/marketing-navigation-rendering.test.ts` asserts its panel, one-entry gallery link and mobile presentation.
- **Keyvo:** the header renders the production/craft/screening structure from `STUDIO_NAV_LINKS`; there is no examples menu, so those upstream assertions are not carried over.
- **Why:** the examples dropdown cannot exist in Keyvo's header. Revisit if the examples menu is ever adopted.

## Deviations kept outside the seven customizations

### Bundled public examples (`frontend/config/public-examples.json`)

- **Upstream:** public example videos come from the production database.
- **Keyvo:** `frontend/server/bundled-public-examples.ts`, `frontend/config/public-examples.json` and `scripts/seed-public-examples.ts` supply bundled examples when the database has none (commit `b12cb276f`).
- **Why:** a fresh Keyvo database has no public videos, so the home page, model demos and watch pages would be empty. See also "Unselected watch pages" above.

### Upstream sync 2026-11-10 (`e4fa06283`): deviations introduced while merging

- **Home hero:** `HERO_VIDEO_ORDER` is `minimax-h3, seedance-2-5, wan-3, kling-3-pro`. Upstream opens with `flux-3-max`, which Keyvo hides (overseas vendor), so its examples link would be dead. The critical LCP poster in `home-lcp-image.ts` is the MiniMax H3 poster and `home-posters.generated.json` was regenerated with `pnpm --prefix frontend media:home-posters:prepare`. Re-check this order after every sync; `tests/public-video-coverage.test.ts` and `tests/homepage-real-examples-preview.test.ts` pin four items.
- **Studio same-origin check:** `isStudioSameOriginRequest` keeps Keyvo's proxy-aware `isSameOriginConsentRequest` and adds upstream's strict development-only loopback recovery in front of it (`frontend/app/api/studio/_lib/studio-route-utils.ts`).
- **Public image pricing rows:** the Keyvo relaxation `isKeyvoPublicImagePricingEntry` only applies to the Keyvo-native `alibaba_qwen_image` engines; every other model follows upstream's `includeInEstimator` contract.
- **Character Studio landing:** Keyvo's production-style hero (`CharacterBuilderHeroSection`, `ProductionReviewNotes`) sits on top of upstream's new workflow, recast and conversion sections. The sections are synchronous components; the page view resolves locale and dictionary and passes them down.
- **Qwen image engine:** the optional `watermark` input was removed with upstream's retirement of optional watermark controls; `execute-image-generation.ts` always sends `watermark: false`.
- **Brand in fr/es code and content:** `tests/product-brand-coverage.test.ts` forbids `MaxVideoAI`, so the strings upstream reintroduced in `subprocessors-copy.ts`, `milo-copy.ts`, `creation-stories-copy.ts`, the fr/es MCP docs and similar were rebranded. fr/es translations otherwise follow upstream.
- **Hidden models in tests:** upstream tests that exercise hidden families (flux-3-max, Veo, Gemini Omni) import `tests/helpers/keyvo-unfiltered-catalog.ts` or `scripts/lib/disable-keyvo-model-visibility` first, or set `KEYVO_MODEL_VISIBILITY=off` before dynamic imports.
- **MCP policy fingerprint:** `tests/fixtures/mcp-tool-selection-curated-policy.json` carries the Keyvo fingerprint computed from the merged tool set, not upstream's value.
- **Not adopted from upstream:** the privacy, terms, legal-notice and subprocessor pages keep the Keyvo documents (`legal/subprocessors/_lib/subprocessors-copy.ts` is an unreferenced upstream orphan); the storyboard composer entry removed upstream stays removed.
- **Environment-only test failures:** the container used for validation cannot decode H.264 or run WebKit and has no `jq`, so the Vercel-preflight scripts, the creator/example video readers and the WebKit halves of several browser tests fail there on pure upstream code as well. `keyvo-github-publication` and `github-assets` fail whenever the Keyvo capture reviews in `docs/marketing/github-asset-manifest.json` are older than 30 days.

### Google Vertex Veo regional endpoints

- **Keyvo uses Google Vertex for Veo.** Commit `e30eb7c00` isolates Veo's regional endpoints from global models (`frontend/server/video-providers/google-vertex-veo/client.ts`, `frontend/server/google-vertex-readiness.ts`, `docs/deployment/vertex-regions.md`). It stays unless upstream ships an equivalent fix.

### Qwen Image recovery after interrupted responses

- `frontend/lib/image-generation-client.ts` recovers a stored result when the response is interrupted (commit `d7a8f3736`, documented in `docs/deployment/qwen-image.md`). It belongs to the direct Alibaba Qwen Image 3.0 generation (customization 6) and stays with it.

### Hidden-locale content

- French and Spanish content (models, blog, best-for) is identical to upstream. English content still carries the intermediate `VideoAI` brand because Chinese pages use English as their base text and fall back to it where no Chinese override exists; mixed-locale comparison files keep it for the same reason. Keyvo's brand test only scans page code, messages and the docs folders.

### Seedance Edit transport variable (legacy)

- `frontend/src/lib/env.ts` still reads the older `SEEDANCE_2_5_V2V_TRANSPORT` as a fallback for `SEEDANCE_2_5_EDIT_TRANSPORT`, and `tests/seedance-2-5-edit-transport-fallback.test.ts` pins it. It predates upstream's own ModelArk Edit transport and is a candidate for removal; it does not change behaviour when only the canonical variable is set.

### MiniMax official API (H3, Hailuo, H3 Max)

- **Keyvo:** MiniMax-H3 and the Hailuo models run on MiniMax's own mainland API behind `MINIMAX_OFFICIAL_ENABLED` (see `docs/engineering/minimax-official-provider.md`). The shared H3 catalogue (`frontend/src/config/fal-engines/minimax-h3.ts`, `execution-constraints.ts`) offers 4-15 s at 768P/2K only, because 480P and 4K are not MiniMax-H3 tiers; `minimax-hailuo-2-3` and `minimax-hailuo-2-3-fast` exist only for this route.
- **H3 Max (2026-11-12):** `minimax-h3-max` runs on MiniMax's own V2 API (`MiniMax-H3-Max`) behind the same switch, with upstream's registry publication (the hidden-id list `frontend/config/keyvo-hidden-model-ids.json` is now empty; the mechanism stays for future models). The shared engine (`frontend/src/config/fal-engines/minimax-h3-max.ts`) offers 480P/768P only, a 7,000-character prompt, frames in image mode only, and no soundtrack, seed, middle frame or reference order (Fal-only controls); its pricing is MiniMax's PROVISIONAL CNY list price (`src/lib/minimax-h3-max-pricing.ts`), so the reference-token open tariff no longer applies to it (`server/pricing/open-quantity-tariff.ts`). Fal's Recast/Relight stay defined for upstream but are not executable, offered or sold (`KEYVO_UNSERVED_VIDEO_OPERATIONS` in `lib/pricing-audit/video-operation-tariff-inventory.ts`). Upstream tests of those Fal-only controls were adapted to assert their absence; the Fal request builder keeps its upstream contract.
- The EN/FR/ES model content and `data/benchmarks` still describe Fal's 1080P tier (Keyvo renders zh only); `content/models/zh/minimax-h3-max.json` and the MCP guidance entry name 480P/768P.

### Wan 2.5 and Happy Horse 1.0 offline (2026-11-11)

- Both keep their lifecycle (`deep_legacy` and `legacy`) and successor (`wan-3`, `happy-horse-1-1`) but are unpublished on every registry surface, including compare: `wan-2-5` left the `publishedPairIds`/`suggestedOpponentIds` of the 20 models that listed it, which took the comparison inventory from 290 to 269 slugs (807 localized URLs). Upstream still publishes them. The Happy Horse 1.0 template and content CTAs point at the Happy Horse 1.1 page.

### Audit records are not committed

- The Keyvo merge and system audit logs under `docs/plans` were removed; the directory matches upstream. Keep new audit output out of the repository (`scripts/audit-keyvo-merge.mjs` writes there by default, so set `KEYVO_AUDIT_OUTPUT_DIR` to a path outside the working tree).

### Volcengine Ark mainland defaults and retirements (2026-11-11)

- **Code defaults are mainland (customization 6):** `BYTEPLUS_ARK_BASE_URL` defaults to `https://ark.cn-beijing.volces.com/api/v3`, `BYTEPLUS_ARK_REGION` to `cn-beijing`, and the Seedance/Seedream model ids to the `doubao-*` names (`src/lib/env.ts`, `byteplus-modelark-constants.ts`, `byteplus-seedream-constants.ts`, `launch-config.ts`). BytePlus international (`dreamina-*`, `dola-*`, `ap-southeast-1`) stays available through the same env variables. Production already set the mainland values, so behaviour there is unchanged. The BytePlus signed account contract (`server/byteplus-account-contract.ts`) only applies when the region is `ap-southeast-1`; tests that exercise it pin that region explicitly. The LAS host stays BytePlus-only (no mainland LAS).
- **Seedance 1.5 Pro and Seedream 5.0 Lite are retired** in the registry (`lifecycle: retired`, replacements `seedance-2-0-mini` and `seedream-5-0-pro`), following the provider shutdowns (mainland 1.5 on 2026-09-21, Seedream 5.0 Lite on 2026-11-24). Upstream keeps 1.5 as a published archive page. Engine definitions and provider mappings stay for historical jobs and polling. The comparison-indexation tests filter the approved 2026-09-04 noindex lists for retired models instead of re-curating them.
- **Seedance 2.0 4K guard:** `src/server/video-providers/byteplus-modelark-capacity.ts` refuses a new 4K Seedance 2.0 submission (HTTP 429, refunded) while the account already has one in flight, the documented Ark limit (RPM 15, concurrency 1). `SEEDANCE_2_4K_MAX_CONCURRENCY` raises it if Volcengine grants more.

### Kling 3.0 Turbo on Kling's official Turbo API (2026-11-12)

- **Keyvo:** `kling-3-turbo-standard` / `-pro` direct leg is the real `kling-3.0-turbo` model on the new-design API (`/text-to-video|/image-to-video/kling-3.0-turbo`, `/tasks` polling, API Key only, never Fal), see `docs/engineering/kling-official-provider.md`. Upstream sends Turbo to the legacy `/v1/videos/*` route as `kling-v3` with a Fal fallback.
- Upstream tests that used Turbo as the representative legacy Kling engine (`fal-fallback-attempt-recovery`, `direct-ack-persistence-postgres`, `fal-provider-fallback-enqueue-postgres`, the Fal case in `kling-3-turbo-fallback`) use `kling-3-standard` instead; `kling-3-turbo-direct-contract.test.ts` holds the Keyvo Turbo contract. Re-check these after every sync.

### Owner model allowlist (2026-11-14)

- **Upstream:** every registry model of a visible family is offered on the workspace, pricing and MCP surfaces; only the page-level surfaces were hidden by family.
- **Keyvo:** `frontend/config/keyvo-model-allowlist.json` is the single owner-decided list of 26 engine ids that customers may be offered. Every other registry model (40 of 66) is hidden on every customer surface. `frontend/config/keyvo-model-visibility.ts` reads it: `isKeyvoHiddenModel` is "not on the allowlist" and is consumed by the runtime publication projection (`config/model-runtime.ts`: page, App and pricing), the workspace engine list (`src/lib/engines.ts` `buildBaseEngines`), the generate route (`app/api/generate/_lib/route-context.ts`, which also refuses the hidden BytePlus fallback), the pricing hub, the examples API, MCP and agent guidance.
- **Why:** the owner decided that only the listed Kling, Alibaba Bailian, MiniMax, Volcengine, Google Vertex and OpenAI models are offered. The registry stays the authored source; the allowlist is a Keyvo-owned overlay, so upstream registry edits do not conflict.
- **Defaults repointed to offered engines:** Studio shot model (`seedance-2-5`), storyboard image preset and storyboard tool (`gpt-image-2-6-sunburst`), Studio image conversation (`gpt-image-2-6-sunburst`), MCP trial preset and agent trial quote (`seedance-2-5`), family defaults for Seedance (`seedance-2-5`) and Veo (`gemini-omni-flash`).
- **Veo family stays visible for Gemini Omni Flash.** Gemini Omni Flash is registry family `veo`; a model outside a visible family is closed even when allowlisted, so `veo` is in `keyvo-visible-families.json`. Veo 3.1 (x3) stays hidden. Open question for the owner: the Veo family nav label still reads "Veo 3.1" and the examples/footer lists show a Veo entry (Gemini Omni only).
- **Hidden P0 models are closed on App and pricing too** (previously upstream kept App and pricing open for hidden models). Visible-family models still follow the family rule.
- **Still to repoint (not done):** editorial copy that names hidden models (`pricing/_lib/pricingPageContent.ts` cards for FLUX 3 Max, Veo 3.1, Seedance 2.0 and Pika; PAYG discovery and film-programme configs; best-for scenes; home and content dictionary pricing rows). Those are copy and resolution changes, not default swaps.
- **Test fixtures:** upstream mechanism tests (family grouping, settings defaults, MCP catalogue, open-quantity tariffs, public projection, the Pika/Seedance layout browser scenarios) run on the unfiltered catalog via `tests/helpers/keyvo-unfiltered-catalog.ts`. Customer-surface expectations were updated to the allowlist (MCP guidance, MCP specialised-mode audit, marketing navigation, P0 graph, LLMS comparison feed).
- **Route priority:** no route change was needed for Kling 3 / 3 Omni / 3 Turbo, MiniMax-H3 (both already Bailian first), Wan 3, HappyHorse and Qwen (Alibaba direct). Still open: LLM Hub remains a fallback in `src/server/video-providers/router.ts` (`llmhubFallback()`) for allowlisted models, which the owner rule ("official API only" when Bailian does not host the model) does not allow; GPT Image 2.5 still routes through LLM Hub (`src/config/fal-engines/gpt-image-2-5.ts`, `src/server/images/llmhub-image-models.ts`).
- **Tests:** `tests/keyvo-model-allowlist-contract.test.ts` locks the owner list, the workspace/publication/catalogue absence of hidden models, and the absence of hidden defaults.
- **Offered but not yet priced by the official-list rule:** Nano Banana 2 / 2.1 / Lite, Gemini Omni Flash 1.2 and the GPT Image 2.5 / 2.6 engines have no official mainland CNY list price in the repo. Their prices stay on their existing rules (nothing was guessed or changed). `tests/keyvo-official-list-pricing.test.ts` lists them as pending; the owner must supply the CNY list prices. The GPT Image 2.6 engines also still show "Price unavailable" in the picker (existing tariff-gate/dispatch defect, follow-up).
- **Priced but not offered:** Kling 3 4K tiers, Kling O3 4K, Hailuo 02 / 2.3 / 2.3 Fast, Seedance 2.0 / Fast / Mini keep their official-list price rule and are listed as such in the same test, so a future offer needs no price change.
- **PAYG strip:** the first six preferred examples now include Gemini Omni Flash and Kling 4.0, so MiniMax-H3-Max drops out of the strip (its row stays offered). Strip placement is an owner question.

### Official mainland list prices × 0.8 (2026-11-13)

- **Keyvo:** every Keyvo-visible model is priced at 80% of its supplier's official mainland CNY list price
  (`docs/engineering/pricing-engine.md` "Keyvo official list price rule"). Supplier facts in the shared engine files
  (`wan-3*.ts`, `happy-horse-1-1.ts`, `kling-3-*.ts`, `kling-o3.ts`, `kling-3-turbo-shared.ts`, `pricing-addons.ts`,
  `seedream*.ts`, `launch-config.ts` Seedance builders, `kling-v4*-pricing.ts`, `minimax-h3-pricing.ts`,
  `minimax-hailuo-pricing.ts`, `audio-generation.ts`) carry the official CNY list price instead of upstream's
  fal/BytePlus-international USD prices, and `official-list-pricing.ts` with the `official-list-80` profile sets the
  customer price. Upstream keeps its margin rule. Expect conflicts in these files on every sync: keep Keyvo's numbers.
- **Character Recast** costs exactly 2 × the ordinary Wan 3 Prime customer price (owner, 2026-11-13): Recast quotes
  use the Keyvo-only `recast-even-cents` profile (supplier cost × coefficient rounded once to even cents) and the
  scoped database coefficient is ×1.6 (set in the admin Recast editor; the new-rule draft defaults to ×1.6). Upstream
  uses `standard` rounding with its own coefficient; keep Keyvo's profile, draft default and tests on sync.
- **Kling 4.0 / Flash** quote on the rule path in Keyvo (upstream requires a reviewed customer tariff).
- **MiniMax-H3** bills reference-video seconds and images beyond five; Seedance counts input-video seconds in its
  tokens at Volcengine's "含视频" rate.
- Upstream tests that pin fal-era prices or the 30% margin for these engines were updated to the official-list numbers;
  tariff cutover/seed rehearsals (`customer-tariff-*`, `local-customer-tariff-activation-postgres`,
  `current-price-consumer-parity-postgres`) add explicit engine margin rules in their disposable databases because
  below-cost prices cannot become tariff cells. Tests that used Wan 2.6 / Kling 2.5 Turbo / Kling 2.6 Pro as live
  fixtures now use published models or assert their absence.
- **Keyvo cannot run the customer-tariff initial cutover with the official-list-80 engines (below cost by design);
  never activate `app_customer_tariff_state.active` in production.** With only the database-wide rule the reviewed
  seed refuses them: Seedance with "A positive reviewed variant margin is required.", Wan 3 / 3 Prime with
  "Unsupported Wan continuous tariff profile", and every other official-list point price is a below-cost manual cell
  (settlement guard) that no reviewed exception can approve; the cutover itself requires complete inventory coverage,
  so those engines cannot be left out either. `customer-tariff-initial-cutover-postgres.test.ts` asserts these
  refusals and runs the upstream atomicity / rollback / reader rehearsal only on the engines that are not
  official-list priced (unpublished in-process, no price or rule changes).

### Wan 2.6, Kling 2.5 Turbo and Kling 2.6 Pro offline (2026-11-13)

- They have no mainland route (not in the Alibaba, LLM Hub or Kling direct maps), so they are unpublished on every
  registry surface like Wan 2.5, keep their `legacy` lifecycle, gain successors (`wan-3` already, `kling-3-turbo-standard`,
  `kling-3-pro`) and left the compare lists of the models that listed them (19 models), which took the comparison
  inventory from 269 to 211 slugs (633 localized URLs; `docs/seo/comparison-indexation-matrix-2026-07-08.*`
  regenerated). Upstream still publishes them. Their frozen
  audit rows stay reproducible (`FROZEN_LEGACY_AUDIT_ENGINE_IDS`).
- The homepage `fallback-wan` example card (`home.redesign.examples.fallbackCards` in every locale) presents Wan 3
  (poster `/hero/showcase-wan-3-city-22s.webp`) instead of Wan 2.6; an unpublished engine's card is dropped, which
  left the zh homepage with three cards. Keep the Wan 3 card on upstream syncs.

### Phone number login: password sign-in, SMS code for registration and recovery (2026-11-13, off by default)

- **Keyvo:** with `NEXT_PUBLIC_PHONE_LOGIN_ENABLED` on, `/login` is phone-first. Returning users sign in with a
  mainland mobile number (`^1[3-9]\d{9}$`, sent as E.164 `+86…`) and a password through
  `supabase.auth.signInWithPassword({ phone, password })`; no SMS is sent. New numbers and forgotten passwords use an
  SMS code: `supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: true } })` then
  `verifyOtp({ phone, token, type: 'sms' })`, with a 60 s resend cooldown kept in `sessionStorage`
  (`keyvo-login-phone-otp`) and five client-side code attempts. The SMS step requires the terms and age checkboxes,
  because an unregistered number creates an account. Consents go to `/api/legal/consents` only when the verified
  user was created within the last 30 minutes.
- **Required password step (owner decision 2026-11-13):** every verified SMS code ends in a password step before the
  page may leave: `supabase.auth.updateUser({ password })`, minimum 6 characters (the same rule and messages as email
  sign-up), confirmation field, and a cancel button that signs the browser out. Sign-up analytics
  (`sign_up_completed`, method `phone`) fire when this step completes, not when the code verifies.
- **Redirect hold:** from the moment a code verifies until the password is saved, `useLoginPageController` ignores
  every `completeAuthenticatedRedirect` call (`authRedirectHoldRef`), so the session probes and auth-state listener
  cannot skip the step. The pending step is recorded in `sessionStorage` (`keyvo-login-phone-password-setup`, one hour)
  and restored after a reload; an expired verification (`session_not_found` and similar) clears it and returns to
  phone sign-in with a localized message.
- **Errors:** wrong number or password share one neutral message (`auth.phone.feedback.passwordInvalid`) so a
  registered number is not revealed. Weak, reused, throttled and unavailable password errors map to
  `auth.phone.feedback.*`; provider wording is never shown.
- **Owners:** pure rules in `frontend/app/(core)/login/_lib/login-phone.ts`, `_lib/login-phone-password.ts` (error
  mapping, setup record) and `_lib/login-validation.ts` (`validatePasswordSetup`); the state machine in
  `_hooks/useLoginPhoneAuth.ts`, with `_hooks/useLoginPhonePasswordSignIn.ts` (password sign-in) and
  `_hooks/useLoginPhonePasswordSetup.ts` (password step); forms in `_components/LoginPhoneSignInForm.tsx`,
  `LoginPhoneAuthPanel.tsx` (SMS step), `LoginPhonePasswordSetupForm.tsx` and `LoginPhoneNumberField.tsx`.
  `LoginAuthSurface.tsx` renders the step and `useLoginPageController.ts` only gains the redirect hold.
  Copy is `auth.phone.*` (including `passwordSignin`, `passwordSetup` and the `feedback.password*` keys) in all four
  message files; `tests/login-copy-localization.test.ts` needs every locale.
- **Flag:** `NEXT_PUBLIC_PHONE_LOGIN_ENABLED` (build time; Dockerfile ARG defaulting to `false`, GitHub variable in
  `docker-build-push.yml`, `docker-compose.1panel.yml` build arg, `.env.production.example`). Without it the page renders
  exactly the email/password form.
- **Server side** (not part of the web image; **no GoTrue or OpenResty change for password login**): the GoTrue Send SMS
  hook in `docs/deployment/phone-login-sms/` (`hook.js`, Alibaba Cloud SMS, Standard Webhooks signature, masked logs,
  in-memory per-phone/global limits) and its operator README. `POST /auth/v1/token?grant_type=password` and
  `PUT /auth/v1/user` must not be blocked at the gateway; email `/signup` and email `/otp` stay blocked there.
- **Email accounts:** existing email users keep the email sign-in form behind
  "已有邮箱账户？使用邮箱和密码登录" (`auth.phone.useEmailAccount`), with password reset. That form cannot create accounts.
- **Tests:** `tests/login-phone-auth.test.ts` (flag, validation, cooldown, password sign-in and its errors, code
  registration and recovery into the password step, redirect hold, reload and cancel, setup validation and errors,
  email sign-in, copy), `tests/login-phone-password.test.ts` (pure error mapping, setup record, validation, module
  boundaries), `tests/phone-only-account-identity.test.ts` (null-email display, admin, MCP, settings) and
  `tests/phone-login-sms-hook.test.ts` (hook behaviour with injected verifier/sender). Keep them on upstream syncs.
- **Accounts without an email:** GoTrue returns `email: ""` and `phone: "86…"` for them. `frontend/lib/account-identity.ts`
  normalizes the email to null and masks the phone (`138****5678`). Header/marketing nav (whose signed-in state was
  `Boolean(email)`), `getMarketingAuthSnapshot`, settings (masked phone field), admin user list/detail (masked
  phone, phone search), `getUserIdentity` (`phone` added), DSAR export (`user.phone`) use it. The MCP/agent principal
  treats a confirmed phone as a verified contact (`emailVerified` = email or phone confirmed). Admin impersonation
  needs an email magic link and stays disabled for phone-only accounts. `method: 'phone'` is an allowed analytics
  method. Audit: `tests/phone-only-account-identity.test.ts`; the full table is in the Keyvo package notes.
- **Known gaps (owner decision needed):** GoTrue exposes no "has a password" flag to the browser, so the password step
  is enforced in the UI and by the redirect hold only. A browser closed after the code but before the password is
  saved keeps a password-less session, and that user reaches the app until the next SMS sign-in. Closing it needs a
  server-side marker. Turning the flag off makes password-only phone accounts unable to sign in until it is on again.

## Login tabs and generic continuation banner removed (2026-11-13)

- **Generic banner removed (regardless of the phone flag):** `buildLoginContinuation` in `frontend/app/(core)/login/_lib/login-continuation.ts`
  returns `null` for `/app`, `/app/image`, `/app/audio`, `/app/library`, `/app/tools` and `/app/studio`. The banner
  ("您的生成设置已保存") was derived from the `next=` path alone, so it claimed a saved setting even when nothing was
  saved. Only the billing amount confirmation (`billing`, `billingGeneric`) and the MCP connection (`mcp`) banners remain.
  The retired `auth.continuation.{video,image,audio,library,tool,studio}` copy is removed from all four message files.
  Guards: `tests/login-continuation-confidence.test.ts`.
- **Phone tabs (flag on):** `登录` shows phone + password (hint and sign-up link removed), `注册` shows the number,
  the terms/age checkboxes and the SMS step, then the required password step (no tabs). The forgot-password code view
  and the email view have no tabs and a back link. `?mode=signup` opens 注册, `?mode=signin` and bare `/login` open 登录
  (`resolveInitialAuthMode(..., fallback)` in `_lib/login-route-state.ts`). Cancelling the password step returns to 登录.
  The tab bar is `_components/LoginPhoneModeTabs.tsx`; the SMS panel takes `mode` `signup` (registration) or `signin`
  (recovery, which keeps the consent checkboxes because an unknown number creates an account).
  Copy: `auth.phone.{tabs,signin,signup,codeSignin,backToPhone}`; `title`, `description`, `usePhone` and
  `passwordSignin.newUser` are retired. Guards: `tests/login-phone-auth.test.ts`, `tests/login-phone-tabs-contract.test.ts`.
  The email-era tab bar (flag off) is unchanged.

## Character Builder price in CNY and the Nano Banana 2.1 tariff gate (2026-11-13)

- **Engine id is correct.** Both Character Studio quality modes (`draft`, `final`) price on `nano-banana-2-1`
  (`frontend/src/lib/character-builder.ts`, `getQualityEngineId`). It is not a suffix bug.
- **Why the production estimate returns 500 `pricing_error`:** `server/pricing/quote-billing.ts` forces Nano 2.1 onto the
  native customer-tariff path (`requiresNano21Tariff`). That path needs `app_customer_tariff_state.active`, which Keyvo keeps
  off (see the cutover section above). With the state inactive the quote throws "An active reviewed Nano Banana 2.1 customer
  tariff is required.", so no price is ever shown. The reviewed Nano 2.1 cells in `frontend/config/customer-tariffs.json` take
  effect only with that state active. Activating
  the state or changing the gate is an owner decision, not a code fix. Guard: `tests/character-builder-nano21-gate.test.ts`.
- **CNY in the Character Builder:** the workspace hook and the dock assumed USD (`payload.pricing.currency !== 'USD'`, `$` text),
  so a CNY customer snapshot could never display. `_lib/character-builder-price.ts` now accepts the Keyvo CNY snapshot, converts
  it back through `meta.customerCurrencyConversion` (refusing inconsistent totals), keeps the tariff revision requirement, and the
  dock formats through `formatCustomerUsdAmount`. Guard: `tests/character-builder-price-currency.test.ts`. Still USD-only in the
  Character Studio recast estimate route and `recast-submit.ts` (`quote.currency !== 'USD'`); not changed here.

## Chinese workspace copy coverage (2026-11-13)

- Keyvo-visible labels that rendered in English for `zh` now have zh branches: model picker copy (`engine-select/model-picker-copy.ts`,
  with the CNY estimate note), the picker trigger and aria labels, the picker scenario controls (duration, audio, keep-source-audio),
  gallery "Original cost", the Milo footer link and pricing link, the Send-to-Milo aria label, the tools catalogue heading (which now
  uses the existing creator zh copy), the Character Studio copy (`zh` object), its catalogue labels (`ZH_STUDIO_LABELS`, prompts stay
  English for the model), the presentation and sheet client components, and the `/app/image` and `/app/audio` page titles.
- Model, brand and provider names stay in English. Example prompts in `/zh/examples` are user-prompt content and stay English.

## Checking for new deviations after an upstream sync

Run `node scripts/report-upstream-deviations.mjs` after merging a new upstream snapshot. It classifies every file that differs from `origin/MaxVideoAI` by customization (1 zh, 2 LLM Hub Pay, 3 CNY, 4 UI redesign, 5 LLM Hub API, 6 domestic providers, 7 white-label), deploy infrastructure, or documented kept deviation, and lists the paths that are new since `docs/engineering/keyvo-deviation-baseline.tsv`. A new path in `Z no signal` has no sign of belonging to a customization: document it here or restore the upstream file. The classification is heuristic and informational; `--strict` exits non-zero when such paths exist. After reviewing, refresh the baseline with `--write-baseline`.

## Phone sign-up records the Cookie Policy (2026-11-13)

Upstream records only Terms and Privacy at sign-up; the Cookie Policy is recorded by the cookie banner, so a new account saw the re-consent prompt immediately. Keyvo's phone sign-up sentence now names all three documents and sends `cookiesAccepted: true` to `/api/legal/consents`, which then also records the `cookies` document at its current version. The email sign-up request is unchanged. Guard: `tests/phone-signup-cookie-consent.test.ts`.

## Owner model allowlist: admin tier, Kling 3 4K, GPT Image 2.5 on OpenAI (2026-11-14)

- **Allowlist (`frontend/config/keyvo-model-allowlist.json`):** `offeredEngineIds` now has 31 engines. New: `kling-3-4k`
  and `kling-o3-4k` (public, owner decision F opened), `veo-3-1`, `veo-3-1-fast`, `veo-3-1-lite` (admin tier). Each
  offered engine has an explicit `engineTiers` entry: `public` or `admin`.
- **Admin tier (owner decision C):** `nano-banana-2-1`, `nano-banana-2`, `nano-banana-lite`, `gemini-omni-flash`,
  `gpt-image-2-6-sunburst`, `gpt-image-2-6-flare`, `gpt-image-2-5-sunburst`, `gpt-image-2-5-flare`, `veo-3-1`,
  `veo-3-1-fast`, `veo-3-1-lite`. Single choke point: `isKeyvoHiddenModelForViewer(id, { isAdmin })` in
  `frontend/config/keyvo-model-visibility.ts`. `isKeyvoHiddenModel(id)` is its non-admin view and is what every public
  surface uses (pages, sitemap, pricing hub, MCP/agent catalogues, examples, PAYG strip). Admins see admin-tier
  engines in the authenticated workspace list (`getBaseEnginesByCategory(category, { isAdmin })`, the engines GET
  handler) and may generate with them.
  Refusals before any charge: `app/api/generate` (`resolveGenerateRouteContext`, admin check only for admin-tier ids),
  `app/api/images/generate`, `app/api/images/estimate` and `app/api/pricing/quote` (`src/server/keyvo-engine-access.ts`).
  The image generate refusal also covers every hidden engine (it previously accepted any registry image engine).
- **Families:** `veo`, `gpt-image` and `nano-banana` are removed from `keyvo-visible-families.json` because they have no
  public member. Their public pages, sitemap and comparisons are therefore absent.
- **Public defaults:** the image storyboard preset moved from GPT Image 2.6 (admin tier) to `seedream-5-0-flash`.
  Character Builder (both quality modes run Nano Banana 2.1, admin tier) refuses ordinary accounts in
  `app/api/tools/character-builder` with `tools_disabled` before any reservation. Its marketing page and the home
  and model-page links to it still render for everyone; hiding those entries is an owner decision (see report).
- **PAYG strip (owner decision E):** `payg-video-showcase.ts` shows only domestic engine ids (Kling, Seedance, Seedream,
  Wan, HappyHorse, MiniMax/Hailuo, Qwen) and drops hidden engines. `payg-discovery-config.ts` drops Gemini Omni Flash
  and Veo 3.1 entries.
- **GPT Image 2.5 on OpenAI official (owner decision B):** `gpt-image-2-5-{flare,sunburst}` providerMeta is
  `openai_images` (was `llmhub`); removed from `llmhub-image-models.ts`. `lib/image/gptImage26.ts` gains
  `isOpenAIDirectImageEngineId` and `openAIImageModelSlugForEngineId`; the executor, executability check and settings
  normalisation use them for 2.5 and 2.6. Dispatch defect fixed: `resolveImageProviderSelection` now returns the direct
  route for `openai_images` (2.6 previously fell through to the fal path), and `assertDirectImageProviderAvailable`
  calls `assertOpenAIImageAvailable` before the wallet reservation.
- **Tests:** `tests/keyvo-model-allowlist-contract.test.ts` pins the 31-engine list, the 11 admin-tier ids, the workspace
  split and the family rule. `tests/keyvo-customer-offer-visibility.test.ts` (new) pins the customer view without the
  unfiltered-catalog override. `tests/mcp-model-recommendations.test.ts` and `tests/product-schema-visible-offer.test.ts`
  now import `tests/helpers/keyvo-unfiltered-catalog.ts`, because they test recommendation and offer mechanisms rather
  than the customer surface.
- **Not done in this change:** LLM Hub fallback removal for allowlisted engines (decision A) and the official-list-100
  profile for admin-tier prices (decision D). See the report for the call-site list and the unverified prices.

## Admin-tier environment override: `KEYVO_ADMIN_TIER_OPEN` (2026-11-14)

- **Switch:** `KEYVO_ADMIN_TIER_OPEN=true` (or `1`, case and spaces ignored) makes every admin-tier engine public on
  every surface: workspace pickers, estimate and generate access checks, model pages, examples, sitemap, pricing hub
  and estimator, nav, MCP and agent catalogues. Unset, `false`, `0`, `yes` or any other value keeps the admin tier
  admin-only, exactly as before. The eleven ids are the admin tier in `keyvo-model-allowlist.json`.
- **Single choke point:** `keyvoEngineTier()` in `frontend/config/keyvo-model-visibility.ts` returns `public` for an
  admin-tier engine while the switch is on. Every tier check reads it. The family gate for the admin families (veo,
  gpt-image, nano-banana) is opened per engine by `isKeyvoVisibleEntry` and, for the examples family filter, by
  `isKeyvoVisibleOrOpenedFamily`. The env reader is `isKeyvoAdminTierOpen()` in `frontend/lib/env.ts`.
- **Read time:** the value is read on each server call, never cached in a module constant. It is not visible in
  browser bundles (a non-`NEXT_PUBLIC_` variable is undefined there), so browser code reports the admin tier as closed;
  the server decides, and the engine lists arrive from the server.
- **What needs what:**
  - Restart only (no rebuild): API routes (generate, estimate, pricing quote, character builder, examples),
    server-rendered pages without a build-time cache, and the workspace engine lists. These read the env per request.
  - Rebuild required: statically prerendered model, example, pricing and blog pages, the homepage and any ISR cache,
    and the sitemap. They keep the state of the build that produced them. Set the variable in the build environment
    too, then rebuild and redeploy.
  - The model runtime projection (`frontend/config/model-runtime.ts`) and the engine catalogue are built at module load,
    so a restart is enough for them, but a rebuild is needed for the static copies above.
- **Where to set it:** in `.env.production` (the compose `env_file`). Do not add it to the `environment:` block of
  `docker-compose.1panel.yml`, because compose `environment:` values override `env_file` values and would pin it.
  `.env.production.example` documents the commented key.
- **Tests:** `tests/keyvo-admin-tier-env-override.test.ts` covers default-off (unset and non-true values), the
  true/1 opening for every admin-tier id, non-opening for unlisted and hidden ids, the direct-API refusal path without
  a session lookup, and a child-process projection check that the model page is unpublished by default and published
  when the value is `true`.

## Official-list-100 price rule for Nano Banana engines (2026-11-14)

- **Owner decision:** Nano Banana 2 (`nano-banana-2`, `gemini-3.1-flash-image`), Nano Banana Lite
  (`nano-banana-lite`, `gemini-3.1-flash-lite-image`) and Nano Banana 2.1 (`nano-banana-2-1`,
  `gemini-nano-banana-2.1`) are sold at 100% of the official USD list, converted at 8 CNY/USD. No discount, no margin.
  The owner confirmed Gemini API (AI Studio) prices equal Vertex prices.
- **Source:** https://aistudio.google.com/docs/pricing (the `ai.google.dev` URL redirects there), read 2026-11-14.
  Image output list prices as stated on that page:

  | Engine | 0.5K | 1K | 2K | 4K | Input (text/image/video, standard) |
  |---|---|---|---|---|---|
  | Nano Banana 2 (`gemini-3.1-flash-image`) | $0.045 | $0.067 | $0.101 | $0.151 | $0.50 per 1M tokens |
  | Nano Banana Lite (`gemini-3.1-flash-lite-image`) | not listed | $0.0336 | not listed | not listed | $0.25 per 1M tokens |
  | Nano Banana 2.1 (`gemini-nano-banana-2.1`) | not listed | $0.0336 | $0.0504 | $0.113 | $1.50 per 1M tokens |

  CNY per image at 8 CNY/USD, before rounding: Nano Banana 2 0.5K 0.36, 1K 0.536, 2K 0.808, 4K 1.208; Lite 1K 0.2688;
  2.1 1K 0.2688, 2K 0.4032, 4K 0.904. Batch prices on the page are not used.
- **Mechanism:** `official-list-100` in `frontend/config/pricing-policy.json` is `official-list-80` with
  `marginPercentOverride: 0`. `resolveOfficialListCompatibilityProfile` in `frontend/src/lib/official-list-pricing.ts`
  selects it for these three engines (`OFFICIAL_LIST_100_PRICED_ENGINE_IDS`) in place of the 80 profile. The database
  engine rule (admin policy editor) still wins over the versioned profile, as for every official-list engine.
- **Supplier facts:** `frontend/src/config/fal-engines/nano-banana-2.ts` and `nano-banana-lite.ts` now hold the official
  per-size USD prices (they were fal-era values such as 0.04 / 0.08 / 0.12 / 0.16). Nano Banana 2.1 keeps its token model
  in `nano-banana-2-1-pricing.ts`, but its output part is the page's stated per-size price (4K $0.113). The page's own
  token count (3,780 x $30/M = $0.1134) differs by $0.0004, and the stated price was used.
- **Kept as they were (page gives no figure):** input reference images (Nano Banana 2.1 keeps 1,120 image tokens per
  reference at $1.50/M, the existing assumption; Nano Banana 2 and Lite keep their existing handling and the page gives
  no per-image token count); web-search add-on (1.5 cents, not on the page); the batch tier; the 1-cent CNY floor, which
  this change did not re-verify.
- **Not changed by design:** the Nano Banana 2.1 native customer-tariff gate (`requiresNano21Tariff` in
  `frontend/server/pricing/quote-billing.ts`). The 100 profile does not remove the need for an active tariff, so the gate
  stays. Keyvo keeps the tariff state inactive.
- **Stale customer copy:** `nano-banana-2.ts` billing notes still say "starts at $0.06 for 0.5K ... $0.21 for 4K" (fal
  display prices). They are text, not computed; updating them is a copy change not made here.
- **Awaiting owner prices (existing rules untouched):** Gemini Omni Flash 1.2 (the page lists per-second video prices,
  so the owner must confirm the unit), Veo 3.1, Veo 3.1 Fast and Veo 3.1 Lite, GPT Image 2.5 and GPT Image 2.6 (Sunburst
  and Flare).
- **Governed baseline (2026-11-14):** `tests/fixtures/keyvo-official-list-100-public-pricing-2026-11-14.json` records the
  18 public rows that moved (Nano Banana 2: 4-image estimate 42 -> 28 cents, standard image 11 -> 7, offer 11 -> 7;
  Nano Banana Lite: standard image 4 -> 3, 4-image 16 -> 12, estimator 16 -> 13). It is wired into
  `frontend/scripts/pricing-public-baseline.ts`. The eight audit scenarios (4-image billing and estimator rows) are
  approved in `frontend/src/lib/pricing-audit/approved-changes.ts` (60 approved changes, 0 mismatches). Nothing is added
  or retired; Nano Banana 2.1 public rows are unchanged.
- **Tests:** `tests/keyvo-official-list-100-pricing.test.ts` (profile, selection, facts and the 2.1 partial list);
  `tests/creator-commercial-pricing.test.ts` and `tests/image-estimate-service.test.ts` updated to the new ordinary
  margin (Nano Banana 2 margin 0) and the Lite total (13 cents for four images).
- **Hub image total rounding (2026-11-14):** the pricing hub quoted a multi-image preset as the rounded per-image price
  times the count, while billing and the estimate round the whole output count once. For official-list-100 engines the
  per-image cost is fractional (Nano Banana Lite 3.36 cents), so the 4-image hub price was 12 cents against a 13-cent
  charge. `pricingHubData.ts` now quotes official-list-100 engines as one total. Nano Banana 2 4-image moves 28 -> 27
  cents and Lite 12 -> 13 (both recorded in the 2026-11-14 official-list-100 transition fixture). Other engines still
  use the per-image hub path: the same mismatch exists for GPT Image 2 / 2.5 Flare / Sunburst, Nano Banana / Pro and
  Seedream 5.0 Flash 4-image presets (hub 24/8/8/24/80/4 vs total billing). Those rows are not changed here because the
  owner has not approved moving them (GPT Image 2.5/2.6 prices are pending).

## Subtitles creator tool hidden (2026-11-14)

`subtitles` has `publicReleased: false` in `frontend/src/lib/toolbox/creator-availability.ts`, so the tools index, menus, library/media handoff destinations, marketing pages and sitemap omit it. Its only speech-to-text route is ElevenLabs Scribe v2 on Fal (`frontend/src/server/subtitles/scribe.ts`); Keyvo has no `FAL_KEY` and no mainland ASR adapter exists. Restoring it needs a mainland ASR adapter (Bailian or Volcengine speech) plus a pricing decision. Guard: `tests/keyvo-subtitles-hidden.test.ts`.
