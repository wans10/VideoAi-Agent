# Home works wall and prompt-to-workspace handoff

Created: 2026-10-30. Owner: application engineering.

Keyvo's home page opens with a prompt box, four scene cards and a wall of example works, followed by the price demo,
the closing summary and the FAQ. It replaces the upstream showreel, discovery, creation and creative-worlds chapters.
Those components and their upstream data owners remain in the repository (and keep their contract tests) but the home
route no longer composes them.

## Ownership

| Concern | Owner |
| --- | --- |
| First screen: server-rendered headline, client prompt form and scene cards | `components/marketing/home/HomePromptHero.tsx`, `HomePromptStudio.client.tsx` |
| Copy (zh; other locales fall back to English) | `components/marketing/home/home-showcase-copy.ts` |
| Wall: batches, preview budget, load more | `HomeShowcaseWall.client.tsx`, `home-showcase.module.css` (heading, load-more); cards and rows come from `components/examples/ExampleGalleryCard.tsx` and `examples-masonry.module.css` |
| Which examples may appear | `app/(localized)/[locale]/(marketing)/(home)/_lib/home-route-data/showcase.ts` |
| Next batches | `app/api/home-showcase/route.ts` (no database, no prices, no engine filter) |
| Pricing-only data read for the route | `(home)/_lib/home-pricing-data.ts` |
| Chinese prompts for the examples | `config/home-showcase-zh.json` (example id to Chinese prompt) |
| Detail page of a bundled example (Chinese, no job-only hand-offs) | `app/(public-watch)/video/[id]/_lib/bundled-fallback-detail.ts`, `_components/VideoWatchContent.tsx`, `ExampleReaderContent`'s `bundledExample` prop |
| Example media URLs | `lib/home-showcase-media.ts` (`showcaseMediaUrl`) |
| `/app?prompt=` link building and parsing limits | `lib/workspace-prompt-link.ts` |
| Applying the prompt in the workspace | `app/(core)/(workspace)/app/_lib/workspace-hydration.ts` (parsing), `_hooks/useWorkspaceRequestedPrompt.ts` (applying once) |

## What the wall may show

Only bundled examples (`config/public-examples.json`) whose model is in a family listed in
`config/keyvo-visible-families.json` **and** is orderable today: `publication.app.published` and a lifecycle other than
`retired` or `deep_legacy`. Hidden-vendor examples, and retired versions of visible families, are excluded so the wall
does not promise results the product cannot produce. Families take turns so the first screen mixes vendors.
`tests/home-showcase.test.ts` locks this against the snapshot.

## Chinese prompts

The bundled examples carry English prompts, but the wall and the detail pages are a Chinese surface, so they show only the
Chinese translations in `config/home-showcase-zh.json`. A bundled example without an entry there is left off the wall;
when a sync adds examples, translate them (keep durations, timecodes, aspect ratios, `@` tokens and on-screen text
unchanged, and drop any settings header line) or they will not appear. The translations are not the original inputs.

The wall has **no per-card remix button**. A link can carry only the prompt, not the model, duration, framing or
references, so "make the same" would promise a video the product cannot reproduce. The whole card is the link to the
example's detail page; the prompt box and scene cards on the first screen are the creation entry.

The wall reads the bundled snapshot directly; it does not depend on the database, `KEYVO_MODEL_VISIBILITY` or the
general examples readers. `/api/examples` rejects an `engine` filter for a hidden family for the same reason.

## Media rules

- The first scene poster is the only prioritised image (React adds its matching preload link). Every other poster is lazy.
- The wall uses the examples page's own card and justified-row layout (`examples-masonry.module.css`): each item is as wide
  as its aspect ratio asks (`flex: ratio 1 ratio*220px`, at most `ratio*340px`), so desktop rows hold about three large cards
  and mobile one or two. Geometry is fixed by `aspect-ratio`, so nothing shifts. The caption is the model, the settings and the
  Chinese prompt excerpt; there is no price and no model link.
- Only the short preview ever plays, mounted on hover or visible intent through `useExampleCardPlayback` and
  `useGalleryPreviewBudget`; it uses `preload="none"`. The full-length video URL never reaches the wall.
- Each batch is its own flex container, so appending a batch never moves a row that is already on screen.
- Example media is still hosted on the upstream media CDN. Route every URL through `showcaseMediaUrl`; moving the
  examples to Keyvo's own storage is a change there plus rewriting the snapshot, not a change to the components.
  The upstream CDN stores previews under both `renders/previews/` and `renderspreviews/`; both paths are real.

## Prompt handoff

`/app?prompt=<text>` seeds only the composer prompt. Links are capped by percent-encoded length
(`WORKSPACE_PROMPT_LINK_MAX_ENCODED`) so that the login redirect, which encodes the link a second time, stays under the
common 8 KB request-line limit; the home textarea allows 400 characters for the same reason. The workspace accepts up to
2,000 control-free characters. The prompt is applied once, after the stored or account draft has hydrated, and is then
removed from the URL so a refresh keeps the user's edits. Logged-out visitors keep the parameter through the login
redirect (`next=` carries the full query) and it is applied after sign-in. Generation, wallet, preflight and polling are
not involved. `tests/workspace-requested-prompt-contract.test.ts` covers parsing, link building and apply-once behavior.

## Detail pages of bundled examples

`/video/<id>` renders the upstream watch page (`ExampleReaderContent`). When the video comes from the bundled fallback
(`isBundledFallbackVideo`), the page is Chinese (`readerCopy('zh')`, Chinese breadcrumbs) and drops what needs a database
job: the per-model quote table, the Studio and assistant hand-off, the `/app?from=<id>` recreation link and the
`/ai-video-engines/` compare links (hidden on Keyvo). It keeps a "使用此提示词" button that opens
`/app?prompt=<Chinese prompt>` (`bundledExamplePromptHref`), only when the whole translated prompt fits in a link and the
original run did not use reference files, and a model link only when that model's page is published. Videos from the
database keep the upstream page unchanged. `tests/example-detail-bundled-page.test.ts` covers both.
