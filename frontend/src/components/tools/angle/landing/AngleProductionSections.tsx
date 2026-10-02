import Image from 'next/image';
import { ArrowDown, ArrowUpRight, Check, ChevronDown } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/locales';
import { AngleOrbitStudio } from './AngleOrbitStudio.client';
import { ANGLE_ORBIT_ASSETS, type AngleLandingContent } from './angle-landing-assets';
import { ANGLE_PRODUCTION_COPY } from './angle-production-copy';
import palette from './AngleLanding.module.css';
import styles from './AngleProduction.module.css';

export function AngleProductionSections({ content, locale }: { content: AngleLandingContent; locale: AppLocale }) {
  const copy = ANGLE_PRODUCTION_COPY[locale];
  const frames = [ANGLE_ORBIT_ASSETS.hero.front, ANGLE_ORBIT_ASSETS.hero.threeQuarter, ANGLE_ORBIT_ASSETS.hero.profile];
  return <div className={`${palette.page} ${styles.page}`}>
    <section className={styles.opening}>
      <div className={styles.heading}>
        <p className={styles.kicker}>{copy.department}</p>
        <h1>{copy.title}</h1><p className={styles.intro}>{copy.intro}</p>
        <Link href="/app/tools/angle" prefetch={false} className={styles.primary} data-analytics-event="tool_cta_click" data-analytics-tool-name="angle" data-analytics-cta-name="angle_try_tool_hero" data-analytics-cta-location="tool_angle_hero" data-analytics-tool-surface="public">{copy.open}<ArrowUpRight size={18} /></Link>
        <a href="#coverage" className={styles.secondary}>{copy.explore}<ArrowDown size={16} /></a>
      </div>
      <div className={styles.viewer}><AngleOrbitStudio content={content.hero.orbit} /><p>{copy.note}</p></div>
    </section>
    <section id="coverage" className={styles.coverage}>
      <header><p className={styles.kicker}>{copy.scene}</p><h2>{copy.sceneTitle}</h2><p>{copy.sceneBody}</p></header>
      <ol className={styles.shots}>{copy.frames.map(([intent, title, body], index) => <li key={title}>
        <div className={styles.shotTop}><span>0{index + 1}</span><span>{intent}</span></div>
        <div className={styles.still}><Image src={frames[index]} alt={content.hero.orbit.views[index].alt} fill sizes="(max-width: 760px) 100vw, 33vw" loading="lazy" className="object-cover" /></div>
        <h3>{title}</h3><p>{body}</p>
      </li>)}</ol>
    </section>
    <section className={styles.preparation}>
      <header><p className={styles.kicker}>{copy.prep}</p><h2>{copy.prepTitle}</h2></header>
      <ol>{copy.steps.map(([title, body], index) => <li key={title}><span className={styles.step}>{String(index + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{body}</p></div><Check size={20} aria-hidden /></li>)}</ol>
    </section>
    <section className={styles.limits}>
      <div><p className={styles.kicker}>{copy.limits}</p><h2>{copy.limitTitle}</h2><p>{copy.limitBody}</p></div>
      <div>{content.faq.items.map(item => <details key={item.question}><summary>{item.question}<ChevronDown size={16} aria-hidden /></summary><p>{item.answer}</p></details>)}</div>
    </section>
    <section className={styles.next}>
      <p className={styles.kicker}>{copy.next}</p><h2>{copy.nextTitle}</h2>
      <nav aria-label={copy.next}>{copy.nextLinks.map(([label, href], index) => <Link key={href} href={href} prefetch={false}><span>0{index + 1}</span><strong>{label}</strong><ArrowUpRight size={22} /></Link>)}</nav>
    </section>
  </div>;
}
