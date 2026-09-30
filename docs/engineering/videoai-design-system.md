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
