# Image Workspace Route Guide

This route owns the dedicated still-image generation workspace.

## Responsibilities

- `ImageWorkspace.tsx`: route orchestrator; it wires image workspace state, handlers, preview, composer, rails, and modal entry points.
- `_components`: image-specific presentational surfaces and modals.
- `_hooks`: image-specific browser state hooks that do not belong to the shared video workspace route.
- `_lib`: pure image workspace helpers, copy fallbacks, persistence parsing, reference-slot utilities, history mapping, and local group builders.

## Refactor Rules

- Keep copy fallbacks and template formatting in `_lib/image-workspace-copy.ts`.
- Keep reusable image workspace types and storage constants in `_lib/image-workspace-types.ts`.
- Keep character reference parsing, labels, and slot merging in `_lib/image-workspace-character-references.ts`.
- Keep job-to-history and local active group builders in `_lib/image-workspace-history.ts`.
- Keep reference slot state, upload orchestration, library selection, and character toggling in `_hooks/useImageReferenceSlots.ts`.
- Keep preview copy/download actions and generated-library save/remove orchestration in `_hooks/useImagePreviewActions.ts`.
- Keep image setting field derivation, select options, and schema-driven default resets in `_hooks/useImageSettingsFields.ts`.
- Keep browser-only library UI in `_components/ImageLibraryModal.tsx`.
- Keep `ImageWorkspace.tsx` focused on orchestration; do not add new inline helper blocks or route-local modal implementations there.
- Keep image composer storage keys and stored payload shape backward compatible.
- A signed-in user opens the image workspace on an EMPTY preview; the rail still lists their history. `_lib/image-workspace-preview.ts` (`resolveImagePreviewEntry`) shows an entry only when one is selected (opened from the rail, a deep link, or the result of a generation started here, which `useImageGenerationRunner` selects). The fall-back to the newest entry applies only when `defaultToLatestEntry` is on, which `ImageWorkspace.tsx` sets for logged-out visitors (`!accountId`). `suppressDefaultPreview` (storyboard hand-off) still keeps it empty. `tests/workspace-default-preview-contract.test.ts` locks this.
- Keep upload, generation, pricing, and auth behavior unchanged unless the task explicitly targets those flows.

## Media Delivery

Read `docs/engineering/media-delivery.md` before changing image display or persistence. Keep thumbnail, responsive preview and original action URLs distinct; preserve private/signed URL behavior and stored render compatibility. Use shared optimizer settings instead of per-route quality/width constants. A missing thumbnail must not silently turn every small tile into an eager original download. Keep error/loading geometry stable and validate initial-load changes against Core Web Vitals before expanding rollout.

## Checks

For image workspace refactors, run:

```bash
pnpm exec tsx --tsconfig frontend/tsconfig.json --test tests/image-workspace-split-contract.test.ts tests/supabase-browser-session-cleanup.test.ts
pnpm --prefix frontend exec tsc --noEmit
```
