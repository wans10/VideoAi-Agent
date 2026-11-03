import { isKeyvoToolDisabled } from '@/config/keyvo-disabled-features';
import { notFound } from 'next/navigation';
import BackgroundRemovalWorkspace from '@/components/tools/BackgroundRemovalWorkspace';

export default function BackgroundRemovalToolPage() {
  if (isKeyvoToolDisabled('background-removal')) notFound();
  return <BackgroundRemovalWorkspace />;
}
