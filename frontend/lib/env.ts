const RESULT_PROVIDER = (process.env.NEXT_PUBLIC_RESULT_PROVIDER ?? '').trim();
const FAL_API_KEY =
  typeof window === 'undefined'
    ? (process.env.FAL_API_KEY ?? process.env.FAL_KEY ?? '').trim()
    : '';
const WORKSPACE_CENTER_GALLERY = (process.env.NEXT_PUBLIC_WORKSPACE_CENTER_GALLERY ?? '').trim().toLowerCase();

export const ENV = {
  RESULT_PROVIDER: RESULT_PROVIDER || null,
  FAL_API_KEY: FAL_API_KEY || null,
  FAL_KEY: FAL_API_KEY || null,
  WORKSPACE_CENTER_GALLERY,
} as const;

export type EnvShape = typeof ENV;

/**
 * Keyvo admin-tier override. KEYVO_ADMIN_TIER_OPEN=true (or 1) treats every admin-tier engine as public on every
 * surface. It is read on each call, never cached, and only on the server: browser bundles never see a non-public
 * variable, so they report false. Static pages and sitemaps keep the value they were built with (rebuild needed).
 */
export function isKeyvoAdminTierOpen(): boolean {
  if (typeof process === 'undefined' || typeof window !== 'undefined') return false;
  const raw = (process.env.KEYVO_ADMIN_TIER_OPEN ?? '').trim().toLowerCase();
  return raw === 'true' || raw === '1';
}
