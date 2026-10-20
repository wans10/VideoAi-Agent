import {
  publicCardToVideo,
  selectLocalModelExamples,
  selectLocalPublicExamples,
  type PublicExamplesSnapshot,
} from './local-public-examples-data';
import type { ExampleSort, ListExamplesPageResult } from './videos-examples';
import type { GalleryVideo } from './videos-normalization';
import rawSnapshot from '@/config/public-examples.json';

const snapshot = rawSnapshot as unknown as PublicExamplesSnapshot;

export function getBundledPublicExamplesSnapshot(): PublicExamplesSnapshot {
  return snapshot;
}

export function getBundledPublicExample(id: string): GalleryVideo | null {
  const card = snapshot.cards?.[id];
  return card ? publicCardToVideo(card) : null;
}

export function listBundledPublicExamples(
  family: string,
  sort: ExampleSort,
  limit: number,
  offset: number,
  includeVersionSamples = false,
): ListExamplesPageResult {
  return selectLocalPublicExamples(snapshot, family, sort, limit, offset, includeVersionSamples);
}

export function listBundledModelExamples(modelSlug: string, limit = 200): GalleryVideo[] {
  return selectLocalModelExamples(snapshot, modelSlug, limit);
}

export function hasBundledPublicExamples(family: string): boolean {
  const feed = snapshot.feeds?.[family];
  return Boolean(feed && (feed.playlist.length > 0 || feed['date-desc'].length > 0));
}
