import type { AppLocale } from '@/i18n/locales';
import { en } from './en';
import { fr } from './fr';
import { es } from './es';
import type { OpenArtCopy } from './types';

// zh is not served: the OpenArt comparison is hidden for Keyvo (see the page guard); English only satisfies the type.
const copyByLocale: Record<Exclude<AppLocale, 'zh'>, OpenArtCopy> = { en, fr, es };

export function getOpenArtCopy(locale: AppLocale): OpenArtCopy {
  return copyByLocale[locale === 'zh' ? 'en' : locale];
}
