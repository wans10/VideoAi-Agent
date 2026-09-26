import type { AssetFieldRole } from '@/components/asset-dropzone/asset-dropzone-types';
import type { EngineInputField } from '@/types/engines';

export function workspaceReferenceCopy(locale: string) {
  if (locale === 'fr') {
    return {
      calculating: 'Calcul…', priceUnavailable: 'Prix indisponible', kinds: { image: 'Images', video: 'Vidéos', audio: 'Audio' },
      start: 'Image de début', end: 'Image de fin', title: 'Références', add: 'Ajouter des références', manage: 'Gérer', close: 'Fermer', replace: 'Remplacer', remove: 'Retirer', upload: 'Importer', library: 'Choisir dans Médias', required: 'Requis', unavailable: 'Indisponible pour ce modèle', details: 'Formats et conseils', options: 'Options', placeholder: 'Décrivez votre création…',
    };
  }
  if (locale === 'es') {
    return {
      calculating: 'Calculando…', priceUnavailable: 'Precio no disponible', kinds: { image: 'Imágenes', video: 'Vídeos', audio: 'Audio' },
      start: 'Imagen inicial', end: 'Imagen final', title: 'Referencias', add: 'Añadir referencias', manage: 'Gestionar', close: 'Cerrar', replace: 'Reemplazar', remove: 'Quitar', upload: 'Subir', library: 'Elegir en Medios', required: 'Obligatorio', unavailable: 'No disponible para este modelo', details: 'Formatos y consejos', options: 'Opciones', placeholder: 'Describe tu creación…',
    };
  }
  if (locale === 'zh') {
    return {
      calculating: '正在计算…', priceUnavailable: '价格暂不可用', kinds: { image: '图像', video: '视频', audio: '音频' },
      start: '首帧图', end: '尾帧图', title: '参考素材', add: '添加参考素材', manage: '管理', close: '关闭', replace: '替换', remove: '移除', upload: '上传素材', library: '从媒体库选择', required: '必填', unavailable: '当前模型不支持', details: '格式与建议', options: '选项', placeholder: '描述您的创作构想…',
    };
  }
  return {
    calculating: 'Calculating…', priceUnavailable: 'Price unavailable', kinds: { image: 'Images', video: 'Videos', audio: 'Audio' },
    start: 'Start frame', end: 'End frame', title: 'References', add: 'Add references', manage: 'Manage', close: 'Close', replace: 'Replace', remove: 'Remove', upload: 'Upload', library: 'Choose from Media', required: 'Required', unavailable: 'Unavailable for this model', details: 'Formats and guidance', options: 'Options', placeholder: 'Describe your creation…',
  };
}

export function resolveWorkspaceReferenceFieldTitle(
  field: EngineInputField,
  role: AssetFieldRole,
  locale: string
): string {
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
