import type { AppLocale } from '@/i18n/locales';
import {
  DECISION_CRITERIA_FILLERS,
  ENGINE_BY_SLUG,
  USECASE_CHIPS,
  USECASE_CRITERIA,
  USECASE_MISTAKE_FALLBACKS,
  type BestForEntry,
  type RankedPick,
} from './best-for-detail-config';

export const BEST_FOR_SERP_SNIPPETS: Record<string, { title: string; description: string }> = {
  'image-to-video': {
    title: 'Best AI Video Engines for Image-to-Video Prompts',
    description:
      'Compare the best AI video engines for animating still images, product shots, style frames and approved references with Seedance, Veo, Kling and LTX.',
  },
  'cinematic-realism': {
    title: 'Best AI Video Engines for Cinematic Realism',
    description:
      'Compare AI video engines for cinematic realism, camera motion, lighting, character consistency and polished visual direction with Seedance, Kling, Veo and LTX.',
  },
  'character-reference': {
    title: 'Best AI Video Engines for Character References',
    description:
      'Compare AI video engines for stable characters, wardrobe, props and product references across shots, including Kling, Seedance and other reference models.',
  },
  'reference-to-video': {
    title: 'Best AI Video Engines for Reference-to-Video',
    description:
      'Compare AI video engines for turning image, video, audio, product, style or campaign references into usable video shots with the right model.',
  },
  'multi-shot-video': {
    title: 'Best AI Video Engines for Multi-Shot Videos',
    description:
      'Compare AI video engines for mini-films, trailers, ad sequences and edited-style clips from structured prompts, with pricing and best-use guidance.',
  },
  '4k-video': {
    title: 'Best AI Video Engines for 4K: Veo, Kling & LTX',
    description:
      'Compare the best AI video engines for 4K delivery, native 4K workflows, premium finishing, pricing, resolution limits and when to use Veo, Kling or LTX.',
  },
  ads: {
    title: 'Best AI Video Engines for Ads & Product Creative',
    description:
      'Compare AI video engines for product ads, ecommerce creative, paid social campaigns and polished commercial assets with pricing and model recommendations.',
  },
  'ugc-ads': {
    title: 'Best AI Video Engines for UGC Ads & Social Videos',
    description:
      'Compare AI video engines for creator-style clips, selfie videos, short dialogue, social proof and TikTok-style ad tests with the right model for each format.',
  },
  'product-videos': {
    title: 'Best AI Video Engines for Product Videos',
    description:
      'Compare AI video engines for product reveals, ecommerce shots, packshots, demos and clean commercial storytelling with prompts, pricing and best uses.',
  },
  'lipsync-dialogue': {
    title: 'Best AI Video Engines for Lip Sync & Dialogue',
    description:
      'Compare AI video engines for speaking characters, short dialogue, native audio, voice control and social narration with Seedance, Veo and other models.',
  },
  'fast-drafts': {
    title: 'Best AI Video Engines for Fast Drafts & Prompt Tests',
    description:
      'Compare AI video engines for fast drafts, cheaper iterations, timing tests and concept exploration with LTX 2.3 Fast, Seedance Fast and other quick models.',
  },
  'stylized-anime': {
    title: 'Best AI Video Engines for Anime & Stylized Video',
    description:
      'Compare AI video engines for anime-style motion, illustration, stylized loops and non-photoreal creative tests with Kling, Seedance, Pika and other models.',
  },
};

export function getBestForDisplayTitle(locale: AppLocale, entry?: BestForEntry, fallbackTitle?: string) {
  if (!entry) return fallbackTitle ?? 'Best AI video engines by use case';
  if (locale === 'en' && BEST_FOR_SERP_SNIPPETS[entry.slug]) return BEST_FOR_SERP_SNIPPETS[entry.slug].title;
  if (locale !== 'en') return fallbackTitle ?? entry.title;
  const intentLabels: Record<string, string> = {
    'image-to-video': 'image-to-video',
    'cinematic-realism': 'cinematic realism',
    'character-reference': 'character reference',
    'reference-to-video': 'reference-to-video',
    'multi-shot-video': 'multi-shot video',
    '4k-video': '4K video',
    ads: 'ads',
    'ugc-ads': 'UGC videos',
    'product-videos': 'product videos',
    'lipsync-dialogue': 'lip sync and dialogue',
    'fast-drafts': 'fast drafts',
    'stylized-anime': 'anime and stylized video',
  };
  return `Best AI video engines for ${intentLabels[entry.slug] ?? entry.title.replace(/^Best\s+/i, '').toLowerCase()}`;
}

