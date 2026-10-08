export function mediaActionCopy(locale: string) {
  if (locale.startsWith('zh')) return { title: '素材', close: '关闭', preview: '预览', download: '下载原文件', video: '生成视频', image: '生成图片', animate: '让图片动起来', reference: '选择参考用途', actions: '操作', back: '返回', next: '工作台将检查参考用途与兼容性。', error: '无法准备此素材，请重试。' };
  if (locale.startsWith('fr')) return { title: 'Média', close: 'Fermer', preview: 'Aperçu', download: 'Télécharger l’original', video: 'Créer une vidéo', image: 'Créer une image', animate: 'Animer cette image', reference: 'Choisir le rôle de référence', actions: 'Actions', back: 'Retour', next: 'Le rôle et la compatibilité seront vérifiés dans le créateur.', error: 'Impossible de préparer ce média. Réessayez.' };
  if (locale.startsWith('es')) return { title: 'Medio', close: 'Cerrar', preview: 'Vista previa', download: 'Descargar original', video: 'Crear un vídeo', image: 'Crear una imagen', animate: 'Animar esta imagen', reference: 'Elegir el rol de referencia', actions: 'Acciones', back: 'Volver', next: 'El creador comprobará el rol y la compatibilidad.', error: 'No se pudo preparar este medio. Inténtalo de nuevo.' };
  return { title: 'Media', close: 'Close', preview: 'Preview', download: 'Download original', video: 'Create a video', image: 'Create an image', animate: 'Animate this image', reference: 'Choose reference role', actions: 'Actions', back: 'Back', next: 'The creator will check the reference role and compatibility.', error: 'Unable to prepare this media. Please try again.' };
}

export function meaningfulMediaLabel(url: string, fallback: string): string {
  try {
    const name = decodeURIComponent(new URL(url, 'https://local.invalid').pathname.split('/').pop() ?? '');
    if (!name || name.length > 72 || /[a-f0-9]{20,}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/i.test(name)) return fallback;
    return name;
  } catch { return fallback; }
}

export function referenceContinuationCopy(locale: string) {
  if (locale.startsWith('zh')) return { newReference: '新参考素材', add: '添加为参考', replace: '替换参考素材', context: '参考用途' };
  if (locale.startsWith('fr')) return { newReference: 'Nouvelle référence', add: 'Ajouter comme référence', replace: 'Remplacer la référence', context: 'Référence pour' };
  if (locale.startsWith('es')) return { newReference: 'Nueva referencia', add: 'Añadir como referencia', replace: 'Reemplazar referencia', context: 'Referencia para' };
  return { newReference: 'New reference', add: 'Add as reference', replace: 'Replace reference', context: 'Reference for' };
}

export function compactMediaSource(source: string, locale: string, fallback: string) {
  const labels: Record<string, string> = locale.startsWith('fr') ? { all: 'Toutes', upload: 'Importées', generated: 'Générées', recent: 'Récentes', storyboard: 'Storyboard', character: 'Personnage', angle: 'Angle', upscale: 'Upscale' } : locale.startsWith('es') ? { all: 'Todos', upload: 'Subidos', generated: 'Generados', recent: 'Recientes', storyboard: 'Storyboard', character: 'Personaje', angle: 'Ángulo', upscale: 'Upscale' } : locale.startsWith('zh') ? { all: '全部', upload: '已上传', generated: '已生成', recent: '近期素材', storyboard: '分镜', character: '角色', angle: '视角', upscale: '放大' } : { all: 'All', upload: 'Uploads', generated: 'Generated', recent: 'Recent', storyboard: 'Storyboard', character: 'Character', angle: 'Angle', upscale: 'Upscale' };
  return labels[source] ?? fallback;
}
