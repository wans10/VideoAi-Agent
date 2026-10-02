import type { AppLocale } from '@/i18n/locales';
import { getToolProductionCopy } from './tool-production-copy';
import styles from './ProductionDepartments.module.css';

export function ProductionReviewNotes({ locale, kind }: { locale: AppLocale; kind: 'character' | 'upscale' | 'separation' }) {
  const c = getToolProductionCopy(locale);
  const character = kind === 'character';
  const title = character ? c.dossierTitle : kind === 'upscale' ? c.finishingTitle : c.separationTitle;
  const body = character ? c.dossierBody : kind === 'upscale' ? c.finishingIntro : c.separationIntro;
  const rows = character ? c.dossierRows : kind === 'upscale' ? c.finishingChecks : c.separationChecks;
  return <section className={styles.notes} data-production-review={kind}><div className="container-page">
    {character ? <p className={styles.kicker}>{c.dossier}</p> : null}<h2>{title}</h2><p>{body}</p>
    <div className={styles.notebook}>{rows.map(([label, description, check], index) => <article className={styles.note} key={label}><span aria-hidden="true">0{index + 1}</span><h3>{label}</h3><p>{description}{check ? <small>{check}</small> : null}</p></article>)}</div>
  </div></section>;
}
