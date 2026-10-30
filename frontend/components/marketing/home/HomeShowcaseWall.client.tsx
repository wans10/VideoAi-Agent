'use client';

import { useCallback, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useGalleryPreviewBudget } from '@/components/examples/useGalleryPreviewBudget';
import type { HomeShowcaseCard as HomeShowcaseCardData } from '@/app/(localized)/[locale]/(marketing)/(home)/_lib/home-route-data/showcase';
import { HomeShowcaseCard } from './HomeShowcaseCard.client';
import type { HomeShowcaseCopy } from './home-showcase-copy';
import styles from './home-showcase.module.css';

const BATCH_SIZE = 24;

export function HomeShowcaseWall({ initialCards, hasMore: initialHasMore, copy, assistant = null }: {
  initialCards: HomeShowcaseCardData[];
  hasMore: boolean;
  copy: HomeShowcaseCopy;
  /** Present only while the shared MCP gate is enabled. */
  assistant?: { href: string; label: string } | null;
}) {
  const [batches, setBatches] = useState<HomeShowcaseCardData[][]>([initialCards]);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const count = batches.reduce((total, batch) => total + batch.length, 0);
  const ids = batches.flatMap((batch) => batch.map((card) => card.id));
  const { active, onVisibility, setIntent } = useGalleryPreviewBudget(ids);

  const loadMore = useCallback(async () => {
    if (status === 'loading') return;
    setStatus('loading');
    try {
      const response = await fetch(`/api/home-showcase?offset=${count}&limit=${BATCH_SIZE}`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(String(response.status));
      const payload = (await response.json()) as { cards?: HomeShowcaseCardData[]; hasMore?: boolean };
      const known = new Set(ids);
      const fresh = (payload.cards ?? []).filter((card) => !known.has(card.id));
      if (fresh.length) setBatches((current) => [...current, fresh]);
      setHasMore(Boolean(payload.hasMore) && fresh.length > 0);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }, [count, ids, status]);

  return (
    <section className={styles.wall} aria-labelledby="home-wall-title" data-home-showcase>
      <div className={styles.wallInner}>
        <header className={styles.wallHead}>
          <div>
            <h2 id="home-wall-title" className={styles.wallTitle}>{copy.wallTitle}</h2>
            <p className={styles.wallSubtitle}>{copy.wallSubtitle}</p>
          </div>
          <div className={styles.wallLinks}>
            <Link href={{ pathname: '/examples' }} prefetch={false} className={styles.wallAll}>{copy.wallAll} →</Link>
            {assistant ? <a href={assistant.href} className={styles.wallAll}>{assistant.label} →</a> : null}
          </div>
        </header>
        {batches.map((batch, index) => (
          <div key={batch[0]?.id ?? index} className={styles.batch}>
            {batch.map((card) => (
              <div key={card.id} className={styles.item}>
                <HomeShowcaseCard card={card} copy={copy} requested={active.has(card.id)} onVisibility={onVisibility} onIntent={setIntent} />
              </div>
            ))}
          </div>
        ))}
        {hasMore ? (
          <div className={styles.more}>
            <button type="button" className={styles.moreButton} onClick={loadMore} disabled={status === 'loading'}>
              {status === 'loading' ? copy.loading : status === 'error' ? copy.loadError : copy.loadMore}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
