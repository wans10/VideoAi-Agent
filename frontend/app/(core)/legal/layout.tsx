import Link from 'next/link';
import { resolveLocale } from '@/lib/i18n/server';
import type { AppLocale } from '@/i18n/locales';
import { localizePathFromEnglish } from '@/lib/i18n/paths';
import { BrandLockup } from '@/components/brand/BrandLockup';
import { IcpFiling } from '@/components/marketing/IcpFiling';

const LAYOUT_COPY: Record<AppLocale, { title: string; back: string }> = {
  en: { title: 'Legal', back: 'Back to homepage' },
  fr: { title: 'Mentions légales', back: "Retour à l'accueil" },
  es: { title: 'Centro legal', back: 'Volver al inicio' },
  zh: { title: '法律条款', back: '返回首页' },
};

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const locale = await resolveLocale();
  const copy = LAYOUT_COPY[locale] ?? LAYOUT_COPY.en;
  const homeHref = localizePathFromEnglish(locale, '/');

  return (
    <main className="videoai-document bg-bg py-10 sm:py-16">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 sm:px-8">
        <header className="flex items-baseline justify-between gap-4">
          <BrandLockup caption={copy.title} />
          <Link
            href={homeHref}
            className="text-sm font-medium text-brand transition hover:text-brandHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            {copy.back}
          </Link>
        </header>
        <section className="stack-gap-xl rounded-card border border-border bg-surface p-6 shadow-card sm:p-10">
          {children}
        </section>
        <p className="text-center text-xs text-text-muted"><IcpFiling /></p>
      </div>
    </main>
  );
}
