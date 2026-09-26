import type { AppLocale } from '@/i18n/locales';

export type UiLocale = Extract<AppLocale, 'en' | 'fr' | 'es' | 'zh'>;

export type FieldCopy = {
  label: string;
  description?: string;
};

export const LTX_FIELD_COPY: Record<UiLocale, Record<string, FieldCopy>> = {
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
      description: 'Utilisez cette image comme première frame pour ancrer le mouvement.',
    },
    end_image_url: {
      label: 'Image de fin',
      description: 'Frame finale optionnelle pour les transitions début → fin en Image → Vidéo.',
    },
    audio_url: {
      label: 'Piste audio source',
      description: 'Requis pour Audio → Vidéo. La durée de la vidéo suit celle du fichier audio.',
    },
    video_url: {
      label: 'Vidéo source',
      description: 'Importez ou réutilisez un rendu précédent pour étendre la vidéo ou refaire une séquence.',
    },
    guidance_scale: {
      label: 'Échelle de guidage',
      description: 'Ajustez la fidélité du résultat par rapport au prompt.',
    },
    context: {
      label: 'Fenêtre de contexte',
      description: "Définit la portion de vidéo source prise en compte lors de l'extension.",
    },
    mode: {
      label: 'Position de l’extension',
      description: 'Choisissez si l’extension s’ajoute avant ou après le clip.',
    },
    start_time: {
      label: 'Point de départ',
      description: 'Indiquez où commence le retake dans la vidéo source.',
    },
    retake_mode: {
      label: 'Mode de retake',
      description: 'Choisissez comment le segment source doit être remplacé.',
    },
  },
  es: {
    prompt: { label: 'Prompt' },
    negative_prompt: { label: 'Prompt negativo' },
    image_url: {
      label: 'Imagen inicial',
      description: 'Usa este frame como punto de partida que guía el movimiento.',
    },
    end_image_url: {
      label: 'Imagen final',
      description: 'Frame final opcional para transiciones de inicio a fin en Imagen → Video.',
    },
    audio_url: {
      label: 'Audio fuente',
      description: 'Obligatorio para Audio → Video. La duración del video sigue la del archivo de audio.',
    },
    video_url: {
      label: 'Video fuente',
      description: 'Sube o reutiliza un render anterior para extender el video o rehacer una sección.',
    },
    guidance_scale: {
      label: 'Escala de guía',
      description: 'Ajusta con qué fuerza sigue el resultado al prompt.',
    },
    context: {
      label: 'Ventana de contexto',
      description: 'Controla qué parte del video fuente se tiene en cuenta al extender.',
    },
    mode: {
      label: 'Posición de extensión',
      description: 'Elige si la extensión se añade antes o después del clip.',
    },
    start_time: {
      label: 'Momento de inicio',
      description: 'Indica dónde empieza el retake dentro del video fuente.',
    },
    retake_mode: {
      label: 'Modo de retake',
      description: 'Elige cómo se debe reemplazar el fragmento del video fuente.',
    },
  },
  zh: {
    prompt: { label: '提示词' },
    negative_prompt: { label: '反向提示词' },
    image_url: {
      label: '起始图像',
      description: '使用此静止帧作为引导动态的起始画面。',
    },
    end_image_url: {
      label: '结束图像',
      description: '图生视频模式下可选的首尾过渡结束帧。',
    },
    audio_url: {
      label: '源音频',
      description: '音频生视频必填项。视频长度将跟随音频文件的时长。',
    },
    video_url: {
      label: '源视频',
      description: '上传或复用之前的渲染作品以延长视频或重拍特定片段。',
    },
    guidance_scale: {
      label: '引导比例',
      description: '调整生成结果遵从提示词的强度。',
    },
    context: {
      label: '上下文窗口',
      description: '控制视频延长过程中参考源视频的时长跨度。',
    },
    mode: {
      label: '延长位置',
      description: '选择在片段前部还是后部追加延长内容。',
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
