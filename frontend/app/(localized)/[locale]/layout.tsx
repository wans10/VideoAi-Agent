import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { locales, publishedLocales, type AppLocale } from '@/i18n/locales';
import { LocaleRuntime } from '@/app/_components/LocaleRuntime';
import { MARKETING_CLIENT_MESSAGE_NAMESPACES } from '@/lib/i18n/client-message-namespaces';
import { SITE_ORIGIN } from '@/lib/siteOrigin';
type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return publishedLocales.map((locale) => ({ locale }));
}

const NORMALIZED_SITE_URL = SITE_ORIGIN;

export const metadata: Metadata = {
  metadataBase: new URL(`${NORMALIZED_SITE_URL}/`),
  title: {
    default: 'VideoAI — 影像制作工作室',
    template: '%s — VideoAI',
  },
  description: '在 VideoAI 影像工作室创作视频、图片和声音。比较模型，生成前确认价格，按需付费。',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: ['/favicon.ico'],
    other: [{ rel: 'mask-icon', url: '/favicon.svg', color: '#b83c2b' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#b83c2b',
};

export default async function LocaleLayout(props: LocaleLayoutProps) {
  const params = await props.params;

  const { children } = props;

  const locale = params.locale as AppLocale;
  if (!locales.includes(locale)) {
    notFound();
  }

  return (
    <LocaleRuntime locale={locale} clientMessageNamespaces={MARKETING_CLIENT_MESSAGE_NAMESPACES}>
      {children}
    </LocaleRuntime>
  );
}
