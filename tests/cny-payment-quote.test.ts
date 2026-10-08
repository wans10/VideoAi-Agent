import assert from 'node:assert/strict';
import test from 'node:test';
import { convertUsdToCurrencyAmount, USD_TO_CNY_FIXED_RATE } from '../frontend/src/lib/fxQuote';

test('CNY payment quote uses the launch fixed rate without an FX margin', async () => {
  const quote = await convertUsdToCurrencyAmount({ usdAmountCents: 1000, targetCurrency: 'CNY' });
  assert.equal(USD_TO_CNY_FIXED_RATE, 8);
  assert.equal(quote.currency, 'CNY');
  assert.equal(quote.amountMinor, 8000);
  assert.equal(quote.rate, 8);
  assert.equal(quote.rateWithMargin, 8);
  assert.equal(quote.marginBps, 0);
  assert.equal(quote.source, 'fixed:usd-cny');
});
