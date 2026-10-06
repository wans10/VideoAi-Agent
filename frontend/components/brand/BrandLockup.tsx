import clsx from 'clsx';

/** The frame and mark form Keyvo's shared brand across public and product surfaces. */
export function BrandLockup({ compact = false, caption, className }: {
  compact?: boolean;
  caption?: string;
  className?: string;
}) {
  return (
    <span className={clsx('videoai-brand', compact && 'videoai-brand-compact', className)}>
      <svg className="videoai-brand-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill="currentColor" />
        <path d="M13 11v18M13 20l10-9M13 20l10 9" stroke="var(--brand-mark-ink, #fffaf5)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="12" r="2" fill="var(--brand-mark-ink, #fffaf5)" />
      </svg>
      {!compact ? <span className="videoai-brand-copy"><strong>Key<span>vo</span></strong>{caption ? <small>{caption}</small> : null}</span> : null}
    </span>
  );
}
