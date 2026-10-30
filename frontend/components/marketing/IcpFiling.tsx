import { ICP_FILING_NUMBER, ICP_FILING_URL } from '@/lib/product-brand';

export function IcpFiling({ className }: { className?: string }) {
  return (
    <a href={ICP_FILING_URL} target="_blank" rel="noopener noreferrer" className={className} data-icp-filing>
      {ICP_FILING_NUMBER}
    </a>
  );
}
