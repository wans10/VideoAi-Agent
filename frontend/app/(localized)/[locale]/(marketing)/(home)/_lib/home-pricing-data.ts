import type { AppLocale } from '@/i18n/locales';
import { withPublicPageTiming } from '@/server/public-page-timing';
import { buildCurrentHomePriceDemo } from './current-home-price-demo-data';

/**
 * The works-wall home needs only the price demo. The hero slots, engine scores, example discovery and hero
 * price quotes belonged to sections that no longer exist, so none of those reads start for this route.
 */
export function prepareHomePricingData(locale: AppLocale) {
  let priceModels!: ReturnType<typeof buildCurrentHomePriceDemo>;
  const completed = withPublicPageTiming({ route: 'home', locale }, async (measure) => {
    priceModels = measure('demo-pricing', () => buildCurrentHomePriceDemo(locale));
    await priceModels;
  });
  void priceModels.catch(() => undefined);
  void completed.catch(() => undefined);
  return { priceModels, completed };
}
