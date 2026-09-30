# VideoAI studio design system

VideoAI's visual identity is a Chinese-first professional image and video studio. Warm paper, ink, framed media and vermilion editing marks replace the inherited bronze/cool-blue theme. Chinese copy uses a native CJK sans-serif stack; no remote font service is required.

## Ownership

- `frontend/src/styles/tokens.css`: shared color, spacing, typography and control tokens, including dark mode.
- `frontend/components/brand/BrandLockup.tsx`: frame/cut mark and VideoAI wordmark.
- `frontend/src/styles/videoai-brand.css`: shared brand, document and authentication presentation.
- `frontend/src/styles/videoai-marketing.css`: public navigation, footer and page-family compositions. Home-specific composition remains in `marketing-home.css`.
- `frontend/src/styles/app-experience.css` and `app-shell.css`: creation surfaces and product navigation, including mobile safe areas.
- Billing CSS modules: wallet, amount picker, checkout and receipt presentation.
- Admin shell components and `videoai-admin.css`: operational navigation, page headings and data surfaces.

## Visual rules

Paper `#f7f5f0`, white `#fffefa`, ink `#20211f`, muted ink `#696b64`, line `#deded5`, and vermilion `#b83c2b`. Vermilion identifies primary actions and selection; state colors retain distinct semantics. Dark mode uses warm charcoal surfaces and lighter vermilion for text. Media retains its own colors.

Use large, restrained headings, readable Chinese line heights, tabular money values and consistent 8 px spacing. Public page sections use visible chapter labels and framing; product controls are denser and avoid decorative effects. Do not reduce body text below 14 px on mobile. Inputs remain at least 16 px on mobile, primary actions at least 44 px tall, and keyboard focus is always visible. Reduced-motion users receive no decorative movement.

## Page coverage

This inventory describes where shared identity and styles apply. It is not evidence that each page has a new composition. Route availability, passing tests and first-viewport screenshots alone cannot establish visual redesign completeness.

Public: home, model/video/image catalogs, model detail and prelaunch, comparisons and use cases, examples and watch pages, tools and tool landings, pricing, integrations/MCP, workflows, blog, documentation, company/about/contact/status, legal and error pages.

Product: video/image/audio creation, Studio, tools, media library, jobs, settings, account connections, login/reset/signup, wallet/receipts and OAuth consent.

Operations: all existing admin routes inherit the operational shell and tokens. Compatibility redirect routes remain redirects and do not acquire a duplicate interface.

## Invariants and verification

Visual changes must retain route destinations, metadata/JSON-LD, model availability, quote calculation, wallet and payment contracts, authorization, provider routing and media lifecycle owners. The critical homepage poster stays server-rendered; secondary links follow it in mobile document order. Do not replace original media with previews in generation/download actions.

Validate desktop and mobile layouts, keyboard controls, light/dark product states, loading/empty/error states and horizontal overflow. Use the same viewport, build mode and network conditions for before/after performance comparisons. Live authenticated/payment states require a configured test account; a login gate or mock cannot establish those paths have passed production validation.

## Review and reproducible checks (2026-09-30)

Branch: `feat/videoai-studio-design`, based on `bd946267fc7f847aaaf6ba3820f4b42b0de87d0b`.

The redesign includes the shared identity/favicon/PWA icons, public navigation and mobile menu, homepage composition and explicitly illustrative creation flow, catalog contact sheet, tool catalog, document navigation, company hub, authentication split layout, wallet and amount cards, creator navigation and surfaces, Studio palette, admin shell and recovery pages. Page families with their own color vocabulary (model details, comparisons, MCP and Angle) explicitly project the studio palette.

### Checks

