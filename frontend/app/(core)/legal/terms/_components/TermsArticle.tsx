import type { AppLocale } from '@/i18n/locales';
import { TermsArticleEn } from './TermsArticleEn';
import { TermsArticleEs } from './TermsArticleEs';
import { TermsArticleFr } from './TermsArticleFr';
import { TermsArticleZh } from './TermsArticleZh';

type TermsBodyProps = {
  locale: AppLocale;
  version: string;
  effective: string | null;
  subprocessorsHref: string;
};

export function TermsArticle({ locale, version, effective, subprocessorsHref }: TermsBodyProps) {
  switch (locale) {
    case 'zh':
      return <TermsArticleZh version={version} effective={effective} subprocessorsHref={subprocessorsHref} />;
    case 'fr':
      return <TermsArticleFr version={version} effective={effective} subprocessorsHref={subprocessorsHref} />;
    case 'es':
      return <TermsArticleEs version={version} effective={effective} subprocessorsHref={subprocessorsHref} />;
    default:
      return <TermsArticleEn version={version} effective={effective} subprocessorsHref={subprocessorsHref} />;
  }
}
