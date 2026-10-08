import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, locales, resolveSiteLocale, type AppLocale } from '@/i18n/locales';
import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';
import frMessages from '@/messages/fr.json';
import zhMessages from '@/messages/zh.json';

const LOCALE_MESSAGES = {
  en: enMessages,
  fr: frMessages,
  es: esMessages,
  zh: zhMessages,
} satisfies Record<AppLocale, Record<string, unknown>>;

function isAppLocale(candidate: string | undefined | null): candidate is AppLocale {
  if (!candidate) {
    return false;
  }
  return (locales as readonly string[]).includes(candidate);
}

function loadMessages(locale: AppLocale) {
  return LOCALE_MESSAGES[locale];
}

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const segmentLocale = await requestLocale;

  const resolvedLocale = resolveSiteLocale(
    (isAppLocale(locale) && locale) ||
    (isAppLocale(segmentLocale) && segmentLocale) ||
    defaultLocale);

  return {
    locale: resolvedLocale,
    messages: loadMessages(resolvedLocale),
  };
});
