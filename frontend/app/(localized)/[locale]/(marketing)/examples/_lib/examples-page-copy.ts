import type { AppLocale } from '@/i18n/locales';
import { buildCompareHref, buildModelHref } from './examples-route-utils';

type PaginationDictionary = {
  prev?: string;
  next?: string;
  page?: string;
  loadMore?: string;
};

export type ExamplesNextStepLink = {
  href: string;
  label: string;
  comparison?: readonly [leftEngineId: string, rightEngineId: string];
  modelSlug?: string;
};

export function getExamplesEditorialSections(
  sections: Array<{ title: string; body: string }>,
  replacementTitles: string[] | null,
) {
  return sections.map((section, index) => ({
    title: replacementTitles?.[index] ?? section.title,
    body: section.body,
  }));
}

export function getExamplesBrowseByModelLabel(locale: AppLocale) {
  return locale === 'fr' ? 'Parcourir par marque' : locale === 'es' ? 'Explorar por modelo' : locale === 'zh' ? '按品牌浏览' : 'Browse by brand';
}

export function getExamplesGalleryUiCopy(locale: AppLocale, pagination: PaginationDictionary = {}) {
  const fallback =
    locale === 'fr'
      ? {
          prev: 'Précédent',
          next: 'Suivant',
          page: 'Page',
          loadMore: 'Voir plus d’exemples',
          loading: 'Chargement…',
          noPreview: 'Aucun aperçu',
          audioAvailable: 'Audio disponible à la lecture',
          detailsCta: 'Voir réglages et prix',
        }
      : locale === 'es'
        ? {
            prev: 'Anterior',
            next: 'Siguiente',
            page: 'Página',
            loadMore: 'Ver más ejemplos',
            loading: 'Cargando…',
            noPreview: 'Sin vista previa',
            audioAvailable: 'Audio disponible al reproducir',
            detailsCta: 'Ver ajustes y precio',
          }
        : locale === 'zh' ? {
            prev: '上一页', next: '下一页', page: '页', loadMore: '加载更多案例', loading: '加载中…', noPreview: '暂无预览', audioAvailable: '播放时可听音频', detailsCta: '查看设置与价格',
          } : {
            prev: 'Previous',
            next: 'Next',
            page: 'Page',
            loadMore: 'Load more examples',
            loading: 'Loading…',
            noPreview: 'No preview',
            audioAvailable: 'Audio available on playback',
            detailsCta: 'View settings & price',
          };

  return {
    ...fallback,
    prev: pagination.prev ?? fallback.prev,
    next: pagination.next ?? fallback.next,
    page: pagination.page ?? fallback.page,
    loadMore: pagination.loadMore ?? fallback.loadMore,
  };
}

export function getExamplesLongDescription(locale: AppLocale) {
  if (locale === 'fr') {
    return 'Parcourez des exemples vidéo IA par famille de modèles. Ouvrez un exemple pour consulter son prompt, ses réglages, sa durée et le coût enregistré du rendu, puis recréez-le dans votre studio.';
  }
  if (locale === 'es') {
    return 'Explora ejemplos de video IA por modelo. Abre un ejemplo para consultar su prompt, ajustes, duración y costo registrado de la generación, y después recréalo en tu espacio de trabajo.';
  }
  if (locale === 'zh') return '按模型浏览 AI 视频案例。打开案例查看提示词、设置、时长和历史生成费用，再到工作台复用创作。';
  return 'Browse AI video examples by model. Open any example to inspect its prompt, settings, duration, and recorded render cost, then recreate it in your workspace.';
}

export function getKlingExamplesSectionTitles(locale: AppLocale, isKlingLanding: boolean) {
  if (!isKlingLanding) return null;
  if (locale === 'fr') {
    return ['Prompts Kling AI à réutiliser', 'Schémas image-vers-vidéo', 'Réglages et choix du modèle'];
  }
  if (locale === 'es') {
    return ['Prompts de Kling AI para reutilizar', 'Patrones de imagen a video', 'Ajustes y elección del modelo'];
  }
  if (locale === 'zh') return ['可复用的 Kling AI 提示词', '图生视频提示词模式', '设置与模型选择'];
  return ['Kling AI prompts to reuse', 'Image-to-video prompt patterns', 'Settings and model fit'];
}

