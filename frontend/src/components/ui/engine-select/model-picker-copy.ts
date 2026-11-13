const en = {
  priceBasis: 'Prices for', effectiveSettings: 'Effective settings shown on each model.', priceContextNote: 'Estimates in USD · Effective settings on each model.',
  title: 'Choose a model', selected: 'Our selection', all: 'All models', search: 'Search models', clear: 'Clear search', close: 'Close model picker',
  quality: 'Quality first', balanced: 'Good balance', budget: 'Small budget', current: 'Current', use: 'Use', choose: 'Choose', info: 'About',
  back: 'Back to models', confirm: 'Confirm settings', before: 'Before applying', settings: 'Review the settings to apply. Your prompt and references are kept.',
  estimate: 'Estimate with these settings', priceNote: 'Estimates in USD. The final price is checked before generation.', pending: 'Estimating…', error: 'Price unavailable', retry: 'Retry prices',
  model: 'model', models: 'models', family: 'family', families: 'families', empty: 'No matching model', loading: 'Preparing options…', unavailable: 'Unavailable for this operation',
  preserved: 'Click a model to use it.', changes: 'Settings apply with your chosen model.', legacy: 'Older models', adjusted: 'Uses', supported: 'Supported operations', resolutions: 'Resolutions',
};
const fr: typeof en = {
  priceBasis: 'Prix pour', effectiveSettings: 'Les réglages effectifs figurent sous chaque modèle.', priceContextNote: 'Estimations en USD · Réglages sous chaque modèle.',
  title: 'Choisir un modèle', selected: 'Notre sélection', all: 'Tous les modèles', search: 'Rechercher un modèle', clear: 'Effacer la recherche', close: 'Fermer le choix de modèle',
  quality: 'Qualité en priorité', balanced: 'Bon équilibre', budget: 'Petit budget', current: 'Actuel', use: 'Utiliser', choose: 'Choisir', info: 'Informations sur',
  back: 'Revenir aux modèles', confirm: 'Confirmer les réglages', before: 'Avant d’appliquer', settings: 'Vérifiez les réglages à appliquer. Votre description et vos références sont conservées.',
  estimate: 'Estimation avec ces réglages', priceNote: 'Estimations en USD. Le prix final est vérifié avant génération.', pending: 'Estimation…', error: 'Prix indisponible', retry: 'Réessayer les prix',
  model: 'modèle', models: 'modèles', family: 'famille', families: 'familles', empty: 'Aucun modèle correspondant', loading: 'Préparation des options…', unavailable: 'Indisponible pour cette opération',
  preserved: 'Cliquez sur un modèle pour l’utiliser.', changes: 'Réglages appliqués avec le modèle choisi.', legacy: 'Anciens modèles', adjusted: 'Avec', supported: 'Opérations disponibles', resolutions: 'Résolutions',
};
const es: typeof en = {
  priceBasis: 'Precios para', effectiveSettings: 'Cada modelo indica sus ajustes efectivos.', priceContextNote: 'Estimaciones en USD · Ajustes en cada modelo.',
  title: 'Elegir un modelo', selected: 'Nuestra selección', all: 'Todos los modelos', search: 'Buscar modelos', clear: 'Borrar búsqueda', close: 'Cerrar selector',
  quality: 'Prioridad a la calidad', balanced: 'Buen equilibrio', budget: 'Presupuesto reducido', current: 'Actual', use: 'Usar', choose: 'Elegir', info: 'Información sobre',
  back: 'Volver a los modelos', confirm: 'Confirmar ajustes', before: 'Antes de aplicar', settings: 'Revisa los ajustes que se aplicarán. Se conservan tu descripción y tus referencias.',
  estimate: 'Estimación con estos ajustes', priceNote: 'Estimaciones en USD. Se verifica el precio final antes de generar.', pending: 'Estimando…', error: 'Precio no disponible', retry: 'Reintentar precios',
  model: 'modelo', models: 'modelos', family: 'familia', families: 'familias', empty: 'Ningún modelo coincide', loading: 'Preparando opciones…', unavailable: 'No disponible para esta operación',
  preserved: 'Pulsa un modelo para usarlo.', changes: 'Los ajustes se aplican con el modelo elegido.', legacy: 'Modelos anteriores', adjusted: 'Con', supported: 'Operaciones disponibles', resolutions: 'Resoluciones',
};
const zh: typeof en = {
  priceBasis: '价格基于', effectiveSettings: '各模型卡片上显示其生效设置。', priceContextNote: '预估价格以人民币（CNY）显示。各模型的生效设置见其卡片。',
  title: '选择模型', selected: '精选推荐', all: '全部模型', search: '搜索模型', clear: '清除搜索', close: '关闭模型选择',
  quality: '质量优先', balanced: '均衡之选', budget: '经济之选', current: '当前', use: '使用', choose: '选择', info: '关于',
  back: '返回模型列表', confirm: '确认设置', before: '应用前', settings: '请检查将要应用的设置。你的提示词和参考素材会保留。',
  estimate: '按这些设置预估', priceNote: '预估价格以人民币（CNY）计。生成前会再次核对最终价格。', pending: '预估中…', error: '价格暂不可用', retry: '重试价格',
  model: '个模型', models: '个模型', family: '系列', families: '个系列', empty: '没有匹配的模型', loading: '正在准备选项…', unavailable: '此操作不可用',
  preserved: '点击模型即可使用。', changes: '设置将随所选模型一同应用。', legacy: '旧版模型', adjusted: '使用', supported: '支持的操作', resolutions: '分辨率',
};
export function modelPickerCopy(locale: string) { return locale.startsWith('zh') ? zh : locale.startsWith('fr') ? fr : locale.startsWith('es') ? es : en; }
export type ModelPickerCopy = typeof en;
