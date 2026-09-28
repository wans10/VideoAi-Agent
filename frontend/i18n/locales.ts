export const locales = ['en', 'fr', 'es', 'zh'] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = 'en';
// English keeps the existing unprefixed public URLs and SEO canonical targets.
// New visitors start in Chinese; core routes and the homepage use this preference.
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
