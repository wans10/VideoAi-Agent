# CNY commercial migration

The intended launch policy is 1 USD = 8 CNY. The project has no registered users at the time of this decision, so no historical wallet or receipt migration is required. This is a change to customer prices and ledger units, not a number-formatting change.

The payment-currency selector defaults to CNY when no account preference or deployment override exists. The 1Panel Compose config enables CNY alone, so a saved test-account EUR preference cannot override the China launch payment currency. Neon migration 50 permits CNY profile preferences; it must run before CNY preferences are written.

The CNY customer build uses `NEXT_PUBLIC_CUSTOMER_CURRENCY=CNY` at **image build time**. `DEFAULT_CURRENCY=CNY` and `ENABLED_CURRENCIES=cny` only select the payment currency at runtime; they cannot change prices already bundled into an older image. The Dockerfile, image workflow, and repository 1Panel Compose set the build argument to CNY. Deploy a newly built web image and run the migration image before verifying the site. Neon migration 51 changes the default currency on new receipts to CNY; it does not rewrite earlier receipts.

## Current ownership

- `frontend/config/pricing-policy.json` and provider price facts remain authored in USD. The canonical pricing kernel checks that facts and policy use the same currency. The historical billing and public pricing baselines remain frozen USD references.
- `frontend/src/lib/customer-currency.ts` projects canonical USD quotes and snapshots to customer CNY at the fixed 8× rate, including totals and component amounts. Snapshot provenance retains the USD source amount. Billing, public prices, and fixed products use this projection.
- `frontend/src/server/wallet-summary.ts`, `frontend/src/lib/wallet.ts`, and the billing schema own the receipt ledger and balance. The CNY build sums CNY receipts. New top-ups, charges, and refunds must use CNY cents.
- `frontend/app/api/wallet/route.ts` and Stripe webhook top-up persistence separate wallet credit from settlement currency. LLMHub Pay settles and credits the same CNY amount in the CNY build.
- `frontend/src/config/topupTiers.ts` owns customer currency presets and minimums. The billing page and workspace top-up modal use these tiers. The CNY presets are ¥80, ¥200, ¥400, and ¥800.

## Acceptance boundary

For one representative video, image, audio, fixed product, Stripe top-up, and LLMHub Pay top-up, verify that the displayed CNY quote equals the accepted CNY charge and the CNY receipt. Verify refund and insufficient-balance paths against the same units. The billing page and header must show the wallet API's CNY balance, and both billing and workspace top-up pickers must show CNY presets. Preserve the frozen USD pricing baselines as historical evidence; record approved commercial deltas through the pricing audit process.

Before production release, verify the image digest running in 1Panel is the newly built CNY image and confirm a ¥80 test payment produces exactly ¥80 in the wallet. A runtime Compose currency setting alone is insufficient evidence that a web image was built with CNY customer prices.
