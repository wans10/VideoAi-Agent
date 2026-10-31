import '@/styles/marketing-home.css';
import { Suspense } from 'react';
import { HomePricingSection } from '@/components/marketing/home/HomePricingSection';
import { HomeDeferredPricing } from './_components/HomeDeferredPricing';
import { HomePromptHero } from '@/components/marketing/home/HomePromptHero';
import { HomeShowcaseWall } from '@/components/marketing/home/HomeShowcaseWall.client';
import { getHomeShowcaseCopy } from '@/components/marketing/home/home-showcase-copy';
import { prepareHomePricingData } from './_lib/home-pricing-data';
import { HOME_SHOWCASE_FIRST_BATCH, getShowcaseScenePosters, listShowcaseCards } from './_lib/home-route-data/showcase';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { resolveDictionary } from '@/lib/i18n/server';
import { normalizeAppLocale } from '@/i18n/locales';
import { buildSeoMetadata } from '@/lib/seo/metadata';
import { DeferredMarketingContent } from '@/components/marketing/DeferredMarketingContent';
import {
  HomeFaq,
  WorkflowSeoSummary,
  type WorkflowSeoSummaryCopy,
} from '@/components/marketing/home/HomeRedesignSections';
import { filterProviderItems, type RedesignContent } from './_lib/home-route-data';
import { getMcpInternalLink } from '@/lib/mcp-internal-links';
import { buildFaqSchema, buildItemListSchema, buildSoftwareSchema, serializeJsonLd } from './_lib/home-jsonld';

export const revalidate = 60;

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = normalizeAppLocale(params.locale);
  const t = await getTranslations({ locale, namespace: 'home.meta' });

  return buildSeoMetadata({
    locale,
    title: t('title'),
    description: t('description'),
    hreflangGroup: 'home',
    image: '/og/home-2026-09-25.png',
    imageAlt: t('title'),
  });
}

export default async function HomePage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = normalizeAppLocale(params.locale);
  const { dictionary } = await resolveDictionary({ locale });
  const content = dictionary.home.redesign as RedesignContent;
  const workflowSeoCopy = dictionary.home.seoContent as WorkflowSeoSummaryCopy | undefined;
  const pricing = prepareHomePricingData(locale);
  const showcaseCopy = getHomeShowcaseCopy(locale);
  const showcase = listShowcaseCards(0, HOME_SHOWCASE_FIRST_BATCH);
  const scenePosters = getShowcaseScenePosters();
  const mcpLink = getMcpInternalLink(locale, 'home');
  const providers = filterProviderItems(content);
  const softwareSchema = buildSoftwareSchema(content, locale);
  const faqSchema = buildFaqSchema(content.faq.items);
  const itemListSchema = buildItemListSchema(content, providers);

  return (
    <div className="home-monochrome home-cinema home-showcase">
      <HomePromptHero
        copy={showcaseCopy}
        scenePosters={showcaseCopy.scenes.map((scene) => ({ id: scene.id, posterUrl: scenePosters[scene.id].posterUrl }))}
      />
      <HomeShowcaseWall initialCards={showcase.cards} hasMore={showcase.hasMore} copy={showcaseCopy} locale={locale} assistant={mcpLink} />
      <DeferredMarketingContent>
        <Suspense fallback={<HomePricingSection locale={locale} copy={content.pricingTrust} pending />}>
          <HomeDeferredPricing locale={locale} models={pricing.priceModels} copy={content.pricingTrust} />
        </Suspense>
      </DeferredMarketingContent>
      <DeferredMarketingContent>
        {workflowSeoCopy ? <WorkflowSeoSummary copy={workflowSeoCopy} locale={locale} /> : null}
        <HomeFaq copy={content.faq} items={content.faq.items} />
      </DeferredMarketingContent>
      <script id="home-webapp-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(softwareSchema) }} />
      <script id="home-faq-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqSchema) }} />
      <script id="home-provider-itemlist-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListSchema) }} />
    </div>
  );
}
