# LLM Hub GPT Image 2.5 compatibility audit — 2026-10-08

## Conclusion

LLM Hub exposes both `gpt-image-2.5-flare` and `gpt-image-2.5-sunburst` for generation and editing, but the repository at commit `22dd4d9` is not fully compatible. Real calls reproduced blocking request/response mismatches. No inference code was changed in this audit.

## Method and evidence

22 generation/edit POSTs: two requests matching the repository adapter, then 20 bounded compatibility cases with the rejected `response_format` removed. 14 returned HTTP 200, six returned HTTP 400, and two returned HTTP 504. These are request outcomes, not confirmed account charges. Output Base64 was decoded and image dimensions, format and Alpha presence checked with macOS `sips`. The real returned Base64 images were replayed into `runLlmhubFlareGeneration` using an injected fetch; both variants reproduced `LLM Hub did not return image URLs`. The 19 existing integration/adapter tests pass despite the live mismatches.

The adjacent JSON contains sanitized requests, response settings, usage, status, elapsed time, request IDs and image probes. No Key or Base64 image data is included. Requests with 504 were never resubmitted.

## Results

| Capability / request | Flare | Sunburst |
| --- | --- | --- |
| Current adapter: `response_format=url` | 400 unknown parameter | 400 unknown parameter |
| high, 1024×768 PNG, background auto | 200, exact dimensions | 200, exact dimensions |
| low, custom 1280×768 JPEG, opaque | 200, exact dimensions | 200, exact dimensions |
| medium, 1024×1024 PNG | 200 | 200 |
| WebP output | 400: only png/jpeg supported | Same |
| xhigh, 1024×1024 transparent PNG | 200, Alpha present | 504 after 120.6 s |
| max, 3840×2160 PNG | 200, exact 4K | 504 after 120.4 s |
| 1920×1080 preset | 400: both edges must be divisible by 16 | Same |
| n=4, low, 1024×1024 PNG | 200, four exact-size images | Same |
| Edit, one PNG reference, no size field | 200, 1448×1086 output | Same |
| Edit, 16 PNG references plus mask, explicit 1024×768 | 200 | 200 |

All successful calls returned `data[].b64_json`, not URL. Both edit requests visibly changed a blue mug to red. The 16-reference case repeats one image and uses a fully transparent mask: it verifies multipart count/acceptance and output, not 16 distinct-source reasoning or precise spatial mask preservation.

## Repository mismatches and required follow-up

1. `frontend/src/server/images/llmhub-flare-generation.ts:127` always adds `response_format=url` to generation and edit forms. Remove it specifically for the two verified 2.5 models; other model routes need their own evidence.
2. The same adapter, lines 157–162, rejects successful Base64 outputs. Decode and persist them into owned image storage using the existing account/job ownership contract before completion. Capture provider request identity before output processing; a storage error must not trigger a repeated paid generation.
3. `frontend/src/config/fal-engines/gpt-image-2-5.ts` advertises WebP. The live endpoint accepts PNG/JPEG only. Either constrain provider output or explicitly transcode in owned storage and verify the advertised format.
4. The provider-size map advertises/sends 1920×1080, which violates the live dimension rule. Replace it with a valid size and align UI, catalog, quote and billing contracts; do not silently keep charging/displaying the old size.
5. For edit auto, `execute-image-generation.ts:131–138` derives quote dimensions from reference images, while the adapter omits size and live output is 1448×1086 for a 1024×768 source. Align the actual provider size with the priced size or revise the pricing policy using confirmed provider accounting.
6. Sunburst high-load synchronous requests twice reached an approximately 120-second upstream openresty timeout, shorter than the adapter's 180-second timeout. Final task outcome and charges are unknown. Increasing only the repository timeout cannot remove an upstream 504. Provider-supported recovery/async behavior or a channel timeout change needs verification.

## Limits

This bounded matrix is not the full Cartesian product of sizes, qualities, backgrounds and reference formats. Input max-size boundaries, distinct 16-image semantics, spatial mask precision, idempotency guarantees, async recovery, real debit and provider cost equivalence were not established. Directory `owned_by=azure` is provider metadata, not independent certification of the underlying model. GET model details returned model_not_found despite directory presence and successful POSTs; it does not establish missing generation capability.

Actual token usage was returned, but the repository's legacy quality/size price table and flat reference surcharge remain unverified against LLM Hub account billing. API transport support is not proof of cost accuracy.
