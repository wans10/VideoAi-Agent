import assert from 'node:assert/strict';
import test from 'node:test';

import { readCharacterBuilderEstimate } from '../frontend/src/components/tools/character-builder/_lib/character-builder-price.ts';

const tariffMeta = { pricingMode: 'manual_tariff', customerTariffRevision: 3 };

test('character builder estimate accepts a USD manual-tariff snapshot', () => {
  assert.deepEqual(
    readCharacterBuilderEstimate({ ok: true, pricing: { currency: 'USD', totalCents: 11, meta: tariffMeta } }),
    { usd: 0.11, revision: 3 },
  );
});

test('character builder estimate accepts the Keyvo CNY snapshot and returns its USD source amount', () => {
  // 11 USD cents are customer-converted at 8 fen per cent; the workspace keeps USD cents internally.
  const pricing = {
    currency: 'CNY', totalCents: 88,
    meta: { ...tariffMeta, customerCurrencyConversion: { sourceCurrency: 'USD', rate: 8, sourceTotalCents: 11 } },
  };
  assert.deepEqual(readCharacterBuilderEstimate({ ok: true, pricing }), { usd: 0.11, revision: 3 });
});

test('character builder estimate refuses unusable payloads', () => {
  assert.equal(readCharacterBuilderEstimate({ ok: false, pricing: { currency: 'USD', totalCents: 11, meta: tariffMeta } }), null);
  assert.equal(readCharacterBuilderEstimate({ ok: true, pricing: { currency: 'USD', totalCents: 11, meta: { pricingMode: 'rule' } } }), null);
  assert.equal(readCharacterBuilderEstimate({ ok: true, pricing: { currency: 'CNY', totalCents: 88, meta: tariffMeta } }), null);
  const inconsistent = { currency: 'CNY', totalCents: 89, meta: { ...tariffMeta, customerCurrencyConversion: { sourceCurrency: 'USD', rate: 8, sourceTotalCents: 11 } } };
  assert.equal(readCharacterBuilderEstimate({ ok: true, pricing: inconsistent }), null);
  assert.equal(readCharacterBuilderEstimate({ ok: true, pricing: { currency: 'USD', totalCents: -1, meta: tariffMeta } }), null);
  assert.equal(readCharacterBuilderEstimate(null), null);
});
