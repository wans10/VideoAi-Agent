import clsx from 'clsx';

/** The frame and cut form VideoAI's shared mark across public and product surfaces. */
export function BrandLockup({ compact = false, caption, className }: {
  compact?: boolean;
  caption?: string;
  className?: string;
}) {
  return (
    <span className={clsx('videoai-brand', compact && 'videoai-brand-compact', className)}>
      <svg className="videoai-brand-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill="currentColor" />
        <path d="M9 12h6l6 16h-6L9 12Zm16 0h6l-6 16h-6l6-16Z" fill="var(--brand-mark-ink, #fffaf5)" />
        <path d="M28 7h5v5" stroke="var(--brand-mark-ink, #fffaf5)" strokeWidth="1.5" />
      </svg>
      {!compact ? <span className="videoai-brand-copy"><strong>Video<span>AI</span></strong>{caption ? <small>{caption}</small> : null}</span> : null}
    </span>
  );
}
