import type { AppLocale } from '@/i18n/locales';
import { FOCUS_VS_PAIRS } from './pairs';
import type { FocusVsConfig } from './types';

export function resolveFocusVsConfig(currentSlug: string, locale: AppLocale): FocusVsConfig | null {
  const entry = FOCUS_VS_PAIRS.find((pair) => {
    if (pair.onlyFor && !pair.onlyFor.includes(currentSlug)) {
      return false;
    }
    return pair.slugA === currentSlug || pair.slugB === currentSlug;
  });
  if (!entry) return null;
  const isA = entry.slugA === currentSlug;
  const currentName = isA ? entry.nameA : entry.nameB;
  const otherName = isA ? entry.nameB : entry.nameA;
  const currentCopy = (isA ? entry.copyA : entry.copyB)[locale] ?? (isA ? entry.copyA : entry.copyB).en;
  const otherCopy = (isA ? entry.copyB : entry.copyA)[locale] ?? (isA ? entry.copyB : entry.copyA).en;
  const ctaSlug = isA ? entry.slugB : entry.slugA;
  const ctaLabel = (() => {
    if (locale === 'fr') return `Voir les détails ${otherName} →`;
    if (locale === 'es') return `Ver detalles de ${otherName} →`;
    if (locale === 'zh') return `查看 ${otherName} 详情 →`;
    return `View ${otherName} details →`;
  })();
  return {
    title: `${currentName} vs ${otherName}`,
    ctaLabel,
    ctaSlug,
    leftTitle: currentCopy.title,
    leftItems: currentCopy.items,
    rightTitle: otherCopy.title,
    rightItems: otherCopy.items,
  };
}
