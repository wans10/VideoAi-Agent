import { publishedLocales, type AppLocale } from '@/i18n/locales';

export type SitemapEntry = {
  url: string;
  lastModified?: string;
  englishPath: string;
  locales?: AppLocale[];
  disableAlternates?: boolean;
};

export type CanonicalPathEntry = {
  englishPath: string;
  lastModified?: string;
  locales?: AppLocale[];
  disableAlternates?: boolean;
};

export type RouteTemplate = {
  template: string;
  isDynamic: boolean;
  sourceFile?: string;
};

export type DynamicRouteGenerator = () => Promise<CanonicalPathEntry[]>;

export const LOCALE_SITEMAP_PATHS: Record<AppLocale, string> = {
  en: '/sitemap-en.xml',
  fr: '/sitemap-fr.xml',
  es: '/sitemap-es.xml',
  zh: '/sitemap-zh.xml',
};

export const LOCALES: AppLocale[] = publishedLocales;

export const BASE_EXTRA_CANONICAL_PATHS: CanonicalPathEntry[] = [
  { englishPath: '/legal/cookies-list', locales: ['en', 'fr', 'es', 'zh'] },
  { englishPath: '/legal/mentions', locales: ['en', 'fr', 'es', 'zh'] },
  { englishPath: '/legal/subprocessors', locales: ['en', 'fr', 'es', 'zh'] },
];
