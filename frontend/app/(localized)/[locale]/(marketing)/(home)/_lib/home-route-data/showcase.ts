import visibleFamilies from '@/config/keyvo-visible-families.json';
import showcasePromptsZh from '@/config/home-showcase-zh.json';
import { galleryVideoRatio } from '@/components/examples/examples-discovery-layout';
import { showcaseMediaUrl } from '@/lib/home-showcase-media';
import { getBundledPublicExamplesSnapshot } from '@/server/bundled-public-examples';
import { isShowcaseEngine } from '@/server/keyvo-example-eligibility';
import type { PublicExampleCard } from '@/server/local-public-examples-data';

/** The first server-rendered batch of the home works wall. */
export const HOME_SHOWCASE_FIRST_BATCH = 24;
export const HOME_SHOWCASE_MAX_BATCH = 48;
/** Chinese prompts for the bundled examples (the originals are English); the wall never shows English prompts. */
const PROMPTS_ZH: Readonly<Record<string, string>> = showcasePromptsZh;
const EXCERPT_CHARS = 90;

export type HomeShowcaseCard = {
  id: string;
  href: string;
  engineLabel: string;
  /** The engine id; the shared gallery card requires one but does not read it. */
  engineIconId: string;
  aspectRatio: string | null;
  outputWidth: number | null;
  outputHeight: number | null;
  ratio: number;
  durationSec: number;
  hasAudio: boolean;
  posterUrl: string;
  previewVideoUrl: string | null;
  promptExcerpt: string;
};

// A fixed, reviewed pick for each scene card on the first screen (one per visible vendor family).
const SCENE_POSTER_IDS: Record<'marketing' | 'cinematic' | 'creative' | 'everyone', string> = {
  marketing: '4104d35b-a97a-4449-91fd-cfc628f626de',
  cinematic: 'c474084a-6b30-4d6c-a48d-4615e0e8b36d',
  creative: 'job_9dda92fc-830a-41c4-88d4-44967acc8875',
  everyone: 'job_6d55cf71-5f48-41d2-be95-be990ae294f2',
};
export type HomeShowcaseSceneId = keyof typeof SCENE_POSTER_IDS;

const FAMILIES: readonly string[] = visibleFamilies;

// The predicate is shared with the detail-page fallback in server/videos.ts, so the wall and its cards cannot drift apart.
export { isShowcaseEngine };

let cachedCards: PublicExampleCard[] | null = null;

/** Families take turns so the wall mixes vendors; each family keeps its curated playlist order. */
function buildShowcaseSequence(): PublicExampleCard[] {
  const snapshot = getBundledPublicExamplesSnapshot();
  const seen = new Set<string>();
  const queues = FAMILIES.map((family) =>
    (snapshot.feeds?.[family]?.playlist ?? []).flatMap((id) => {
      const card = snapshot.cards?.[id];
      if (!card || seen.has(card.id) || !card.rawPosterUrl || !PROMPTS_ZH[card.id] || !isShowcaseEngine(card.engineIconId)) return [];
      seen.add(card.id);
      return [card];
    }),
  ).filter((queue) => queue.length > 0);
  const sequence: PublicExampleCard[] = [];
  for (let round = 0; queues.some((queue) => round < queue.length); round += 1) {
    for (const queue of queues) if (round < queue.length) sequence.push(queue[round]);
  }
  return sequence;
}

function showcaseSequence(): PublicExampleCard[] {
  cachedCards ??= buildShowcaseSequence();
  return cachedCards;
}

function plainExcerpt(prompt: string): string {
  const flat = prompt.replace(/[*#>`]/g, '').replace(/\s+/g, ' ').trim();
  return flat.length > EXCERPT_CHARS ? `${flat.slice(0, EXCERPT_CHARS).trimEnd()}…` : flat;
}

function toShowcaseCard(card: PublicExampleCard): HomeShowcaseCard {
  const promptZh = PROMPTS_ZH[card.id];
  const aspectRatio = card.aspectRatio ?? null;
  return {
    id: card.id,
    href: `/video/${encodeURIComponent(card.id)}`,
    engineLabel: card.engineLabel,
    engineIconId: card.engineIconId,
    aspectRatio,
    outputWidth: card.outputWidth ?? null,
    outputHeight: card.outputHeight ?? null,
    ratio: galleryVideoRatio({ id: card.id, aspectRatio, outputWidth: card.outputWidth, outputHeight: card.outputHeight }),
    durationSec: card.durationSec,
    hasAudio: card.hasAudio,
    posterUrl: showcaseMediaUrl(card.rawPosterUrl as string),
    previewVideoUrl: showcaseMediaUrl(card.previewVideoUrl),
    promptExcerpt: plainExcerpt(promptZh),
  };
}

export function listShowcaseCards(offset: number, limit: number): { cards: HomeShowcaseCard[]; total: number; hasMore: boolean } {
  const sequence = showcaseSequence();
  const start = Math.max(0, Math.floor(offset) || 0);
  const size = Math.min(HOME_SHOWCASE_MAX_BATCH, Math.max(1, Math.floor(limit) || HOME_SHOWCASE_FIRST_BATCH));
  const slice = sequence.slice(start, start + size);
  return { cards: slice.map(toShowcaseCard), total: sequence.length, hasMore: start + slice.length < sequence.length };
}

export function getShowcaseScenePosters(): Record<HomeShowcaseSceneId, { posterUrl: string; ratio: number }> {
  const sequence = showcaseSequence();
  const byId = new Map(sequence.map((card) => [card.id, card]));
  const fallback = sequence[0];
  const pick = (id: string) => {
    const card = byId.get(id) ?? fallback;
    return card ? { posterUrl: showcaseMediaUrl(card.rawPosterUrl as string), ratio: 16 / 10 } : { posterUrl: '', ratio: 16 / 10 };
  };
  return {
    marketing: pick(SCENE_POSTER_IDS.marketing),
    cinematic: pick(SCENE_POSTER_IDS.cinematic),
    creative: pick(SCENE_POSTER_IDS.creative),
    everyone: pick(SCENE_POSTER_IDS.everyone),
  };
}
