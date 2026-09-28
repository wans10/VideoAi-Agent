# CNY commercial migration

The intended launch policy is 1 USD = 8 CNY. The project has no registered users at the time of this decision, so no historical wallet or receipt migration is required. This is a change to customer prices and ledger units, not a number-formatting change.

The payment-currency selector now defaults to CNY when no account preference or deployment override exists. The 1Panel Compose config enables CNY alone, so a saved test-account EUR preference cannot override the China launch payment currency. Neon migration 50 permits CNY profile preferences; it must run before CNY preferences are written. This changes settlement selection only. The pricing catalog, top-up credit tiers, wallet ledger, receipts, and model quotes are still USD until the commercial migration below is complete.

## Current ownership

- `frontend/config/pricing-policy.json` and provider price facts are authored in USD. The canonical pricing kernel checks that facts and policy use the same currency. The historical billing and public pricing baselines are frozen USD references.
- `frontend/server/pricing/quote-billing.ts`, `frontend/src/lib/pricing-public-quote.ts`, and `frontend/src/lib/billing-products.ts` project customer quotes. A CNY conversion must cover the total, base, addons, margin, discount, platform share, and vendor share together, while retaining the USD cost basis and fixed conversion rate in provenance.
- `frontend/src/server/wallet-summary.ts`, `frontend/src/lib/wallet.ts`, and the billing schema own the receipt ledger and balance. The wallet currently sums USD receipts. New top-ups, charges, and refunds must all use CNY cents before switching its balance currency.
- `frontend/app/api/wallet/route.ts` and Stripe webhook top-up persistence separate wallet credit from settlement currency. `frontend/server/llmhub-pay/orders.ts` currently settles CNY but credits USD. Both paths must credit the same CNY amount that the user accepted.
- `frontend/src/config/topupTiers.ts` and the billing UI currently choose USD credit amounts. Change their minimums, presets, intent parsing, return reconciliation, and labels as one unit.

## Acceptance boundary

For one representative video, image, audio, fixed product, Stripe top-up, and LLMHub Pay top-up, verify that the displayed CNY quote equals the accepted CNY charge and the CNY receipt. Verify refund and insufficient-balance paths against the same units. Preserve the frozen USD pricing baselines as historical evidence; record approved commercial deltas through the pricing audit process. Do not enable CNY wallet defaults until these paths agree.
