import assert from 'node:assert/strict';
import test from 'node:test';
import { TOPUP_TIERS } from '../frontend/src/config/topupTiers';
import {
  createInitialTopupSelection,
  createReturnedTopupSelection,
} from '../frontend/app/(core)/billing/_lib/billing-selection';
import { parseAmountToCents } from '../frontend/app/(core)/billing/_lib/billing-utils';

test('preset billing hydration selects the tier without opening custom state', () => {
  assert.deepEqual(createInitialTopupSelection(TOPUP_TIERS[1].amountCents), {
    selectedTopupCents: TOPUP_TIERS[1].amountCents,
    customAmountInput: '',
  });
});

test('custom billing hydration preserves the exact customer-currency input', () => {
  const customAmountCents = TOPUP_TIERS[0].amountCents + 234;
  assert.deepEqual(createInitialTopupSelection(customAmountCents), {
    selectedTopupCents: customAmountCents,
    customAmountInput: (customAmountCents / 100).toFixed(2),
  });
});

test('large safe-integer billing hydration preserves exact cents in the display input', () => {
  assert.deepEqual(createInitialTopupSelection(9007199254740990), {
    selectedTopupCents: 9007199254740990,
    customAmountInput: '90071992547409.90',
  });
});

test('large safe-integer billing hydration round-trips through the custom input parser', () => {
  const initialSelection = createInitialTopupSelection(9007199254740990);
  const reparsedCents = parseAmountToCents(initialSelection.customAmountInput);

  assert.equal(reparsedCents, 9007199254740990);
  assert.deepEqual(createInitialTopupSelection(reparsedCents ?? undefined), initialSelection);
});

test('invalid billing hydration falls back to the first tier', () => {
  for (const value of [undefined, Number.NaN, TOPUP_TIERS[0].amountCents - 1, 10.5]) {
    assert.deepEqual(createInitialTopupSelection(value), {
      selectedTopupCents: TOPUP_TIERS[0].amountCents,
      customAmountInput: '',
    });
  }
});

test('hosted checkout return restores the selected preset or custom amount', () => {
  assert.deepEqual(createReturnedTopupSelection(TOPUP_TIERS[1].amountCents), {
    selectedTopupCents: TOPUP_TIERS[1].amountCents,
    customAmountInput: '',
  });
  const customAmountCents = TOPUP_TIERS[0].amountCents + 234;
  assert.deepEqual(createReturnedTopupSelection(customAmountCents), {
    selectedTopupCents: customAmountCents,
    customAmountInput: (customAmountCents / 100).toFixed(2),
  });

  for (const value of [null, Number.NaN, TOPUP_TIERS[0].amountCents - 1, 10.5]) {
    assert.equal(createReturnedTopupSelection(value), null);
  }
});
