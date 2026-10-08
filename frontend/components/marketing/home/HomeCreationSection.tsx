import { ArrowUpRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/locales';
import { HOME_PRODUCTION_COPY } from './home-production-copy';

export function HomeCreationSection({ locale, assistantHref }: { locale: AppLocale; assistantHref?: string }) {
  const copy = HOME_PRODUCTION_COPY[locale];
  return <section id="create" className="production-brief-section">
    <div className="container-page">
      <header className="production-brief-heading"><div><p className="editorial-eyebrow">{copy.eyebrow}</p><h2>{copy.title}</h2><p>{copy.body}</p></div>
        <aside className="production-slate" aria-label={copy.slate}>
          <div className="production-slate-stripes" aria-hidden="true" /><strong>{copy.slate}</strong>
          <dl><div><dt>{copy.scene}</dt><dd>{copy.sceneValue}</dd></div><div><dt>{copy.intention}</dt><dd>{copy.intentionValue}</dd></div></dl><small>{copy.note}</small>
        </aside>
      </header>
      <ol className="production-stage-list">{copy.steps.map(([number, title, body, cta], index) => <li key={title}><span>{number}</span><h3>{title}</h3><p>{body}</p><Link href={['/app/image', '/app/tools/storyboard', '/app'][index]} prefetch={false} data-analytics-event="cta_click" data-analytics-cta-name={`home_production_stage_${index + 1}`} data-analytics-cta-location="home_creation">{cta}<ArrowUpRight size={17} /></Link></li>)}</ol>
      {assistantHref ? <div className="production-pipeline-note"><div><strong>{copy.pipeline}</strong><p>{copy.pipelineBody}</p></div><Link href={assistantHref} prefetch={false}>{copy.pipelineCta}<ArrowUpRight size={17} /></Link></div> : null}
    </div>
  </section>;
}
