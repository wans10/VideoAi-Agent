import { localePathnames, type AppLocale } from '@/i18n/locales';
import { buildSlugMap } from '@/lib/i18nSlugs';
import { SITE_BASE_URL } from '@/lib/metadataUrls';
import { getBreadcrumbLabels } from '@/lib/seo/breadcrumbs';
import { buildMarketingServiceJsonLd } from '@/lib/seo/marketingServiceJsonLd';
import { CUSTOMER_CURRENCY, USD_TO_CNY_CUSTOMER_RATE } from '@/lib/customer-currency';

export const PRICING_SLUG_MAP = buildSlugMap('pricing');

export function buildPricingBreadcrumbJsonLd({ canonical, locale }: { canonical: string; locale: AppLocale }) {
  const breadcrumbLabels = getBreadcrumbLabels(locale);
  const localePrefix = localePathnames[locale] ? `/${localePathnames[locale]}` : '';
  const homeUrl = `${SITE_BASE_URL}${localePrefix || ''}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: breadcrumbLabels.home,
        item: homeUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: breadcrumbLabels.pricing,
        item: canonical,
      },
    ],
  };
}

export function buildPricingServiceJsonLd({ canonical, locale }: { canonical: string; locale: AppLocale }) {
  return buildMarketingServiceJsonLd({
    name:
      locale === 'fr' ? 'Tarifs VideoAI' : locale === 'es' ? 'Precios de VideoAI' : 'VideoAI pricing',
    description:
      locale === 'fr'
        ? 'Comparez les prix VideoAI par moteur, durée, résolution, audio, image et outils.'
        : locale === 'es'
          ? 'Compara precios de VideoAI por motor, duración, resolución, audio, imagen y herramientas.'
          : 'Compare VideoAI prices by engine, duration, resolution, audio, image and tools.',
    serviceType:
      locale === 'fr'
        ? 'Comparaison de prix IA'
        : locale === 'es'
          ? 'Comparación de precios de IA'
          : 'AI pricing comparison',
    category: locale === 'fr' ? 'Tarification' : locale === 'es' ? 'Precios' : 'Pricing',
    url: canonical,
    offers: {
      priceCurrency: CUSTOMER_CURRENCY,
      price: (10 * (CUSTOMER_CURRENCY === 'CNY' ? USD_TO_CNY_CUSTOMER_RATE : 1)).toFixed(2),
      availability: 'https://schema.org/InStock',
      url: canonical,
    },
  });
}
