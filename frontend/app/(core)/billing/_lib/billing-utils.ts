export function formatReceiptSurfaceLabel(surface?: string | null): string | null {
  switch ((surface ?? '').toLowerCase()) {
    case 'video':
      return '视频';
    case 'image':
      return '图片';
    case 'character':
      return '角色';
    case 'angle':
      return '视角';
    case 'upscale':
      return '放大';
    case 'audio':
      return '音频';
    default:
      return null;
  }
}

export function parseAmountToCents(value: string): number | null {
  if (!value) return null;
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return null;
  const decimalMatch = /^\+?(\d*)(?:\.(\d*))?$/.exec(normalized);
  if (!decimalMatch || (!decimalMatch[1] && !decimalMatch[2])) return null;

  const wholeDollars = BigInt(decimalMatch[1] || '0');
  const fractionalDigits = decimalMatch[2] ?? '';
  const centDigits = fractionalDigits.padEnd(2, '0').slice(0, 2);
  let amountCents = wholeDollars * BigInt(100) + BigInt(centDigits);
  if ((fractionalDigits[2] ?? '0') >= '5') {
    amountCents += BigInt(1);
  }
  if (amountCents <= BigInt(0) || amountCents > BigInt(Number.MAX_SAFE_INTEGER)) {
    return null;
  }
  return Number(amountCents);
}

/** Product names that the ledger stores in English. Model and brand names (MiniMax H3, Seedance...) stay as they are. */
const RECEIPT_PRODUCT_LABELS_ZH: Record<string, string> = {
  'Voice Over': '配音',
  'Voice Over Only': '配音',
};

function localizeReceiptProduct(name: string): string {
  return RECEIPT_PRODUCT_LABELS_ZH[name.trim()] ?? name;
}

/**
 * Display-only Simplified Chinese projection of stored wallet ledger descriptions
 * ("Run MiniMax H3 - 4s", "Voice Over"). The stored description is never rewritten; unknown text is returned unchanged.
 */
export function localizeReceiptDescriptionZh(description: string | null | undefined): string | null | undefined {
  if (!description) return description;
  const run = description.match(/^Run (.+?) - (\d+)s$/);
  if (run) return `生成 ${localizeReceiptProduct(run[1])} · ${run[2]} 秒`;
  const partial = description.match(/^Partial refund (.+?) - (\d+) images? not generated$/);
  if (partial) return `部分退款 ${localizeReceiptProduct(partial[1])} · ${partial[2]} 张图片未生成`;
  const refund = description.match(/^Refund (.+)$/);
  if (refund) return `退款 ${localizeReceiptProduct(refund[1])}`;
  return RECEIPT_PRODUCT_LABELS_ZH[description.trim()] ?? description;
}
