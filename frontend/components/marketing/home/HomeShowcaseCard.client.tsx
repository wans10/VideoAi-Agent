'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useExampleCardPlayback } from '@/components/examples/useExampleCardPlayback';
import type { HomeShowcaseCard as HomeShowcaseCardData } from '@/app/(localized)/[locale]/(marketing)/(home)/_lib/home-route-data/showcase';
import type { HomeShowcaseCopy } from './home-showcase-copy';
import styles from './home-showcase.module.css';

const POSTER_SIZES = '(max-width: 767px) 50vw, (max-width: 1099px) 33vw, (max-width: 1499px) 25vw, 20vw';

export function HomeShowcaseCard({ card, copy, requested, onVisibility, onIntent }: {
  card: HomeShowcaseCardData;
  copy: HomeShowcaseCopy;
  requested: boolean;
  onVisibility: (id: string, visible: boolean) => void;
  onIntent: (id: string | null) => void;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  // Only the short preview ever plays here; the full-length video is for the watch page.
  const { videoRef, playbackAttempt, events, videoReady } = useExampleCardPlayback(card.previewVideoUrl, requested, false);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => onVisibility(card.id, entry.isIntersecting), { threshold: 0.4 });
    observer.observe(node);
    return () => {
      observer.disconnect();
      onVisibility(card.id, false);
    };
  }, [card.id, onVisibility]);

  return (
    <div
      ref={cardRef}
      className={styles.card}
      style={{ ['--ratio' as string]: card.ratio }}
      onMouseEnter={() => onIntent(card.id)}
      onMouseLeave={() => onIntent(null)}
      onFocus={() => onIntent(card.id)}
      onBlur={() => onIntent(null)}
    >
      <Image src={card.posterUrl} alt={card.promptExcerpt ? `${card.engineLabel}: ${card.promptExcerpt}` : card.engineLabel} fill className={styles.poster} sizes={POSTER_SIZES} quality={52} loading="lazy" />
      {playbackAttempt ? (
        <video
          key={playbackAttempt.id}
          ref={videoRef}
          src={playbackAttempt.rendition.src}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          data-examples-card
          {...events}
          className={`${styles.video} ${videoReady ? styles.playing : styles.waiting}`}
        />
      ) : null}
      <Link
        href={card.href}
        prefetch={false}
        className={styles.watch}
        aria-label={`${copy.openAria}: ${card.engineLabel}`}
        data-analytics-event="cta_click"
        data-analytics-cta-name="view_example_details"
        data-analytics-cta-location="home_showcase"
      >
        <span className={styles.caption}>
          <span className={styles.captionLabel}>{card.engineLabel}</span>
          <span className={styles.captionMeta}>{card.durationSec} {copy.seconds}</span>
          {card.promptExcerpt ? <span className={styles.excerpt}>{card.promptExcerpt}</span> : null}
        </span>
      </Link>
      <Link
        href={card.makeHref}
        prefetch={false}
        className={styles.remix}
        aria-label={copy.remixAria}
        data-analytics-event="cta_click"
        data-analytics-cta-name="showcase_remix"
        data-analytics-cta-location="home_showcase"
      >
        {copy.remix}
      </Link>
    </div>
  );
}
