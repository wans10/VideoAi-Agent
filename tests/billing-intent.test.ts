import assert from 'node:assert/strict';
import test from 'node:test';
import { TOPUP_TIERS } from '../frontend/src/config/topupTiers';
import { CUSTOMER_CURRENCY } from '../frontend/src/lib/customer-currency';
import {
  DEFAULT_BILLING_INTENT,
  buildBillingIntentTarget,
  parseBillingIntent,
} from '../frontend/app/(core)/billing/_lib/billing-intent';

test('billing intent accepts a valid customer-currency amount in integer cents', () => {
  const amountCents = TOPUP_TIERS[1].amountCents;
  const parsed = parseBillingIntent(new URLSearchParams(`amount=${amountCents}&currency=${CUSTOMER_CURRENCY.toLowerCase()}`));
  assert.deepEqual(parsed, { amountCents, currency: CUSTOMER_CURRENCY, isExplicit: true });
});

test('billing intent falls back for missing or invalid values', () => {
  const invalidQueries = [
    '',
    `amount=${TOPUP_TIERS[0].amountCents - 1}&currency=${CUSTOMER_CURRENCY}`,
    `amount=10.5&currency=${CUSTOMER_CURRENCY}`,
    `amount=-2500&currency=${CUSTOMER_CURRENCY}`,
    `amount=${Number.MAX_SAFE_INTEGER + 1}&currency=${CUSTOMER_CURRENCY}`,
    `amount=${TOPUP_TIERS[1].amountCents}&currency=EUR`,
  ];

  for (const query of invalidQueries) {
    assert.deepEqual(parseBillingIntent(new URLSearchParams(query)), DEFAULT_BILLING_INTENT, query);
  }
});

test('billing target serialization is deterministic and allowlisted', () => {
  assert.equal(
    buildBillingIntentTarget({ amountCents: TOPUP_TIERS[1].amountCents, currency: CUSTOMER_CURRENCY }),
    `/billing?amount=${TOPUP_TIERS[1].amountCents}&currency=${CUSTOMER_CURRENCY}`
  );
  assert.equal(
    buildBillingIntentTarget({ amountCents: TOPUP_TIERS[1].amountCents, currency: 'EUR' }),
    `/billing?amount=${TOPUP_TIERS[0].amountCents}&currency=${CUSTOMER_CURRENCY}`
  );
});
