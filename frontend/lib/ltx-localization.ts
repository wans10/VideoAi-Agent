import type { AppLocale } from '@/i18n/locales';
import type { EngineInputField, Mode } from '@/types/engines';
import { ASSET_DROPZONE_COPY, type AssetDropzoneCopy } from './ltx-asset-dropzone-copy';

type UiLocale = Extract<AppLocale, 'en' | 'fr' | 'es' | 'zh'>;

type FieldCopy = {
  label: string;
  description?: string;
};

type WorkflowCopy = {
  generateVideo: string;
  removeAudioToUnlock: string;
  audioUnsupported: string;
  audioLocked: string;
  audioLockedFallback: string;
  removeAudioToUseEdit: string;
  clearReferencesToUseStartEnd: string;
  clearStartEndToUseReferences: string;
  addReferenceMediaBeforeAudio: string;
  addSourceVideo: (modeLabel: string) => string;
  workflowOptionsTitle: string;
  workflowOptionsSubtitle: string;
  selectOption: string;
  defaultOption: string;
};

const MODE_LABELS: Record<UiLocale, Record<Mode, string>> = {
  en: {
    t2v: 'Text → Video',
    i2v: 'Image → Video',
    ref2v: 'Reference → Video',
    fl2v: 'First/Last',
    v2v: 'Modify Video',
    r2v: 'Video → Video',
    a2v: 'Audio → Video',
    extend: 'Extend Video',
    retake: 'Retake Video',
    reframe: 'Reframe Video',
    t2i: 'Text → Image',
    i2i: 'Image → Image',
  },
  fr: {
    t2v: 'Texte → Vidéo',
    i2v: 'Image → Vidéo',
    ref2v: 'Références → Vidéo',
    fl2v: 'Première / Dernière image',
    v2v: 'Modifier la vidéo',
    r2v: 'Vidéo → Vidéo',
    a2v: 'Audio → Vidéo',
    extend: 'Étendre la vidéo',
    retake: 'Retake vidéo',
    reframe: 'Recadrer la vidéo',
    t2i: 'Texte → Image',
    i2i: 'Image → Image',
  },
  es: {
    t2v: 'Texto → Video',
    i2v: 'Imagen → Video',
    ref2v: 'Referencias → Video',
    fl2v: 'Primer / Último frame',
    v2v: 'Modificar video',
    r2v: 'Video → Video',
    a2v: 'Audio → Video',
    extend: 'Extender video',
    retake: 'Retake de video',
    reframe: 'Reencuadrar video',
    t2i: 'Texto → Imagen',
    i2i: 'Imagen → Imagen',
  },
  zh: {
    t2v: '文生视频',
    i2v: '图生视频',
    ref2v: '参考生视频',
    fl2v: '首尾帧',
    v2v: '修改视频',
    r2v: '视频转视频',
    a2v: '音频生视频',
    extend: '延长视频',
    retake: '重新拍摄',
    reframe: '重构画面',
    t2i: '文生图',
    i2i: '图生图',
  },
};

