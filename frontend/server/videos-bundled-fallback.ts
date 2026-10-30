import showcasePromptsZh from '@/config/home-showcase-zh.json';
import { getBundledPublicExample } from './bundled-public-examples';
import { isShowcaseEngine } from './keyvo-example-eligibility';
import type { GalleryVideo } from './videos-normalization';

// Upstream database-reader tests set KEYVO_BUNDLED_EXAMPLES=off to exercise the database path.
export const keyvoBundledExamplesOnly = () => process.env.KEYVO_BUNDLED_EXAMPLES !== 'off';

const SHOWCASE_PROMPTS_ZH: Readonly<Record<string, string>> = showcasePromptsZh;
const bundledFallbackVideos = new WeakSet<GalleryVideo>();

/** True for a video served from the bundled snapshot because the database has no row for it. */
export function isBundledFallbackVideo(video: GalleryVideo | null | undefined): boolean {
  return Boolean(video) && bundledFallbackVideos.has(video as GalleryVideo);
}

function chineseExcerpt(prompt: string): string {
  const flat = prompt.replace(/[*#>`]/g, '').replace(/\s+/g, ' ').trim();
  return flat.length > 160 ? `${flat.slice(0, 160).trimEnd()}…` : flat;
}

/**
 * Keyvo's database holds none of the bundled examples, yet the home works wall links to them. Serve exactly the
 * examples the wall may show, with the Chinese prompt the wall shows, and remember that they are not Keyvo's own
 * pages so they stay out of search indexes.
 */
function keyvoBundledExample(videoId: string): GalleryVideo | null {
  const example = getBundledPublicExample(videoId);
  if (!example || !isShowcaseEngine(example.engineId)) return null;
  const promptZh = SHOWCASE_PROMPTS_ZH[example.id];
  const video: GalleryVideo = promptZh ? { ...example, prompt: promptZh, promptExcerpt: chineseExcerpt(promptZh) } : example;
  bundledFallbackVideos.add(video);
  return video;
}

/**
 * Where the database cannot answer. `missing`: it is configured and has no such row. `unavailable`: it is not
 * configured or the read failed. Upstream behavior (`KEYVO_BUNDLED_EXAMPLES=off`) is unchanged: only the second
 * case falls back, ungated.
 */
export function bundledExampleFallback(videoId: string, reason: 'missing' | 'unavailable'): GalleryVideo | null {
  if (keyvoBundledExamplesOnly()) return keyvoBundledExample(videoId);
  return reason === 'unavailable' ? getBundledPublicExample(videoId) : null;
}
