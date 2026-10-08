# GPT Image 2.5 systematic programmatic audit — 2026-10-08

## Conclusion

Request/price/projection compatibility checks pass, but the implementation is not issue-free. The audit reproduced three output persistence defects. This audit changed no implementation code and made no new paid API requests.

## Executed checks

- 5,520 offline adapter combinations across both models, both modes, declared non-custom resolutions, five quality tiers, two output formats, three background choices and four output counts. Assertions checked protocol/model size fields, absence of response_format, provider-valid dimension constraints and one submission. Zero request-construction failures. Fetch/upload were injected; synthetic signature buffers were used. This proves local request construction only, not remote acceptance or image validity for every combination.
- 420 provider price comparisons across model/mode/size/quality/count/reference-count dimensions. Compared the quote's provider subtotal with the subtotal recalculated from the actual resolved output size. Zero mismatches. Does not validate supplier invoice rates.
- Six Auto source-size boundary examples returned valid output dimensions, including missing dimensions, odd dimensions, 4K, oversized and tiny sources. The estimator returned 1456×1088 for 1448×1086 inputs on both models.
- HTTP 400, 401, 429, 500, 502, 503 and 504 fault injection preserved status and made exactly one POST each.
- 112 focused regression/architecture tests passed. Full frontend typecheck and configured frontend lint scope passed; model registry/runtime/catalog/roster checks, exposure and diff checks passed.
- Previously recorded four live adapter canaries remain the live evidence. The entire remote Cartesian product, production S3 completion, account debit, high-load Sunburst reliability and browser deployment were not retested.

## New reproduced findings

### P1 — Truncated images can pass output validation

`frontend/src/server/images/llmhub-image-output.ts` checks canonical Base64 and file signature, then trusts width/height returned by the upload dependency. The production storage function extracts PNG dimensions from IHDR without decoding the full image. A crafted 24-byte PNG with the correct signature/IHDR and 1024×768 dimensions was rejected by Sharp decoding but accepted by storeLlmhubImageOutputs with the production-equivalent header dimension extractor. This permits a broken image to reach completion and charge handling.

The original 8-byte-signature mock finding was refined to the stronger 24-byte valid-IHDR reproduction. Validate full PNG/JPEG decode and expected dimensions before storage writes; do not rely on a header or provider response settings as image validity.

### P2 — Wrong-size output writes occur before rejection

An injected upload returning 1024×1024 for a quoted 1024×768 output was called once before the dimension mismatch was thrown. The current helper cannot reject wrong geometry before the S3 write. Production writes before extracting dimensions as well. Reject decoded geometry before upload so a mismatched generated asset cannot create a storage side effect.

### P2 — A later batch upload failure leaves an earlier uploaded asset

Two valid images were supplied; the first upload succeeded and the second threw an S3-outage error. The helper rejected the batch after two upload calls, with no rollback or partial-success recovery in this helper. No delete dependency is available there. Earlier objects can remain without a completed job attachment. This is a partial-storage/orphan risk, not a demonstrated duplicate provider charge. Persist/resume partial upload state or explicitly clean up the exact successfully created objects when completing the whole batch is impossible.

## Existing limitations retained

The previous broad suite failed outside this focused scope and was not rerun here. The eight Qwen public-price baseline differences were previously reproduced on the committed baseline. Sunburst xhigh transparency and max 4K reached upstream 504 around 120 seconds in prior live canaries. The local no-retry checks do not establish upstream idempotency, async recovery or final outcome/charge after a timeout. Legacy supplier-cost facts remain unverified against actual LLM Hub debit.

Adjacent JSON records counts, fault outcomes and Auto-size examples. Temporary audit scripts live under /tmp/videoai-gpt-validation and contain no API Key.