const LTX_FIELD_COPY: Record<UiLocale, Record<string, FieldCopy>> = {
  en: {
    prompt: { label: 'Prompt' },
    negative_prompt: { label: 'Negative prompt' },
    image_url: {
      label: 'Start image',
      description: 'Use this still as the first frame that anchors the motion.',
    },
    end_image_url: {
      label: 'End image',
      description: 'Optional final frame for start-to-end transitions in Image → Video.',
    },
    audio_url: {
      label: 'Source audio',
      description: 'Required for Audio → Video. Video length follows the audio file duration.',
    },
    video_url: {
      label: 'Source video',
      description: 'Upload or reuse a previous render to extend it or retake a section.',
    },
    guidance_scale: {
      label: 'Guidance scale',
      description: 'Adjust how strongly the result should follow the prompt.',
    },
    context: {
      label: 'Context window',
      description: 'Controls how much of the source video is considered during the extension.',
    },
    mode: {
      label: 'Extend position',
      description: 'Choose whether the extension is added before the clip or after it.',
    },
    start_time: {
      label: 'Start time',
      description: 'Set where the retake begins inside the source video.',
    },
    retake_mode: {
      label: 'Retake mode',
      description: 'Choose how the source segment should be replaced.',
    },
  },
  fr: {
    prompt: { label: 'Prompt' },
    negative_prompt: { label: 'Prompt négatif' },
    image_url: {
      label: 'Image de départ',
      description: "Utilisez cette image comme première frame pour ancrer le mouvement.",
    },
    end_image_url: {
      label: 'Image de fin',
      description: "Frame finale optionnelle pour les transitions début → fin en Image → Vidéo.",
    },
    audio_url: {
      label: 'Audio source',
      description: "Obligatoire en Audio → Vidéo. La durée vidéo suit la durée du fichier audio.",
    },
    video_url: {
      label: 'Vidéo source',
      description: 'Importez ou réutilisez un rendu précédent pour l’étendre ou refaire une section.',
    },
    guidance_scale: {
      label: 'Force du guidage',
      description: 'Ajuste à quel point le résultat doit suivre le prompt.',
    },
    context: {
      label: 'Fenêtre de contexte',
      description: 'Détermine quelle portion de la vidéo source est prise en compte pendant l’extension.',
    },
    mode: {
      label: 'Position de l’extension',
      description: 'Choisissez si l’extension est ajoutée avant le clip ou après.',
    },
    start_time: {
      label: 'Temps de départ',
      description: 'Définissez le point de départ du retake dans la vidéo source.',
    },
    retake_mode: {
      label: 'Mode de retake',
      description: 'Choisissez comment la portion source doit être remplacée.',
    },
  },
  es: {
    prompt: { label: 'Prompt' },
    negative_prompt: { label: 'Prompt negativo' },
    image_url: {
      label: 'Imagen inicial',
      description: 'Usa esta imagen como primer frame para anclar el movimiento.',
    },
    end_image_url: {
      label: 'Imagen final',
      description: 'Frame final opcional para transiciones inicio → fin en Imagen → Video.',
    },
    audio_url: {
      label: 'Audio fuente',
      description: 'Obligatorio en Audio → Video. La duración del video sigue la duración del audio.',
    },
    video_url: {
      label: 'Video fuente',
      description: 'Sube o reutiliza un render previo para extenderlo o rehacer una sección.',
    },
    guidance_scale: {
      label: 'Intensidad de guía',
      description: 'Ajusta cuánto debe seguir el resultado al prompt.',
    },
    context: {
      label: 'Ventana de contexto',
      description: 'Controla cuánto del video fuente se toma en cuenta durante la extensión.',
    },
    mode: {
      label: 'Posición de extensión',
      description: 'Elige si la extensión se agrega antes del clip o después.',
    },
    start_time: {
      label: 'Tiempo de inicio',
      description: 'Define dónde empieza el retake dentro del video fuente.',
    },
    retake_mode: {
      label: 'Modo de retake',
      description: 'Elige cómo debe reemplazarse el segmento fuente.',
    },
  },
  zh: {
    prompt: { label: '提示词' },
    negative_prompt: { label: '反向提示词' },
    image_url: {
      label: '起始图像',
      description: '使用此静态图像作为定位动作的第一帧。',
    },
    end_image_url: {
      label: '结束图像',
      description: '图生视频起始到结束过渡的可选尾帧。',
    },
    audio_url: {
      label: '源音频',
      description: '音频生视频必填项。视频时长随音频文件长度确定。',
    },
    video_url: {
      label: '源视频',
      description: '上传或复用先前的渲染作品以进行延长或重新拍摄片段。',
    },
    guidance_scale: {
      label: '引导系数',
      description: '调整生成结果遵循提示词的紧密程度。',
    },
    context: {
      label: '上下文窗口',
      description: '控制在延长视频时参考源视频的时长范围。',
    },
    mode: {
      label: '延长位置',
      description: '选择将扩展内容添加到片段之前还是之后。',
    },
    start_time: {
      label: '起始时间',
      description: '设置在源视频中重新拍摄的开始位置。',
    },
    retake_mode: {
      label: '重拍模式',
      description: '选择如何替换源视频片段。',
    },
  },
};

