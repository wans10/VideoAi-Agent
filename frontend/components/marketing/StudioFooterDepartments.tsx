import { Link } from '@/i18n/navigation';
import type { MarketingFooterNavigation } from '@/config/public-marketing-navigation';

type Translate = <T = unknown>(key: string, fallback?: T) => T | undefined;
export function StudioFooterDepartments({ t, departments }: { t: Translate; departments: MarketingFooterNavigation['departments'] }) {
  return <div className="production-footer-departments">{departments.links.filter(item => item.key !== 'pricing').map(item => {
    const department = departments.dropdowns[item.key]!;
    const title = t<string>(`nav.linkLabels.${item.key}`, item.key) ?? item.key;
    return <nav key={item.key} aria-label={title}><h2>{title}</h2>{department.items.map(entry => <Link key={entry.key} href={entry.href} prefetch={false}>{t<string>(`nav.dropdown.${item.key}.items.${entry.key}`, entry.label)}</Link>)}</nav>;
  })}</div>;
}
