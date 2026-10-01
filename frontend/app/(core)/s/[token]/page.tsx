import { cookies } from 'next/headers';
import { LOCALE_COOKIE } from '@/lib/i18n/constants';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { SITE_ORIGIN } from '@/lib/siteOrigin';
import { getSharedVideo } from '@/server/video-shares';
import './share-video.css';

type PageProps = { params: Promise<{ token: string }> };
const readCopy = cache(async () => {
  const store = await cookies();
  const locale = store.get(LOCALE_COOKIE)?.value ?? store.get('NEXT_LOCALE')?.value ?? 'zh';
  return locale.startsWith('zh') ? { unavailable: '视频不可用', title: '分享给您的视频 | VideoAI', description: 'VideoAI 创作者分享的视频。', breadcrumb: '面包屑导航', home: '首页', shared: '分享的视频', video: '分享的 VideoAI 视频', created: '使用 VideoAI 创作', heading: '分享给您的视频', watch: '观看 VideoAI 创作者分享的视频。', create: '创作您的视频', explore: '探索 AI 视频模型，在 VideoAI 开始自己的创作。', start: '开始创作', examples: '浏览视频案例' } : { unavailable: 'Video unavailable', title: 'Video shared with you | VideoAI', description: 'A video shared by a VideoAI creator.', breadcrumb: 'Breadcrumb', home: 'Home', shared: 'Shared video', video: 'Shared VideoAI video', created: 'Created with VideoAI', heading: 'Video shared with you', watch: 'Watch this video shared by a VideoAI creator.', create: 'Create your own video', explore: 'Explore AI video models and make something of your own on VideoAI.', start: 'Start creating', examples: 'Explore video examples' };
});
const readVideo = cache(async (token: string) => getSharedVideo(token));

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const copy = await readCopy();
  const { token } = await params;
  const video = await readVideo(token);
  if (!video) return { title: copy.unavailable, robots: { index: false, follow: false } };
  const pageUrl = new URL(`/s/${token}`, SITE_ORIGIN).toString();
  const image = video.thumbUrl ? new URL(video.thumbUrl, SITE_ORIGIN).toString() : undefined;
  return {
    title: { absolute: copy.title },
    description: copy.description,
    referrer: 'no-referrer',
    robots: { index: false, follow: false },
    openGraph: {
      type: 'video.other',
      title: copy.title,
      description: copy.description,
      url: pageUrl,
      images: image ? [image] : undefined,
      videos: [{ url: new URL(video.url, SITE_ORIGIN).toString(), type: 'video/mp4' }],
    },
    twitter: { card: 'summary_large_image', images: image ? [image] : undefined },
  };
}

export default async function SharedVideoPage({ params }: PageProps) {
  const copy = await readCopy();
  const { token } = await params;
  const video = await readVideo(token);
  if (!video) notFound();
  return <div className="shared-video-page">
    <nav className="shared-video-breadcrumb" aria-label={copy.breadcrumb}>
      <Link href="/">{copy.home}</Link><span aria-hidden>›</span><span>{copy.shared}</span>
    </nav>
    <div className="shared-video-grid">
      <article className="shared-video-card">
        <video controls playsInline preload="none" poster={video.thumbUrl ?? undefined} src={video.url} aria-label={copy.video} />
        <div className="shared-video-details">
          <p className="shared-video-eyebrow">{copy.created}</p>
          <h1>{copy.heading}</h1>
          <p>{copy.watch}</p>
        </div>
      </article>
      <aside className="shared-video-aside">
        <h2>{copy.create}</h2>
        <p>{copy.explore}</p>
        <Link className="shared-video-primary-link" href="/app">{copy.start}</Link>
        <Link className="shared-video-secondary-link" href="/zh/examples">{copy.examples}</Link>
      </aside>
    </div>
  </div>;
}
