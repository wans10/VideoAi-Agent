import { TOPUP_TIERS } from '@/config/topupTiers';
import { CUSTOMER_CURRENCY } from '@/lib/customer-currency';

const MIN_TOPUP_CENTS = TOPUP_TIERS[0].amountCents;

export function getSufficientTopUpAmountCents(shortfallCents: number | undefined): number {
  if (typeof shortfallCents !== 'number' || !Number.isFinite(shortfallCents)) {
    return MIN_TOPUP_CENTS;
  }
  const normalizedShortfall = Math.max(0, Math.ceil(shortfallCents));
  return Math.max(MIN_TOPUP_CENTS, Math.ceil(normalizedShortfall / 100) * 100);
}

export function buildWorkspaceTopupAnalyticsPayload(amountCents: number): Record<string, unknown> {
  const normalizedAmount = Number.isFinite(amountCents)
    ? Math.max(MIN_TOPUP_CENTS, Math.round(amountCents))
    : MIN_TOPUP_CENTS;
  return {
    source: 'workspace',
    route_family: 'workspace',
    payment_provider: 'stripe',
    payment_flow: 'checkout',
    charge_currency: CUSTOMER_CURRENCY,
    ...(CUSTOMER_CURRENCY === 'USD' ? { wallet_amount_usd: normalizedAmount / 100 } : {}),
    wallet_amount_cents: normalizedAmount,
    credits_amount: normalizedAmount / 100,
    ...(CUSTOMER_CURRENCY === 'USD' ? { topup_amount_usd: normalizedAmount / 100 } : {}),
    topup_amount_cents: normalizedAmount,
  };
}
