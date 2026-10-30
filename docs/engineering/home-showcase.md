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
| Wall: batches, preview budget, load more | `HomeShowcaseWall.client.tsx`, `HomeShowcaseCard.client.tsx`, `home-showcase.module.css` |
| Which examples may appear | `app/(localized)/[locale]/(marketing)/(home)/_lib/home-route-data/showcase.ts` |
| Next batches | `app/api/home-showcase/route.ts` (no database, no prices, no engine filter) |
| Pricing-only data read for the route | `(home)/_lib/home-pricing-data.ts` |
| Chinese prompts for the examples | `config/home-showcase-zh.json` (example id to Chinese prompt) |
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

The bundled examples carry English prompts, but the wall is a Chinese surface, so it shows and remixes only the Chinese
translations in `config/home-showcase-zh.json`. A bundled example without an entry there is left off the wall; when a
sync adds examples, translate them (keep durations, timecodes, aspect ratios, `@` tokens and on-screen text unchanged,
and drop any settings header line) or they will not appear. The translations are not the original inputs, so "make the
same" gives a similar, not identical, video.

"做同款" is offered only when the whole prompt can travel in the link (within `WORKSPACE_PROMPT_LINK_MAX_ENCODED`) and the
original run did not rely on reference files (`@Image1`, `@[storyboard ref]`, "reference image"). Otherwise the card only
links to its detail page: a silently shortened prompt would not make the same video.

The wall reads the bundled snapshot directly; it does not depend on the database, `KEYVO_MODEL_VISIBILITY` or the
general examples readers. `/api/examples` rejects an `engine` filter for a hidden family for the same reason.

## Media rules

- The first scene poster is the only prioritised image (React adds its matching preload link). Every other poster is lazy.
- Wall cards have fixed geometry from the example's aspect ratio (`aspect-ratio: var(--ratio)`), so nothing shifts.
- Only the short preview ever plays, mounted on hover or visible intent through `useExampleCardPlayback` and
  `useGalleryPreviewBudget`; it uses `preload="none"`. The full-length video URL never reaches the wall.
- Each appended batch balances its own CSS columns, so cards already on screen never move.
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
