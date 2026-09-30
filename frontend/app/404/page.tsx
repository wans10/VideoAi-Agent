import { NotFoundContent } from '@/components/NotFoundContent';

export const metadata = {
  title: 'Page not found – VideoAI',
  robots: { index: false, follow: true },
};

export default function Marketing404Page() {
  return <NotFoundContent />;
}