const WORKFLOW_COPY: Record<UiLocale, WorkflowCopy> = {
  en: {
    generateVideo: 'Generate Video',
    removeAudioToUnlock: 'Remove the audio source to unlock Extend Video and Retake Video.',
    audioUnsupported: 'This engine does not support Audio → Video. Remove the audio source or switch to LTX 2.3 Pro.',
    audioLocked:
      'Audio source detected. LTX 2.3 Pro is now locked to Audio → Video. Extend Video and Retake Video will unlock again when you remove the audio source.',
    audioLockedFallback:
      'Audio source detected. The available controls are now limited to Audio → Video settings until you remove the audio source.',
    removeAudioToUseEdit: 'Remove the audio source to use Extend Video or Retake Video.',
    clearReferencesToUseStartEnd: 'Clear the Seedance reference files to use start and end images.',
    clearStartEndToUseReferences: 'Clear the start or end images to use Seedance reference files.',
    addReferenceMediaBeforeAudio: 'Add at least one reference image or reference video before using reference audio.',
    addSourceVideo: (modeLabel) => `Add a source video before running ${modeLabel}.`,
    workflowOptionsTitle: 'Workflow options',
    workflowOptionsSubtitle: 'Settings specific to this workflow.',
    selectOption: 'Select an option',
    defaultOption: 'Default',
  },
  fr: {
    generateVideo: 'Générer la vidéo',
    removeAudioToUnlock: "Retirez l'audio source pour réactiver Étendre la vidéo et Retake vidéo.",
    audioUnsupported:
      "Ce moteur ne prend pas en charge Audio → Vidéo. Retirez l'audio source ou passez sur LTX 2.3 Pro.",
    audioLocked:
      "Audio source détecté. LTX 2.3 Pro est maintenant verrouillé sur Audio → Vidéo. Étendre la vidéo et Retake vidéo se réactiveront quand vous retirerez l'audio source.",
    audioLockedFallback:
      'Audio source détecté. Les contrôles disponibles sont désormais limités aux réglages Audio → Vidéo jusqu’au retrait du fichier audio.',
    removeAudioToUseEdit: "Retirez l'audio source pour utiliser Étendre la vidéo ou Retake vidéo.",
    clearReferencesToUseStartEnd: 'Retirez les fichiers de référence Seedance pour utiliser les images de départ et de fin.',
    clearStartEndToUseReferences: 'Retirez l’image de départ ou de fin pour utiliser les fichiers de référence Seedance.',
    addReferenceMediaBeforeAudio: 'Ajoutez au moins une image ou une vidéo de référence avant d’utiliser un audio de référence.',
    addSourceVideo: (modeLabel) => `Ajoutez une vidéo source avant d’utiliser ${modeLabel}.`,
    workflowOptionsTitle: 'Options du workflow',
    workflowOptionsSubtitle: 'Réglages spécifiques à ce workflow.',
    selectOption: 'Sélectionner une option',
    defaultOption: 'Par défaut',
  },
  es: {
    generateVideo: 'Generar video',
    removeAudioToUnlock: 'Quita el audio fuente para desbloquear Extender video y Retake de video.',
    audioUnsupported:
      'Este motor no admite Audio → Video. Quita el audio fuente o cambia a LTX 2.3 Pro.',
    audioLocked:
      'Se detectó audio fuente. LTX 2.3 Pro ahora queda bloqueado en Audio → Video. Extender video y Retake de video volverán a habilitarse cuando quites el audio fuente.',
    audioLockedFallback:
      'Se detectó audio fuente. Los controles disponibles ahora se limitan a los ajustes de Audio → Video hasta que quites el audio.',
    removeAudioToUseEdit: 'Quita el audio fuente para usar Extender video o Retake de video.',
    clearReferencesToUseStartEnd: 'Quita los archivos de referencia de Seedance para usar las imágenes inicial y final.',
    clearStartEndToUseReferences: 'Quita la imagen inicial o final para usar los archivos de referencia de Seedance.',
    addReferenceMediaBeforeAudio: 'Añade al menos una imagen o un video de referencia antes de usar audio de referencia.',
    addSourceVideo: (modeLabel) => `Añade un video fuente antes de ejecutar ${modeLabel}.`,
    workflowOptionsTitle: 'Opciones del flujo de trabajo',
    workflowOptionsSubtitle: 'Ajustes específicos de este flujo de trabajo.',
    selectOption: 'Selecciona una opción',
    defaultOption: 'Predeterminado',
  },
  zh: {
    generateVideo: '生成视频',
    removeAudioToUnlock: '移除源音频以解锁“延长视频”和“重新拍摄”。',
    audioUnsupported: '此引擎不支持音频生视频。请移除源音频或切换至 LTX 2.3 Pro。',
    audioLocked:
      '检测到源音频。LTX 2.3 Pro 目前已锁定为音频生视频模式。移除源音频后将重新解锁“延长视频”与“重新拍摄”。',
    audioLockedFallback:
      '检测到源音频。在移除源音频之前，可用控制选项已限定为音频生视频设置。',
    removeAudioToUseEdit: '移除源音频以使用“延长视频”或“重新拍摄”。',
    clearReferencesToUseStartEnd: '清除 Seedance 参考文件以使用起始图与结束图。',
    clearStartEndToUseReferences: '清除起始图或结束图以使用 Seedance 参考文件。',
    addReferenceMediaBeforeAudio: '在使用参考音频之前，请至少添加一张参考图像或一个参考视频。',
    addSourceVideo: (modeLabel) => `运行 ${modeLabel} 之前需添加源视频。`,
    workflowOptionsTitle: '工作流选项',
    workflowOptionsSubtitle: '此工作流的专属设置。',
    selectOption: '选择一个选项',
    defaultOption: '默认',
  },
};

