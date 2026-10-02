import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_ORIGIN } from '@/lib/siteOrigin';

const DESCRIPTION =
  '登录 VideoAI 影像工作室，创作视频、图片与声音，管理账户余额和生成作品。';

export const metadata: Metadata = {
  title: {
    absolute: 'VideoAI — 登录',
  },
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_ORIGIN}/login`,
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'VideoAI — 登录',
    description: DESCRIPTION,
    url: `${SITE_ORIGIN}/login`,
  },
  twitter: {
    title: 'VideoAI — 登录',
    description: DESCRIPTION,
  },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
