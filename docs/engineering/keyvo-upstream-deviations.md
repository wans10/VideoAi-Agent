# Keyvo deviations from upstream MaxVideoAI

Keyvo (`feat/white-label-keyvo`) deliberately differs from the upstream `MaxVideoAI` branch in the places below. When syncing a new upstream snapshot, keep these behaviours and update the pinned tests rather than reverting to upstream.

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
