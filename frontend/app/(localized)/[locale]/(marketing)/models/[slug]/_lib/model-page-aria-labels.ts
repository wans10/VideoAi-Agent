import type { AppLocale } from '@/i18n/locales';

const LABELS = {
  sections: { en: 'Model page sections', zh: '模型页面章节' },
  decisionPaths: { en: 'Model decision paths', zh: '模型选择路径' },
  exampleFilters: { en: 'Example filters', zh: '案例筛选' },
} as const;

/** Screen-reader labels of the model page; only Chinese differs from the English text. */
export function modelPageAriaLabel(key: keyof typeof LABELS, locale?: AppLocale | string | null): string {
  return locale === 'zh' ? LABELS[key].zh : LABELS[key].en;
}
