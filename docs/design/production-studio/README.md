# VideoAI production studio direction — 2026-10-02

The product is an AI image-making studio for filmmakers and visual creators. The public experience starts with a production intention: develop a look, plan coverage, test a shot, prepare sound, or inspect the result. Model selection supports those decisions.

## Information architecture

| Department | Visitor's decision | Primary destinations |
| --- | --- | --- |
| 制作台 / Production | What stage do I need to work on? | Shot generation, storyboard, visual development, sound |
| 摄影与美术 / Camera & art | What reference or image problem must I resolve? | Characters, camera studies, finishing, subject isolation |
| 放映室 / Screening room | What can I learn from a shot? | Actual outputs, cinematic studies, commercials, production journal |
| 制作管线 / Pipeline | How does this fit my existing workflow? | Supported assistant integrations and MCP |
| 制作预算 / Budget | What does this take cost? | Existing pricing and quote surfaces |

Model directories and capability comparisons remain linked as secondary production references. Existing routes, model identity, generation controls, pricing and integration eligibility remain owned by their original application modules.

## Content and composition

- Home opens with a shot-making proposition, followed by a production brief, camera/art departments, a screening programme and shot budgeting. A clapperboard-style brief is explicitly illustrative. The model comparison section becomes an optional production reference.
- Angle is a camera-study page: interactive prepared views, a three-shot dialogue coverage plan, preparation decisions, explicit generation limits and next-stage links. Its old product-feature sequence and workspace screenshot are no longer rendered.
- Desktop menus contain task cards with short briefs; mobile menus expose the same departments with stacked descriptions. Footer navigation uses those same department definitions.
- Tools is a department sheet organized around three preparation decisions: character, camera and storyboard. Each row states the material to prepare, with finishing operations in a separate source-problem index.
- Character Builder opens as a reference desk, followed by continuity notes and the existing factual reference-to-video demonstration. Generic problem/solution and use-case cards no longer render. Its hero and conversion copy no longer promise guaranteed character continuity.
- Upscale leads with source review and texture/motion/delivery checks. The former model-feature cards are removed; exact model specifications and the existing workspace preview remain available.
- Background removal prioritizes the compositing handoff, edge/background/export checks and format compatibility. The former generic use-case grid is removed. Actual workflow steps, export information and schemas retain their owners.
- Examples is a screening room: shots remain in the existing 24-card SSR gallery, followed by framing/motion/continuity review notes. The model-family rail becomes an expandable technical index; detailed family pages keep it open. Model references remain expandable below the review notes. Preview controls and opening guidance now also have explicit Simplified Chinese labels.
- Pricing opens with production intent and a three-pass budget sheet, then existing exact scenario quotes. The sheet is explicitly advisory, does not persist a project budget and performs no price calculations. Pricing, billing and refund policy remain unchanged.
- MCP explains the shot handoff from brief to exact-price confirmation to result review, before the registry-derived connection choices. It retains all client availability, host-evidence and publication gates.
- All new department copy, home brief and Angle narrative are authored in Chinese, English, French and Spanish. Chinese copy avoids promises of exact camera geometry or guaranteed character continuity.

Implemented public page scope: homepage, tools hub, Character Builder, Angle, Upscale, Background Removal, examples hub (and shared family review structure), pricing and MCP. These nine page entries and the shared navigation/footer now use the production-studio direction.

The model catalog, individual model/comparison articles, blog/documentation, integration setup guides, legal pages and authenticated workspaces retain their specialized content and internal functionality. They receive the shared public shell where applicable. This change does not claim that every route or the authenticated editor has a bespoke new design.

## Ownership

- `frontend/config/studio-navigation.ts`: authored production departments and task destinations.
- `frontend/config/navigation.ts`: shared navigation compatibility facade and registry-derived integration availability.
- `frontend/messages/{en,fr,es,zh}.json`: translated department labels and descriptions.
- `frontend/components/marketing/home/home-production-copy.ts`: production brief copy.
- `frontend/src/components/tools/angle/landing/AngleProductionSections.tsx`: camera-study composition; its copy and CSS are colocated.
- `AngleOrbitStudio.client.tsx`: unchanged image selection, keyboard/drag behaviour, responsive display and preparation owner.
- `frontend/src/components/tools/production/`: shared preparation/review copy and tool department styling; tool-specific data, media and schemas stay in existing landing owners.
- `pricing/_components/ProductionBudgetSheet.tsx` and `_lib/production-budget-copy.ts`: advisory budget presentation. `pricingHubData.ts` still owns canonical quote projections.
- `examples/_components/ScreeningRoomNotes.tsx` and `_lib/screening-room-copy.ts`: editorial review guidance; gallery pagination and media ownership are unchanged.
- `frontend/components/marketing/mcp/mcp-production-copy.ts`: localized production narrative; integration capabilities still come from the existing registry/evidence owners.

