'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { HomeComparisonModel } from './home-comparison-types';
import { PairedScores, type PairedMetric } from '@/components/marketing/PairedScores';

/** The comparison pages and homepage share the same score scale and details. */
export function HomeComparisonScores({ metrics, label, right, overallLabel, leftOverall }: { metrics: PairedMetric[]; label: string; right?: HomeComparisonModel; overallLabel?: string; leftOverall?: number | null }) {
  const root = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(1);
  useEffect(() => {
    const node = root.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!node || motion.matches) return;
    let frame = 0;
    let started = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started) return;
      started = true;
      observer.disconnect();
      const start = performance.now();
      setProgress(0);
      const tick = (now: number) => {
        const fraction = Math.min(1, (now - start) / 1100);
        setProgress(1 - Math.pow(1 - fraction, 3));
        if (fraction < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.35 });
    observer.observe(node);
    const finish = () => {
      if (!motion.matches) return;
      observer.disconnect();
      cancelAnimationFrame(frame);
      setProgress(1);
    };
    motion.addEventListener('change', finish);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); motion.removeEventListener('change', finish); };
  }, [right?.slug]);

  return <div ref={root} className="studio-score-sheet">
    <div className="studio-contenders">
      <div className="studio-contender">
        <div className="studio-contender-name"><Image src="/brand/partners/kling/kling-mark-light.png" alt="" aria-hidden="true" width={36} height={36}/><strong><span className="score-left" aria-hidden>● </span>Kling 3 Pro</strong></div>
        {overallLabel ? <div className="studio-contender-rating"><span>{overallLabel}</span><strong>{leftOverall?.toFixed(1) ?? '—'}<small>/10</small></strong></div> : null}
      </div>
      <div className="studio-contender studio-contender-selected">
        <div className="studio-contender-name"><Image src={right?.logo ?? '/brand/partners/bytedance/bytedance-mark-dark.svg'} alt="" aria-hidden="true" width={36} height={36}/><strong><span className="score-right" aria-hidden>◆ </span>{right?.name ?? 'Seedance 2.5'}</strong></div>
        {overallLabel ? <div className="studio-contender-rating"><span>{overallLabel}</span><strong>{right?.overall == null ? '—' : right.overall.toFixed(1)}<small>/10</small></strong></div> : null}
      </div>
    </div>
    <p className="comparison-scale">{label}</p>
    <PairedScores metrics={metrics} className="home-paired-scores" motionProgress={{ left: right ? 1 : progress, right: progress }}/>

  </div>;
}