const MODEL_CARD_USE_CASES: Record<UiLocale, Record<string, string>> = {
  en: {
    'gpt-image-2': 'text-heavy stills, product photography, and controlled edits',
    'ltx-2-3': 'all-in-one LTX video workflows with audio and retakes',
    'ltx-2-3-fast': 'quick LTX 2.3 iterations for text and image video',
  },
  fr: {
    'gpt-image-2': 'images riches en texte, packshots produit et retouches contrôlées',
    'ltx-2-3': 'workflows LTX tout-en-un avec audio, retakes, contrôle fort et tarifs compétitifs en texte et image-vers-vidéo',
    'ltx-2-3-fast': 'itérations LTX 2.3 rapides pour la génération texte et image vers vidéo',
  },
  es: {
    'gpt-image-2': 'imágenes con texto, producto y ediciones controladas',
    'ltx-2-3': 'flujos LTX todo en uno con audio, retakes, control fuerte y precios competitivos en texto e imagen a video',
    'ltx-2-3-fast': 'iteraciones rápidas de LTX 2.3 para texto e imagen a video',
  },
  zh: {
    'gpt-image-2': '文字丰富的静态图、产品摄影及可控编辑',
    'ltx-2-3': '集音频、重拍、强控制力及优惠资费于一体的 LTX 文生/图生视频全流程工作流',
    'ltx-2-3-fast': '快速的 LTX 2.3 文生与图生视频迭代',
  },
};

const MODEL_CARD_CAPABILITY_KEYWORDS: Record<UiLocale, Record<string, string>> = {
  en: {
    T2V: 'text-to-video',
    I2V: 'image-to-video',
    V2V: 'video-to-video',
    'Lip sync': 'lip sync',
    Audio: 'native audio',
    'First/Last': 'first/last frame control',
    Extend: 'extend workflows',
  },
  fr: {
    T2V: 'texte-vers-vidéo',
    I2V: 'image-vers-vidéo',
    V2V: 'vidéo-vers-vidéo',
    'Lip sync': 'lip sync',
    Audio: 'audio natif',
    'First/Last': 'contrôle première / dernière frame',
    Extend: "workflows d'extension",
  },
  es: {
    T2V: 'texto a video',
    I2V: 'imagen a video',
    V2V: 'video a video',
    'Lip sync': 'lip sync',
    Audio: 'audio nativo',
    'First/Last': 'control de primer / último frame',
    Extend: 'workflows de extensión',
  },
  zh: {
    T2V: '文生视频',
    I2V: '图生视频',
    V2V: '视频转视频',
    'Lip sync': '对口型',
    Audio: '原生音频',
    'First/Last': '首尾帧控制',
    Extend: '延长工作流',
  },
};