export function buildBestForHeroDescription(locale: AppLocale, entry: BestForEntry, fallbackDescription?: string) {
  if (locale !== 'en') return fallbackDescription ?? entry.description ?? 'Editorial guidance for picking the best AI video engines by use case.';
  const names = (entry.topPicks ?? []).slice(0, 3).map((slug) => ENGINE_BY_SLUG.get(slug)?.marketingName ?? slug);
  if (!names.length) return fallbackDescription ?? entry.description ?? 'Compare AI video engines before spending credits.';
  return `Compare ${formatList(names)} for ${entry.title.replace(/^Best\s+/i, '').replace(/\s+AI generator$/i, '').toLowerCase()} before spending credits.`;
}

export function buildBestForMetaDescription(locale: AppLocale, entry: BestForEntry, fallbackDescription?: string) {
  if (locale !== 'en') return fallbackDescription ?? entry.description ?? 'Compare the best AI video engines by use case.';
  if (BEST_FOR_SERP_SNIPPETS[entry.slug]) return BEST_FOR_SERP_SNIPPETS[entry.slug].description;
  const names = (entry.topPicks ?? []).slice(0, 3).map((slug) => ENGINE_BY_SLUG.get(slug)?.marketingName ?? slug);
  const engineText = names.length ? ` Compare ${formatList(names)}` : ' Compare leading AI video engines';
  const lead = normalizeSentenceLead(fallbackDescription ?? entry.description ?? entry.title);
  return `${lead}.${engineText} by quality, control, consistency, cost, and workflow fit.`;
}

export function buildBestForKeywords(locale: AppLocale, entry: BestForEntry, localizedTitle: string) {
  const engines = (entry.topPicks ?? []).map((slug) => ENGINE_BY_SLUG.get(slug)?.marketingName ?? slug);
  const genericKeyword =
    locale === 'fr'
      ? `${entry.slug.replace(/-/g, ' ')} générateur vidéo IA`
      : locale === 'es'
        ? `${entry.slug.replace(/-/g, ' ')} generador de video con IA`
        : `${entry.slug.replace(/-/g, ' ')} AI video generator`;
  return Array.from(
    new Set([
      localizedTitle,
      genericKeyword,
      ...engines,
      ...getUsecaseChips(locale, entry.slug, []),
    ])
  );
}

export function formatScore(score?: number) {
  return typeof score === 'number' && Number.isFinite(score) ? score.toFixed(1) : '-';
}

