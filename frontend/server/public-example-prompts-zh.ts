import showcasePromptsZh from '@/config/home-showcase-zh.json';
import extraPromptsZh from '@/config/public-examples-zh.json';
import type { GalleryVideo } from './videos-normalization';

const SHOWCASE: Readonly<Record<string, string>> = showcasePromptsZh;
const EXTRA: Readonly<Record<string, string>> = extraPromptsZh;

/** Static Chinese translation of a bundled example's prompt (works-wall set first, then the remaining gallery examples). */
export function getBundledExamplePromptZh(exampleId: string): string | null {
  return SHOWCASE[exampleId] ?? EXTRA[exampleId] ?? null;
}

export function chineseExampleExcerpt(prompt: string): string {
  const flat = prompt.replace(/[*#>`]/g, '').replace(/\s+/g, ' ').trim();
  return flat.length > 160 ? `${flat.slice(0, 160).trimEnd()}…` : flat;
}

/**
 * Keyvo is a Chinese surface: show the Chinese prompt and excerpt of a bundled example. The English original stays on
 * `promptOriginal`; it is never sent to the workspace by a link. An example without a translation is returned unchanged.
 */
export function withChineseExamplePrompt(video: GalleryVideo): GalleryVideo {
  const promptZh = getBundledExamplePromptZh(video.id);
  if (!promptZh) return video;
  return { ...video, prompt: promptZh, promptExcerpt: chineseExampleExcerpt(promptZh), promptOriginal: video.prompt };
}
