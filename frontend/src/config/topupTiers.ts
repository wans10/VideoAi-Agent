export type TopupTier = {
  id: string;
  label: string;
  amountCents: number;
};

export const USD_TOPUP_TIERS: TopupTier[] = [
  { id: 'usd_10', label: '$10', amountCents: 1000 },
  { id: 'usd_25', label: '$25', amountCents: 2500 },
  { id: 'usd_50', label: '$50', amountCents: 5000 },
  { id: 'usd_100', label: '$100', amountCents: 10000 },
];

export const CNY_TOPUP_TIERS: TopupTier[] = [
  { id: 'cny_80', label: '¥80', amountCents: 8000 },
  { id: 'cny_200', label: '¥200', amountCents: 20000 },
  { id: 'cny_400', label: '¥400', amountCents: 40000 },
  { id: 'cny_800', label: '¥800', amountCents: 80000 },
];

export const TOPUP_TIERS = CUSTOMER_CURRENCY === 'CNY' ? CNY_TOPUP_TIERS : USD_TOPUP_TIERS;

export function findTopupTier({
  amountCents,
  tierId,
}: {
  amountCents?: number;
  tierId?: string | null;
}): TopupTier | null {
  if (tierId) {
    const byId = TOPUP_TIERS.find((tier) => tier.id === tierId);
    if (byId) return byId;
  }
  if (typeof amountCents === 'number' && Number.isFinite(amountCents)) {
    const byAmount = TOPUP_TIERS.find((tier) => tier.amountCents === amountCents);
    if (byAmount) return byAmount;
  }
  return null;
}
import { CUSTOMER_CURRENCY } from '@/lib/customer-currency';
