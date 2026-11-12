import type { AppLocale } from '@/i18n/locales';

export type BenchmarkScoreReview = {
  status: 'editorial-estimated';
  disclosure: Record<AppLocale, string>;
  sourceUrl: string | null;
};

const COPY = {
  en: { short: 'Est.', label: 'Editorial estimate', source: 'Evidence source', method: 'Scoring method', fallback: 'This score is an editorial estimate. Evidence confidence varies by criterion; it is not a controlled Keyvo test result.' },
  fr: { short: 'Est.', label: 'Estimation éditoriale', source: 'Source des preuves', method: 'Méthode de notation', fallback: 'Cette note est une estimation éditoriale. La confiance varie selon le critère ; il ne s’agit pas du résultat d’un test contrôlé Keyvo.' },
  es: { short: 'Est.', label: 'Estimación editorial', source: 'Fuente de las pruebas', method: 'Método de puntuación', fallback: 'Esta puntuación es una estimación editorial. La confianza varía por criterio; no es el resultado de una prueba controlada de Keyvo.' },
  zh: { short: '估', label: '编辑估算', source: '依据来源', method: '评分方法', fallback: '此评分为编辑估算。各评分项的证据可信度不同；它并非 Keyvo 的对照测试结果。' },
} as const;

export function getBenchmarkScoreReviewCopy(locale: AppLocale) {
  return COPY[locale];
}
