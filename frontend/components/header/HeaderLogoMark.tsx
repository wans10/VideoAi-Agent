'use client';

import { BrandLockup } from '@/components/brand/BrandLockup';
import Link from 'next/link';

export function HeaderLogoMark() {
  return (
    <Link href="/" prefetch={false} className="flex items-center gap-2">
      <BrandLockup />
    </Link>
  );
}