export function getExamplesModelPageLabels({
  isKlingLanding,
  isLtxLanding,
  isSeedanceLanding,
  locale,
}: {
  isKlingLanding: boolean;
  isLtxLanding: boolean;
  isSeedanceLanding: boolean;
  locale: AppLocale;
}) {
  const modelPagesLabel =
    locale === 'fr'
      ? 'Pages modèles concernées'
      : locale === 'es'
        ? 'Páginas de modelo relacionadas'
        : locale === 'zh' ? '相关模型页面' : 'Related model pages';
  const currentModelPagesLabel =
    isKlingLanding
      ? locale === 'fr'
        ? 'Choisissez votre modèle Kling'
        : locale === 'es'
          ? 'Elige tu modelo Kling'
          : locale === 'zh' ? '选择您的 Kling 模型' : 'Choose your Kling model'
      : isLtxLanding
        ? locale === 'fr'
          ? 'Choisissez votre modèle LTX'
          : locale === 'es'
            ? 'Elige tu modelo LTX'
            : locale === 'zh' ? '选择您的 LTX 模型' : 'Choose your LTX model'
      : isSeedanceLanding
        ? locale === 'fr'
          ? 'Choisissez votre modèle Seedance'
          : locale === 'es'
            ? 'Elige tu modelo Seedance'
            : locale === 'zh' ? '选择您的 Seedance 模型' : 'Choose your Seedance model'
        : locale === 'fr'
          ? 'Pages modèles actuelles'
          : locale === 'es'
            ? 'Páginas de modelo actuales'
            : locale === 'zh' ? '当前模型页面' : 'Current model pages';
  const supportedOlderVersionLabel =
    isKlingLanding
      ? locale === 'fr'
        ? 'Anciens modèles Kling encore pris en charge'
        : locale === 'es'
          ? 'Modelos Kling anteriores aún compatibles'
          : locale === 'zh' ? '仍受支持的旧版 Kling 模型' : 'Supported older Kling models'
      : isLtxLanding
        ? locale === 'fr'
          ? 'Modèles LTX plus anciens encore pris en charge'
          : locale === 'es'
            ? 'Modelos LTX anteriores aún compatibles'
            : locale === 'zh' ? '仍受支持的旧版 LTX 模型' : 'Supported older LTX models'
      : locale === 'fr'
        ? 'Version plus ancienne prise en charge'
        : locale === 'es'
          ? 'Versión anterior compatible'
          : locale === 'zh' ? '仍受支持的旧版模型' : 'Supported older version';
  const pricingLinkLabel =
    locale === 'fr' ? 'Comparer les tarifs' : locale === 'es' ? 'Comparar precios' : locale === 'zh' ? '比较价格' : 'Compare pricing';

  return {
    currentModelPagesLabel,
    modelPagesLabel,
    pricingLinkLabel,
    supportedOlderVersionLabel,
  };
}

