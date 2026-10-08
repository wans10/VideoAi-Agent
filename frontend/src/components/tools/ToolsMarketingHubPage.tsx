import Image from 'next/image';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import type { AppLocale } from '@/i18n/locales';
import { Link } from '@/i18n/navigation';
import { getToolDefinition } from '@/lib/toolbox/catalogue';
import { QUICK_TOOL_ART, WORKSHOP_ART } from './toolbox-art';
import { toolboxCopy } from './toolbox-copy';
import { getToolProductionCopy } from './production/tool-production-copy';
import styles from './production/ProductionDepartments.module.css';

// The route still owns metadata from content; the department view has its own editorial copy.
export function ToolsMarketingHubPage({ locale }: { locale: AppLocale }) {
  const c = getToolProductionCopy(locale);
  const labels = toolboxCopy(locale);
  const departments = [
    { id: 'character-builder', href: '/tools/character-builder', src: WORKSHOP_ART['character-builder'] },
    { id: 'angle', href: '/tools/angle', src: WORKSHOP_ART.angle },
    { id: 'storyboard', href: getToolDefinition('storyboard')!.href, src: WORKSHOP_ART.storyboard },
  ];
  return <div className={styles.page}>
    <header className={styles.opening}><div className={`container-page ${styles.heading}`}>
      <div><p className={styles.kicker}>{c.index}</p><h1>{c.title}</h1></div>
      <div><p>{c.intro}</p><div className={styles.actions}><a href="#departments" className={styles.primary}>{c.jump}<ArrowDown size={17}/></a><Link href="/app/tools" prefetch={false}>{c.open}<ArrowUpRight size={17}/></Link></div></div>
    </div></header>
    <section id="departments" className={styles.stages} aria-label={c.index}><div className="container-page">
      {departments.map((department, index) => { const stage = c.stages[index]; return <article key={department.id} className={styles.stage}>
        <span className={styles.number} aria-hidden="true">0{index + 1}</span>
        <div><h2>{stage.title}</h2><p>{stage.body}</p><dl><dt>{c.output}</dt><dd>{stage.output}</dd></dl><Link href={department.href} prefetch={false} data-analytics-event="tool_cta_click" data-analytics-tool-name={department.id} data-analytics-tool-surface="public" data-analytics-cta-location="production_department">{stage.link}<ArrowUpRight size={18}/></Link></div>
        <div className={styles.figure}><Image unoptimized src={department.src} alt={labels.tools[department.id as keyof typeof labels.tools].title} fill priority={index === 0} sizes="(max-width: 700px) 85vw, 42vw"/></div>
      </article>; })}
    </div></section>
    <section className={styles.finishing}><div className="container-page"><header><h2>{c.finishing}</h2><p>{c.finishingBody}</p></header><div className={styles.repairs}>
      {Object.entries(QUICK_TOOL_ART).map(([id, src]) => { const tool = labels.tools[id as keyof typeof labels.tools]; const href = id.startsWith('upscale') ? '/tools/upscale' : id === 'background-removal' ? '/tools/background-removal' : getToolDefinition(id)!.href; return <Link key={id} href={href} prefetch={false} className={styles.repair}><Image unoptimized src={src} width={176} height={132} alt="" loading="lazy"/><div><h3>{tool.title}</h3><p>{tool.body}</p></div><ArrowUpRight size={18}/></Link>; })}
    </div></div></section>
    <section className={styles.sources}><div className="container-page"><h2>{c.sources}</h2><p>{c.sourceBody}</p><div className={styles.actions}><Link href="/app/image" prefetch={false} className={styles.primary}>{c.image}<ArrowUpRight size={17}/></Link><Link href="/app/audio" prefetch={false}>{c.audio}<ArrowUpRight size={17}/></Link></div></div></section>
  </div>;
}
