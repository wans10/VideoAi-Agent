import assert from 'node:assert/strict';
import test from 'node:test';
import { TOPUP_TIERS } from '../frontend/src/config/topupTiers';
import { CUSTOMER_CURRENCY } from '../frontend/src/lib/customer-currency';

import {
  buildWorkspaceTopupAnalyticsPayload,
  formatWorkspaceTopupPaymentAmount,
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

test('Workspace payment review formats the local quote and records its charge currency', () => {
  assert.equal(typeof formatWorkspaceTopupPaymentAmount, 'function');
  assert.equal(formatWorkspaceTopupPaymentAmount(920, 'EUR', 'fr').replace(/\s/g, ' '), '9,20 €');
  assert.equal(buildWorkspaceTopupAnalyticsPayload(1000, 'EUR').charge_currency, 'EUR');
});

test('Workspace top-up analytics contains conversion fields and no personal content', () => {
  const amount = 1300;
  assert.deepEqual(buildWorkspaceTopupAnalyticsPayload(1300), {
    source: 'workspace',
    route_family: 'workspace',
    payment_provider: 'stripe',
    payment_flow: 'checkout',
    charge_currency: 'USD',
    ...(CUSTOMER_CURRENCY === 'USD' ? { wallet_amount_usd: amount / 100 } : {}),
    wallet_amount_cents: amount,
    credits_amount: amount / 100,
    ...(CUSTOMER_CURRENCY === 'USD' ? { topup_amount_usd: amount / 100 } : {}),
    topup_amount_cents: amount,
  });
});
