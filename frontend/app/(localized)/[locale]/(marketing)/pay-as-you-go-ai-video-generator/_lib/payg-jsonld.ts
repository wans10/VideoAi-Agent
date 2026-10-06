import { localePathnames, type AppLocale } from '@/i18n/locales';
import { SITE_BASE_URL } from '@/lib/metadataUrls';
import { getBreadcrumbLabels } from '@/lib/seo/breadcrumbs';
import { buildMarketingServiceJsonLd } from '@/lib/seo/marketingServiceJsonLd';
import { CUSTOMER_CURRENCY } from '@/lib/customer-currency';
import { TOPUP_TIERS } from '@/config/topupTiers';
import type { PayAsYouGoContent } from '../_content/types';

export function buildPayAsYouGoBreadcrumbJsonLd({ canonical, locale, copy }: { canonical: string; locale: AppLocale; copy: PayAsYouGoContent['jsonLd'] }) {
  const labels = getBreadcrumbLabels(locale);
  const localePrefix = localePathnames[locale] ? `/${localePathnames[locale]}` : '';
  const homeUrl = `${SITE_BASE_URL}${localePrefix || ''}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: labels.home,
        item: homeUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: copy.breadcrumbName,
        item: canonical,
      },
    ],
  };
}

export function buildPayAsYouGoServiceJsonLd({ canonical, copy }: { canonical: string; copy: PayAsYouGoContent['jsonLd'] }) {
  return buildMarketingServiceJsonLd({
    name: copy.service.name,
    description: copy.service.description,
    serviceType: copy.service.serviceType,
    category: copy.service.category,
    url: canonical,
    offers: {
      priceCurrency: CUSTOMER_CURRENCY,
      price: (TOPUP_TIERS[0].amountCents / 100).toFixed(2),
      availability: 'https://schema.org/InStock',
      description: copy.service.offer,
      url: canonical,
    },
  });
}

export function buildPayAsYouGoWebApplicationJsonLd({ canonical, copy }: { canonical: string; copy: PayAsYouGoContent['jsonLd'] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Keyvo',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: canonical,
    description: copy.webApplication.description,
    offers: {
      '@type': 'Offer',
      price: (TOPUP_TIERS[0].amountCents / 100).toFixed(2),
      priceCurrency: CUSTOMER_CURRENCY,
      description: copy.webApplication.offer,
      url: canonical,
    },
    featureList: copy.webApplication.features,
  };
}
