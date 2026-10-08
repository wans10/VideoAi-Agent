# China-facing site experience

Reviewed 2026-10-02. This deployment serves Simplified Chinese only and hides
MCP promotion. The implementation preserves translations and MCP server code.

## Language publication

`frontend/config/site-experience.json` owns `publishedLocales` and `defaultLocale`.
The authored locale union and English route namespace remain in `i18n/locales.ts`
for slug resolution and future reopening. `resolveSiteLocale` applies the active
policy to request messages, core layouts, login and password recovery.

`lib/middleware/site-language.ts` redirects public English/French/Spanish URLs
to the corresponding Chinese path with a reversible 307, retaining query state.
The policy runs before cookie, bot or local-preview negotiation. Core route URLs
remain unprefixed. API calls, POSTs and authentication callbacks keep their
existing protocols. Old language cookies cannot select a hidden UI language.
Single-language deployments omit both language controls, advertise only Chinese
and Chinese x-default metadata, and publish only the active locale sitemap.
Inactive locale sitemap endpoints return 404; robots references follow the list.

To reintroduce languages, add them to `publishedLocales`, review `defaultLocale`,
and rebuild. The auth continuity and legacy routing suites explicitly exercise
the reopened multilingual mode; `site-experience-policy.test.ts` checks the
current Chinese-only mode separately.

## MCP visibility

`config/mcp-publication.json` now sets `publicMarketing` and `publicIndexing` to
false. Existing publication gates hide MCP/integration/docs pages and sitemap
links. Navigation, footer, workspace assistant cards, shortcuts and connection
menu items follow the same publication flag. Preserve the direct account
connections management route for existing authorizations, including revocation.
Transport, OAuth, server tools and stored integrations are unchanged.

To reopen MCP, restore the two publication flags and rebuild after reviewing
the current integration evidence. This does not create a new package release or
certify a host. Offline client evaluation may run while both marketing flags are
closed, and must report `productionPublicationActive: false`.

## Layout and sharing

The shared production-reference footer now has 20–40 px horizontal padding.
Model disclosures and the examples reference/FAQ panels also have 20 px insets.
Nested spec summaries already sit inside padded cards; inline pricing popovers
and score rows retain their surrounding panel spacing.

`components/library/domestic-share-platforms.ts` owns the Douyin, Xiaohongshu
and Kuaishou creator portal links. See [video-sharing.md](video-sharing.md) for
original-file handling, manual publishing and privacy boundaries.

Validation included local Chrome at 390 px and 1440 px on home, pricing, tools,
models, docs, examples, comparisons and login; footer insets measured 21/41 px
including the border, with no horizontal overflow. Separate image/video share
fixtures ran at 390/900 px. Original-file and caption behavior is covered by DOM
tests. The three creator portal URLs returned HTTP 200 and matching official
titles. No real third-party upload, account connection or publication occurred.
Native sharing into installed mobile apps remains device-dependent and was
tested with mocked Web Share APIs, not a real Douyin/Xiaohongshu/Kuaishou app.
