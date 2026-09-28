# LLM Hub Pay V2 wallet top-ups

LLM Hub Pay is an optional Billing-page payment choice alongside Stripe. The merchant charges CNY through Alipay or WeChat Pay; the existing wallet remains denominated in USD. The source protocol is the merchant's V2 documentation at `https://payment.llmhub.com.cn/doc/` (`sign_note`, `paytype`, `pay_create`, `pay_query`, `pay_notify`). Do not use the V1 MD5 endpoints for this integration.

When the gateway is configured, Billing adds CNY to its payment-currency selector. Selecting CNY shows the LLM Hub Pay quote and Alipay/WeChat buttons; EUR/USD continue through Stripe. CNY here is a payment currency only: it is not added to wallet currency preferences or Stripe's enabled-currency policy.

## Ownership

- `frontend/server/llmhub-pay/client.ts` owns form encoding, SHA256WithRSA signing, platform-signature verification, and signed create/query responses. It requests `method=jump` so the payment provider returns an HTTPS redirect URL.
- A nonzero API response without a signature is diagnostic only: its sanitized code/message may explain a failed request, but it cannot create an order or credit the wallet. A success response must carry a valid platform signature; a signed error with an invalid signature is rejected.
- `frontend/app/api/llmhub-pay/checkout/route.ts` authorizes the account, checks restrictions and checkout abuse limits, quotes CNY, persists a pending order, and creates the provider order.
- `frontend/app/api/llmhub-pay/notify/route.ts` accepts the provider's documented signed GET notification. It also accepts form-encoded POST notifications through the same signature and settlement path for gateway compatibility. It responds with exactly `success` only after the wallet receipt commits. `return/route.ts` verifies the signed browser return, queries the provider, and confirms a paid order before displaying success.
- `frontend/server/llmhub-pay/orders.ts` locks the pending order, compares merchant ID, merchant order number, platform order number, payment type, and exact CNY fen. A unique `app_receipts.llmhub_pay_out_trade_no` prevents double credit. The transaction inserts a USD top-up receipt and marks the order paid atomically. Browser parameters never directly credit the wallet.
- `neon/migrations/49_llmhub_pay_topups.sql` adds the order ledger and receipt/checkout-attempt identities. The request-time billing bootstrap mirrors the required schema for local development.

## Configuration and rollout

1. Apply migration 49 to the target Neon database before enabling the gateway.
2. Set `LLMHUB_PAY_PID`, `LLMHUB_PAY_MERCHANT_PRIVATE_KEY`, `LLMHUB_PAY_PLATFORM_PUBLIC_KEY`, and the canonical HTTPS `NEXT_PUBLIC_SITE_URL` as server configuration. The private key can be PEM with literal newlines or `\\n` escapes. The provider must allow the resulting `/api/llmhub-pay/notify` and `/api/llmhub-pay/return` URLs.
3. The CNY quote uses the existing USD FX quote policy and margin. The live Frankfurter USD/CNY rate is preferred; `FX_RATE_USD_CNY` is an explicit fallback. If neither is available, the quote and checkout return 503 rather than charging at an invented rate.
4. Test a real low-value Alipay and WeChat Pay payment in a non-production merchant environment. Confirm the redirect, notification `success` acknowledgement, a single USD receipt, exact CNY original amount, wallet balance, and signed query reconciliation. Repeat the notification to confirm no second receipt. Do not put real keys in the repository.

The Billing page hides the choice until the merchant configuration, site URL, and database URL are present. Stripe and its webhook remain independent. A successful return does not imply credit unless the signed provider query reports status `1` and the transaction commits. If the provider has not confirmed payment, Billing shows a pending notice.

The provider's available documents describe payment notification, not automated refund events. Refund operations and related wallet reversals require a separate reviewed workflow; do not issue a platform refund without reconciling the wallet ledger.
