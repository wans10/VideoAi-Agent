'use client';

import { useEffect } from 'react';
import { RecoverySurface } from '@/components/brand/RecoverySurface';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global route error boundary caught an error:', error);
  }, [error]);

  return (
    <html lang="zh">
      <body style={{ margin: 0, background: '#f7f5f0' }}><RecoverySurface reset={reset} /></body>
    </html>
  );
}
