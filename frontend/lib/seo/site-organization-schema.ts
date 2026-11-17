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

/** The studio name already shown in the site header and sign-in page; no other alias is declared. */
export const SITE_ALTERNATE_NAME = `${PRODUCT_BRAND_NAME} 影像工作室`;

export function buildSiteWebSiteSchema(inLanguage?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_ORIGIN}/#website`,
    url: `${SITE_ORIGIN}/`,
    name: PRODUCT_BRAND_NAME,
    alternateName: SITE_ALTERNATE_NAME,
    ...(inLanguage ? { inLanguage } : {}),
    publisher: { '@id': `${SITE_ORIGIN}/#organization` },
  };
}

export function buildSiteOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: PRODUCT_BRAND_NAME,
    alternateName: SITE_ALTERNATE_NAME,
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/assets/branding/app-icon-512.png`,
    description:
      'Keyvo 是按需付费的 AI 视频、图像与声音生成平台，提供网页创作工作台。生成前先比较模型并确认价格，无需订阅。',
  };
}