- Production Next.js build, including model registry, public rendition and immutable homepage poster prebuild gates.
- TypeScript, ESLint, public exposure check and whitespace check.
- Marketing/navigation/theme/media, workspace, billing, login and docs contracts, plus Chinese consent/recent-media and recovery indexing checks.
- `scripts/qa/videoai-design-audit.mjs`: isolated Chrome, 1440 × 1000 and 390 × 844; records HTTP status, final route, auth gates, document overflow, browser exceptions, API failures, heading contrast, canonical/hreflang/JSON-LD presence, LCP and CLS. Title contrast checks use solid ancestor backgrounds; media/gradient contrast still needs visual review.
- `scripts/qa/videoai-design-interactions.mjs`: mobile keyboard menu/focus restoration, saved app theme, CNY amount and custom input selection, recovery links/noindex, and login consent/form separation. No login, generation or payment is submitted.

Both scripts accept `DESIGN_AUDIT_URL` and `DESIGN_AUDIT_OUTPUT`. The page audit additionally accepts comma-separated `DESIGN_AUDIT_ROUTES`, `DESIGN_AUDIT_WIDTHS` and `DESIGN_AUDIT_THEME`. Run the browser checks against a local build with the deployment's `NEXT_PUBLIC_CUSTOMER_CURRENCY=CNY` setting. The fixed existing USD-to-CNY conversion remains 8.

### Environment boundaries

Local screenshots use a loopback-only Supabase preview address and no business database. Public pages and visitor-accessible product surfaces render; unavailable wallet/history data is shown as an unavailable or guest state. Studio and account connections correctly lead to login. Admin and authenticated Studio contents receive their shared design in source but require a configured test account for live visual acceptance. Payment completion and generated output states are outside these read-only visual checks.

API 500/503 responses caused by the absent local database are retained in the audit report. They must not be reported as healthy backend behavior. A redirect to login is an access-gate check, not a successful inspection of the protected page.

### Issues caught during visual review

- Old comparison-section color variables left pale text on the warm light background: fixed by assigning complete light and dark section palettes.
- The inherited gold creation CTA and route-local model/MCP/tool colors did not match VideoAI: mapped to the studio palette.
- Chinese Studio navigation label wrapped beside its beta badge: label and badge now stack on mobile.
- Login consent's old right-corner position overlapped the new right-hand form: moved to the left story column on wide screens; small-screen scroll space is preserved.
- Fresh core-route consent and recent-media controls fell back to English: added Chinese defaults/copy while preserving explicit language choices.
- Custom localized 404 pages lacked an explicit noindex directive: added to all custom recovery entries. Localized fallback responses can still stream with HTTP 200; the browser check requires recovery UI and noindex, not an assumed HTTP status.

### Recorded results

- 193 focused tests passed. Angle's theme assertions were updated for the approved studio light palette; its dark-theme ownership and media contracts remain asserted.
- 32 representative routes × 2 viewports = 64 browser checks: no document overflow, page exceptions or failed solid-background title contrast checks. Lowest measured title contrast: 7.90:1. This is not an audit of every text/control or every generated URL.
- 60 checks rendered the requested pages. The other four were the two protected routes (`/app/studio`, `/account/connections`) at both sizes and verified their login gate.
- Additional 320, 768 and 1024 px light-theme samples of home, pricing, workspace and billing passed 12 overflow/script checks.
- Nine interactive checks passed: mobile menu focus containment/restoration; theme change and persistence; CNY preset/custom input selection; recovery page links/noindex; desktop login consent/form separation.
- CNY preview showed the existing ¥80/¥200/¥400/¥800 funding tiers, and public example quotes such as ¥2.08 and ¥8.80. No checkout was initiated.
- Expected local API failures: `/api/jobs` 503 and `/api/legal/cookies/version` 500 without a database. Source guards and visual error/guest states were checked; these are not successful database integration tests.

Local artifacts: `/tmp/videoai-design-final/report.json` and screenshots, `/tmp/videoai-design-breakpoints/report.json`, `/tmp/videoai-design-interactions/report.json`, and `/tmp/videoai-design-contracts-final.log`. The local production preview listens on `http://127.0.0.1:3000`.

### Local performance comparison

