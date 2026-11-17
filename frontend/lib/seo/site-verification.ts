import type { Metadata } from 'next';

/**
 * Search-engine site-verification meta tags, read from the environment when the page is rendered.
 * Nothing is emitted for a variable that is unset or empty, so the tags never exist until the owner
 * pastes the token a webmaster console shows. File-based verification (baidu_verify_*.html and similar)
 * needs no code: drop the file into frontend/public and it is served from the site root.
 */
export const SITE_VERIFICATION_ENV_TAGS = [
  { env: 'BAIDU_SITE_VERIFICATION', name: 'baidu-site-verification' },
  { env: 'BING_SITE_VERIFICATION', name: 'msvalidate.01' },
  { env: 'SO360_SITE_VERIFICATION', name: '360-site-verification' },
  { env: 'SOGOU_SITE_VERIFICATION', name: 'sogou_site_verification' },
  { env: 'SHENMA_SITE_VERIFICATION', name: 'shenma-site-verification' },
] as const;

// Console tokens are short opaque strings. Anything else is ignored rather than rendered into <head>.
const TOKEN_PATTERN = /^[A-Za-z0-9_\-=+/.]{4,200}$/;

export function buildSiteVerificationMetadata(
  env: Record<string, string | undefined> = process.env,
): Metadata['verification'] | undefined {
  const other: Record<string, string> = {};
  for (const { env: key, name } of SITE_VERIFICATION_ENV_TAGS) {
    const value = env[key]?.trim();
    if (value && TOKEN_PATTERN.test(value)) other[name] = value;
  }
  return Object.keys(other).length ? { other } : undefined;
}
