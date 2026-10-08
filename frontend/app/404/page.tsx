import { NotFoundContent } from '@/components/NotFoundContent';

export const metadata = {
  title: 'Page not found – Keyvo',
  robots: { index: false, follow: true },
};

export default function Marketing404Page() {
  return <NotFoundContent />;
}
