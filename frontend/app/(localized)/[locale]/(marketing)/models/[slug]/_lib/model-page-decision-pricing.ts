import type { AppLocale } from '@/i18n/locales';
import type { FalEngineEntry } from '@/config/falEngines';
import { CUSTOMER_CURRENCY } from '@/lib/customer-currency';

import { getImagePresetQuote, getPresetQuote, type VideoPriceScenario } from '../../../pricing/_lib/pricingHubData';
import type {
  ModelPageFixedPricingPreset,
  ModelPageImagePricingPreset,
  ModelPagePricingPreset,
  ModelPageVideoPricingPreset,
} from './model-page-template-types';

export type ModelDecisionPricingScenario = {
  id: string;
  label: string;
  value: string;
  note: string;
  badge?: string;
};

const SCENARIO_COPY: Record<
  AppLocale,
  Record<string, string>
> = {
  en: {
    audio: 'Audio',
    audioExtraValue: '$0 extra',
    audioLedWorkflow: 'Audio-led workflow',
    checkLiveQuote: 'Check live quote',
    commonProductionCheck: 'Common production check',
    deliveryRender: 'Delivery render',
    entryDraft: 'Entry draft',
    entryText: '5s · 768P · from text',
    imageProduction: '10s · 2K · from an image',
    referenceFinal: '15s · 4K · with references',
    fullImageReferenceSet: '10s · 2K · 9 reference images',
    eightSeconds1080p: '8s · 1080p',
    finalDelivery: 'Final delivery',
    fourSeconds720p: '4s · 720p',
    fourSeconds720pAudioIncluded: '4s · 720p · audio included',
    fourSeconds720pAudioOn: '4s · 720p · audio on',
    fourGeneratedImages: '4 generated images · $0.06/image',
    fourKImage: '4K image',
    fourKStill: '4K still',
    fourKReference: '4K reference',
    fiveSeconds480p: '5s · 480p',
    generateModesOnly: 'Generate modes only',
    imageBatch: 'Reference set',
    highResolutionStill: 'High-resolution still',
    imagePrep: 'Reference prep',
    imageToVideo1080pCheck: 'I2V 1080p check',
    imageToVideoRouteOnly: 'Image-to-video route',
    maxDuration: 'Max duration',
    mostPopular: 'Most popular',
    motionDraft: 'Motion draft',
    nativeAudioIncluded: 'Native audio included',
    nativeAudioWorkflow: 'Native-audio workflow',
    nativeAudioShot: 'Native-audio shot',
    native4K: 'Native 4K',
    polishedShort: 'Polished short',
    productStill: 'Product still',
    proWorkflow: 'Pro workflow',
    referenceBatch: 'Reference batch',
    referenceEditSet: 'Reference edit set',
    heroEdit: 'Hero edit',
    storyboardPass: 'Storyboard pass',
    singleEdit: 'Single edit',
    standardPreview: 'Standard preview',
    eightSeconds720p: '8s · 720p',
    tenSeconds1080p: '10s · 1080p',
    tenSeconds1080pDraft: '10s · 1080p draft',
    singleGeneratedStill: 'Single generated still',
    sourceImageEdit: 'Source image edit',
    sourcePlusThreeReferences: 'Source + 3 references',
    stillImage: 'Still image',
    twoKHeroImage: '2K hero image',
    twoKImage: '2K image',
    twoKStill: '2K still',
    fourKHeroStill: '4K hero still',
    fiveSeconds480pAudioIncluded: '5s · 480p · audio included',
    fourSeconds720pAudioOff: '4s · 720p · audio off',
    fiveSeconds1080pAudioOff: '5s · 1080p · audio off',
    fiveSeconds1080pAudioOn: '5s · 1080p · audio on',
    mediumVariantSet: '4 medium variants',
    eightSeconds720pAudioIncluded: '8s · 720p · audio included',
    sixSeconds720pAudioOn: '6s · 720p · audio on',
    sixSeconds720pAudioIncluded: '6s · 720p · audio included',
    eightSeconds1080pAudioOn: '8s · 1080p · audio on',
    stylizedDraft: 'Stylized draft',
    socialLoop: 'Social loop',
    eightSeconds1080pAudioIncluded: '8s · 1080p · audio included',
    tenSeconds720pAudioIncluded: '10s · 720p · audio included',
    tenSeconds1080pAudioOn: '10s · 1080p · audio on',
    fifteenSeconds1080pAudioOn: '15s · 1080p · audio on',
    twelveSeconds1080p: '12s · 1080p',
    upTo15Images: 'Up to 15 generated/reference images total',
    upTo4K: 'Up to 4K',
    upTo720p: 'Up to 720p',
    upTo768p: 'Up to 768p',
    upTo1080p: 'Up to 1080p',
    upTo1080pI2vOnly: '1080p in I2V only',
  },
  fr: {
    audio: 'Audio',
    audioExtraValue: '0 $ en plus',
    audioLedWorkflow: 'Création à partir d’un audio',
    checkLiveQuote: 'Vérifier le prix actuel',
    commonProductionCheck: 'Usage courant',
    deliveryRender: 'Rendu final',
    entryDraft: 'Premier essai',
    entryText: '5 s · 768P · depuis un texte',
    imageProduction: '10 s · 2K · depuis une image',
    referenceFinal: '15 s · 4K · avec références',
    fullImageReferenceSet: '10 s · 2K · 9 images de référence',
    eightSeconds1080p: '8 s · 1080p',
    finalDelivery: 'Livraison finale',
    fourSeconds720p: '4 s · 720p',
    fourSeconds720pAudioIncluded: '4 s · 720p · audio inclus',
    fourSeconds720pAudioOn: '4 s · 720p · audio activé',
    fourGeneratedImages: '4 images générées · 0,06 $/image',
    fourKImage: 'Image 4K',
    fourKStill: 'Image fixe 4K',
    fourKReference: 'Référence 4K',
    fiveSeconds480p: '5 s · 480p',
    generateModesOnly: 'Modes de génération uniquement',
    imageBatch: 'Jeu de références',
    highResolutionStill: 'Image haute résolution',
    imagePrep: 'Préparer une image de référence',
    imageToVideo1080pCheck: 'Essai image vers vidéo en 1080p',
    imageToVideoRouteOnly: 'Image vers vidéo uniquement',
    maxDuration: 'Durée max',
    mostPopular: 'Populaire',
    motionDraft: 'Essai de mouvement',
    nativeAudioIncluded: 'Audio natif inclus',
    nativeAudioWorkflow: 'Création avec audio natif',
    nativeAudioShot: 'Plan avec audio natif',
    native4K: '4K native',
    polishedShort: 'Vidéo courte finalisée',
    productStill: 'Image produit',
    proWorkflow: 'Création professionnelle',
    referenceBatch: 'Lot de références',
    referenceEditSet: 'Retouches avec références',
    heroEdit: 'Retoucher le visuel principal',
    storyboardPass: 'Prévisualisation du storyboard',
    singleEdit: 'Retouche simple',
    standardPreview: 'Aperçu standard',
    eightSeconds720p: '8 s · 720p',
    tenSeconds1080p: '10 s · 1080p',
    tenSeconds1080pDraft: '10 s · 1080p brouillon',
    singleGeneratedStill: 'Image fixe générée',
    sourceImageEdit: 'Retouche image source',
    sourcePlusThreeReferences: 'Source + 3 références',
    stillImage: 'Image fixe',
    twoKHeroImage: 'Visuel 2K',
    twoKImage: 'Image 2K',
    twoKStill: 'Image 2K',
    fourKHeroStill: 'Visuel 4K',
    fiveSeconds480pAudioIncluded: '5 s · 480p · audio inclus',
    fourSeconds720pAudioOff: '4 s · 720p · audio désactivé',
    fiveSeconds1080pAudioOff: '5 s · 1080p · audio désactivé',
    fiveSeconds1080pAudioOn: '5 s · 1080p · audio activé',
    mediumVariantSet: '4 variantes en taille moyenne',
    eightSeconds720pAudioIncluded: '8 s · 720p · audio inclus',
    sixSeconds720pAudioOn: '6 s · 720p · audio activé',
    sixSeconds720pAudioIncluded: '6 s · 720p · audio inclus',
    eightSeconds1080pAudioOn: '8 s · 1080p · audio activé',
    stylizedDraft: 'Brouillon stylisé',
    socialLoop: 'Vidéo en boucle pour les réseaux',
    eightSeconds1080pAudioIncluded: '8 s · 1080p · audio inclus',
    tenSeconds720pAudioIncluded: '10 s · 720p · audio inclus',
    tenSeconds1080pAudioOn: '10 s · 1080p · audio activé',
    fifteenSeconds1080pAudioOn: '15 s · 1080p · audio activé',
    twelveSeconds1080p: '12 s · 1080p',
    upTo15Images: 'Jusqu’à 15 images générées/références au total',
    upTo4K: 'Jusqu’à 4K',
    upTo720p: 'Jusqu’à 720p',
    upTo768p: 'Jusqu’à 768p',
    upTo1080p: 'Jusqu’à 1080p',
    upTo1080pI2vOnly: '1080p en I2V uniquement',
  },
  es: {
    audio: 'Audio',
    audioExtraValue: '0 $ extra',
    audioLedWorkflow: 'Flujo guiado por audio',
    checkLiveQuote: 'Consultar el precio actual',
    commonProductionCheck: 'Uso habitual',
    deliveryRender: 'Render de entrega',
    entryDraft: 'Borrador inicial',
    entryText: '5 s · 768P · desde texto',
    imageProduction: '10 s · 2K · desde una imagen',
    referenceFinal: '15 s · 4K · con referencias',
    fullImageReferenceSet: '10 s · 2K · 9 imágenes de referencia',
    eightSeconds1080p: '8 s · 1080p',
    finalDelivery: 'Entrega final',
    fourSeconds720p: '4 s · 720p',
    fourSeconds720pAudioIncluded: '4 s · 720p · audio incluido',
    fourSeconds720pAudioOn: '4 s · 720p · audio activado',
    fourGeneratedImages: '4 imágenes generadas · 0,06 $/imagen',
    fourKImage: 'Imagen 4K',
    fourKStill: 'Imagen fija 4K',
    fourKReference: 'Referencia 4K',
    fiveSeconds480p: '5 s · 480p',
    generateModesOnly: 'Solo modos de generación',
    imageBatch: 'Conjunto de referencias',
    highResolutionStill: 'Imagen de alta resolución',
    imagePrep: 'Preparación de referencias',
    imageToVideo1080pCheck: 'Prueba de imagen a video en 1080p',
    imageToVideoRouteOnly: 'Solo imagen a video',
    maxDuration: 'Duración máxima',
    mostPopular: 'Popular',
    motionDraft: 'Borrador de movimiento',
    nativeAudioIncluded: 'Audio nativo incluido',
    nativeAudioWorkflow: 'Flujo con audio nativo',
    nativeAudioShot: 'Toma con audio nativo',
    native4K: '4K nativo',
    polishedShort: 'Video corto terminado',
    productStill: 'Imagen de producto',
    proWorkflow: 'Flujo Pro',
    referenceBatch: 'Lote de referencias',
    referenceEditSet: 'Ediciones con imágenes de referencia',
    heroEdit: 'Editar la imagen principal',
    storyboardPass: 'Vista previa del storyboard',
    singleEdit: 'Edición simple',
    standardPreview: 'Vista previa estándar',
    eightSeconds720p: '8 s · 720p',
    tenSeconds1080p: '10 s · 1080p',
    tenSeconds1080pDraft: '10 s · 1080p borrador',
    singleGeneratedStill: 'Imagen fija generada',
    sourceImageEdit: 'Edición de imagen fuente',
    sourcePlusThreeReferences: 'Fuente + 3 referencias',
    stillImage: 'Imagen fija',
    twoKHeroImage: 'Imagen 2K',
    twoKImage: 'Imagen 2K',
    twoKStill: 'Imagen 2K',
    fourKHeroStill: 'Imagen 4K',
    fiveSeconds480pAudioIncluded: '5 s · 480p · audio incluido',
    fourSeconds720pAudioOff: '4 s · 720p · audio desactivado',
    fiveSeconds1080pAudioOff: '5 s · 1080p · audio desactivado',
    fiveSeconds1080pAudioOn: '5 s · 1080p · audio activado',
    mediumVariantSet: '4 variantes de tamaño mediano',
    eightSeconds720pAudioIncluded: '8 s · 720p · audio incluido',
    sixSeconds720pAudioOn: '6 s · 720p · audio activado',
    sixSeconds720pAudioIncluded: '6 s · 720p · audio incluido',
    eightSeconds1080pAudioOn: '8 s · 1080p · audio activado',
    stylizedDraft: 'Borrador estilizado',
    socialLoop: 'Video en bucle para redes',
    eightSeconds1080pAudioIncluded: '8 s · 1080p · audio incluido',
    tenSeconds720pAudioIncluded: '10 s · 720p · audio incluido',
    tenSeconds1080pAudioOn: '10 s · 1080p · audio activado',
    fifteenSeconds1080pAudioOn: '15 s · 1080p · audio activado',
    twelveSeconds1080p: '12 s · 1080p',
    upTo15Images: 'Hasta 15 imágenes generadas/referencias en total',
    upTo4K: 'Hasta 4K',
    upTo720p: 'Hasta 720p',
    upTo768p: 'Hasta 768p',
    upTo1080p: 'Hasta 1080p',
    upTo1080pI2vOnly: '1080p solo en I2V',
  },
  zh: {
    audio: '音频',
    audioExtraValue: '0 美元额外费用',
    audioLedWorkflow: '音频主导工作流',
    checkLiveQuote: '查看实时报价',
    commonProductionCheck: '常见制作测试',
    deliveryRender: '交付级渲染',
    entryDraft: '初级草稿',
    entryText: '5秒 · 768P · 文生视频',
    imageProduction: '10秒 · 2K · 图生视频',
    referenceFinal: '15秒 · 4K · 参考图引导',
    fullImageReferenceSet: '10秒 · 2K · 9张参考图',
    eightSeconds1080p: '8秒 · 1080p',
    finalDelivery: '最终交付',
    fourSeconds720p: '4秒 · 720p',
    fourSeconds720pAudioIncluded: '4秒 · 720p · 包含音频',
    fourSeconds720pAudioOn: '4秒 · 720p · 音频开启',
    fourGeneratedImages: '4张生成图像 · 0.06美元/张',
    fourKImage: '4K 图像',
    fourKStill: '4K 静态图',
    fourKReference: '4K 参考图',
    fiveSeconds480p: '5秒 · 480p',
    generateModesOnly: '仅生成模式',
    imageBatch: '参考图集',
    highResolutionStill: '高分辨率静态图',
    imagePrep: '参考图准备',
    imageToVideo1080pCheck: '图生视频 1080p 测试',
    imageToVideoRouteOnly: '仅图生视频路由',
    maxDuration: '最大时长',
    mostPopular: '最受欢迎',
    motionDraft: '动态草稿',
    nativeAudioIncluded: '包含原生音频',
    nativeAudioWorkflow: '原生音频工作流',
    nativeAudioShot: '原生音频镜头',
    native4K: '原生 4K',
    polishedShort: '精修短片',
    productStill: '产品静态图',
    proWorkflow: '专业工作流',
    referenceBatch: '批量参考图',
    referenceEditSet: '参考图编辑集',
    heroEdit: '主图编辑',
    storyboardPass: '分镜测试',
    singleEdit: '单次编辑',
    standardPreview: '标准预览',
    eightSeconds720p: '8秒 · 720p',
    tenSeconds1080p: '10秒 · 1080p',
    tenSeconds1080pDraft: '10秒 · 1080p 草稿',
    singleGeneratedStill: '单张生成静态图',
    sourceImageEdit: '原图编辑',
    sourcePlusThreeReferences: '原图 + 3张参考图',
    stillImage: '静态图像',
    twoKHeroImage: '2K 主图',
    twoKImage: '2K 图像',
    twoKStill: '2K 静态图',
    fourKHeroStill: '4K 主静态图',
    fiveSeconds480pAudioIncluded: '5秒 · 480p · 包含音频',
    fourSeconds720pAudioOff: '4秒 · 720p · 音频关闭',
    fiveSeconds1080pAudioOff: '5秒 · 1080p · 音频关闭',
    fiveSeconds1080pAudioOn: '5秒 · 1080p · 音频开启',
    mediumVariantSet: '4种中等尺寸变体',
    eightSeconds720pAudioIncluded: '8秒 · 720p · 包含音频',
    sixSeconds720pAudioOn: '6秒 · 720p · 音频开启',
    sixSeconds720pAudioIncluded: '6秒 · 720p · 包含音频',
    eightSeconds1080pAudioOn: '8秒 · 1080p · 音频开启',
    stylizedDraft: '风格化草稿',
    socialLoop: '社交媒体循环视频',
    eightSeconds1080pAudioIncluded: '8秒 · 1080p · 包含音频',
    tenSeconds720pAudioIncluded: '10秒 · 720p · 包含音频',
    tenSeconds1080pAudioOn: '10秒 · 1080p · 音频开启',
    fifteenSeconds1080pAudioOn: '15秒 · 1080p · 音频开启',
    twelveSeconds1080p: '12秒 · 1080p',
    upTo15Images: '总计最多 15 张生成/参考图像',
    upTo4K: '最高 4K',
    upTo720p: '最高 720p',
    upTo768p: '最高 768p',
    upTo1080p: '最高 1080p',
    upTo1080pI2vOnly: '仅在图生视频中支持 1080p',
  },
};

