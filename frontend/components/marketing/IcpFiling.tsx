import {
  ICP_FILING_NUMBER,
  ICP_FILING_URL,
  PUBLIC_SECURITY_FILING_NUMBER,
  PUBLIC_SECURITY_FILING_URL,
} from '@/lib/product-brand';

/** MIIT (ICP) number followed by the Public Security Bureau filing, both linking to their official lookup pages. */
export function IcpFiling({ className }: { className?: string }) {
  return (
    <>
      <a href={ICP_FILING_URL} target="_blank" rel="noopener noreferrer" className={className} data-icp-filing>
        {ICP_FILING_NUMBER}
      </a>{' '}
      <a href={PUBLIC_SECURITY_FILING_URL} target="_blank" rel="noreferrer" className={className} data-public-security-filing>
        {PUBLIC_SECURITY_FILING_NUMBER}
      </a>
    </>
  );
}