export function getTopPicksTitle(locale: AppLocale, slug: string) {
  const labels: Record<string, Partial<Record<AppLocale, string>>> = {
    'cinematic-realism': {
      en: 'Top picks for cinematic shots',
      fr: 'Meilleurs choix pour plans cinéma',
      es: 'Mejores opciones para planos cinematográficos',
      zh: '电影级镜头精选推荐',
    },
    'character-reference': {
      en: 'Top picks for character reference',
      fr: 'Meilleurs choix pour character reference',
      es: 'Mejores opciones para character reference',
      zh: '角色参考精选推荐',
    },
    'reference-to-video': {
      en: 'Top picks for reference-to-video',
      fr: 'Meilleurs choix pour reference-to-video',
      es: 'Mejores opciones para reference-to-video',
      zh: '参考生成视频精选推荐',
    },
    'multi-shot-video': {
      en: 'Top picks for multi-shot video',
      fr: 'Meilleurs choix pour multi-shot',
      es: 'Mejores opciones para multi-shot',
      zh: '多镜头视频精选推荐',
    },
    '4k-video': {
      en: 'Top picks for 4K delivery',
      fr: 'Meilleurs choix pour livraison 4K',
      es: 'Mejores opciones para entrega 4K',
      zh: '4K 交付精选推荐',
    },
    ads: {
      en: 'Top picks for ads',
      fr: 'Meilleurs choix pour publicités',
      es: 'Mejores opciones para anuncios',
      zh: '广告视频精选推荐',
    },
    'ugc-ads': {
      en: 'Top picks for UGC videos',
      fr: 'Meilleurs choix pour vidéos UGC',
      es: 'Mejores opciones para videos UGC',
      zh: 'UGC 视频精选推荐',
    },
    'product-videos': {
      en: 'Top picks for product videos',
      fr: 'Meilleurs choix pour vidéos produit',
      es: 'Mejores opciones para videos de producto',
      zh: '产品视频精选推荐',
    },
    'lipsync-dialogue': {
      en: 'Top picks for dialogue',
      fr: 'Meilleurs choix pour dialogue',
      es: 'Mejores opciones para diálogo',
      zh: '口型与对白精选推荐',
    },
    'fast-drafts': {
      en: 'Top picks for fast drafts',
      fr: 'Meilleurs choix pour tests rapides',
      es: 'Mejores opciones para borradores rápidos',
      zh: '快速草稿精选推荐',
    },
    'stylized-anime': {
      en: 'Top picks for stylized video',
      fr: 'Meilleurs choix pour vidéo stylisée',
      es: 'Mejores opciones para video estilizado',
      zh: '风格化视频精选推荐',
    },
    'image-to-video': {
      en: 'Top picks for image-to-video',
      fr: 'Meilleurs choix image vers vidéo',
      es: 'Mejores opciones de imagen a video',
      zh: '图生视频精选推荐',
    },
  };
  return labels[slug]?.[locale] ?? labels[slug]?.en ?? (locale === 'fr' ? 'Meilleurs choix' : locale === 'es' ? 'Mejores opciones' : locale === 'zh' ? '精选推荐' : 'Top picks');
}

export function buildReasonSentence(locale: AppLocale, usecaseSlug: string, pick: RankedPick) {
  const usecaseLabel = getUsecaseLabel(locale, usecaseSlug);
  if (locale === 'fr') {
    return `est utile quand ${pick.criterion.toLowerCase()} compte pour ${usecaseLabel}, avec un chemin clair pour comparer qualité, coût et workflow avant le rendu final.`;
  }
  if (locale === 'es') {
    return `es útil cuando ${pick.criterion.toLowerCase()} importa para ${usecaseLabel}, con una ruta clara para comparar calidad, coste y flujo antes del render final.`;
  }
  if (locale === 'zh') {
    return `在${usecaseLabel}中当${pick.criterion}至关重要时非常实用，为您在最终交付前提供对比品质、成本与工作流适配度的清晰路径。`;
  }
  return `is useful when ${pick.criterion.toLowerCase()} matters for ${usecaseLabel}, with a clear path to compare quality, cost, and workflow fit before final delivery.`;
}

