import type { AssetFieldRole } from '@/components/asset-dropzone/asset-dropzone-types';
import type { EngineCaps, EngineInputField } from '@/types/engines';

export function workspaceReferenceCopy(locale: string) {
  return locale === 'zh' ? {
    sending:'发送中…',calculating:'计算中…',priceUnavailable:'价格暂不可用',kinds:{image:'图片',video:'视频',audio:'音频'},
    start:'首帧',end:'尾帧',title:'参考素材',add:'添加参考素材',manage:'管理',close:'关闭',replace:'替换',remove:'移除',upload:'上传',library:'从素材库选择',required:'必填',unavailable:'此模型暂不支持',details:'格式与指南',options:'选项',placeholder:'描述您的创意…',
  } : locale === 'fr' ? {
    sending: 'Envoi…',
    calculating: 'Calcul…', priceUnavailable: 'Prix indisponible', kinds: { image: 'Images', video: 'Vidéos', audio: 'Audio' },
    start: 'Image de début', end: 'Image de fin', title: 'Références', add: 'Ajouter des références', manage: 'Gérer', close: 'Fermer', replace: 'Remplacer', remove: 'Retirer', upload: 'Importer', library: 'Choisir dans Médias', required: 'Requis', unavailable: 'Indisponible pour ce modèle', details: 'Formats et conseils', options: 'Options', placeholder: 'Décrivez votre création…',
  } : locale === 'es' ? {
    sending: 'Enviando…',
    calculating: 'Calculando…', priceUnavailable: 'Precio no disponible', kinds: { image: 'Imágenes', video: 'Vídeos', audio: 'Audio' },
    start: 'Imagen inicial', end: 'Imagen final', title: 'Referencias', add: 'Añadir referencias', manage: 'Gestionar', close: 'Cerrar', replace: 'Reemplazar', remove: 'Quitar', upload: 'Subir', library: 'Elegir en Medios', required: 'Obligatorio', unavailable: 'No disponible para este modelo', details: 'Formatos y consejos', options: 'Opciones', placeholder: 'Describe tu creación…',
  } : {
    sending: 'Sending…',
    calculating: 'Calculating…', priceUnavailable: 'Price unavailable', kinds: { image: 'Images', video: 'Videos', audio: 'Audio' },
    start: 'Start frame', end: 'End frame', title: 'References', add: 'Add references', manage: 'Manage', close: 'Close', replace: 'Replace', remove: 'Remove', upload: 'Upload', library: 'Choose from Media', required: 'Required', unavailable: 'Unavailable for this model', details: 'Formats and guidance', options: 'Options', placeholder: 'Describe your creation…',
  };
}

export function resolveWorkspaceReferenceFieldTitle(
  field: EngineInputField,
  role: AssetFieldRole,
  locale: string
): string {
  if (role === 'reference' && ['reference_image_urls', 'reference_video_urls', 'reference_audio_urls'].includes(field.id)
    && /^reference (images|videos|audio)$/i.test(field.label.trim())) {
    const kind = field.type === 'audio' ? 'audio' : field.type === 'video' ? 'video' : 'image';
    return workspaceReferenceCopy(locale).kinds[kind];
  }
  if (locale !== 'fr' && locale !== 'es' && locale !== 'zh') return field.label;
  const label = field.label.trim();
  const capacity = typeof field.maxCount === 'number' && Number.isFinite(field.maxCount) && field.maxCount > 1
    ? Math.floor(field.maxCount)
    : null;
  const suffix = capacity == null ? '' : locale === 'fr' ? ` (jusqu’à ${capacity})` : locale === 'es' ? ` (hasta ${capacity})` : `（最多 ${capacity} 个）`;

  if (field.id === 'video_url' && /^source video$/i.test(label)) {
    return locale === 'fr' ? 'Vidéo source' : locale === 'es' ? 'Video fuente' : '源视频';
  }
  if (role !== 'reference') return field.label;
  if (field.id === 'image_urls' && /^reference images(?:\s*\([^)]*\))?$/i.test(label)) {
    return locale === 'fr' ? `Images de référence${suffix}` : locale === 'es' ? `Imágenes de referencia${suffix}` : `参考图像${capacity != null ? `（最多 ${capacity} 张）` : ''}`;
  }
  if (field.id === 'video_urls' && /^reference video clips(?:\s*\([^)]*\))?$/i.test(label)) {
    return locale === 'fr' ? `Clips vidéo de référence${suffix}` : locale === 'es' ? `Clips de vídeo de referencia${suffix}` : `参考视频片段${suffix}`;
  }
  if (field.id === 'audio_urls' && /^reference audio clips(?:\s*\([^)]*\))?$/i.test(label)) {
    return locale === 'fr' ? `Clips audio de référence${suffix}` : locale === 'es' ? `Clips de audio de referencia${suffix}` : `参考音频片段${suffix}`;
  }
  return field.label;
}

export function resolveWorkspaceReferenceFieldDescription(
  field: EngineInputField,
  engine: EngineCaps,
  locale: string
): string | undefined {
  if (!engine.id.startsWith('wan-3')) return field.description;
  const constraints = engine.inputSchema?.constraints;
  if (field.id === 'reference_audio_urls' && constraints?.maxCombinedAudioDurationSec
    && field.description === `Combined audio duration <=${constraints.maxCombinedAudioDurationSec} seconds.`) {
    // The cumulative limit is already shown beside the import action.
    return undefined;
  }
  const fps = constraints?.minimumReferenceVideoFps;
  if (field.id === 'reference_video_urls' && fps && constraints?.maxCombinedVideoDurationSec
    && field.description === `Combined video duration <=${constraints.maxCombinedVideoDurationSec} seconds; each video must be >=${fps} fps.`) {
    return locale === 'fr' ? `Chaque vidéo doit être à au moins ${fps} images/s.`
      : locale === 'es' ? `Cada vídeo debe tener al menos ${fps} fotogramas/s.`
      : `Each video must be at least ${fps} fps.`;
  }
  return field.description;
}
