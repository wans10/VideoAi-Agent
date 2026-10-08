import styles from './ProductionBudget.module.css';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { ReactNode } from 'react';
import { CUSTOMER_CURRENCY } from '@/lib/customer-currency';

type PricingHeroSectionProps = {
  badges?: string[];
  calculatorHref?: string;
  calculatorLabel?: string;
  compareHref?: string;
  compareLabel?: string;
  eyebrow?: string;
  subtitle?: string;
  supportingLine?: string;
  title?: string;
  children?: ReactNode;
};

const DEFAULT_BADGES = ['No subscription', 'Guest preview', `Starter credits from ${CUSTOMER_CURRENCY === 'CNY' ? '¥80' : '$10'}`, 'Refunds on failed generations'];

export function PricingHeroSection({
  badges = DEFAULT_BADGES,
  calculatorHref = '/app',
  calculatorLabel = 'Open app for live pricing before you generate',
  compareHref = '#video-pricing',
  compareLabel = 'Compare prices below',
  eyebrow = 'Keyvo Pricing',
  subtitle = 'Compare video, image, audio and tool costs before you generate.',
  supportingLine = 'Pay as you go. See the exact live price in the app before launch. Failed generations are refunded.',
  title = 'AI Video Pricing Comparison',
  children,
}: PricingHeroSectionProps) {
  return (
    <header className={`${styles.hero} min-h-[260px]`}>
      <div className={`container-page ${styles.opening}`}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <div className={styles.brief}>
          <div><p className={styles.intro}>{subtitle}</p><p className={styles.support}>{supportingLine}</p></div>
          <div className={styles.actions}>
            <Link href={calculatorHref} prefetch={false} className={styles.primary}>{calculatorLabel}<ArrowUpRight size={17}/></Link>
            <Link href={compareHref}>{compareLabel}<ArrowDown size={17}/></Link>
          </div>
        </div>
        <ul className={styles.terms}>{badges.map(badge => <li key={badge}>{badge}</li>)}</ul>
      </div>
      {children}
    </header>
  );
}
