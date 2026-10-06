import type { AppLocale } from '@/i18n/locales';

// Exact capability phrases only: unknown values keep their original meaning.
const CAPABILITY_COPY: Record<string, { fr: string; es: string; zh: string }> = {
  'optional end frame': { fr: 'image de fin facultative', es: 'imagen final opcional', zh: '可选尾帧' },
  'single start image plus optional end frame': { fr: 'Une image de départ et une image de fin facultative', es: 'Una imagen inicial y una imagen final opcional', zh: '单张起始图加可选尾帧' },
  'supported through synchronized audio and audio-to-video workflows': { fr: 'Via l’audio synchronisé et la génération audio-vers-vidéo', es: 'Mediante audio sincronizado y generación de audio a video', zh: '通过同步音频和音频生视频工作流支持' },
  'dolly, jib, static and focus-shift presets': { fr: 'Préréglages : travelling, grue, plan fixe et changement de mise au point', es: 'Preajustes: travelling, grúa, plano fijo y cambio de enfoque', zh: '推拉、摇臂、定格与变焦预设' },
  'no visible maxvideoai watermark': { fr: 'Aucun filigrane Keyvo visible', es: 'Sin marca de agua visible de Keyvo', zh: '无可见 Keyvo 水印' },
  'no visible maxvideoai watermark; provider provenance markers may apply': { fr: 'Aucun filigrane Keyvo visible ; des marqueurs de provenance du fournisseur peuvent être présents', es: 'Sin marca de agua visible de Keyvo; puede haber marcadores de procedencia del proveedor', zh: '无可见 Keyvo 水印；可能保留提供商标注' },
  'prompt-directed native dialogue': { fr: 'Dialogue natif guidé par le prompt', es: 'Diálogo nativo guiado por el prompt', zh: '提示词控制的原生对白' },
  'prompt-based; native multi-shot storyboard support': { fr: 'Guidage par prompt et storyboard de plusieurs plans', es: 'Guía por prompt y storyboard de varias tomas', zh: '基于提示词；支持原生多镜头分镜' },
  'supported by provider for editing and extension through reference video': { fr: 'Le fournisseur permet la modification et l’extension à partir d’une vidéo de référence', es: 'El proveedor permite editar y extender a partir de un video de referencia', zh: '提供商支持通过参考视频进行编辑和延长' },
  'native stereo audio': { fr: 'Audio stéréo natif', es: 'Audio estéreo nativo', zh: '原生立体声音频' },
  'native audio': { fr: 'Audio natif', es: 'Audio nativo', zh: '原生音频' },
  'optional native audio': { fr: 'Audio natif en option', es: 'Audio nativo opcional', zh: '可选原生音频' },
  'supported as a reference-to-video input': { fr: 'Vidéo acceptée comme référence pour la génération', es: 'Video aceptado como referencia para la génération', zh: '支持作为参考视频输入' },
  'start image + optional end image': { fr: 'image de départ et image de fin facultative', es: 'imagen inicial e imagen final opcional', zh: '起始图 + 可选尾帧图' },
  'prompt-based camera and multi-shot control': { fr: 'Caméra et séquence de plans guidées par le prompt', es: 'Cámara y secuencia de tomas guiadas por el prompt', zh: '基于提示词的相机运镜与多镜头控制' },
  'prompt-based camera control': { fr: 'Caméra guidée par le prompt', es: 'Cámara guiada por el prompt', zh: '基于提示词的相机运镜控制' },
  'start image, end image, or both': { fr: 'image de début, image de fin ou les deux', es: 'imagen inicial, imagen final o ambas', zh: '首帧、尾帧或两者' },
  'video editing and extension': { fr: 'modification et extension vidéo', es: 'edición y extensión de video', zh: '视频编辑与延长' },
};

/** Shared exact capability translation for model and comparison pages. */
export function localizeCapabilityDetail(value: string, locale: AppLocale): string | null {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  if (locale !== 'en') {
    const exact = CAPABILITY_COPY[lower];
    if (exact) return exact[locale] ?? null;
    const unavailable = normalized.match(/^Not exposed in current (.+) endpoint set$/i);
    if (unavailable) return locale === 'fr' ? `Non disponible actuellement avec ${unavailable[1]}` : locale === 'es' ? `No disponible actualmente con ${unavailable[1]}` : `当前 ${unavailable[1]} 接口集中未开放`;
    const clips = lower.match(/^up to (\d+) clips, (\d+)s total$/);
    if (clips) return locale === 'fr' ? `Jusqu’à ${clips[1]} clips, ${clips[2]} s au total` : locale === 'es' ? `Hasta ${clips[1]} clips, ${clips[2]} s en total` : `最多 ${clips[1]} 个片段，总计 ${clips[2]} 秒`;
    const images = lower.match(/^up to (\d+) (?:image references|reference images)$/);
    if (images) return locale === 'fr' ? `Jusqu’à ${images[1]} images de référence` : locale === 'es' ? `Hasta ${images[1]} imágenes de referencia` : `最多 ${images[1]} 张参考图像`;
    const videos = lower.match(/^up to (\d+) video references; (\d+)-(\d+)s each and (\d+)s combined$/);
    if (videos) return locale === 'fr'
      ? `Jusqu’à ${videos[1]} vidéos de référence ; ${videos[2]}–${videos[3]} s chacune, ${videos[4]} s au total`
      : locale === 'es'
        ? `Hasta ${videos[1]} videos de referencia; ${videos[2]}–${videos[3]} s cada uno, ${videos[4]} s en total`
        : `最多 ${videos[1]} 个参考视频；每个 ${videos[2]}–${videos[3]} 秒，总计 ${videos[4]} 秒`;
  }
  return null;
}
