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

## Character Builder on Seedream, priced in CNY (2026-11-14)

- **Upstream:** Character Studio draft and final run on Nano Banana 2.1 (1K/2K/4K), which needs an active reviewed customer tariff.
- **Keyvo:** Keyvo keeps `app_customer_tariff_state` inactive on purpose, so Nano Banana 2.1 cannot be quoted and the builder
  returned 500 `pricing_error`. The builder now runs on Volcengine Seedream on the official-list rule path
  (`src/lib/official-list-pricing.ts`), which needs no tariff. The tariff gate is not changed; Nano 2.1 stays gated.
  - **Standard (draft)** = `seedream-5-0-flash`: ¥0.08 per image (official ¥0.12 x 0.8 = ¥0.096, rounded by the engine to whole
    cents x 8 = ¥0.08); input images free.
  - **Pro (final)** = `seedream-5-0-pro`: ¥0.48 per image (official ¥0.60 x 0.8); the first input image is free and each further
    input image is ¥0.02 official (¥0.016 at customer price before the engine's whole-cent rounding). With 1 to 3 input images
    the total is ¥0.48; with 4 it is ¥0.56.
  - Both render **2K only** (1K and 4K are not offered for characters). The format picker shows one 2K option.
  - Aspect: Seedream has no 4:5, so the portrait ratio renders as 3:4 (`getCharacterEngineAspectRatio`). Every other ratio the builder
    uses (3:2, 2:3, 16:9, 4:5 to 3:4) is accepted by both engines.
  - Inputs: up to 4 reference images per request (`CHARACTER_BUILDER_MAX_INPUT_IMAGES`), well under Seedream's 10. Prompts name
    each reference by its position in the request ("input image 1 (the uploaded identity reference image)").
  - Watermark stays off (`watermark: false` in the Seedream payload).
- **Estimate and generation:** `useCharacterBuilderPrice` quotes the engine of the selected mode. A rule-priced snapshot has no
  tariff revision: `readCharacterBuilderEstimate` returns `revision: null` and no revision header is sent. A manual-tariff
  snapshot still needs its revision. The server quotes its own current price at generation time, as for other rule-priced
  image surfaces.
- **Pricing rows:** the pricing hub's Character rows quote Standard on each engine at 2K; the Pro column shows a dash because
  there is no higher size. The legacy fixed products `character-draft` / `character-final` keep their keys and stored prices
  (the builder does not charge them); the inventory row now describes Seedream at 2K.
- **Guards:** `tests/character-builder-domestic-engines.test.ts` (engines, 2K, aspect mapping, reference count, payload size,
  prompt positions, CNY price table, no Nano 2.1 left in the builder source), `tests/character-builder-nano21-gate.test.ts` (Nano 2.1
  still refuses without a tariff), `tests/character-studio-seedream-price-postgres.test.ts` (estimate = reserved receipt = hub row).
- **Not verified here:** image quality of Seedream for character sheets (no provider calls were made). Try Pro at 2K with
  the sheet layout first; if the sheet panels are cramped at 3:2, try the 16:9 close-up layout before changing engines.
- **Recast (not changed):** the Character Studio Recast estimate route (`app/api/tools/character-studio/recast/estimate/route.ts`),
  its timing display (`_components/CharacterStudioRecastTiming.client.tsx`) and `_lib/recast-submit.ts` still refuse any quote whose
  `currency` is not `'USD'`. Keyvo quotes Recast in CNY, so they show no estimate. The submit check is on a financial quote, so it
  is left for a separate change that fixes all three together.
- **CNY snapshot reader:** `_lib/character-builder-price.ts` accepts the Keyvo CNY snapshot and converts it back through
  `meta.customerCurrencyConversion` (refusing inconsistent totals). Guard: `tests/character-builder-price-currency.test.ts`.

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
  `isKeyvoVisibleOrOpenedFamily`. The env reader is `isKeyvoAdminTierOpen()` in `frontend/config/keyvo-model-visibility.ts` (not `lib/env.ts`, whose load-time `process` reads would break sandboxed bundles).
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

## Character Recast hidden (2026-11-15, `KEYVO_RECAST_HIDDEN`)

- **Why:** Recast (Wan 3 Prime video-to-video character swap in Character Studio) cannot be bought in the CNY build. Its quote
  is built in USD (`server/pricing/quote-recast.ts`, no customer-currency conversion) while the wallet is CNY
  (`reserveWalletCharge` returns `currency_mismatch`), the estimate route, `CharacterStudioRecastTiming.client.tsx` and
  `recast-submit.ts` require a USD quote, and `CHARACTER_STUDIO_RECAST_LIVE_ENABLED` is not set in production. A customer
  would have seen a dollar price that can never be paid.
- **Keyvo:** `KEYVO_RECAST_HIDDEN = true` in `frontend/config/keyvo-disabled-features.ts`; guarded code calls
  `isKeyvoRecastHidden()` (the test-only `KEYVO_RECAST_FULL_UI=1` reopens it, never set in production). No Recast pricing,
  DB rule or coefficient logic changed; all code, data and copy (en/fr/es) stay in place.
- **Hidden:** the Character Studio Recast tab and `?mode=recast` (`CharacterStudioNavigation`, `CharacterBuilderWorkspace`),
  the Explore "Recast" button and examples, the "Recast" buttons on result cards and in the saved-character library, the
  Recast panel (not mounted), the Recast section and pricing pointer on the `/tools/character-builder` landing page plus
  FAQ entries mentioning it (`character-builder-landing-recast.ts`), `CharacterStudioPublicFilms` (app, examples and blog
  proof), the blog proof/"see Recast examples" link and next-step `mode=recast` links, the pricing hub "Keyvo Recast" row
  (`PricingOtherSurfacesSection`; `buildCurrentOtherPricing` no longer reads any Recast quote), the llms.txt Recast phrase.
- **Refused:** `app/api/tools/character-studio/recast/{estimate,prepare,confirm}` return 404 (`TOOLS_DISABLED`) before any
  pricing, wallet or provider work; the MCP Recast tools stay listed (the reviewed tool-selection fingerprint is unchanged)
  but `createAgentCharacterStudioService` refuses with `ENGINE_UNAVAILABLE`; the Studio conversation director no longer
  offers `recast_prepare` and `prepareStudioConversationRecast` refuses.
- **Not touched (not customer-facing or a different feature):** admin Recast pricing pages, the `h3-recast` MiniMax H3-Max
  "Replace characters" video operation, `HomeCharacterStudio` (not rendered by the Keyvo home), the MCP instruction text and
  the recast audio-reference upload branch of the multipart video upload routes.
- **No pricing baseline moved:** no governed public baseline or approved change covers `character-recast` (the hub Recast
  examples were live reads), so `pricing:public-baseline` and `pricing:audit` are unchanged.
- **Tests:** `tests/keyvo-recast-hidden.test.ts` (constant, navigation, workspace wiring, landing/blog, pricing hub, routes
  with trapped collaborators, MCP/Studio refusal, llms.txt, and that reopening restores each surface); tests that pin
  Recast itself (`character-studio-explore`, `character-studio-marketing`, `studio-character-recast-contract`,
  `mcp-character-studio`, `recast-pricing-page`) reopen it explicitly.
- **How to reopen:** (1) convert the Recast quote to the customer currency in `quote-recast.ts`; (2) relax the USD-only checks
  in the estimate route, `CharacterStudioRecastTiming.client.tsx`, `recast-submit.ts` and the MCP `confirm_recast` currency
  literal; (3) set `CHARACTER_STUDIO_RECAST_LIVE_ENABLED=1`; (4) flip `KEYVO_RECAST_HIDDEN` to `false`.

## Creator tools hidden (Subtitles 2026-11-14; Lip Sync, Product Photo Editor, Product Video Editor, Motion Transfer 2026-11-16)

All five creator tools have `publicReleased: false` in `frontend/src/lib/toolbox/creator-availability.ts`, so the `/app/tools` catalogue (the whole "Create and edit" group disappears when empty), menus and navigation, library/media hand-off destinations, the public marketing landing pages (404), the sitemap/route discovery and IndexNow selection omit them.

- **Subtitles:** its only speech-to-text route is ElevenLabs Scribe v2 on Fal (`frontend/src/server/subtitles/scribe.ts`); Keyvo has no `FAL_KEY` and no mainland ASR adapter exists.
- **Lip Sync, Product Photo Editor, Product Video Editor, Motion Transfer:** production returned 404 for `/app/tools/<id>` because `CREATOR_TOOLS_ENABLED` is unset, while the cards and public landing pages still showed (dead links). Creator quotes are also USD (`quote-creator.ts`, provider cost plus margin, no `customerSnapshot`) while the Keyvo wallet is CNY, so a reservation would end in `CURRENCY_MISMATCH` (see the creator tools audit).
- **Kept on purpose:** all code, routes, APIs, MCP creator tools (already hidden), pricing and the execution gate `CREATOR_TOOLS_ENABLED`. Nothing was deleted or repriced; the flags are the only switch.
- **How to reopen:** (1) fix the USD quote versus CNY wallet mismatch in `quote-creator.ts` (wrap the snapshot in the customer-currency conversion), and for Subtitles add a mainland ASR adapter plus a pricing decision; (2) set `CREATOR_TOOLS_ENABLED=1` (and the Alibaba public-routing flags the Wan 3 profiles need); (3) flip the five flags to `publicReleased: true`; (4) revert the hidden pins in `tests/keyvo-subtitles-hidden.test.ts`, `tests/creator-marketing.test.ts` (`KEYVO_HIDDEN_CREATORS`) and `tests/library-reference-identity-dom.test.ts`.
- **Guard:** `tests/keyvo-subtitles-hidden.test.ts` (flags, paths, catalogue DOM render, media hand-off, navigation).

### MCP included trial closed (`KEYVO_MCP_TRIAL_DISABLED`)

- **Upstream:** an eligible verified account can receive one platform-funded Seedance generation through the public MCP server (`FEATURES.mcp.trial` AND `MCP_TRIAL_ENABLED=true`).
- **Keyvo:** the trial is closed by the owner. Mainland users cannot use Claude or Codex, so it has no audience. `KEYVO_MCP_TRIAL_DISABLED = true` in `frontend/config/keyvo-disabled-features.ts` is a constant, not an environment switch, so no deployment setting can reopen it.
- **What it closes:** `isTrialEligibilityEnabled` (shared by trial eligibility and the confirm gate) returns false, so `get_account_status` reports `trial: { status: 'disabled' }` and prepare never creates trial-funded quotes (they become ordinary wallet quotes). `confirmGeneration` refuses a trial quote with `TRIAL_NOT_ELIGIBLE` before any risk check, reservation, wallet or provider call. `getMcpPublicationState` forces `showTrialClaim` to false and `buildMcpBudgetOptions` never emits an `included_trial` option, so no page, budget card or llms text claims a trial; paid-minimum selection runs across all eligible routes. The `content/docs/mcp.mdx` section states that the introductory credit is not offered.
- **Kept on purpose:** the MCP server, all tools and paid MCP generation; the trial repositories, readers and admin views, so existing trial entitlements, quotes and jobs still read correctly. No migration was written or run; `neon/migrations/31` and `60` and their CHECK guard (which pins `seedance-2-0-mini` while the app preset is `seedance-2-5`, so a new trial row cannot even be inserted) are untouched. The MCP tool descriptions still mention an "included trial" in neutral terms because they feed the reviewed tool-policy fingerprint.
- **Tests:** `tests/mcp-trial-*.test.ts` reopen the switch explicitly (`keyvoClosed: false`) to keep the dormant machinery covered and add closed-state cases; `tests/mcp-budget-options.test.ts` asserts no trial option; `tests/integration/mcp-seedance-mini-trial.test.ts` now pins the fail-closed behaviour. `tests/mcp-trial-confirmation-concurrency.test.ts` was removed: its three PostgreSQL cases only exercised inserting and reserving trial rows, which the guard now refuses.
- **How to reopen later:** a trial would need (1) a migration widening the `mcp_generation_quotes_funding_shape` and related CHECK guards and the provider-cost function to the preset engine and its current cost (the guard is pinned to Seedance Mini), (2) an owner financial decision on the ceiling (`MCP_TRIAL_PROVIDER_COST_CEILING_CENTS`, default 25 cents against a 52-cent authoritative cost) and risk limits, (3) setting `KEYVO_MCP_TRIAL_DISABLED` to false, `trial: true` in `frontend/config/mcp-publication.json` and `MCP_TRIAL_ENABLED=true`, and (4) the reconcile cron from `docs/operations/mcp-trial-runbook.md`, then reverting the closed-state test pins.

## Official-list-100 for Veo 3.1, Gemini Omni Flash 1.2 and GPT Image 2.5 (2026-11-15)

- **Owner decision:** Veo 3.1, Veo 3.1 Fast, Veo 3.1 Lite, Gemini Omni Flash 1.2 and GPT Image 2.5 (Sunburst, Flare) sell
  at the repo's existing provider USD cost facts x 8 CNY/USD with no margin and no discount (`official-list-100`).
  Before, they sat on the rule path with the production default 20% margin. No vendor cost fact was changed.
- **Unverified source (recorded on purpose):** these facts were not checked against the Google / OpenAI official list
  pages. The owner accepted that because the engines are admin-only. Re-check them before offering the engines to
  ordinary accounts; the Nano Banana facts of 2026-11-14 are the only ones read from a list page.
- **Surfaces that changed:** billing quotes, public/estimate quotes (same snapshot), pricing hub rows, model-page,
  JSON-LD offers, price chip, workspace preflight, MCP/agent quotes and the admin canonical scenarios (all through the
  profile resolver). Public price pages only show them where the owner allowlist exposes them; governed rows: 61 in
  `tests/fixtures/keyvo-official-list-100-public-pricing-2026-11-15.json`.
- **Unchanged by design:** Veo image-to-video at 4/6 s and video operations (extend/edit) keep their reviewed tariff
  gate; Omni source-video modes keep their tariff cells; GPT Image 2.6 stays gated (output-only incomplete facts, see
  pricing-engine.md); the customer tariff state stays inactive.

## MCP hidden from customers (2026-11-15, `KEYVO_MCP_UI_HIDDEN`)

- **Why:** Keyvo does not offer MCP assistants (ChatGPT, Claude, Codex, OpenClaw, n8n connectors) to customers for now: mainland
  users cannot use the Claude/Codex hosts, and the MCP free trial is already closed (`KEYVO_MCP_TRIAL_DISABLED`).
- **Keyvo:** `KEYVO_MCP_UI_HIDDEN = true` in `frontend/config/keyvo-disabled-features.ts`; guarded code calls
  `isKeyvoMcpUiHidden()` (the test-only `KEYVO_MCP_FULL_UI=1`, or importing `tests/helpers/keyvo-mcp-full-ui.ts` first, reopens it;
  never set in production). Customer-facing and discovery code reads `mcpUiPublication` (`frontend/config/mcp-ui-publication.ts`),
  which forces `publicMarketing` and `publicIndexing` off while the constant is true; server and protocol code keeps reading
  `config/mcp-publication.json`.
- **Hidden (UI/marketing/discovery only):** the `/mcp`, `/docs/mcp` and `/integrations/*` pages (404 through the publication
  state), header/footer/app-menu/sidebar links, sitemap and route discovery, llms.txt, home/pricing/models/examples/comparison
  links (`getMcpInternalLink`), the Studio Milo credits dialog footer ("Use your assistant through MCP", ChatGPT/Claude/Codex
  links and the plan-limit note; the credits sentence stays), the Settings "Connected apps" tab and the `/account/connections`
  page (404), the MCP section and FAQ entry on the Studio marketing page, the MCP card on the Milo marketing page, the
  assistant link in the video-background-changer tool footer, and the "Continue with ChatGPT/Claude" hand-off on example pages.
- **Left unchanged on purpose:** the MCP server and transport (`/api/mcp`), the OAuth discovery routes under `/.well-known`, the
  OAuth consent page (reached only from a connector flow), `/api/account/mcp-settings`, tools and the reviewed tool-policy
  fingerprint, `config/mcp-publication.json`, database code, cron routes, admin MCP pages and the legal privacy text that
  discloses external assistants. The page and component code stays in place for reopening.
- **Tests:** `tests/keyvo-mcp-ui-hidden.test.ts`; tests that pin MCP surfaces visible import the helper or follow the hidden reality.
- **How to reopen:** flip `KEYVO_MCP_UI_HIDDEN` to `false` and set `publicMarketing`/`publicIndexing` in `config/mcp-publication.json`.

## No customer link to the upstream site (2026-11-15)

- **Rule:** no customer-facing source links to `maxvideoai.com` / `www.maxvideoai.com`; use `SITE_ORIGIN` (`frontend/lib/siteOrigin.ts`,
  `https://app.keyvo.cn` unless `NEXT_PUBLIC_SITE_URL`/`SITE_URL` say otherwise) or a relative path. `media.maxvideoai.com` example
  media stays until the owner self-hosts it. `tests/keyvo-no-upstream-links.test.ts` scans `frontend/{app,components,src,lib,server,hooks}`
  and holds a short allowlist with reasons (MCP protocol layer, internal fetch origins, admin editorial, snapshot identity).
- **Fixed:** the Studio Milo dialog MCP helper (it opened `https://maxvideoai.com/zh/mcp`; the row is also hidden), the MCP staging
  notice on the login page (hidden, relative link), the wallet header and image quote card billing links in QA mode, the editorial
  reader's relative links, the Milo guide and Studio director instructions that gave users the upstream contact page and
  `support@maxvideoai.com` (now `${SITE_ORIGIN}/contact` and `contact@llmhub.com.cn`), the IndexNow API route (host now derived from
  `SITE_ORIGIN`), `scripts/indexnow-submit-changed.mjs` and `.github/workflows/indexnow.yml` (default site `https://app.keyvo.cn`).
- **IndexNow owner action:** the route needs `INDEXNOW_KEY` and serves nothing without it; the key file `frontend/public/<key>.txt` is
  upstream's, so either set `INDEXNOW_KEY` to that file's name or add a key file of your own and set the variable to match, then it
  is verified at `https://app.keyvo.cn/<key>.txt`.
- **Left deliberately:** the MCP/agent-api account and destination URLs and trusted-origin allowlists (protocol layer, MCP hidden),
  internal fetch origins, the admin editorial pipeline, the host-conditional redirect for the upstream blog subdomain in `next.config.js` (applies only on that host),
  `scripts/email/auth-templates.mjs` (upstream-branded Supabase email templates with `support@maxvideoai.com`; Supabase templates are
  configured outside this repo, so they need a Keyvo zh rewrite before use), and the unused `PartnerBadges`/`HomeStartupFameLink`
  upstream promotion badges.

## Milo brand (2026-11-15)

Milo, the Studio conversation director and the user-visible Studio/render messages speak as Keyvo. The name comes
from `PRODUCT_BRAND_NAME` (`frontend/lib/product-brand.ts`), never a literal. Changed: the Milo system prompt
(`prompt-assistance/provider.ts`), the editorial profile provenance, the French image-director prompt, the
agent-generation-policy failure copy, assistance restriction / export / Studio timeline / reference-import errors and
the image batch review message. Prompts are otherwise byte-identical. Pinned by `tests/keyvo-milo-brand.test.ts`.

No version or fingerprint is derived from this text: `STUDIO_ASSISTANCE_POLICY_VERSION`
(`studio-credits-2026-10-05-v2`, compared with the production env `STUDIO_ASSISTANCE_APPROVED_POLICY`), the profile
version `2026-10-30-v2`, `MILO_SCOPE_VERSION` and the context version are literals, so they did not change.

Stays MaxVideoAI on purpose: npm scope `@maxvideoai/*`, the MCP server, its tool descriptions and reviewed policy
fingerprint, MCP account-URL allowlists and plugin repository (hidden, not removed); storage and header keys
(`maxvideoai:media-handoff:v1`, `x-maxvideoai-*`, `maxvideoai.*` localStorage keys); Stripe customer source, ECS task
tags, remotion composition ids, `source: 'maxvideoai-editor'`, billing `product` metadata (persisted); media host
allowlists (`media.maxvideoai.com`); the `MaxVideoAI Recast` billing label (feature hidden by `KEYVO_RECAST_HIDDEN`);
the MCP `AUTH_REQUIRED` text in `agent-api/character-studio.ts`; non-zh locale marketing copy and the `User-Agent`
`MaxVideoAI-MCP/1.0` of the MCP media fetcher.

## Account deletion with a 15-day cooling-off and data export (2026-11-16)

China PIPL requires a usable deletion path, so Keyvo diverges from upstream (whose `POST /api/account/delete` only
set `profiles.marked_for_deletion_at` and promised a 30-day purge that never existed). Full guide:
`docs/engineering/account-deletion.md`.

- **Routes**: `POST /api/account/delete` now needs the typed word and the password, refuses a positive wallet
  balance, mirrors the flag into Supabase `app_metadata`, revokes sessions and returns the 15-day purge date
  (`deletionCompleted: false`). New `POST /api/account/delete/cancel`, `GET /api/account/delete/status` and
  `POST /api/cron/account-purge` (needs `CRON_SECRET`, erases only with `ACCOUNT_PURGE_ENABLED=true`).
  `POST /api/account/export` is rate limited (10 minutes) and its payload now includes jobs/prompts, media list,
  wallet balances and consents, and no longer includes vendor or pricing internals.
- **Guard**: `getRouteAuthContext(req, { allowScheduledDeletion })` in `src/lib/supabase-ssr.ts` returns a flagged
  account as signed out unless the route opts in; `middleware.ts` redirects protected pages to `/account/deletion`.
  After an upstream sync, keep both changes and the `updateSession` return shape (`deletionScheduledAt`).
- **UI**: settings privacy tab (`DataExportPanel`, `AccountDeletionPanel`) and the `/account/deletion` screen;
  copy under `workspace.settings.privacy.{dataExport,deletion}` and `workspace.accountDeletion` in all four
  message files. The old zh `dangerZone.deleteWarning` text (permanent immediate wallet loss) was corrected.
- **Database**: migration `98_account_privacy_events.sql` (additive; code is guarded until applied).
- **Tests**: `account-deletion-request`, `account-privacy-routes`, `account-privacy-ui-dom`,
  `account-purge-postgres` (full-schema inventory guard). The old test pinning the 30-day text was replaced.

### Billing page copy and layout (`/billing`)

- **Pending hosted payment:** `LlmhubPayCheckout.client.tsx` labels the remembered-payment button with `checkoutReturn.pendingConfirmAction` (the banner and toast keep `pendingTitle`), explains it with `pendingHint`, and offers `pendingCancelAction`, which only runs `clearRequest()` (client sessionStorage). The next click mints a new request id; server idempotency and payment logic are unchanged, and a late notification for the cancelled order still credits through the existing notify route.
- **Receipts:** the zh Stripe wording is removed. `useBillingReceipts` opens the wallet activity tab when the documents list loads empty and the user has not picked a tab yet (Keyvo has no Stripe documents; 聚合易支付 top-ups appear only in the activity ledger).
- **Currency:** Keyvo settles in CNY only, so `WalletTopupPanel` shows "支付币种：人民币（CNY）" as fixed text (`data-testid="billing-currency-fixed"`) instead of a select; `useBillingCurrencyState` and the quote logic are unchanged, and the workspace top-up modal has no currency control. `.currencyField` and `.reviewHeading` wrap inside the card. `tests/billing-copy-currency-keyvo.test.ts` and `tests/billing-wallet-presentation.test.ts` pin this.

## Home pricing teaser and FAQ hidden (2026-11-16)

The zh home page no longer shows the pricing teaser (kicker "制作预算 / 按镜头核算", the Wan 3 price demo) or the FAQ section
("关于 AI 视频创作的常见问题", 8 questions). Controlled by `KEYVO_HOME_PRICING_TEASER_HIDDEN` and `KEYVO_HOME_FAQ_HIDDEN` in
`frontend/config/keyvo-disabled-features.ts`, consumed only where `(home)/page.tsx` composes its sections.

- Hidden means absent from the server HTML. While the teaser is hidden `prepareHomePricingData` is not called (no price read, no
  timing record), and the interactive `HomePriceDemo` client chunk is never referenced. The FAQ and the pricing section components
  (`HomeFaq`, `HomePricingSection`, `HomeDeferredPricing`) and the `home.redesign.faq` / `pricingTrust` messages stay in place.
- The `home-faq-jsonld` FAQPage script is emitted only with the visible FAQ (structured data must match visible content). The
  WebApplication and provider ItemList JSON-LD are unchanged.
- No in-page anchor or link targeted either section (`#your-price` was only the section id). The header "制作预算" item links to
  `/pricing`, which is untouched, as are the neighbouring sections, their order and the hero poster/media rules. The workflow summary
  now follows the works wall directly and ends the page.
- Test-only reopen: `KEYVO_HOME_SECTIONS_FULL_UI=1` (never set in production) restores both sections for `home-streaming` and
  `home-data-loading`. `tests/keyvo-home-sections-hidden.test.ts` pins the flags; the rendered-HTML proof is the second test in
  `tests/home-streaming.test.ts`.
- To reopen: flip the constants to false. Pages are ISR (`revalidate = 60`), so a rebuild is not needed beyond one revalidation.

## Supabase auth emails (2026-11-16)

Production Supabase is self-hosted and has no SMTP yet. Keyvo zh templates (reset password, email verification, email change,
magic link, invite, reauthentication code) live in `docs/deployment/supabase-email/templates/`, generated by
`docs/deployment/supabase-email/build-templates.mjs` and previewed with `preview.mjs`; the server procedure (Alibaba Cloud Direct
Mail, GoTrue env, OpenResty interaction, rollback) is `docs/deployment/supabase-email/README.md`. Nothing is applied on the server.
The recovery link goes to `https://app.keyvo.cn/auth/reset-password?token_hash=...&redirect_to=...` (the page the app already handles),
not to `{{ .SiteURL }}`, because the Supabase site URL is the auth host.

`scripts/email/auth-templates.mjs` and `supabase/templates/*` remain the upstream-branded en/fr/es generator for the local Supabase CLI
(`supabase/config.toml`); the self-hosted production auth service does not read them, so they are not rewired. zh copy changed:
`login.feedback.resetSent` and `resetUnavailable` (`frontend/messages/zh.json`). Pinned by `tests/keyvo-email-templates.test.ts`.

## Operations monitoring (2026-11)

Keyvo-only (no upstream equivalent; keep on syncs): `GET /api/cron/ops-health` (`frontend/app/api/cron/ops-health/route.ts`, `frontend/src/server/ops-health.ts`) returns read-only, PII-free health signals and fails closed (503) when `CRON_SECRET` is unset, unlike other cron routes. `scripts/ops/ops-monitor.mjs` (Node 22, no dependencies) runs from the Aliyun relay host and alerts a DingTalk robot (`DINGTALK_WEBHOOK_URL`, `DINGTALK_SECRET`). Operator and owner guide: `docs/operations/monitoring.md`; vendor consoles that cannot be automated: `docs/operations/monitoring-manual-checks.md`. Tests: `tests/ops-monitor-script.test.ts`, `tests/ops-health-route.test.ts`, `tests/ops-health-postgres.test.ts` (auto-placed in the PostgreSQL lane by its `-postgres.test.ts` name; no new CI lane).

## Age 18, WeChat Pay hidden, settings zh leftovers (2026-11)

Keyvo-only; keep on upstream syncs (resolve conflicts by keeping both sides).

- **Minimum age 18.** `LEGAL_MIN_AGE` / `NEXT_PUBLIC_LEGAL_MIN_AGE` default to 18 and never go below 18 (`Math.max(18, ...)` in `useLoginPageController.ts` and `app/api/legal/consents/route.ts`), so a stale production value of 15 cannot lower the rule. The checkbox text is the parameterized `auth.terms.age` message ("我确认已年满 {age} 周岁。"). The server records the attestation in `user_consents` as `doc_key = 'age_attestation'` with `doc_version = 'min_age:<N>'`: new signups are stored as `min_age:18`, earlier ones stay `min_age:15` and are not re-prompted. No migration; the legal document versions in `legal_documents` (terms/privacy) are database data and were not bumped. zh terms 1.4 and privacy 10.1 state the 18+ rule; en/fr/es terms say 18.
- **WeChat Pay hidden.** `KEYVO_WECHAT_PAY_HIDDEN` / `isKeyvoWechatPayHidden()` (`config/keyvo-disabled-features.ts`; test-only reopen `KEYVO_WECHAT_PAY_FULL_UI=1`). `LlmhubPayCheckout.client.tsx` omits the button, uses the `llmhubTitleAlipayOnly` title and a single-column grid (`llmhubButtonsSingle`). The checkout API, orders and callbacks still accept `wxpay`. Reopen: flip the constant. Pinned by `tests/keyvo-wechat-pay-hidden.test.ts`.
- **Notifications settings tab hidden.** `KEYVO_NOTIFICATIONS_TAB_HIDDEN` / `isKeyvoNotificationsTabHidden()` (reopen `KEYVO_NOTIFICATIONS_FULL_UI=1`), applied in `lib/settings-navigation.ts`; `?tab=notifications` opens Account.
- **zh leftovers.** `workspace.settings.privacy.{summary,reviewNote,guestNote,supportPrefix,supportEmail,supportSuffix}` added to zh; receipts `collapsedLabel/expandedLabel` (展开/收起) added to all four locales; ledger rows use `localizeReceiptDescriptionZh` and zh surface chips in `billing/_lib/billing-utils.ts` (display only, stored descriptions untouched). Left in English on purpose: brand and model names (Keyvo, MiniMax H3, Seedance...). Pinned by `tests/keyvo-age18-settings-zh.test.ts`.
