import {
  publicCardToVideo,
  selectLocalModelExamples,
  selectLocalPublicExamples,
  type PublicExamplesSnapshot,
} from './local-public-examples-data';
import type { ExampleSort, ListExamplesPageResult } from './videos-examples';
import type { GalleryVideo } from './videos-normalization';
import { withChineseExamplePrompt } from './public-example-prompts-zh';
import rawSnapshot from '@/config/public-examples.json';

const snapshot = rawSnapshot as unknown as PublicExamplesSnapshot;

export function getBundledPublicExamplesSnapshot(): PublicExamplesSnapshot {
  return snapshot;
}

export function getBundledPublicExample(id: string): GalleryVideo | null {
  const card = snapshot.cards?.[id];
  return card ? withChineseExamplePrompt(publicCardToVideo(card)) : null;
}

export function listBundledPublicExamples(
  family: string,
  sort: ExampleSort,
  limit: number,
  offset: number,
  includeVersionSamples = false,
): ListExamplesPageResult {
  const page = selectLocalPublicExamples(snapshot, family, sort, limit, offset, includeVersionSamples);
  return { ...page, items: page.items.map(withChineseExamplePrompt) };
}

export function listBundledModelExamples(modelSlug: string, limit = 200): GalleryVideo[] {
  return selectLocalModelExamples(snapshot, modelSlug, limit).map(withChineseExamplePrompt);
}

export function hasBundledPublicExamples(family: string): boolean {
  const feed = snapshot.feeds?.[family];
  return Boolean(feed && (feed.playlist.length > 0 || feed['date-desc'].length > 0));
}
