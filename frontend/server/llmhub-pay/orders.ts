import { query, withDbTransaction, type QueryExecutor } from '@/lib/db';
import { recordConfirmedMcpWalletFunding, resolveMcpTrialToWalletWindowSeconds } from '@/server/agent-api/mcp-funnel';
import type { LlmhubPayType, SignedFields } from './client';
import { CUSTOMER_CURRENCY } from '@/lib/customer-currency';

type OrderRow = {
  out_trade_no: string;
  user_id: string;
  wallet_amount_cents: number;
  settlement_amount_fen: number;
  payment_type: LlmhubPayType;
  provider_trade_no: string | null;
  status: string;
  quote_metadata: Record<string, unknown> | null;
};

export function parseYuanToFen(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const raw = String(value);
  if (!/^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/.test(raw)) return null;
  const [yuan, fraction = ''] = raw.split('.');
  const amount = Number(yuan) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function formatFenAsYuan(amountFen: number): string {
  if (!Number.isSafeInteger(amountFen) || amountFen <= 0) throw new Error('invalid_cny_amount');
  return `${Math.floor(amountFen / 100)}.${String(amountFen % 100).padStart(2, '0')}`;
}

export async function createPendingLlmhubPayOrder(input: {
  outTradeNo: string;
  userId: string;
  walletAmountCents: number;
  settlementAmountFen: number;
  paymentType: LlmhubPayType;
  checkoutAttemptId: number;
  quoteMetadata: Record<string, unknown>;
}): Promise<void> {
  await query(
    `INSERT INTO llmhub_pay_topup_orders
      (out_trade_no, user_id, wallet_amount_cents, settlement_amount_fen, payment_type, checkout_attempt_id, quote_metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [input.outTradeNo, input.userId, input.walletAmountCents, input.settlementAmountFen,
      input.paymentType, input.checkoutAttemptId, JSON.stringify(input.quoteMetadata)]
  );
}

export async function markLlmhubPayOrderCreated(outTradeNo: string, providerTradeNo: string): Promise<void> {
  const rows = await query<{ out_trade_no: string }>(
    `UPDATE llmhub_pay_topup_orders SET provider_trade_no = $2, updated_at = now()
      WHERE out_trade_no = $1 AND (provider_trade_no IS NULL OR provider_trade_no = $2)
      RETURNING out_trade_no`,
    [outTradeNo, providerTradeNo]
  );
  if (rows.length !== 1) throw new Error('llmhub_provider_order_mismatch');
}

export async function markLlmhubPayOrderFailed(outTradeNo: string): Promise<void> {
  await query(`UPDATE llmhub_pay_topup_orders SET status = 'failed', updated_at = now()
    WHERE out_trade_no = $1 AND status = 'pending'`, [outTradeNo]);
}

export async function settleLlmhubPayOrderInTransaction(executor: QueryExecutor, fields: SignedFields, pid: string) {
  const outTradeNo = typeof fields.out_trade_no === 'string' ? fields.out_trade_no : '';
  const providerTradeNo = typeof fields.trade_no === 'string' ? fields.trade_no : String(fields.trade_no ?? '');
  const paymentType = fields.type;
  const paidAmountFen = parseYuanToFen(fields.money);
  if (!outTradeNo || !providerTradeNo || String(fields.pid) !== pid || !paidAmountFen ||
      (paymentType !== 'alipay' && paymentType !== 'wxpay')) throw new Error('llmhub_invalid_payment_identity');

  const rows = await executor.query<OrderRow>(
    `SELECT * FROM llmhub_pay_topup_orders WHERE out_trade_no = $1 FOR UPDATE`, [outTradeNo]);
  const order = rows[0];
  if (!order) throw new Error('llmhub_unknown_order');
  if (Number(order.settlement_amount_fen) !== paidAmountFen || order.payment_type !== paymentType ||
      (order.provider_trade_no && order.provider_trade_no !== providerTradeNo)) throw new Error('llmhub_order_mismatch');
  if (order.status === 'paid') return { kind: 'duplicate' as const, order };
  if (order.status !== 'pending') throw new Error('llmhub_order_not_pending');

  const metadata = {
    ...(order.quote_metadata ?? {}),
    payment_provider: 'llmhub_pay',
    llmhub_pay_trade_no: providerTradeNo,
    llmhub_pay_out_trade_no: outTradeNo,
    payment_type: paymentType,
    wallet_amount_cents: order.wallet_amount_cents,
    settlement_amount_fen: paidAmountFen,
    settlement_currency: 'CNY',
    wallet_currency: CUSTOMER_CURRENCY,
  };
  const receipts = await executor.query<{ id: string; created_at: Date }>(
    `INSERT INTO app_receipts
        (user_id, type, amount_cents, currency, description, metadata,
         original_amount_cents, original_currency, fx_rate, llmhub_pay_out_trade_no)
       VALUES ($1, 'topup', $2, $3, 'Wallet top-up', $4::jsonb, $5, 'CNY', $6, $7)
       ON CONFLICT DO NOTHING RETURNING id::text AS id, created_at`,
    [order.user_id, order.wallet_amount_cents, CUSTOMER_CURRENCY, JSON.stringify(metadata), paidAmountFen,
      order.quote_metadata?.rateWithMargin ?? null, outTradeNo]
  );
  if (receipts.length !== 1) throw new Error('llmhub_receipt_conflict');
  await executor.query(
    `UPDATE llmhub_pay_topup_orders
          SET status = 'paid', provider_trade_no = $2, updated_at = now()
        WHERE out_trade_no = $1`,
    [outTradeNo, providerTradeNo]
  );
  return { kind: 'paid' as const, order, receipt: receipts[0] };
}

export async function confirmLlmhubPayOrder(fields: SignedFields, pid: string): Promise<'paid' | 'duplicate'> {
  const result = await withDbTransaction((executor) => settleLlmhubPayOrderInTransaction(executor, fields, pid));

  if (result.kind === 'paid') {
    try {
      await recordConfirmedMcpWalletFunding({
        receiptId: result.receipt.id,
        userId: result.order.user_id,
        amountCents: result.order.wallet_amount_cents,
        currency: CUSTOMER_CURRENCY,
        occurredAt: result.receipt.created_at,
      }, { executor: { query }, conversionWindowSeconds: resolveMcpTrialToWalletWindowSeconds() });
    } catch (error) {
      console.warn('[llmhub-pay] funding attribution failed', error);
    }
  }
  return result.kind;
}