export function buildUsecaseMistakes(locale: AppLocale, usecaseSlug: string, criteria: string[]) {
  const label = getUsecaseLabel(locale, usecaseSlug);
  const primary = criteria[0] ?? USECASE_MISTAKE_FALLBACKS[locale]?.[0] ?? USECASE_MISTAKE_FALLBACKS.en[0];
  const secondary = criteria[1] ?? USECASE_MISTAKE_FALLBACKS[locale]?.[1] ?? USECASE_MISTAKE_FALLBACKS.en[1];
  const tertiary = criteria[2] ?? USECASE_MISTAKE_FALLBACKS[locale]?.[2] ?? USECASE_MISTAKE_FALLBACKS.en[2];

  if (locale === 'fr') {
    return [
      `Choisir un modèle pour ${label} sans vérifier ${primary.toLowerCase()}.`,
      `Multiplier les références alors que ${secondary.toLowerCase()} doit rester prioritaire.`,
      `Passer directement au modèle premium avant d’avoir validé ${tertiary.toLowerCase()}.`,
      'Oublier de contrôler le coût avant de générer.',
      'Comparer seulement les fiches modèles sans ouvrir les exemples réels liés à ce cas d’usage.',
    ];
  }

  if (locale === 'es') {
    return [
      `Elegir un motor para ${label} sin comprobar ${primary.toLowerCase()}.`,
      `Añadir demasiadas referencias cuando ${secondary.toLowerCase()} debería ser la prioridad.`,
      `Pasar directo al modelo premium antes de validar ${tertiary.toLowerCase()}.`,
      'Olvidar revisar el precio antes de generar.',
      'Comparar solo fichas de modelos sin abrir ejemplos reales para este objetivo.',
    ];
  }

  return [
    `Choosing an engine for ${label} without checking ${primary.toLowerCase()}.`,
    `Adding too many references when ${secondary.toLowerCase()} should stay primary.`,
    `Going straight to a premium model before validating ${tertiary.toLowerCase()}.`,
    'Forgetting to check the cost before generation.',
    'Comparing model pages only without opening real examples for this use case.',
  ];
}

export function getUsecaseCriteria(locale: AppLocale, slug: string): string[] {
  return USECASE_CRITERIA[slug]?.[locale] ?? USECASE_CRITERIA[slug]?.en ?? USECASE_CRITERIA['image-to-video'].en;
}

export function getUsecaseChips(locale: AppLocale, slug: string, fallback: string[]): string[] {
  return USECASE_CHIPS[slug]?.[locale] ?? USECASE_CHIPS[slug]?.en ?? fallback;
}

export function getFilledCriteria(locale: AppLocale, criteria: string[]) {
  return criteria.concat(DECISION_CRITERIA_FILLERS[locale] ?? DECISION_CRITERIA_FILLERS.en).slice(0, 5);
}

function formatList(items: string[]) {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function normalizeSentenceLead(value: string) {
  return value.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/g, '');
}

function getUsecaseLabel(locale: AppLocale, slug: string) {
  const labels: Record<string, Record<AppLocale, string>> = {
    'cinematic-realism': { en: 'cinematic realism', fr: 'un rendu cinématique', es: 'realismo cinematográfico', zh: '电影级写实' },
    'character-reference': { en: 'character reference', fr: 'la référence personnage', es: 'referencia de personaje', zh: '角色一致性参考' },
    'reference-to-video': { en: 'reference-to-video', fr: 'la vidéo guidée par référence', es: 'video guiado por referencia', zh: '参考图生视频' },
    'multi-shot-video': { en: 'multi-shot video', fr: 'la vidéo multi-plan', es: 'video multi-plano', zh: '多镜头分镜视频' },
    '4k-video': { en: '4K video', fr: 'la vidéo 4K', es: 'video 4K', zh: '4K 高清视频' },
    ads: { en: 'ads', fr: 'les publicités', es: 'anuncios', zh: '商业广告' },
    'ugc-ads': { en: 'UGC videos', fr: 'les vidéos UGC', es: 'videos UGC', zh: 'UGC 短视频' },
    'product-videos': { en: 'product videos', fr: 'les vidéos produit', es: 'videos de producto', zh: '商品展示视频' },
    'lipsync-dialogue': { en: 'lip sync and dialogue', fr: 'la synchronisation labiale et le dialogue', es: 'sincronización labial y diálogo', zh: '对口型与角色对白' },
    'fast-drafts': { en: 'fast drafts', fr: 'les tests rapides', es: 'borradores rápidos', zh: '快速草稿预览' },
    'stylized-anime': { en: 'anime and stylized video', fr: 'la vidéo anime et stylisée', es: 'anime y video estilizado', zh: '动漫与风格化视频' },
    'image-to-video': { en: 'image-to-video', fr: "l'image vers vidéo", es: 'imagen a video', zh: '图生视频' },
  };
  return labels[slug]?.[locale] ?? labels[slug]?.en ?? slug.replace(/-/g, ' ');
}
