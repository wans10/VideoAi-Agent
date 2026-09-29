// The launch contract fixes customer CNY prices at eight times their USD source amounts.
export const CNY_BUILD = process.env.NEXT_PUBLIC_CUSTOMER_CURRENCY === 'CNY';

export function expectedCustomerPrice(usdDisplay: string): string {
  if (!CNY_BUILD) return usdDisplay;
  return `CN¥${(Number(usdDisplay.slice(1)) * 8).toFixed(2)}`;
}

export function expectedOfferPrice(usdAmount: string): string {
  return CNY_BUILD ? (Number(usdAmount) * 8).toFixed(2) : usdAmount;
}
