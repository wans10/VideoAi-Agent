import { Link } from '@/i18n/navigation';
import { MARKETING_SITE_NAV_LINKS, MARKETING_NAV_DROPDOWNS } from '@/config/navigation';

type Translate = <T = unknown>(key: string, fallback?: T) => T | undefined;
export function StudioFooterDepartments({ t }: { t: Translate }) {
  return <div className="production-footer-departments">{MARKETING_SITE_NAV_LINKS.filter(item => item.key !== 'pricing').map(item => {
    const department = MARKETING_NAV_DROPDOWNS[item.key]!;
    const title = t<string>(`nav.linkLabels.${item.key}`, item.key) ?? item.key;
    return <nav key={item.key} aria-label={title}><h2>{title}</h2>{department.items.map(entry => <Link key={entry.key} href={entry.href} prefetch={false}>{t<string>(`nav.dropdown.${item.key}.items.${entry.key}`, entry.label)}</Link>)}</nav>;
  })}</div>;
}
