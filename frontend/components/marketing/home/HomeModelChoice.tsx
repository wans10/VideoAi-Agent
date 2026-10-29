import type { HomeComparisonData } from './home-comparison-types';
import type { AppLocale } from '@/i18n/locales';

// Keyvo does not present model comparisons or scores, so the home choice block renders nothing.
export function HomeModelChoice(_props: {
  locale: AppLocale; startupFameLabel: string;
  scores: HomeComparisonData;
  comparisons: Array<{slug:string;title:string}>;
}) {
  return null;
}
