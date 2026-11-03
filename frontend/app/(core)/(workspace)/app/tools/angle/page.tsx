import { isKeyvoToolDisabled } from '@/config/keyvo-disabled-features';
import { notFound } from 'next/navigation';
import AngleWorkspace from '@/components/tools/AngleWorkspace';

export default function AppAngleToolPage() {
  if (isKeyvoToolDisabled('angle')) notFound();
  return <AngleWorkspace />;
}
