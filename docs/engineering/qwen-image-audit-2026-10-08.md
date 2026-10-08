# Qwen Image programmatic audit — 2026-10-08

Scope: the uncommitted Qwen Image 3.0 / Pro integration on
`feat/white-label-keyvo`, including registry projections, estimate transport,
provider payload/config/response, output persistence, refund and existing image
provider regressions. No production credentials, paid API requests or production
database writes were used.

## Reproduced findings and fixes

The initial boundary probe and the new audit tests failed before fixes:

1. Editing with zero references received a quote. More than three references or
   an invalid ratio escaped as generic errors, leading to HTTP 500. Qwen estimate
   validation now returns structured HTTP 400 before pricing.
2. Malformed provider choices/content produced TypeError; negative or nonnumeric
   reported image dimensions were accepted. Response validation now rejects these
   with QwenImageError and retains provider diagnostics for the failure path.
3. The payload builder accepted the application's internal hyphenated model ID
   and could send it unchanged to Alibaba. Only official dotted provider IDs are
   now accepted; engine definitions map internal identities to those IDs.
4. The Beijing rate table could be paired with another region's endpoint. Qwen
   configuration now requires the Beijing workspace/public host and rejects a
   conflicting explicit region. This does not restrict the separate video client.
5. The new preflight validation exceeded the existing image executor architecture
   ceiling. Validation/classification moved into provider helpers; the original
   ceiling was preserved. Vertex availability still runs before wallet reservation
   through the shared direct-provider availability helper; its contract test follows
   that delegation.

Regression tests live in `tests/alibaba-qwen-image-audit.test.ts`, alongside the
payload/client and execution tests. The audit includes actual estimate-route HTTP
handling, not just pricing arithmetic.

## Final results

- 165 focused and related regression tests passed, zero failures.
- Actual estimate and canonical billing functions agree across 112 combinations:
  2 models × 2 resolutions × 7 ratios × 4 reference counts (zero selects text-only).
  The matrix passed independently in both USD and CNY customer configurations.
- The existing 28 model/resolution/ratio checks validate pixel areas and provider
  billing tiers. Output persistence failure retains the request ID and invokes the
  existing refund owner once; success follows output copy and thumbnail preparation.
- Full frontend TypeScript check and full configured frontend ESLint scan passed.
  Cached tool binaries were used directly because frontend `.bin` links are absent.
- Registry validation, runtime/catalog/roster read-only projection checks, public
  exposure scan and `git diff --check` passed.
- Server entry-point esbuild bundling passed. This is not a complete Next.js
  production build.

## Reproduction

```bash
TSX_TSCONFIG_PATH=frontend/tsconfig.json node --import tsx --test \
  tests/alibaba-qwen-image*.test.ts tests/image-generation-*.test.ts \
  tests/image-output-storage.test.ts tests/image-settings-fields-hook-contract.test.ts \
  tests/image-workspace-*.test.ts tests/model-registry-*.test.ts \
  tests/pricing-architecture.test.ts tests/pricing-billing-authority.test.ts \
  tests/pricing-public-authority.test.ts tests/pricing-canonical-kernel.test.ts \
  tests/preflight-media-pricing.test.ts tests/seedream-image-model.test.ts \
  tests/seedream-pricing.test.ts tests/byteplus-seedream-*.test.ts \
  tests/google-vertex-image-*.test.ts

NEXT_PUBLIC_CUSTOMER_CURRENCY=CNY TSX_TSCONFIG_PATH=frontend/tsconfig.json \
  node --import tsx --test tests/alibaba-qwen-image-audit.test.ts

node node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/bin/tsc \
  --noEmit --incremental false -p frontend/tsconfig.json

# Run with Node 24 used for this audit; the repository targets Node 22.
cd frontend
node ../node_modules/.pnpm/eslint@8.57.1/node_modules/eslint/bin/eslint.js \
  app pages components lib src middleware.ts --ext .js,.jsx,.ts,.tsx
```

## Limits and deployment checks

The tests mock provider network, storage and database writes. They do not establish
live model permissions, quota, provider latency, real S3 persistence, real wallet
transactions or production proxy timeout behavior. No browser smoke test or full
Next.js production build was performed. Node 22 CI remains required.

The integration remains synchronous: configure proxy timeouts and avoid automatic
resubmission after an ambiguous timeout. Container termination has no durable
async image recovery in this implementation. These are remaining operational
limitations, not cleared by passing unit/contract tests. See
[Docker setup](../deployment/qwen-image.md) for supported scope and first live tests.

All changes remain local and uncommitted. This report does not certify deployment.
