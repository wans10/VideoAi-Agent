import { isRuntimeModelPagePublished, resolveRuntimePublicSlug } from '@/config/model-runtime';
import type { ExampleWatchDetail } from '@/lib/example-watch-detail';
import type { ReaderCopy } from '@/components/examples/example-reader-copy';
import { bundledExamplePromptHref } from '@/server/keyvo-example-eligibility';
import { isBundledFallbackVideo } from '@/server/videos-bundled-fallback';
import { buildMetaTitle, type WatchPageData } from './video-watch-page-utils';

/** Bundled examples are shown on Keyvo's Chinese site, so their watch page speaks Chinese. */
export const BUNDLED_FALLBACK_LOCALE = 'zh';
const LOCALE_PREFIX = `/${BUNDLED_FALLBACK_LOCALE}`;

function visibleModelHref(modelHref: string | null): string | null {
  const slug = modelHref?.split('/').filter(Boolean).pop();
  const model = slug ? resolveRuntimePublicSlug(slug) : null;
  return model && isRuntimeModelPagePublished(model) ? `${LOCALE_PREFIX}/models/${model.slug}` : null;
}

/**
 * A bundled example has no database job, so the upstream hand-offs that need one cannot work for it:
 * the `/app?from=<id>` recreation link and the model-comparison pages (which Keyvo hides). What remains is honest:
 * the Chinese prompt (only the prompt travels) and the model page when that page is visible.
 */
export function localizeBundledFallbackDetail(detail: ExampleWatchDetail): ExampleWatchDetail {
  return {
    ...detail,
    title: bundledFallbackTitle(detail.engineLabel, detail.prompt),
    recreateHref: bundledExamplePromptHref(detail.id),
    modelHref: visibleModelHref(detail.modelHref),
    context: { ...detail.context, compareLinks: [] },
  };
}

/** The generated watch title mixes an English template with the prompt; the Chinese page uses model + prompt. */
export function bundledFallbackTitle(engineLabel: string, promptZh: string): string {
  const flat = promptZh.replace(/[*#>`]/g, '').replace(/\s+/g, ' ').trim();
  const snippet = flat.length > 36 ? `${flat.slice(0, 36).trimEnd()}…` : flat;
  return snippet ? `${engineLabel} 案例：${snippet}` : `${engineLabel} 案例`;
}

export function bundledFallbackReaderCopy(base: ReaderCopy): ReaderCopy {
  // Only the prompt travels to the workspace, so the button must not promise the same video.
  return { ...base, create: '使用此提示词' };
}

export function localizeBundledBreadcrumbs(
  breadcrumbs: Array<{ label: string; href?: string }>,
  engineLabel: string,
): Array<{ label: string; href?: string }> {
  const labels: Record<string, string> = { Home: '首页', Examples: '案例', Models: '模型' };
  const trail = breadcrumbs.slice(0, -1).map((crumb) => ({
    label: labels[crumb.label] ?? crumb.label,
    ...(crumb.href ? { href: crumb.href === '/' ? LOCALE_PREFIX : `${LOCALE_PREFIX}${crumb.href}` } : {}),
  }));
  // The last crumb is the generated, mixed-language title; the model name is enough and is not repeated.
  const last = trail[trail.length - 1];
  if (last?.label === engineLabel) return [...trail.slice(0, -1), { label: engineLabel }];
  return [...trail, { label: engineLabel }];
}

/** Title and description of a watch page; a bundled example uses model + Chinese prompt instead of the English template. */
export function watchPageMeta(video: WatchPageData['video'], signals: WatchPageData['signals']): { metaTitle: string; description: string } {
  if (!isBundledFallbackVideo(video)) return { metaTitle: buildMetaTitle(signals.metaTitle), description: signals.metaDescription };
  return {
    metaTitle: buildMetaTitle(bundledFallbackTitle(video.engineLabel, video.prompt)),
    description: (video.promptExcerpt || video.prompt).slice(0, 160),
  };
}
