import { getRouteAuthContext } from '@/lib/supabase-ssr';
import { normalizeMediaUrl } from '@/lib/media';
import { shouldUseStarterFallback } from '@/lib/jobs-feed-policy';
import { listStarterPlaylistVideos } from '@/server/videos';
import type { ResultProvider, VideoGroup, VideoItem } from '@/types/video-groups';

type InitialPreview = {
  id: string;
  videoUrl: string | null;
  previewVideoUrl: string | null;
  thumbUrl: string | null;
  aspectRatio: string | null;
  engineId: string | null;
  engineLabel: string | null;
  durationSec: number | null;
  createdAt: string | null;
};

function toVideoAspect(value?: string | null): VideoItem['aspect'] {
  switch (value) {
    case '9:16':
      return '9:16';
    case '1:1':
      return '1:1';
    default:
      return '16:9';
  }
}

function mapInitialPreviewToGroup(preview: InitialPreview, provider: ResultProvider = 'fal', curated = false): VideoGroup | null {
  const videoUrl = normalizeMediaUrl(preview.videoUrl) ?? null;
  const thumbUrl = normalizeMediaUrl(preview.thumbUrl) ?? null;
  const previewVideoUrl = normalizeMediaUrl(preview.previewVideoUrl) ?? undefined;
  const url = videoUrl ?? thumbUrl;
  if (!url) return null;

  const item: VideoItem = {
    id: preview.id,
    url,
    previewUrl: previewVideoUrl,
    aspect: toVideoAspect(preview.aspectRatio),
    thumb: thumbUrl ?? undefined,
    jobId: preview.id,
    durationSec: preview.durationSec ?? undefined,
    engineId: preview.engineId ?? undefined,
    meta: {
      mediaType: videoUrl ? 'video' : 'image',
      curated,
      engineLabel: preview.engineLabel ?? undefined,
    },
  };

  return {
    id: `initial-${preview.id}`,
    items: [item],
    layout: 'x1',
    createdAt: preview.createdAt ?? new Date().toISOString(),
    provider,
    status: 'ready',
    heroItemId: item.id,
    meta: {
      source: 'initial-preview',
    },
  };
}

async function resolveStarterInitialPreview(): Promise<InitialPreview | null> {
  if (!shouldUseStarterFallback('video', null)) return null;
  const videos = await listStarterPlaylistVideos(1);
  const video = videos[0];
  if (!video) return null;
  return {
    id: video.id,
    videoUrl: video.videoUrl ?? null,
    previewVideoUrl: video.previewVideoUrl ?? null,
    thumbUrl: video.thumbUrl ?? null,
    aspectRatio: video.aspectRatio ?? null,
    engineId: video.engineId ?? null,
    engineLabel: video.engineLabel ?? null,
    durationSec: video.durationSec ?? null,
    createdAt: video.createdAt ?? null,
  };
}

/**
 * The preview the workspace opens on before any client state exists. Only logged-out visitors get one (the guest
 * starter sample); a signed-in user opens on an empty preview and picks from their own history, so their latest
 * result is neither queried nor rendered unasked.
 */
export async function resolveInitialAppPreviewGroup(): Promise<VideoGroup | null> {
  try {
    const { userId } = await getRouteAuthContext();
    if (userId) return null;
    const preview = await resolveStarterInitialPreview();
    return preview ? mapInitialPreviewToGroup(preview, 'fal', true) : null;
  } catch (error) {
    console.warn('[app] failed to resolve initial preview', error);
    return null;
  }
}