The baseline and final samples use production builds, the same isolated Chrome harness, the same desktop/mobile viewports, reduced motion and a two-second settle. They are unthrottled local samples, not real-user Core Web Vitals measurements. Baseline `/app` was HTTP 500 because its build lacked Supabase public configuration, so it is excluded from performance comparison. The final customer build uses CNY; the older baseline displayed USD.

The first sample immediately after restarting the final server had desktop-home LCP 740 ms versus the earlier warmed baseline's 176 ms. Other final first-run samples were 232 ms for desktop pricing, 72 ms for desktop login, and 100/124/80 ms for mobile home/pricing/login. CLS was 0 except mobile login at 0.00321. A warmed run is recorded separately to distinguish startup cost from a repeatable rendering regression. No production performance improvement is claimed from these local samples.

Warmed local comparison (milliseconds):

| Viewport / route | Before LCP | After LCP | After CLS |
| --- | ---: | ---: | ---: |
| desktop `/zh` | 176 | 136 | 0.00000 |
| desktop `/zh/pricing` | 312 | 132 | 0.00000 |
| desktop `/login` | 392 | 84 | 0.00000 |
| mobile `/zh` | 104 | 92 | 0.00000 |
| mobile `/zh/pricing` | 140 | 124 | 0.00000 |
| mobile `/login` | 188 | 76 | 0.00321 |

Warmed samples and screenshots are saved at `/tmp/videoai-design-after-warm/`.

## Follow-up: inherited compositions and accents

The first delivery retained the original homepage's dark/gold comparison layout and the navigation's heading/links/sidebar composition. The prior browser checks only captured initial viewports and did not catch these interior sections. The claim that those surfaces had been fully redesigned was premature.

The follow-up replaces those structures:

- Homepage comparison: a paper assessment sheet with a full-width introduction, two model rating cards, three metric columns on desktop and a single column on mobile. `HomeComparisonScores` still delegates exact score values, null handling and marker positions to `PairedScores`; motion and model switching retain their existing guards.
- Desktop navigation: a left introduction, indexed model/destination directory and bottom use-case links. The old right sidebar and top heading layout are removed. Existing destinations, launch badges, pointer dismissal and Escape/focus behavior remain.
- Homepage tools: an introduction beside a vertical inventory of illustrated tools, followed by utility shortcuts. The supplied tool imagery remains explicitly illustrative.
- Homepage FAQ: numbered question cards; pricing demonstration: framed studio controls and VideoAI copy.
- Gold/bronze decorative accents are removed from the home, navigation, model, comparison, tools and MCP styles, including deeply nested controls that escaped earlier overrides. Provider identity marks and semantic state colors remain independent.

`home-comparison.css` and `home-studio-sections.css` are imported by the route-owned `marketing-home.css`, never by the shared layout. Remove retired rules when replacing a structure; do not retain two competing versions and rely on another layer of overrides.

### Acceptance must inspect the rendered cascade

`scripts/qa/videoai-theme-review.mjs` captures the actual comparison, tools, FAQ and expanded desktop menus at 1440/1024/390/320 px. It checks selected-model destinations, score disclosure, Escape/focus restoration, two model cards, paper background, vermilion CTA and horizontal overflow. It temporarily extends the capture viewport height so a sticky header cannot obscure tall mobile sections, then restores the original viewport. Image variance rejects blank captures from offscreen content-visibility. It declines optional cookies locally before capturing; no login, generation or checkout is submitted.

`videoai-design-audit.mjs` also inspects rendered descendants for a defined set of inherited accent colors. This catches the actual cascade across page families, rather than inferring correctness from a root CSS variable. The check is bounded to the listed colors; it cannot prove visual originality or the absence of every old layout.

Production build and 74 related tests passed for the follow-up. Local build tooling uses Node 24; the repository's declared/CI target remains Node 22. Browser checks use the same loopback auth and missing-database constraints recorded above. Final evidence is under `/tmp/videoai-theme-production/` and `/tmp/videoai-theme-pages/`; initial comparison evidence is under `/tmp/videoai-theme-before/`.

