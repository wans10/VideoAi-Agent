import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_ORIGIN } from '@/lib/siteOrigin';

const DESCRIPTION =
  'Create your VideoAI workspace account to generate videos with Sora, Veo, Pika, Kling and more. Sign in, manage credits, and keep every render in one hub.';

export const metadata: Metadata = {
  title: {
    absolute: 'VideoAI — Log in',
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
    title: 'VideoAI — Log in',
    description: DESCRIPTION,
    url: `${SITE_ORIGIN}/login`,
  },
  twitter: {
    title: 'VideoAI — Log in',
    description: DESCRIPTION,
  },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
