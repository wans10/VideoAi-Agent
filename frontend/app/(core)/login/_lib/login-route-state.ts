import { isMcpConsentTarget } from '@/lib/mcp-oauth-continuation';
import { LOCALE_OPTIONS, type AuthMode, type Locale } from './login-copy';
import { defaultExperienceLocale, resolveSiteLocale } from '@/i18n/locales';

export type LoginQueryValue = string | string[] | undefined;

/** `fallback` is the tab used when neither `mode` nor an MCP consent target picks one (phone login: 登录). */
export function resolveInitialAuthMode(
  value: LoginQueryValue,
  next: LoginQueryValue = undefined,
  fallback: AuthMode = 'signup'
): AuthMode {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === 'signin' || candidate === 'reset' || candidate === 'signup'
    ? candidate
    : isMcpConsentTarget(Array.isArray(next) ? next[0] : next) ? 'signin' : fallback;
}

export function resolveInitialAuthLocale(
  ...candidates: Array<string | null | undefined>
): Locale {
  for (const candidate of candidates) {
    const normalized = candidate?.trim().slice(0, 2).toLowerCase();
    if (normalized && LOCALE_OPTIONS.includes(normalized as Locale)) {
      return resolveSiteLocale(normalized);
    }
  }
  return defaultExperienceLocale;
}