Final follow-up results: 13 valid public routes × 2 viewports = 26 checks passed, with no horizontal overflow, page exceptions or matches for the legacy accent list. Minimum solid-background heading contrast was 14.84:1. Four viewport-width runs passed the section/menu interaction checks, including waiting for the actual deferred pricing controls and confirming a CNY symbol. Two initially mistyped audit paths (`/zh/connect` and `/zh/mcp/claude`) returned 404; they are retained as harness errors and excluded from the valid-page count. The registry-backed routes `/zh/mcp` and `/zh/integrations/claude` were checked instead. Combined evidence, including the exclusions, is `/tmp/videoai-theme-acceptance.json`.

The public-home production sample recorded LCP 152 ms desktop / 84 ms mobile and CLS 0. Earlier local warmed samples were 136 / 92 ms; these single local samples are not evidence of a production performance improvement. Original poster sources, loading priorities and media lifecycle remain unchanged.

## Follow-up: page families, content and catalog corrections

The broader September 30 pass changes the desktop public shell to a 208 px left navigation rail with a separate content column, indexed flyout directories, and an editorial footer. `videoai-site-layout.css` owns this shell. `studio-public-surfaces.css` owns the catalog, documentation, article, examples, tools, pricing and integration family layouts. These styles load in the marketing layout; homepage-only composition still loads through the homepage stylesheet.

The model gallery and its separate recommended section now use plain scores, specification rows and a numbered recommendation list. Model detail uses a media/dossier split. The workspace defaults to light for new visitors, honors an existing theme preference, and exposes a clear creation heading and ruled composer controls. Tool landing previews are actual Chinese visitor-workspace captures in `assets/tools/redesign/*-workspace-v2.webp`; they do not represent paid generation or authenticated output verification.

Public brand/contact copy uses VideoAI and `contact@llmhub.com.cn`. Owned canonical/site links use the configured site origin, with `https://videoai.omninodetech.com` as the default. Original external media URLs, protocol identifiers, browser storage keys and upstream plugin links remain technically intact. Organization schema no longer claims the original project's social accounts. Four bundled examples whose prompts explicitly requested the original logo or spoken promotion were removed from the public seed feed; no production database media was changed.

### Defects found by the expanded audit

The initial production audit checked 31 representative routes at 1440 and 390 px. All 62 requests returned 200, with no horizontal overflow or page exceptions, but **12 checks failed** on inherited accent or brand text. These failures are retained in `/tmp/videoai-studio-production-pages/report.json`; the earlier narrower acceptance is not proof that all pages were complete.

- Background removal had gold colors authored directly in TSX, outside the earlier CSS sweep. These now use vermilion and a readable light accent on dark surfaces.
- Comparison specs loaded old product names from `data/benchmarks/engine-key-specs.v1.json`; current route labels were updated.
- Blog and documentation reused Next's persistent markdown cache across builds. `contentEntries:videoai-2026-09-30` invalidates the old content release without changing content parsing. Future source releases must invalidate/version this cache when immediate publication is needed.
- The MCP FAQ eyebrow used an uppercase legacy name missed by the earlier replacement.
- The catalog's recommended section was a separate renderer that still used old ring cards. It now shares the studio's numbered specification layout.
- Catalog ranges were already denominated in CNY but the display appended `$`. Formatting now respects the range currency without multiplying it again. USD source-price fallbacks use the existing fixed customer conversion. Budget filtering retains its original USD-equivalent thresholds.
- A model detail CSS cascade inherited flex display, collapsing desktop media to a narrow box. The dossier explicitly owns grid display and full media width. The browser audit now records media geometry and catalog currency to catch these failures.

### Verification and limits

The final production rebuild passed, including registry, rendition, home-poster, lint and TypeScript gates. `lint:exposure` and `git diff --check` passed. Local Node is 24; CI remains configured for Node 22.

The latest focused runs contain 121 tests: 119 passed and two benchmark route tests failed on pre-existing missing Chinese expectations. Both failed on the extracted unchanged HEAD baseline as well. Logs: `/tmp/videoai-final-focused.log` and `/tmp/videoai-specs-focused.log`.

