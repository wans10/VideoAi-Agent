# Product display branding

Reviewed 2026-10-02. The current service display name is **VideoAI**.
`frontend/lib/product-brand.ts` owns the shared name and CNY wallet top-up
product label. New payment orders use the current brand; stored transactions
and external receipts are not rewritten. Accepted historical render failures
normalize the old name when displayed, without modifying stored events.

The page-copy regression guard is `tests/product-brand-coverage.test.ts`.
Payment protocol tests assert the signed Alipay/WeChat product name and Stripe
checkout tests assert the default product label. The delayed-home-demo test
covers the placeholder that is visible before its client chunk loads.

Treat the following as separate from service display copy:

- Original author biographies, inherited articles, source credits and historical
  publication evidence retain truthful attribution. About explicitly identifies
  the original project, rather than claiming its founder operates this deployment.
- Legal operator name, address and contact details require verified owner input.
  The inherited legal mentions page is still pending that information; do not
  manufacture an entity by replacing its name with the product brand.
- Domains, package names, persisted keys, schema identifiers and integration
  commands are compatibility contracts. A display-name change does not rename them.
- Cached MCP documents remain immutable at their old URIs. New display copy
  uses new resource versions; see [mcp-client-experience.md](mcp-client-experience.md).

Local browser checks covered Chinese home, pricing, MCP, model and comparison
pages, password recovery and About in all four locales. Payment checks use
signed mocked gateway responses; no real payment or production deployment was
performed. Merchant account/statement names must be managed separately from
the checkout product label.

Additional service checks passed after updating the old display-name assertions
(103 targeted tests). The broader MCP run also attempted PostgreSQL integration
tests; 19 could not initialize their disposable database in this environment.
They are not claimed as passing. Frontend lint, TypeScript, exposure lint,
model-registry projection checks and `git diff --check` passed.
