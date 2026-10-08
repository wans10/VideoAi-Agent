import { SITE_ORIGIN } from '@/lib/siteOrigin';
import { PRODUCT_BRAND_NAME } from '@/lib/product-brand';

export const MAXVIDEOAI_PLUGIN_REPOSITORY_URL = 'https://github.com/camgraphe/maxvideoai-plugin';
export const MAXVIDEOAI_YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/channel/UCi5XkvmzIaG8gvJPLEs94Mw';

export function buildSiteOrganizationReference() {
  return {
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: PRODUCT_BRAND_NAME,
    url: `${SITE_ORIGIN}/`,
  } as const;
}

export function buildSiteOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: PRODUCT_BRAND_NAME,
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/favicon-512.png`,
    description:
      'Keyvo is a pay-as-you-go platform for AI video, image and audio generation, with a web workspace for creative production. Compare models and review the price before generating, without a subscription.',
  };
}
