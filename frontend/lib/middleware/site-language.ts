import { NextResponse, type NextRequest } from 'next/server';
import { publishedLocales, siteDefaultLocale } from '@/i18n/locales';
import { buildMarketingLocaleSwitchHref } from '@/lib/i18n/marketing-locale-switch';
import { shouldHandleLocale, splitLocaleFromPath, setLocaleCookies } from './routing-locale';

/** A reversible deployment policy, before cookie/bot language negotiation. */
export function resolveSiteLanguageRedirect(req: NextRequest): NextResponse | null {
  if (publishedLocales.length !== 1 || !['GET', 'HEAD'].includes(req.method)) return null;
  const { pathname } = req.nextUrl;
  const { pathWithoutLocale } = splitLocaleFromPath(pathname);
  if (/^\/(?:api|auth|oauth|_next|_vercel)(?:\/|$)/.test(pathWithoutLocale) || /\.(?:xml|txt|json|png|jpe?g|webp|svg|ico|js|css|woff2?|map)$/i.test(pathname)) return null;
  const isPublic = shouldHandleLocale(pathWithoutLocale) || /^\/(?:models|modeles|modelos|legal|return-policy)(?:\/|$)/.test(pathWithoutLocale);
  const target = req.nextUrl.clone();
  if (isPublic) {
    const localized = new URL(buildMarketingLocaleSwitchHref({ pathname, targetLocale: siteDefaultLocale }), req.url);
    target.pathname = localized.pathname;
  } else if (/^\/(?:en|fr|es|zh)(?:\/|$)/.test(pathname)) {
    target.pathname = pathWithoutLocale;
  }
  if (target.searchParams.has('lang')) target.searchParams.delete('lang');
  if (target.pathname === pathname && target.search === req.nextUrl.search) return null;
  const response = NextResponse.redirect(target, 307);
  response.headers.set('Cache-Control', 'private, no-store');
  setLocaleCookies(response, siteDefaultLocale);
  return response;
}
