/** Concise interface labels take precedence over older workspace message bundles. */
export function upscaleWorkspaceLabels(locale: string) {
  if (locale === 'fr') return {
    previewSource: 'Original', previewResult: 'Résultat', previewCompare: 'Comparer', previewZoom: 'Zoom', previewZoomFit: 'Adapter',
    save: 'Enregistrer', saved: 'Enregistré dans Médias.', saveFailed: 'Impossible d’enregistrer le média.', download: 'Télécharger', recentTitle: 'Récents',
    library: 'Médias', libraryChoose: 'Choisir dans Médias', libraryTitle: 'Choisir dans Médias', libraryBody: '', librarySearch: 'Rechercher…', librarySourcesTitle: 'Médias',
    libraryEmpty: 'Aucun média.', libraryEmptyImages: 'Aucune image.', libraryEmptyVideos: 'Aucune vidéo.', libraryEmptySearch: 'Aucun résultat.', libraryError: 'Impossible de charger Médias.', libraryRefresh: 'Actualiser', libraryLoadMore: 'Afficher plus', libraryUse: 'Choisir', libraryCount: '{count} médias',
    libraryTabs: { all: 'Tous', upload: 'Imports', generated: 'Créations', character: 'Personnages', angle: 'Angles', upscale: 'Agrandissements' },
    uploadFailed: 'Échec de l’import.', priceUnavailable: 'Prix indisponible', priceLoading: 'Calcul du prix…',
  };
  if (locale === 'es') return {
    previewSource: 'Original', previewResult: 'Resultado', previewCompare: 'Comparar', previewZoom: 'Zoom', previewZoomFit: 'Ajustar',
    save: 'Guardar', saved: 'Guardado en Medios.', saveFailed: 'No se pudo guardar el archivo.', download: 'Descargar', recentTitle: 'Recientes',
    library: 'Medios', libraryChoose: 'Elegir en Medios', libraryTitle: 'Elegir en Medios', libraryBody: '', librarySearch: 'Buscar…', librarySourcesTitle: 'Medios',
    libraryEmpty: 'Sin archivos.', libraryEmptyImages: 'Sin imágenes.', libraryEmptyVideos: 'Sin vídeos.', libraryEmptySearch: 'Sin resultados.', libraryError: 'No se pudo cargar Medios.', libraryRefresh: 'Actualizar', libraryLoadMore: 'Mostrar más', libraryUse: 'Elegir', libraryCount: '{count} archivos',
    libraryTabs: { all: 'Todos', upload: 'Importados', generated: 'Creaciones', character: 'Personajes', angle: 'Ángulos', upscale: 'Ampliaciones' },
    uploadFailed: 'Error al importar.', priceUnavailable: 'Precio no disponible', priceLoading: 'Calculando precio…',
  };
  if (locale === 'zh') return {
    previewSource: '原始素材', previewResult: '生成结果', previewCompare: '对比', previewZoom: '缩放', previewZoomFit: '适应画布',
    save: '保存', saved: '已保存至媒体库。', saveFailed: '无法保存该媒体文件。', download: '下载', recentTitle: '最近记录',
    library: '媒体库', libraryChoose: '从媒体库选择', libraryTitle: '从媒体库选择', libraryBody: '', librarySearch: '搜索…', librarySourcesTitle: '媒体库',
    libraryEmpty: '暂无媒体。', libraryEmptyImages: '暂无图片。', libraryEmptyVideos: '暂无视频。', libraryEmptySearch: '未找到相关结果。', libraryError: '无法加载媒体库。', libraryRefresh: '刷新', libraryLoadMore: '加载更多', libraryUse: '选择使用', libraryCount: '{count} 个文件',
    libraryTabs: { all: '全部', upload: '上传', generated: '生成', character: '角色', angle: '多视角', upscale: '超分辨率' },
    uploadFailed: '上传失败。', priceUnavailable: '价格不可用', priceLoading: '正在计算价格…',
  };
  return { libraryTitle: 'Choose from Media', libraryBody: '', librarySearch: 'Search…', libraryLoadMore: 'Load more', libraryUse: 'Choose', libraryCount: '{count} files', recentTitle: 'Recent', previewZoom: 'Zoom' };
}