function formatSeconds(seconds: number, locale: AppLocale) {
  if (locale === 'en') return `${seconds}s`;
  if (locale === 'zh') return `${seconds}秒`;
  return `${seconds} s`;
}

function getMaxDurationSeconds(entry: FalEngineEntry) {
  return entry.engine.pricingDetails?.maxDurationSec ?? entry.engine.maxDurationSec;
}

const CNY_MONETARY_COPY: Record<AppLocale, Record<'audioExtraValue' | 'fourGeneratedImages', string>> = {
  en: { audioExtraValue: '¥0 extra', fourGeneratedImages: '4 generated images' },
  fr: { audioExtraValue: '0 ¥ en plus', fourGeneratedImages: '4 images générées' },
  es: { audioExtraValue: '0 ¥ extra', fourGeneratedImages: '4 imágenes generadas' },
  zh: { audioExtraValue: '音频无额外费用', fourGeneratedImages: '4 张生成图像' },
};

function getPricingLabel(locale: AppLocale, key: string) {
  if (CUSTOMER_CURRENCY === 'CNY' && (key === 'audioExtraValue' || key === 'fourGeneratedImages')) {
    return CNY_MONETARY_COPY[locale][key];
  }
  const copy = SCENARIO_COPY[locale] ?? SCENARIO_COPY.en;
  return copy[key] ?? SCENARIO_COPY.en[key] ?? key;
}

