'use client';

import { useEffect } from 'react';
import { RecoverySurface } from '@/components/brand/RecoverySurface';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App route error boundary caught an error:', error);
  }, [error]);

  return <div style={{ background: '#f7f5f0' }}><RecoverySurface reset={reset} /></div>;
}
