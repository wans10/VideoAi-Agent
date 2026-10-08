# GPT Image 2.5 LLM Hub implementation validation — 2026-10-08

Both models now omit unsupported response_format, persist decoded Base64 PNG/JPEG to the existing account-owned storage, preserve provider identity before output handling, validate output count/format/size, and retain the existing completion/thumbnail/receipt owners. No generation retry or silent quality downgrade was introduced. Seedream and legacy GPT Image 2 keep their prior URL response handling.

The exposed landscape size is 1920×1088 and edit Auto sends the same shared provider-valid size used by estimation. Existing quality/size commercial rates and reference policy remain unchanged. Actual supplier invoice equivalence remains unverified.

## Validation

- 112 focused tests passed: adapter/routing, Base64, count/encoding/format errors, account ownership, storage error/provider identity, no repeated POST, multipart 16 references/mask, JPEG, estimator, pricing, output persistence, preflight vocabulary and architecture contracts.
- Four live repository-adapter requests passed: Flare/Sunburst t2i at 1920×1088 and i2i at 1024×768. Upload dependency wrote temporary local files and probed actual dimensions; production S3/database/wallet were not touched. Sanitized results are in the adjacent JSON.
- Full frontend typecheck, repository frontend lint scope, exposure check, diff check and generated model projection checks passed.
- The broad standard validation suite was run: 6,272 tests, 6,058 passed and 210 failed (four skipped). One changed Sunburst fixture and the executor line-limit contract were then corrected and passed focused revalidation. Many remaining failures concern PostgreSQL/runtime prerequisites and existing white-label/SEO/MCP assertions; a baseline subset reproduced 198 failure names. The baseline comparison environment introduced additional failures, so the other failures are not claimed individually preexisting or fully diagnosed. The full suite was not rerun and cannot be reported as passing.
- Public pricing baseline reports eight Qwen projection differences, reproduced exactly on the committed pre-change baseline. No GPT 2.5 price drift was reported. No frozen price fixtures were rewritten.
- No full Next production build or deployed browser acceptance was performed.

## Remaining limits

Sunburst xhigh transparency and max 4K previously returned upstream 504 at about 120 seconds; no async/recovery protocol has been verified. Local compatibility changes cannot remove that gateway limit. A timeout must not trigger duplicate paid generation. Actual LLM Hub debits and old supplier-cost table accuracy remain unverified. Operational S3 credentials and server-only LLMHUB_API_KEY must be configured on the deployed host.
