import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('LLM Hub Pay credits only through a signed, unique and transactional order', () => {
  const read = (path: string) => readFileSync(path, 'utf8');
  const notify = read('frontend/app/api/llmhub-pay/notify/route.ts');
  const returned = read('frontend/app/api/llmhub-pay/return/route.ts');
  const orders = read('frontend/server/llmhub-pay/orders.ts');
  const migration = read('neon/migrations/49_llmhub_pay_topups.sql');
  assert.match(notify, /verifyLlmhubPayFields/);
  assert.match(notify, /export async function POST/);
  assert.match(notify, /application\/x-www-form-urlencoded/);
  assert.match(notify, /trade_status !== 'TRADE_SUCCESS'/);
  assert.match(returned, /queryLlmhubPayOrder/);
  assert.match(returned, /result\.status !== 1/);
  assert.match(orders, /withDbTransaction/);
  assert.match(orders, /FOR UPDATE/);
  assert.match(orders, /settlement_amount_fen\) !== paidAmountFen/);
  assert.match(orders, /ON CONFLICT DO NOTHING RETURNING/);
  assert.match(migration, /app_receipts_llmhub_pay_order_unique/);
  assert.doesNotMatch(notify, /recordMockWalletTopUp|applyMockWalletTopUp/);
});
