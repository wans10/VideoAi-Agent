import type { AppLocale } from '@/i18n/locales';
import { en } from './en';
import { fr } from './fr';
import { es } from './es';
// zh is not served: the comparison page and its export route are hidden for Keyvo (see the page guard),
// so the English copy only satisfies the type for that locale.
export function getComparisonCopy(locale: AppLocale) { return locale === 'fr' ? fr : locale === 'es' ? es : en; }
