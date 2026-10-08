/** Fallbacks for picker keys that are not yet present in the route translation bundles. */
export function assetLibraryLocaleDefaults(locale: string) {
  if (locale === 'zh') return {
    searchPlaceholder: '搜索素材…', import: '导入', importing: '导入中…', importFailed: '导入失败，请重试。',
    sourcesTitle: '素材', toolsTitle: '创作或转换', toolsDescription: '在其他工具中准备源素材，再导入此处。', emptySearch: '没有符合搜索条件的素材。',
    emptyRecent: '暂无近期输出。', emptyStoryboard: '暂无已保存分镜。', emptyCharacter: '暂无已保存角色。', emptyAngle: '暂无已保存视角。', emptyUpscale: '暂无已保存放大结果。',
    tabs: { recent: '近期输出', storyboard: '分镜', character: '角色', angle: '视角', upscale: '放大' },
    shortcuts: { createImage: '生成图片', storyboard: '分镜', changeAngle: '改变视角', characterBuilder: '创建角色', upscale: '放大' },
  };
  if (locale === 'fr') return {
    searchPlaceholder: 'Rechercher des médias…', import: 'Importer', importing: 'Importation…', importFailed: 'Échec de l’importation. Réessayez.',
    sourcesTitle: 'Médias', toolsTitle: 'Créer ou transformer', toolsDescription: 'Préparez une source dans un autre outil, puis importez-la ici.', emptySearch: 'Aucun média ne correspond à cette recherche.',
    emptyRecent: 'Aucune sortie récente disponible.', emptyStoryboard: 'Aucun storyboard enregistré.', emptyCharacter: 'Aucun personnage enregistré.', emptyAngle: 'Aucune vue enregistrée.', emptyUpscale: 'Aucun agrandissement enregistré.',
    tabs: { recent: 'Sorties récentes', storyboard: 'Storyboard', character: 'Personnages', angle: 'Angles', upscale: 'Agrandissements' },
    shortcuts: { createImage: 'Créer une image', storyboard: 'Storyboard', changeAngle: 'Changer l’angle', characterBuilder: 'Créer un personnage', upscale: 'Agrandir' },
  };
  if (locale === 'es') return {
    searchPlaceholder: 'Buscar medios…', import: 'Importar', importing: 'Importando…', importFailed: 'Error al importar. Inténtalo de nuevo.',
    sourcesTitle: 'Medios', toolsTitle: 'Crear o transformar', toolsDescription: 'Prepara una fuente en otra herramienta e impórtala aquí.', emptySearch: 'Ningún medio coincide con esta búsqueda.',
    emptyRecent: 'No hay salidas recientes.', emptyStoryboard: 'No hay storyboards guardados.', emptyCharacter: 'No hay personajes guardados.', emptyAngle: 'No hay vistas guardadas.', emptyUpscale: 'No hay ampliaciones guardadas.',
    tabs: { recent: 'Salidas recientes', storyboard: 'Storyboard', character: 'Personajes', angle: 'Ángulos', upscale: 'Ampliaciones' },
    shortcuts: { createImage: 'Crear imagen', storyboard: 'Storyboard', changeAngle: 'Cambiar ángulo', characterBuilder: 'Crear personaje', upscale: 'Ampliar' },
  };
  return {};
}
export function assetLibraryActionsCopy(locale: string) {
  if (locale === 'zh') return { use: '使用', delete: '删除', deleting: '删除中…', loadError: '无法加载素材库，请点击刷新重试。' };
  return locale === 'fr'
    ? { use: 'Utiliser', delete: 'Supprimer', deleting: 'Suppression…', loadError: 'Impossible de charger Médias. Réessayez avec Actualiser.' }
    : locale === 'es'
      ? { use: 'Usar', delete: 'Eliminar', deleting: 'Eliminando…', loadError: 'No se puede cargar Medios. Pulsa Actualizar para reintentar.' }
      : { use: 'Use', delete: 'Delete', deleting: 'Deleting…', loadError: 'Unable to load your library. Select Refresh to try again.' };
}