The earlier broad run recorded 5,613 tests: 5,524 passed, 88 failed and one skipped. Baseline comparison matched 86 failing test names; the two additional failures (sitemap origin expectation and preserved n8n evidence fixture) were subsequently corrected and passed in the focused run. This is **not a claim that a fresh full suite is green**. The baseline comparison ran the 111 previously failing files, not the whole baseline suite. Missing PostgreSQL/ffmpeg/bundled Chromium, the Node version gate and existing architecture/localization expectations remain relevant limits. See `/tmp/videoai-studio-final-validation.log` and `/tmp/videoai-design-baseline-tests.log`.

Additional section/menu checks passed at 1440/1024/390/320 px, and nine interactive checks passed for theme persistence, CNY funding controls, navigation, login and recovery pages. Evidence: `/tmp/videoai-studio-sections/` and `/tmp/videoai-studio-interactions/`. No paid generation or payment was submitted.

### Explicitly deferred by the owner

- Actual operating entity, location and registration details: owner requested “暂时跳过”. Original operator statements in About/editorial/legal identity are not replaced with invented VideoAI facts.
- MCP deployment address: owner requested “暂时跳过”. The original MCP endpoint, installation/protocol configuration and upstream installation links remain pending a separate deployment decision. This pass does not claim they are VideoAI-operated services.
- Authenticated Studio/admin/account data surfaces still need an authorized test account and database for live acceptance. Shared styling and route access gates do not establish successful inspection of protected content.

These exceptions mean the repository must not be described as having zero remaining legacy identity or as fully accepted for every production flow. Changes remain in the existing design worktree and are not published by this verification pass.

The next 27 browser checks (nine routes at 1440/1024/390 px) found seven failures: three catalog hydration errors, one background-removal overflow at 1024 px, and three instances of the explicitly deferred MCP endpoint. Screenshot inspection additionally caught a cramped featured-blog column that did not overflow the viewport. The catalog error came from nesting the block-level `EngineIcon` inside a paragraph; its parent is now a `div`. Background-removal format rows now use a full-width grid. The featured blog item no longer wraps a second grid inside the shared journal grid. The audit now checks journal text-column widths as well as media geometry. Original failure evidence is preserved in `/tmp/videoai-studio-verified-pages/`.

The follow-up also replaces the separate `press@maxvideo.ai` / `partners@maxvideo.ai` contact variants and their obfuscated link targets, and translates the three visible Chinese blog topic summaries. The catalog/CNY check passed 14 tests after the nesting fix; theme/landmark checks passed 11 tests after the blog fix. These overlap the broader suites and must not be added as unique test counts.

The final contact/blog focused run passed 12 of 13 tests. Its remaining legal-address assertion expects exactly three locale entries while the source contains four; the same test fails at unchanged HEAD. The operating-entity facts remain deferred as requested. Log: `/tmp/videoai-contact-blog-tests.log`.

### Final rendered acceptance

The last rebuild passed (`/tmp/videoai-studio-final-rebuild.log`). All **16 final browser checks passed**: models, blog, background-removal and contact at 1440/1024/390/320 px. No page exception, overflow, legacy accent/name match, USD catalog label or cramped journal title was reported on these selected routes. Model recommendations displayed values such as `¥0.53/s` and `¥0.72/s`. The separately rendered English/French/Spanish model-detail paths passed three further checks. Evidence: `/tmp/videoai-studio-final-pages/report.json`, screenshots in that directory, and `/tmp/videoai-studio-localized-smoke/report.json`.

Earlier corrected model-detail, comparison, documentation and MCP FAQ samples remain in `/tmp/videoai-studio-verified-pages/`; its MCP integration failures remain explicitly deferred, not reclassified as passes. The final four-route check supersedes that run for the catalog, blog and background-removal layouts. This evidence covers representative page families and widths, not every route or authenticated state. Production performance improvement is not claimed.