## Validation

- 94 focused tests pass, covering navigation, runtime rendering, architecture, responsive orbit, gallery SSR/media, pricing projection, MCP metadata/evidence and tool schemas. `production-page-architecture.test.ts` locks the new editorial ownership; the gallery runtime test covers Simplified Chinese controls.
- ESLint, TypeScript, public-exposure and whitespace checks pass.
- Read-only Chrome review: 1440 × 1000 and 390 × 1000 keyboard/menu/orbit checks pass. Escape restores focus; the mobile dialog retains keyboard focus. A cramped mobile description layout was corrected and rechecked.
- Page audit: home, Angle and tools at 1440 × 1000 and 390 × 844, all HTTP 200, no page exceptions and no horizontal overflow. Canonicals and five locale alternates are present. Four localized Angle routes return 200 with valid JSON-LD.
- Expanded page review: seven additional page entries at 1440 × 1000 and 390 × 1000, plus EN/FR/ES route smoke checks (35 successful page visits). Checks cover headings, expandable indexes, task links, canonical URLs, five hreflang entries and parseable JSON-LD. No page exceptions or horizontal overflow. The final pricing layout has a separate repeat check.
- No generation, sign-in, payment, deployment or external publication was performed. Local database-backed cookie endpoints return 500 because this preview has no database; these are recorded as environment failures, not healthy backend behaviour.

Reproduce:

```bash
DESIGN_AUDIT_URL=http://127.0.0.1:3010 node scripts/qa/videoai-production-review.mjs
DESIGN_AUDIT_URL=http://127.0.0.1:3010 node scripts/qa/videoai-production-pages.mjs
DESIGN_AUDIT_URL=http://127.0.0.1:3010 DESIGN_BASELINE_URL=http://127.0.0.1:3011 node scripts/qa/videoai-production-performance.mjs
```

### Comparable local loading check

Baseline source: `4ab3ae6`. Same Chrome and local Next.js development mode, warmed route compilers, fresh browser contexts, reduced motion, 3 alternating samples for each route/width. Both previews use the same fallback content without a business database.

| Width | Page | Before median LCP | After median LCP | Max CLS (both) |
| --- | --- | --- | --- | --- |
| 390 | Home | 408 ms | 276 ms | 0 |
| 390 | Angle | 360 ms | 216 ms | 0 |
| 1440 | Home | 308 ms | 232 ms | 0 |
| 1440 | Angle | 320 ms | 196 ms | 0 |

No regression was reproduced under these local conditions. These measurements are directional development checks, not production Core Web Vitals or a production performance claim. A production build and real deployed data need their own release validation.

### Review artifacts (local only)

- `/tmp/videoai-production-pages/report.json`: expanded route and interaction checks; desktop/mobile screenshots alongside it.
- `/tmp/videoai-production-pricing-review/report.json`: final compact budget opening and locale checks.
- `/tmp/videoai-production-review/interactions.json`: homepage, department menus and Angle interaction checks.
- `/tmp/production-tests.log`: focused test results.

The live site has not been updated by these local edits. Screenshots are review artifacts, not evidence of a deployed release.

### Expanded page loading comparison

Same baseline `4ab3ae6`, Chrome and local Next development conditions as above. Each cell is before → after median LCP over three alternating samples, in milliseconds. Pricing uses the final compact opening repeat, not the earlier in-progress layout.

| Page | 390 px | 1440 px |
| --- | --- | --- |
| Tools departments | 468 → 288 | 276 → 192 |
| Character references | 308 → 216 | 352 → 220 |
| Upscale | 252 → 236 | 248 → 228 |
| Subject separation | 316 → 244 | 312 → 244 |
| Screening room | 268 → 252 | 412 → 344 |
| Budget | 748 → 644 | 744 → 696 |
| MCP pipeline | 268 → 220 | 288 → 284 |

No LCP regression was reproduced in these runs. All new-page CLS values were 0 and no horizontal overflow was measured. These remain local development measurements, not production CWV. The exact samples are in `/tmp/videoai-production-pages-performance/comparison.json` and `/tmp/videoai-production-final-performance/comparison.json`.
