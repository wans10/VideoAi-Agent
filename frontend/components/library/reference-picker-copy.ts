export function referencePickerCopy(locale: string) {
  return locale.startsWith('fr') ? {
    title: 'Choisir une référence', choose: 'Choisir', selected: 'Sélectionné', use: 'Utiliser la sélection', cancel: 'Annuler', clear: 'Effacer', empty: 'Choisissez un média', busy: 'Ajout…', error: 'Ajout impossible. Réessayez.', done: 'Terminé', instant: 'Sélection appliquée immédiatement', search: 'Rechercher', source: 'Source', slot: 'Emplacement', capacity: 'Maximum',
  } : locale.startsWith('es') ? {
    title: 'Elegir referencia', choose: 'Elegir', selected: 'Seleccionado', use: 'Usar selección', cancel: 'Cancelar', clear: 'Borrar', empty: 'Elige un medio', busy: 'Añadiendo…', error: 'No se pudo añadir. Inténtalo de nuevo.', done: 'Listo', instant: 'Selección aplicada inmediatamente', search: 'Buscar', source: 'Fuente', slot: 'Posición', capacity: 'Máximo',
  } : locale.startsWith('zh') ? {
    title: '选择参考素材', choose: '选择', selected: '已选择', use: '使用所选素材', cancel: '取消', clear: '清除', empty: '选择一个素材文件', busy: '添加中…', error: '无法添加此参考素材，请重试。', done: '完成', instant: '选择立即生效', search: '搜索', source: '来源', slot: '位置', capacity: '上限',
  } : {
    title: 'Choose a reference', choose: 'Choose', selected: 'Selected', use: 'Use selection', cancel: 'Cancel', clear: 'Clear', empty: 'Choose a media file', busy: 'Adding…', error: 'Could not add this reference. Try again.', done: 'Done', instant: 'Selection applies immediately', search: 'Search', source: 'Source', slot: 'Slot', capacity: 'Maximum',
  };
}
