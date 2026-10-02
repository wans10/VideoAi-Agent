import siteExperience from '@/config/site-experience.json';

export const locales = ['en', 'fr', 'es', 'zh'] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = 'en';
// Keep the authored English route namespace for compatibility and slug mapping.
// Deployment publication and redirect policy below decide which languages are served.
export const defaultExperienceLocale: AppLocale = 'zh';

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

export function normalizeAppLocale(value: unknown): AppLocale {
  return isAppLocale(value) ? value : defaultLocale;
}

export const localeLabels: Record<AppLocale, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  zh: '简体中文',
};

export const localeRegions: Record<AppLocale, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-419',
  zh: 'zh-CN',
};

export const localePathnames: Record<AppLocale, string> = {
  en: '',
  fr: 'fr',
  es: 'es',
  zh: 'zh',
};

// Authored translations remain available for a future rollout. Only these
// locales are served and advertised by this deployment.
export const publishedLocales: AppLocale[] = locales.filter(locale => siteExperience.publishedLocales.includes(locale));
export const siteDefaultLocale: AppLocale = isAppLocale(siteExperience.defaultLocale) ? siteExperience.defaultLocale : 'zh';
export function resolveSiteLocale(value: unknown): AppLocale {
  return isAppLocale(value) && publishedLocales.includes(value) ? value : siteDefaultLocale;
}