export function buildExamplesNextStepLinks({
  appLocale,
  familySlug,
  isKlingLanding,
  isLtxLanding,
  isSeedanceLanding,
  isVeoLanding,
  locale,
  pricingPath,
}: {
  appLocale: AppLocale;
  familySlug?: string;
  isKlingLanding: boolean;
  isLtxLanding: boolean;
  isSeedanceLanding: boolean;
  isVeoLanding: boolean;
  locale: AppLocale;
  pricingPath: string;
}): ExamplesNextStepLink[] {
  const compareLabel = locale === 'fr' ? 'Comparer' : locale === 'es' ? 'Comparar' : locale === 'zh' ? '对比' : 'Compare';
  const comparisonLink = (slug: string, label: string): ExamplesNextStepLink => {
    const separator = slug.indexOf('-vs-');
    return {
      href: buildCompareHref(appLocale, slug),
      label: locale === 'zh' ? label.replace(/ vs /g, ' 对比 ') : `${compareLabel} ${label}`,
      comparison: separator > 0 ? [slug.slice(0, separator), slug.slice(separator + 4)] : undefined,
    };
  };
  const family = familySlug ?? (isLtxLanding ? 'ltx' : isKlingLanding ? 'kling' : isSeedanceLanding ? 'seedance' : isVeoLanding ? 'veo' : '');
  // Lead with the current generation; retain selected historical comparisons for
  // visitors evaluating older examples. Published routes remain unchanged.
  const comparisons: Record<string, Array<[string, string]>> = {
    ltx: [
      ['ltx-2-5-fast-vs-ltx-2-5-pro', 'LTX 2.5 Fast vs Pro'],
      ['ltx-2-5-pro-vs-seedance-2-5', 'LTX 2.5 Pro vs Seedance 2.5'],
      ['ltx-2-5-pro-vs-veo-3-1', 'LTX 2.5 Pro vs Veo 3.1'],
      ['ltx-2-3-fast-vs-ltx-2-3-pro', 'LTX 2.3 Fast vs Pro'],
    ],
    kling: [
      ['kling-3-pro-vs-seedance-2-5', 'Kling 3 Pro vs Seedance 2.5'],
      ['kling-3-pro-vs-minimax-h3', 'Kling 3 Pro vs MiniMax H3'],
      ['kling-3-pro-vs-veo-3-1', 'Kling 3 Pro vs Veo 3.1'],
      ['kling-3-pro-vs-kling-3-standard', 'Kling 3 Pro vs Standard'],
    ],
    seedance: [
      ['seedance-2-5-vs-minimax-h3', 'Seedance 2.5 vs MiniMax H3'],
      ['seedance-2-5-vs-kling-3-pro', 'Seedance 2.5 vs Kling 3 Pro'],
      ['seedance-2-5-vs-veo-3-1', 'Seedance 2.5 vs Veo 3.1'],
      ['seedance-2-0-vs-seedance-2-0-fast', 'Seedance 2.0 vs Fast'],
    ],
    veo: [
      ['gemini-omni-flash-vs-veo-3-1', 'Gemini Omni Flash 1.1 vs Veo 3.1'],
      ['veo-3-1-vs-seedance-2-5', 'Veo 3.1 vs Seedance 2.5'],
      ['veo-3-1-vs-minimax-h3', 'Veo 3.1 vs MiniMax H3'],
      ['veo-3-1-vs-veo-3-1-fast', 'Veo 3.1 vs Fast'],
    ],
    hailuo: [
      ['minimax-h3-vs-minimax-h3-max', 'MiniMax H3 vs H3 Max'],
      ['minimax-h3-vs-veo-3-1', 'MiniMax H3 vs Veo 3.1'],
      ['minimax-h3-max-vs-seedance-2-5', 'MiniMax H3 Max vs Seedance 2.5'],
      ['minimax-hailuo-02-text-vs-veo-3-1-fast', 'Hailuo 02 vs Veo 3.1 Fast'],
    ],
    wan: [
      ['wan-3-vs-wan-3-prime', 'Wan 3 vs Wan 3 Prime'],
      ['wan-3-prime-vs-seedance-2-5', 'Wan 3 Prime vs Seedance 2.5'],
      ['wan-3-vs-kling-3-pro', 'Wan 3 vs Kling 3 Pro'],
    ],
  };
  const selected = comparisons[family];
  if (selected) return selected.map(([slug, label]) => comparisonLink(slug, label));
  return [
    { href: buildModelHref(appLocale, 'seedance-2-5'), label: 'Seedance 2.5', modelSlug: 'seedance-2-5' },
    { href: buildModelHref(appLocale, 'minimax-h3'), label: 'MiniMax H3', modelSlug: 'minimax-h3' },
    { href: buildModelHref(appLocale, 'wan-3'), label: 'Wan 3', modelSlug: 'wan-3' },
    comparisonLink('kling-3-pro-vs-seedance-2-5', 'Kling 3 Pro vs Seedance 2.5'),
    { href: pricingPath, label: locale === 'fr' ? 'Voir les tarifs' : locale === 'es' ? 'Ver precios' : locale === 'zh' ? '查看价格' : 'View pricing' },
  ];
}

export function getExamplesMainVideoCopy(locale: AppLocale, familySlug?: string) {
  const showRecreationHint = familySlug === 'veo' || familySlug === 'hailuo';
  if (locale === 'fr') {
    return {
      recreationHint: showRecreationHint
        ? 'Depuis la fiche, reprenez cet exemple dans le studio, ajoutez vos sources et vérifiez le devis avant de générer.'
        : undefined,
      preview: 'Aperçu',
      openExample: 'Voir réglages et prix',
      openWatchPage: 'Ouvrir les détails de la vidéo',
      audioOn: 'Audio activé',
      fullPrompt: 'Prompt complet',
    };
  }
  if (locale === 'es') {
    return {
      recreationHint: showRecreationHint
        ? 'Desde la ficha, recrea este ejemplo en tu espacio de trabajo, añade tus fuentes y revisa el presupuesto antes de generar.'
        : undefined,
      preview: 'Vista previa',
      openExample: 'Ver ajustes y precio',
      openWatchPage: 'Abrir los detalles del video',
      audioOn: 'Audio activado',
      fullPrompt: 'Prompt completo',
    };
  }
  if (locale === 'zh') return {
    recreationHint: showRecreationHint ? '在详情页将此案例带入工作台，添加您的源素材，并在生成前检查报价。' : undefined,
    preview: '预览', openExample: '查看设置与价格', openWatchPage: '打开视频详情', audioOn: '音频已开启', fullPrompt: '完整提示词',
  };
  return {
    recreationHint: showRecreationHint
      ? 'From the detail page, recreate this example in your workspace, add your sources and review the quote before generating.'
      : undefined,
    preview: 'Preview',
    openExample: 'View settings & price',
    openWatchPage: 'Open video details',
    audioOn: 'Audio on',
    fullPrompt: 'Full prompt',
  };
}