const HERO_CHIP_LABELS: Record<UiLocale, Record<string, string>> = {
  en: {
    textToImage: 'Text→Image',
    imageToImage: 'Image→Image',
    textToVideo: 'Text→Video',
    imageToVideo: 'Image→Video',
    maxDuration: 'Max duration',
    maxResolution: 'Max resolution',
    audio: 'Audio',
  },
  fr: {
    textToImage: 'Texte→Image',
    imageToImage: 'Image→Image',
    textToVideo: 'Texte→Vidéo',
    imageToVideo: 'Image→Vidéo',
    maxDuration: 'Durée max',
    maxResolution: 'Résolution max',
    audio: 'Audio',
  },
  es: {
    textToImage: 'Texto→Imagen',
    imageToImage: 'Imagen→Imagen',
    textToVideo: 'Texto→Video',
    imageToVideo: 'Imagen→Video',
    maxDuration: 'Duración máx.',
    maxResolution: 'Resolución máx.',
    audio: 'Audio',
  },
  zh: {
    textToImage: '文生图',
    imageToImage: '图生图',
    textToVideo: '文生视频',
    imageToVideo: '图生视频',
    maxDuration: '最大时长',
    maxResolution: '最高分辨率',
    audio: '音频',
  },
};

const MODEL_META_LABELS: Record<UiLocale, { price: string; duration: string; format: string }> = {
  en: { price: 'Price', duration: 'Duration', format: 'Format' },
  fr: { price: 'Prix', duration: 'Durée', format: 'Format' },
  es: { price: 'Precio', duration: 'Duración', format: 'Formato' },
  zh: { price: '价格', duration: '时长', format: '格式' },
};

export function normalizeUiLocale(locale?: string | null): UiLocale {
  if (locale === 'fr' || locale === 'es' || locale === 'zh') return locale;
  return 'en';
}

export function getLocalizedModeLabel(mode: Mode, locale?: string | null): string {
  const uiLocale = normalizeUiLocale(locale);
  return MODE_LABELS[uiLocale][mode] ?? MODE_LABELS.en[mode] ?? mode.toUpperCase();
}

export function localizeLtxField(field: EngineInputField, locale?: string | null, engineId?: string | null): EngineInputField {
  if (!engineId?.startsWith('ltx-2-3')) return field;
  const uiLocale = normalizeUiLocale(locale);
  const copy = LTX_FIELD_COPY[uiLocale][field.id];
  if (!copy) return field;
  return {
    ...field,
    label: copy.label,
    description: copy.description ?? field.description,
  };
}

export function getLocalizedWorkflowCopy(locale?: string | null): WorkflowCopy {
  return WORKFLOW_COPY[normalizeUiLocale(locale)];
}

export function getLocalizedAssetDropzoneCopy(locale?: string | null): AssetDropzoneCopy {
  return ASSET_DROPZONE_COPY[normalizeUiLocale(locale)];
}

export function getLocalizedModelUseCases(locale?: string | null): Record<string, string> {
  return MODEL_CARD_USE_CASES[normalizeUiLocale(locale)];
}

export function getLocalizedCapabilityKeywords(locale?: string | null): Record<string, string> {
  return MODEL_CARD_CAPABILITY_KEYWORDS[normalizeUiLocale(locale)];
}

export function getLocalizedHeroChipLabels(locale?: string | null): Record<string, string> {
  return HERO_CHIP_LABELS[normalizeUiLocale(locale)];
}

export function getLocalizedModelMetaLabels(locale?: string | null) {
  return MODEL_META_LABELS[normalizeUiLocale(locale)];
}
