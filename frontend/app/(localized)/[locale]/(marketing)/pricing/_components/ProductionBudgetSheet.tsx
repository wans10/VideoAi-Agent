import type { AppLocale } from '@/i18n/locales';
import { getProductionBudgetCopy } from '../_lib/production-budget-copy';
import styles from './ProductionBudget.module.css';

export function ProductionBudgetSheet({ locale }: { locale: AppLocale }) {
  const c = getProductionBudgetCopy(locale);
  return <section className={styles.sheet} aria-labelledby="production-budget-title"><div className="container-page">
    <header><h2 id="production-budget-title">{c.title}</h2><p>{c.note}</p></header>
    <div className={styles.ledger}>
      <div className={styles.columns} aria-hidden="true">{c.columns.map(label => <span key={label}>{label}</span>)}</div>
      {c.rows.map(([pass, decision, allocation], index) => <article className={styles.row} key={pass}>
        <h3><span aria-hidden="true">0{index + 1}</span>{pass}</h3><p><small>{c.columns[1]}</small>{decision}</p><p><small>{c.columns[2]}</small>{allocation}</p>
      </article>)}
    </div><p className={styles.rule}>{c.rule}</p><a href="#video-pricing">{c.prices} ↓</a>
  </div></section>;
}
