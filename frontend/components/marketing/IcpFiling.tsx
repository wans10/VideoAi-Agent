import Image from 'next/image';
import {
  ICP_FILING_NUMBER,
  ICP_FILING_URL,
  PUBLIC_SECURITY_FILING_NUMBER,
  PUBLIC_SECURITY_FILING_URL,
} from '@/lib/product-brand';

/**
 * MIIT (ICP) number followed by the Public Security Bureau filing, both linking to their official lookup pages.
 * The Public Security filing shows the official badge before the number at its original 36:40 ratio.
 */
export function IcpFiling({ className }: { className?: string }) {
  return (
    <>
      <a href={ICP_FILING_URL} target="_blank" rel="noopener noreferrer" className={className} data-icp-filing>
        {ICP_FILING_NUMBER}
      </a>{' '}
      <a
        href={PUBLIC_SECURITY_FILING_URL}
        target="_blank"
        rel="noreferrer"
        className={[className, 'inline-flex items-center gap-1 align-middle'].filter(Boolean).join(' ')}
        data-public-security-filing
      >
        <Image src="/assets/branding/beian.png" alt="公安备案图标" width={18} height={20} unoptimized />
        {PUBLIC_SECURITY_FILING_NUMBER}
      </a>
    </>
  );
}