function isFixedPreset(preset: ModelPagePricingPreset): preset is ModelPageFixedPricingPreset {
  return typeof preset.fixedValueKey === 'string';
}

function isImagePreset(preset: ModelPagePricingPreset): preset is ModelPageImagePricingPreset {
  return typeof preset.imageResolution === 'string';
}

function isVideoPreset(preset: ModelPagePricingPreset): preset is ModelPageVideoPricingPreset {
  return typeof preset.seconds === 'number' && typeof preset.resolution === 'string';
}

function buildPricedScenarioPreset(preset: ModelPageVideoPricingPreset): VideoPriceScenario {
  return {
    id: preset.id,
    label: `${preset.seconds}s ${preset.resolution}`,
    subLabel: preset.labelKey,
    resolution: preset.resolution,
    durationSec: preset.seconds,
    audio: preset.audio ?? false,
    mode: preset.mode,
    referenceImageCount: preset.referenceImageCount,
  };
}

function buildScenarioFromPreset({
  entry,
  locale,
  preset,
}: {
  entry: FalEngineEntry;
  locale: AppLocale;
  preset: ModelPagePricingPreset;
}): ModelDecisionPricingScenario {
  if (isFixedPreset(preset) && preset.fixedValueKey === 'audioExtraValue') {
    return {
      id: preset.id,
      label: getPricingLabel(locale, preset.labelKey),
      value: getPricingLabel(locale, 'audioExtraValue'),
      note: getPricingLabel(locale, preset.noteKey ?? 'nativeAudioIncluded'),
    };
  }

  if (isFixedPreset(preset) && preset.fixedValueKey === 'maxDurationValue') {
    return {
      id: preset.id,
      label: getPricingLabel(locale, preset.labelKey),
      value: formatSeconds(getMaxDurationSeconds(entry), locale),
      note: getPricingLabel(locale, preset.noteKey ?? 'upTo1080p'),
    };
  }

  if (isImagePreset(preset)) {
    const quote = getImagePresetQuote(
      entry,
      {
        id: preset.id,
        resolution: preset.imageResolution,
        quality: preset.imageQuality,
        mode: preset.mode,
        referenceImageCount: preset.referenceImageCount,
        quantity: preset.quantity,
      },
      locale
    );

    return {
      id: preset.id,
      label: getPricingLabel(locale, preset.labelKey),
      value: quote.display ?? '',
      note: preset.noteKey ? getPricingLabel(locale, preset.noteKey) : (quote.note ?? preset.imageResolution),
      badge: preset.highlightKey ? getPricingLabel(locale, preset.highlightKey) : undefined,
    };
  }

  if (!isVideoPreset(preset)) {
    return {
      id: preset.id,
      label: getPricingLabel(locale, preset.labelKey),
      value: '',
      note: getPricingLabel(locale, preset.noteKey ?? 'upTo1080p'),
    };
  }

  const quote = getPresetQuote(entry, buildPricedScenarioPreset(preset), locale);

  return {
    id: preset.id,
    label: getPricingLabel(locale, preset.labelKey),
    value: quote.display ?? '',
    note: preset.noteKey ? getPricingLabel(locale, preset.noteKey) : (quote.note ?? `${formatSeconds(preset.seconds, locale)} · ${preset.resolution}`),
    badge: preset.highlightKey ? getPricingLabel(locale, preset.highlightKey) : undefined,
  };
}

export function buildDecisionPricingScenarios(
  entry: FalEngineEntry,
  locale: AppLocale,
  presets: ModelPagePricingPreset[]
): ModelDecisionPricingScenario[] {
  return presets.map((preset) => buildScenarioFromPreset({ entry, locale, preset }));
}
