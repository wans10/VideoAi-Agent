import { PRODUCT_BRAND_NAME } from '@/lib/product-brand';

const LEGACY_BRAND_PATTERN = /\b(?:Max)?VideoAI\b/g;

/**
 * Upstream model copy and its Chinese overlays still name the intermediate
 * "VideoAI" brand. Keyvo pages must only ever show the Keyvo name, including in
 * the title, description and share cards that search engines and WeChat read.
 */
export function normalizeLegacyBrandText(value: string): string {
  return value.replace(LEGACY_BRAND_PATTERN, PRODUCT_BRAND_NAME);
}

/** Deep-maps every string of a JSON-like value; objects and arrays are copied, never mutated. */
export function normalizeLegacyBrandDeep<T>(value: T): T {
  if (typeof value === 'string') return normalizeLegacyBrandText(value) as unknown as T;
  if (Array.isArray(value)) return value.map((entry) => normalizeLegacyBrandDeep(entry)) as unknown as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, normalizeLegacyBrandDeep(entry)]),
    ) as T;
  }
  return value;
}
