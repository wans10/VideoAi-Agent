import type { LucideIcon } from 'lucide-react';
import {
  BadgeDollarSign,
  Bolt,
  Camera,
  Clock3,
  Film,
  Gauge,
  ImageIcon,
  Mic2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type { AppLocale } from '@/i18n/locales';
import type { LocalizedLinkHref } from '@/i18n/navigation';
import type { ModelGalleryCard } from '@/components/marketing/ModelsGallery';
import type { ModelsGalleryCompareHref } from '@/components/marketing/models-gallery/models-gallery-types';
import { buildCanonicalCompareSlug, isPublishedComparisonSlug } from '@/lib/compare-hub/data';
import { resolveExampleFamilyId } from '@/lib/model-families';

const TOP_PICK_IDS = [
  'ltx-2-5-pro',
  'wan-3-prime',
  'grok-imagine-video-1-5',
  'flux-3',
  'seedance-2-5',
] as const;
const RECOMMENDED_IDS = [
  'wan-3',
  'wan-3-prime',
  'ltx-2-5-fast',
  'ltx-2-5-pro',
  'grok-imagine-video-1-5',
  'flux-3',
  'flux-3-draft',
  'seedance-2-5',
  'seedance-2-0',
  'kling-3-pro',
  'veo-3-1',
  'happy-horse-1-1',
  'ltx-2-3-fast',
  'luma-ray-3-2',
] as const;
const SEEDANCE_FAST_COMPARISON_SLUG = 'seedance-2-0-vs-seedance-2-0-fast';

export type ModelsCatalogDecisionBadge = {
  label: string;
  icon: LucideIcon;
};

export type ModelsCatalogTopPick = {
  id: string;
  label: string;
  reason: string;
  detail: string;
  score: number | null;
  icon: LucideIcon;
  href: LocalizedLinkHref;
};

export type ModelsCatalogUseCase = {
  id: string;
  title: string;
  subtitle: string;
  best: string;
  href: LocalizedLinkHref;
  icon: LucideIcon;
};

export type ModelsCatalogPricingLimitItem = {
  title: string;
  body: string;
  icon: LucideIcon;
};

export type ModelsCatalogPopularComparison = {
  label: string;
  href: ModelsGalleryCompareHref;
};

export type ModelsCatalogDecisionData = {
  badges: ModelsCatalogDecisionBadge[];
  topPicks: ModelsCatalogTopPick[];
  useCases: ModelsCatalogUseCase[];
  recommendedCards: ModelGalleryCard[];
  popularComparisons: ModelsCatalogPopularComparison[];
  pricingLimits: ModelsCatalogPricingLimitItem[];
  faqItems: Array<{ question: string; answer: string }>;
};

function cardMap(cards: ModelGalleryCard[]) {
  return new Map(cards.map((card) => [card.id, card]));
}

function pickCards(cards: ModelGalleryCard[], ids: readonly string[]) {
  const byId = cardMap(cards);
  return ids.map((id) => byId.get(id)).filter((card): card is ModelGalleryCard => Boolean(card));
}

export function buildModelCompareHref(left: string, right: string): ModelsGalleryCompareHref {
  const sorted = [left, right].sort();
  return {
    pathname: '/ai-video-engines/[slug]',
    params: { slug: `${sorted[0]}-vs-${sorted[1]}` },
    query: sorted[0] === left ? undefined : { order: left },
  };
}

export function buildDefaultModelCompareHref(modelSlug: string): ModelsGalleryCompareHref | null {
  if (['nano-banana', 'nano-banana-pro', 'nano-banana-2', 'gpt-image-2', 'gpt-image-2-5-flare', 'gpt-image-2-5-sunburst', 'seedream'].includes(modelSlug)) {
    return null;
  }
  const opponent = modelSlug === 'seedance-2-0' ? 'kling-3-pro' : 'seedance-2-0';
  if (!isPublishedComparisonSlug(buildCanonicalCompareSlug(modelSlug, opponent))) return null;
  return buildModelCompareHref(modelSlug, opponent);
}

export function buildModelExamplesHref(modelSlug: string): LocalizedLinkHref | null {
  const family = resolveExampleFamilyId(modelSlug);
  if (!family) return null;
  return { pathname: '/examples/[model]', params: { model: family } };
}

function textByLocale<T>(locale: AppLocale, values: Partial<Record<AppLocale, T>> & { en: T }): T {
  return values[locale] ?? values.en;
}

function buildBadges(locale: AppLocale): ModelsCatalogDecisionBadge[] {
  const labels = textByLocale(locale, {
    en: ['Price before render', 'Pay-as-you-go', 'Updated specs', 'Vidéo, image et audio'],
    fr: ['Prix avant rendu', "Paiement à l’usage", 'Caractéristiques à jour', 'Vidéo, image et audio'],
    es: ['Precio antes de renderizar', 'Pago por uso', 'Características actualizadas', 'Video, imagen y audio'],
    zh: ['生成前查看预估价格', '灵活按量付费', '参数规格持续更新', '支持视频、图片与音频'],
  });
  return [
    { label: labels[0], icon: BadgeDollarSign },
    { label: labels[1], icon: Gauge },
    { label: labels[2], icon: ShieldCheck },
    { label: labels[3], icon: Sparkles },
  ];
}

function buildTopPickCopy(locale: AppLocale): Record<string, { reason: string; detail: string }> {
  return textByLocale(locale, {
    en: {
      'ltx-2-5-pro': { reason: 'Create with LTX', detail: 'Production-focused LTX 2.5 generation' },
      'wan-3-prime': { reason: 'Create with Wan', detail: 'Premium Wan 3 generation' },
      'grok-imagine-video-1-5': { reason: 'Video with Grok', detail: 'Text, opening-image, and reference workflows' },
      'flux-3': { reason: 'Video with FLUX', detail: 'Standard-quality generation and video extension' },
      'seedance-2-5': { reason: 'Current Seedance flagship', detail: '30-second cinematic, image, and reference workflows' },
      'seedance-2-0': { reason: 'Best native audio', detail: 'Native audio, lip sync, realistic motion' },
      'kling-3-pro': { reason: 'Best control', detail: 'Cinematic sequences and prompt control' },
      'veo-3-1': { reason: 'Best Google route', detail: 'Ad-ready prompts, references, and extend control' },
      'happy-horse-1-1': { reason: 'Best Alibaba audio route', detail: 'Text, image, and references with native audio' },
    },
    fr: {
      'ltx-2-5-pro': { reason: 'Pour les projets vidéo LTX', detail: 'Génération LTX 2.5 orientée production' },
      'wan-3-prime': { reason: 'Pour la vidéo avec Wan', detail: 'Génération premium Wan 3' },
      'grok-imagine-video-1-5': { reason: 'Vidéo avec Grok', detail: 'Texte, image d’ouverture et références' },
      'flux-3': { reason: 'Vidéo avec FLUX', detail: 'Génération standard et prolongation vidéo' },
      'seedance-2-5': { reason: 'Le modèle phare de Seedance', detail: 'Vidéo cinématique de 30 s, image et références' },
      'seedance-2-0': { reason: 'Meilleur audio natif', detail: 'Audio natif, synchronisation labiale et mouvement réaliste' },
      'kling-3-pro': { reason: 'Contrôle de la scène', detail: 'Séquences de cinéma et suivi des instructions' },
      'veo-3-1': { reason: 'Vidéo avec Google', detail: 'Publicité, références et prolongation' },
      'happy-horse-1-1': { reason: 'Audio natif avec Alibaba', detail: 'Texte, image et références avec audio natif' },
    },
    es: {
      'ltx-2-5-pro': { reason: 'Video con LTX', detail: 'Generación LTX 2.5 orientada a producción' },
      'wan-3-prime': { reason: 'Video con Wan', detail: 'Generación premium Wan 3' },
      'grok-imagine-video-1-5': { reason: 'Video con Grok', detail: 'Texto, imagen inicial y referencias' },
      'flux-3': { reason: 'Video con FLUX', detail: 'Generación estándar y extensión de video' },
      'seedance-2-5': { reason: 'El modelo principal de Seedance', detail: 'Video cinematográfico de 30 s, imagen y referencias' },
      'seedance-2-0': { reason: 'Mejor audio nativo', detail: 'Audio nativo, lip sync y movimiento realista' },
      'kling-3-pro': { reason: 'Mejor control', detail: 'Secuencias de cine y seguimiento del prompt' },
      'veo-3-1': { reason: 'Video con Google', detail: 'Anuncios, referencias y extensión' },
      'happy-horse-1-1': { reason: 'Audio nativo con Alibaba', detail: 'Texto, imagen y referencias con audio nativo' },
    },
    zh: {
      'ltx-2-5-pro': { reason: '使用 LTX 创作', detail: '面向生产交付的 LTX 2.5 视频生成' },
      'wan-3-prime': { reason: '使用 Wan 创作', detail: '高阶旗舰 Wan 3 视频生成' },
      'grok-imagine-video-1-5': { reason: 'Grok 视频生成', detail: '文本、首帧图与参考图完整工作流' },
      'flux-3': { reason: 'FLUX 视频生成', detail: '标准画质生成与镜头延展' },
      'seedance-2-5': { reason: 'Seedance 旗舰模型', detail: '30秒电影级、单图生视频与多参考工作流' },
      'seedance-2-0': { reason: '最佳原生音频', detail: '原生音频、口型同步与逼真运动物理' },
      'kling-3-pro': { reason: '最佳控制度', detail: '电影级分镜控制与高精度指令遵循' },
      'veo-3-1': { reason: 'Google 旗舰选择', detail: '商业广告提示词、素材参考与延展控制' },
      'happy-horse-1-1': { reason: '阿里原生音频方案', detail: '带原生音效的文生、图生与参考生视频' },
    },
  });
}

function buildUseCases(locale: AppLocale): ModelsCatalogUseCase[] {
  const copy = textByLocale(locale, {
    en: [
      ['cinematic-video', 'Cinematic video', 'Film-like motion and scenes', 'Seedance 2.5'],
      ['native-audio', 'Native audio & lip sync', 'Dialogue and ambience', 'Seedance 2.0'],
      ['fast-drafts', 'Fast drafts', 'Quick iterations', 'Seedance 2.0 Fast'],
      ['image-to-video', 'Image-to-video', 'Bring images to life', 'Seedance 2.5'],
      ['product-ads', 'Product ads', 'Ad-ready clips and references', 'Seedance 2.5'],
      ['prompt-control', 'Prompt control', 'Strong adherence', 'Kling 3 Pro'],
      ['longest-duration', 'Longest duration', 'Longer clips and output limits', 'LTX 2.3 Fast'],
      ['best-value', 'Best value', 'Lower-cost iteration', 'LTX 2.3 Fast'],
    ],
    fr: [
      ['cinematic-video', 'Video cinematographique', 'Mouvement et scenes cine', 'Seedance 2.5'],
      ['native-audio', 'Audio natif & lip sync', 'Dialogue, ambiance et voix', 'Seedance 2.0'],
      ['fast-drafts', 'Drafts rapides', 'Iterations rapides', 'Seedance 2.0 Fast'],
      ['image-to-video', 'Image-to-video', 'Animer des images', 'Seedance 2.5'],
      ['product-ads', 'Pubs produit', 'Clips et references prets pour ads', 'Seedance 2.5'],
      ['prompt-control', 'Controle du prompt', 'Forte adherence', 'Kling 3 Pro'],
      ['longest-duration', 'Duree la plus longue', 'Clips plus longs et limites de sortie', 'LTX 2.3 Fast'],
      ['best-value', 'Meilleure valeur', 'Iteration moins chere', 'LTX 2.3 Fast'],
    ],
    es: [
      ['cinematic-video', 'Video cinematografico', 'Movimiento y escenas cine', 'Seedance 2.5'],
      ['native-audio', 'Audio nativo & lip sync', 'Dialogo, ambiente y voz', 'Seedance 2.0'],
      ['fast-drafts', 'Borradores rapidos', 'Iteraciones rapidas', 'Seedance 2.0 Fast'],
      ['image-to-video', 'Imagen a video', 'Anima imagenes', 'Seedance 2.5'],
      ['product-ads', 'Anuncios de producto', 'Clips y referencias listos para ads', 'Seedance 2.5'],
      ['prompt-control', 'Control del prompt', 'Alta adherencia', 'Kling 3 Pro'],
      ['longest-duration', 'Mayor duracion', 'Clips mas largos y limites de salida', 'LTX 2.3 Fast'],
      ['best-value', 'Mejor valor', 'Iteracion de menor costo', 'LTX 2.3 Fast'],
    ],
    zh: [
      ['cinematic-video', '电影级视频', '影视质感运镜与光影场景', 'Seedance 2.5'],
      ['native-audio', '原生音频与口型同步', '自然对白、环境音与配音', 'Seedance 2.0'],
      ['fast-drafts', '高速草稿', '低成本极速方案验证', 'Seedance 2.0 Fast'],
      ['image-to-video', '图生视频', '赋予静态画面生动动态', 'Seedance 2.5'],
      ['product-ads', '产品广告', '即开即用的高质感广告镜头', 'Seedance 2.5'],
      ['prompt-control', '提示词控制', '极致遵循文本描述细节', 'Kling 3 Pro'],
      ['longest-duration', '超长镜头', '支持更长单次片段输出', 'LTX 2.3 Fast'],
      ['best-value', '最高性价比', '低成本多版本迭代', 'LTX 2.3 Fast'],
    ],
  });
  const hrefs: LocalizedLinkHref[] = [
    '/ai-video-engines/best-for/cinematic-realism',
    '/ai-video-engines/best-for/lipsync-dialogue',
    '/ai-video-engines/best-for/fast-drafts',
    '/ai-video-engines/best-for/image-to-video',
    '/ai-video-engines/best-for/ads',
    '/ai-video-engines/best-for/multi-shot-video',
    '#models-grid',
    '/ai-video-engines/best-for/fast-drafts',
  ];
  const icons = [Film, Mic2, Bolt, ImageIcon, Camera, SlidersHorizontal, Clock3, Gauge];
  return copy.map(([id, title, subtitle, best], index) => ({
    id,
    title,
    subtitle,
    best,
    href: hrefs[index],
    icon: icons[index] ?? Camera,
  }));
}

function buildPricingLimits(locale: AppLocale): ModelsCatalogPricingLimitItem[] {
  const copy = textByLocale(locale, {
    en: [
      ['Pricing', 'Compare per-second video pricing and per-image still pricing before rendering.'],
      ['Duration', 'Check max video length before choosing a model for drafts or production clips.'],
      ['Output quality', 'Compare 720p, 1080p, 4K, audio, input modes, and model-specific limits.'],
    ],
    fr: [
      ['Prix', 'Comparez les prix video a la seconde et image par image avant le rendu.'],
      ['Duree', 'Verifiez la duree video maximale avant les drafts ou clips de production.'],
      ['Qualite de sortie', 'Comparez 720p, 1080p, 4K, audio, modes d entree et limites par modele.'],
    ],
    es: [
      ['Precio', 'Compara precios de video por segundo e imagen por imagen antes de renderizar.'],
      ['Duracion', 'Revisa la duracion maxima antes de elegir un modelo para drafts o produccion.'],
      ['Calidad de salida', 'Compara 720p, 1080p, 4K, audio, modos de entrada y limites por modelo.'],
    ],
    zh: [
      ['价格透明', '在正式生成前对比按秒视频单价与单张图片成本。'],
      ['生成时长', '根据草稿或交付需求核对各模型支持的最大时长限制。'],
      ['输出质量', '全面对比 720p、1080p、4K、音频、输入模式及特定限制。'],
    ],
  });
  const icons = [BadgeDollarSign, Clock3, Trophy];
  return copy.map(([title, body], index) => ({ title, body, icon: icons[index] ?? Sparkles }));
}

function buildDecisionFaqItems(locale: AppLocale): Array<{ question: string; answer: string }> {
  return textByLocale(locale, {
    en: [
      {
        question: 'Which AI video model should I start with?',
        answer:
          'Start with Seedance 2.5 for 30-second cinematic, image, and reference workflows. Keep Seedance 2.0 for 4K delivery, Kling 3 Pro for explicit scene controls, and LTX 2.3 Fast for fast drafts.',
      },
      {
        question: 'Which models support native audio or lip sync?',
        answer:
          'Seedance, Kling, Veo, Sora, LTX, Wan, and other models may support audio or lip sync depending on the exact version. Check each model card for Audio, Lip sync, T2V, I2V, V2V, and First/Last support.',
      },
      {
        question: 'How is AI video pricing calculated?',
        answer:
          'Most video models are priced per second of generated output. Image models are usually priced per image or by output size. Open each model page for exact pricing and limits.',
      },
      {
        question: 'What is the maximum duration for AI video models?',
        answer:
          'Max duration varies by model. Some models are limited to 8-15 seconds, while others support longer clips. Use the duration filter or compare cards to find the right model.',
      },
      {
        question: 'Where can I find prompt examples?',
        answer:
          'Use the examples pages for model-specific prompts and outputs, including LTX, Kling, Seedance, Veo, Wan, Sora, and Pika examples.',
      },
      {
        question: 'What is the difference between video models and image models?',
        answer:
          'Video models generate motion clips from text, images, video references or first/last frames. Image models generate still images, edits, product visuals, and references that can be used before animation.',
      },
    ],
    fr: [
      {
        question: 'Par quel modele video IA commencer ?',
        answer:
          'Commencez avec Seedance 2.5 pour la video cinematographique de 30 secondes, l image et les references. Gardez Seedance 2.0 pour la 4K, Kling 3 Pro pour les controles de scene et LTX 2.3 Fast pour les drafts rapides.',
      },
      {
        question: 'Quels modeles supportent l audio natif ou le lip sync ?',
        answer:
          'Seedance, Kling, Veo, Sora, LTX et d autres modeles peuvent supporter audio ou lip sync selon la version exacte. Verifiez Audio, Lip sync, T2V, I2V, V2V et First/Last sur chaque carte.',
      },
      {
        question: 'Comment le prix video IA est-il calcule ?',
        answer:
          'La plupart des modeles video sont factures a la seconde generee. Les modeles image sont plutot factures par image ou taille de sortie. Ouvrez chaque page modele pour le prix exact.',
      },
      {
        question: 'Quelle est la duree maximale des modeles video IA ?',
        answer:
          'La duree maximale varie selon le modele. Certains sont limites a 8-15 secondes, tandis que d autres supportent des clips plus longs. Utilisez le filtre duree ou les comparaisons.',
      },
      {
        question: 'Ou trouver des exemples de prompts ?',
        answer:
          'Utilisez les pages exemples pour voir des prompts et sorties par modele, dont LTX, Kling, Seedance, Veo, Wan et Sora.',
      },
      {
        question: 'Quelle difference entre modeles video et modeles image ?',
        answer:
          'Les modeles video generent des clips depuis texte, images, references video ou premieres/dernieres images. Les modeles image generent des visuels fixes, editions et references avant animation.',
      },
    ],
    es: [
      {
        question: 'Con que modelo de video IA deberia empezar?',
        answer:
          'Empieza con Seedance 2.5 para video cinematografico de 30 segundos, imagenes y referencias. Mantén Seedance 2.0 para 4K, Kling 3 Pro para controles de escena y LTX 2.3 Fast para borradores rapidos.',
      },
      {
        question: 'Que modelos soportan audio nativo o lip sync?',
        answer:
          'Seedance, Kling, Veo, Sora, LTX y otros modelos pueden soportar audio o lip sync segun la version exacta. Revisa Audio, Lip sync, T2V, I2V, V2V y First/Last en cada tarjeta.',
      },
      {
        question: 'Como se calcula el precio de video IA?',
        answer:
          'La mayoria de modelos de video se cobran por segundo generado. Los modelos de imagen suelen cobrarse por imagen o tamano de salida. Abre cada pagina de modelo para precio y limites exactos.',
      },
      {
        question: 'Cual es la duracion maxima de los modelos de video IA?',
        answer:
          'La duracion maxima varia por modelo. Algunos modelos estan limitados a 8-15 segundos, mientras otros admiten clips mas largos. Usa el filtro de duracion o las comparaciones.',
      },
      {
        question: 'Donde encuentro ejemplos de prompts?',
        answer:
          'Usa las paginas de ejemplos para prompts y resultados por modelo, incluidos LTX, Kling, Seedance, Veo, Wan y Sora.',
      },
      {
        question: 'Cual es la diferencia entre modelos de video e imagen?',
        answer:
          'Los modelos de video generan clips desde texto, imagenes, referencias de video o primeros/ultimos frames. Los modelos de imagen generan imagenes fijas, ediciones, visuales de producto y referencias antes de animar.',
      },
    ],
    zh: [
      {
        question: '我应该从哪款 AI 视频模型开始？',
        answer:
          '推荐从 Seedance 2.5 开始体验 30 秒电影级、图生视频及多参考工作流。追求 4K 画质可选用 Seedance 2.0；需要精确场景运镜控制推荐 Kling 3 Pro；而快速测试草稿首选 LTX 2.3 Fast。',
      },
      {
        question: '哪些模型支持原生音效或口型同步？',
        answer:
          'Seedance、Kling、Veo、Sora、LTX、Wan 等模型的部分版本支持音频或口型同步。请查看各模型卡片上的“音频”、“口型同步”、文生视频、图生视频、视频重绘及首尾帧支持标注。',
      },
      {
        question: 'AI 视频生成的价格是如何计算的？',
        answer:
          '绝大多数视频模型按最终生成的视频秒数计费；图片模型通常按张数或输出分辨率计费。点击进入各模型详情页即可查看精确价格与额度扣除规则。',
      },
      {
        question: 'AI 视频模型单次最多可以生成多长时间？',
        answer:
          '不同模型的最大时长有所不同。部分模型单次限制在 8-15 秒，而另一些模型支持更长时间片段或镜头延展。可通过时长筛选器快速查找符合预期的模型。',
      },
      {
        question: '在哪里可以找到提示词范例与效果参考？',
        answer:
          '可访问示例展示页面，按模型浏览包括 LTX、Kling、Seedance、Veo、Wan、Sora 及 Pika 的实测提示词与生成效果。',
      },
      {
        question: '视频模型与图片模型有什么区别？',
        answer:
          '视频模型通过文字、图片、参考素材或首尾帧生成动态视频片段；图片模型则生成高精静态画面、局部重绘、商品主图或用作视频起始帧的视觉参考。',
      },
    ],
  });
}

export function buildModelsCatalogDecisionData({
  activeLocale,
  cards,
}: {
  activeLocale: AppLocale;
  cards: ModelGalleryCard[];
}): ModelsCatalogDecisionData {
  const byId = cardMap(cards);
  const topPickCopy = buildTopPickCopy(activeLocale);
  const topPickIcons = [Sparkles, Trophy, Camera, Film, Sparkles, Mic2, SlidersHorizontal, Bolt, Gauge] as const;
  const comparisonCandidates = [
    ['Seedance 2.0 vs Kling 3 Pro', 'seedance-2-0', 'kling-3-pro'],
    ['Seedance 2.0 vs Seedance 2.0 Fast', 'seedance-2-0', 'seedance-2-0-fast', SEEDANCE_FAST_COMPARISON_SLUG],
    ['Kling 3 Pro vs Veo 3.1', 'kling-3-pro', 'veo-3-1'],
    ['Happy Horse 1.1 vs Seedance 2.0', 'happy-horse-1-1', 'seedance-2-0'],
    ['Happy Horse 1.1 vs Veo 3.1', 'happy-horse-1-1', 'veo-3-1'],
    ['Veo 3.1 Fast vs Veo 3.1 Lite', 'veo-3-1-fast', 'veo-3-1-lite'],
  ] as const;

  return {
    badges: buildBadges(activeLocale),
    topPicks: TOP_PICK_IDS.flatMap((id, index): ModelsCatalogTopPick[] => {
      const card = byId.get(id);
      if (!card) return [];
      return [{
        id,
        label: card.label,
        reason: topPickCopy[id].reason,
        detail: topPickCopy[id].detail,
        score: card.overallScore ?? null,
        icon: topPickIcons[index] ?? Trophy,
        href: card.href,
      }];
    }),
    useCases: buildUseCases(activeLocale),
    recommendedCards: pickCards(cards, RECOMMENDED_IDS),
    popularComparisons: comparisonCandidates.flatMap(([label, left, right, authoredSlug]) => (
      byId.has(left) && byId.has(right) && isPublishedComparisonSlug(authoredSlug ?? buildCanonicalCompareSlug(left, right))
        ? [{ label, href: buildModelCompareHref(left, right) }]
        : []
    )),
    pricingLimits: buildPricingLimits(activeLocale),
    faqItems: buildDecisionFaqItems(activeLocale),
  };
}
