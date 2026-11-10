import Link from 'next/link';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { ExampleReaderContent } from '@/components/examples/ExampleReaderContent';
import { readerCopy } from '@/components/examples/example-reader-copy';
import styles from '@/components/examples/example-reader-styles';
import { buildExampleWatchDetail, type ExampleWatchDetailContext } from '@/server/example-watch-detail-loader';
import { isBundledFallbackVideo } from '@/server/videos-bundled-fallback';
import {
  BUNDLED_FALLBACK_LOCALE,
  bundledFallbackReaderCopy,
  localizeBundledBreadcrumbs,
  localizeBundledFallbackDetail,
} from '../_lib/bundled-fallback-detail';
import { buildOptimizedPosterUrl } from '@/lib/media-helpers';
import { LOCALE_COOKIE } from '@/lib/i18n/constants';
import { resolveCookieLocale } from '@/lib/i18n/cookie-locale';
import { localizeMarketingPathname } from '@/lib/i18n/marketing-locale-switch';
import { videoWatchCopy } from '../_lib/video-watch-copy';
import { FALLBACK_POSTER, FALLBACK_THUMB, SITE, serializeJsonLd, toAbsoluteUrl, toDurationIso, type WatchPageData } from '../_lib/video-watch-page-utils';
import { DeferredVideoWatchRelatedExamples, VideoWatchRelatedExamples } from './VideoWatchRelatedExamples';
import { VideoUnavailableState } from './VideoUnavailableState';

export async function VideoWatchContent({ page, quoteContext, deferRelated = false }: { page: WatchPageData; quoteContext?: ExampleWatchDetailContext; deferRelated?: boolean }) {
  const { video, signals, related, isEligible } = page;
  const canonical = signals.canonicalUrl;
  const videoUrl = toAbsoluteUrl(video.videoUrl) ?? video.videoUrl ?? canonical;
  const thumbnailUrl = toAbsoluteUrl(video.thumbUrl) ?? FALLBACK_THUMB;
  const playbackPoster = buildOptimizedPosterUrl(video.thumbUrl ?? FALLBACK_POSTER, { width: 1200, quality: 72 }) ?? video.thumbUrl ?? FALLBACK_POSTER;
  const [builtDetail, cookieStore] = await Promise.all([buildExampleWatchDetail(video, signals, quoteContext), cookies()]);
  const locale = resolveCookieLocale(cookieStore.get(LOCALE_COOKIE)?.value, cookieStore.get('NEXT_LOCALE')?.value);
  const copy = videoWatchCopy(locale);
  if (!builtDetail) return <VideoUnavailableState backHref={localizeMarketingPathname(signals.parentPath ?? '/examples', locale)}/>;
  // A bundled example (no database job behind it) is a Chinese-language page without the hand-offs that need one.
  const bundled = isBundledFallbackVideo(video);
  const detail = bundled ? localizeBundledFallbackDetail(builtDetail) : builtDetail;
  const readerLocale = bundled ? BUNDLED_FALLBACK_LOCALE : locale;
  const readerText = bundled ? bundledFallbackReaderCopy(readerCopy(readerLocale)) : readerCopy(readerLocale);
  const breadcrumbs = bundled ? localizeBundledBreadcrumbs(signals.breadcrumbs, detail.engineLabel) : signals.breadcrumbs;
  const videoJsonLd = isEligible
    ? {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        url: canonical,
        mainEntityOfPage: canonical,
        name: signals.videoObjectName,
        description: signals.metaDescription,
        thumbnailUrl: [thumbnailUrl],
        uploadDate: new Date(page.entry?.publishedAt ?? video.createdAt).toISOString(),
        duration: toDurationIso(signals.durationSec ?? video.durationSec),
        contentUrl: videoUrl,
        publisher: {
          '@type': 'Organization',
          name: 'Keyvo',
          url: SITE,
          logo: {
            '@type': 'ImageObject',
            url: `${SITE}/favicon-512.png`,
          },
        },
      }
    : null;

  const breadcrumbJsonLd = isEligible
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: signals.breadcrumbs.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.label,
          ...(item.href ? { item: `${SITE}${item.href === '/' ? '' : item.href}` } : {}),
        })),
      }
    : null;


  return <div className="mx-auto w-full max-w-[1440px] px-0 pb-16 pt-4 sm:px-6">
    <link rel="preload" as="image" href={playbackPoster} fetchPriority="high" />
    <nav aria-label={bundled ? '面包屑导航' : copy.breadcrumb} className="mb-4 flex flex-wrap items-center gap-2 px-5 text-xs text-text-secondary sm:px-0">
      {breadcrumbs.map((crumb,index) => <span key={`${crumb.label}-${index}`}>
        {index > 0 && <span aria-hidden className="mr-2">›</span>}
        {crumb.href ? <Link href={localizeMarketingPathname(crumb.href, locale)} prefetch={false}>{crumb.href === '/' ? copy.home : crumb.href === '/examples' ? copy.examples : crumb.href === '/models' ? copy.models : crumb.label}</Link> : <span>{crumb.label}</span>}
      </span>)}
    </nav>
    <article className={`${styles.dialog} ${styles.standalone}`}>
      <ExampleReaderContent detail={{...detail,posterUrl:playbackPoster}} copy={readerText} locale={readerLocale} headingLevel="h1" bundledExample={bundled}/>
    </article>
    {deferRelated ? <Suspense fallback={null}><DeferredVideoWatchRelatedExamples page={page} locale={locale}/></Suspense>
      : related.length > 0 && <div className="mt-8 px-5 sm:px-0"><VideoWatchRelatedExamples related={related} locale={locale}/></div>}
    {videoJsonLd && <script id={`video-jsonld-${video.id}`} type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(videoJsonLd)}}/>}
    {breadcrumbJsonLd && <script id={`video-breadcrumb-jsonld-${video.id}`} type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(breadcrumbJsonLd)}}/>}
  </div>;
}
