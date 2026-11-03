import { isKeyvoToolDisabled } from '@/config/keyvo-disabled-features';
import { notFound } from 'next/navigation';
import UpscaleWorkspace from '@/components/tools/UpscaleWorkspace';

export default function UpscaleToolPage() {
  if (isKeyvoToolDisabled('upscale')) notFound();
  return <UpscaleWorkspace />;
}
