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

## Checking for new deviations after an upstream sync

Run `node scripts/report-upstream-deviations.mjs` after merging a new upstream snapshot. It classifies every file that differs from `origin/MaxVideoAI` by customization (1 zh, 2 LLM Hub Pay, 3 CNY, 4 UI redesign, 5 LLM Hub API, 6 domestic providers, 7 white-label), deploy infrastructure, or documented kept deviation, and lists the paths that are new since `docs/engineering/keyvo-deviation-baseline.tsv`. A new path in `Z no signal` has no sign of belonging to a customization: document it here or restore the upstream file. The classification is heuristic and informational; `--strict` exits non-zero when such paths exist. After reviewing, refresh the baseline with `--write-baseline`.

## Phone sign-up records the Cookie Policy (2026-11-13)

Upstream records only Terms and Privacy at sign-up; the Cookie Policy is recorded by the cookie banner, so a new account saw the re-consent prompt immediately. Keyvo's phone sign-up sentence now names all three documents and sends `cookiesAccepted: true` to `/api/legal/consents`, which then also records the `cookies` document at its current version. The email sign-up request is unchanged. Guard: `tests/phone-signup-cookie-consent.test.ts`.

## Phone sign-up contact email, not verified (2026-11-13, behind the phone flag)

Phone sign-up asks for an email address for later product and marketing mail. It is **not verified** (no confirmation
mail, no verification step) and it is **not the login email**: the phone stays the only sign-in identifier.

- **Stored only in our database:** `profiles.contact_email` and `profiles.contact_email_at`, added by
  `neon/migrations/98_profile_contact_email.sql` (nullable, `add column if not exists`, length check 3–254, re-runnable).
  Apply it before the website that writes the column is deployed.
- **Never sent to GoTrue:** `updateUser({ email })` is not called, and no `email` is passed to `signInWithOtp` or
  `verifyOtp`. The GoTrue email path is blocked for sign-up at the gateway and an auth email change would trigger
  confirmation mail. Guard: `tests/contact-email-surfaces.test.ts`, `tests/login-phone-auth.test.ts`.
- **Write path:** `POST /api/account/contact-email` (`frontend/app/api/account/contact-email/route.ts`, owner from
  `getRouteAuthContext`, never from the body, idempotent upsert via `frontend/server/contact-email.ts`). `GET` returns the
  caller's own value for settings. Validation is shared in `frontend/lib/contact-email.ts`.
- **Failure policy:** the save runs right after the SMS code verifies. If it fails (or no address was given), the account
  is not blocked: the password step shows the field again, prefilled, and saves the address before `updateUser({ password })`.
  The retry is unbounded and the password is never set while the address is owed; a persistent route outage therefore
  keeps the user on that step until it succeeds.
- **Marketing choice:** the unchecked "product update mail" box is recorded through `/api/legal/consents` as
  `marketingOptIn` (true or false). Only the 注册 tab offers it. An existing account reached through the 注册 tab keeps
  its address but its marketing choice is not recorded (consents are only written for new accounts, as before); change it in
  settings.
- **Reads:** DSAR export (`user.contactEmail`), admin user detail (read-only "Contact email (not verified)"), admin marketing
  opt-in export (falls back to `contact_email` for phone-only opted-in users), settings (read-only row for phone-only
  accounts, labelled as not the sign-in email). `getProfileSnapshot` deliberately does not read the column, so the
  opt-in readers keep working if the migration is late.
- **Open items (owner):** privacy policy must name the collection, purpose, storage and withdrawal (legal copy, not code).
  Account erasure has no job that clears `contact_email` yet; the request route only marks the profile. The contact email
  is kept with the profile until erasure exists.
- **Paths:** `frontend/lib/contact-email.ts`, `frontend/server/contact-email.ts`,
  `frontend/app/api/account/contact-email/route.ts`, `frontend/app/(core)/login/_hooks/useLoginPhoneContactEmail.ts`,
  `frontend/app/(core)/settings/_hooks/useAccountContactEmail.ts`, `neon/migrations/98_profile_contact_email.sql`.
