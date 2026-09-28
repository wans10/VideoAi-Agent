import assert from 'node:assert/strict';
import test from 'node:test';
import { TOPUP_TIERS } from '../frontend/src/config/topupTiers';
import { CUSTOMER_CURRENCY } from '../frontend/src/lib/customer-currency';

import {
  buildWorkspaceTopupAnalyticsPayload,
  getSufficientTopUpAmountCents,
} from '../frontend/app/(core)/(workspace)/app/_lib/workspace-topup';

test('Workspace top-up rounds shortfall up and enforces the customer-currency minimum', () => {
  const minimum = TOPUP_TIERS[0].amountCents;
  assert.equal(getSufficientTopUpAmountCents(undefined), minimum);
  assert.equal(getSufficientTopUpAmountCents(1), minimum);
  assert.equal(getSufficientTopUpAmountCents(744), minimum);
  assert.equal(getSufficientTopUpAmountCents(minimum + 234), minimum + 300);
  assert.equal(getSufficientTopUpAmountCents(minimum + 1500), minimum + 1500);
});

test('Workspace top-up analytics uses wallet currency and no personal content', () => {
  const amount = TOPUP_TIERS[0].amountCents;
  assert.deepEqual(buildWorkspaceTopupAnalyticsPayload(amount), {
    source: 'workspace',
    route_family: 'workspace',
    payment_provider: 'stripe',
    payment_flow: 'checkout',
    charge_currency: CUSTOMER_CURRENCY,
    ...(CUSTOMER_CURRENCY === 'USD' ? { wallet_amount_usd: amount / 100 } : {}),
    wallet_amount_cents: amount,
    credits_amount: amount / 100,
    ...(CUSTOMER_CURRENCY === 'USD' ? { topup_amount_usd: amount / 100 } : {}),
    topup_amount_cents: amount,
  });
});
