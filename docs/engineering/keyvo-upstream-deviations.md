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

### Google Vertex Veo regional endpoints

- **Keyvo uses Google Vertex for Veo.** Commit `e30eb7c00` isolates Veo's regional endpoints from global models (`frontend/server/video-providers/google-vertex-veo/client.ts`, `frontend/server/google-vertex-readiness.ts`, `docs/deployment/vertex-regions.md`). It stays unless upstream ships an equivalent fix.

### Qwen Image recovery after interrupted responses

- `frontend/lib/image-generation-client.ts` recovers a stored result when the response is interrupted (commit `d7a8f3736`, documented in `docs/deployment/qwen-image.md`). It belongs to the direct Alibaba Qwen Image 3.0 generation (customization 6) and stays with it.

### Hidden-locale content

- French and Spanish content (models, blog, best-for) is identical to upstream. English content still carries the intermediate `VideoAI` brand because Chinese pages use English as their base text and fall back to it where no Chinese override exists; mixed-locale comparison files keep it for the same reason. Keyvo's brand test only scans page code, messages and the docs folders.

### Seedance Edit transport variable (legacy)

- `frontend/src/lib/env.ts` still reads the older `SEEDANCE_2_5_V2V_TRANSPORT` as a fallback for `SEEDANCE_2_5_EDIT_TRANSPORT`, and `tests/seedance-2-5-edit-transport-fallback.test.ts` pins it. It predates upstream's own ModelArk Edit transport and is a candidate for removal; it does not change behaviour when only the canonical variable is set.

### Audit records are not committed

- The Keyvo merge and system audit logs under `docs/plans` were removed; the directory matches upstream. Keep new audit output out of the repository (`scripts/audit-keyvo-merge.mjs` writes there by default, so set `KEYVO_AUDIT_OUTPUT_DIR` to a path outside the working tree).

## Checking for new deviations after an upstream sync

Run `node scripts/report-upstream-deviations.mjs` after merging a new upstream snapshot. It classifies every file that differs from `origin/MaxVideoAI` by customization (1 zh, 2 LLM Hub Pay, 3 CNY, 4 UI redesign, 5 LLM Hub API, 6 domestic providers, 7 white-label), deploy infrastructure, or documented kept deviation, and lists the paths that are new since `docs/engineering/keyvo-deviation-baseline.tsv`. A new path in `Z no signal` has no sign of belonging to a customization: document it here or restore the upstream file. The classification is heuristic and informational; `--strict` exits non-zero when such paths exist. After reviewing, refresh the baseline with `--write-baseline`.

