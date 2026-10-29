import type { AppLocale } from '@/i18n/locales';
import engineCatalog from '@/config/engine-catalog-visible';
import compareConfig from '@/config/compare-config.json';
import {
  filterPublicCurrentModelSlugs,
  listRuntimeModels,
  type RuntimeModelEntry,
} from '@/config/model-runtime';

export interface Params {
  locale?: AppLocale;
  usecase: string;
}

export interface BestForEntry {
  slug: string;
  title: string;
  description?: string;
  tier: number;
  topPicks?: string[];
  relatedComparisons?: string[];
}

export type RelatedGuideEntry = BestForEntry & {
  displayTitle: string;
};

export type EngineCatalogEntry = {
  engineId?: string;
  modelSlug: string;
  marketingName: string;
  provider?: string;
  brandId?: string;
  family?: string;
  bestFor?: string;
};

export type EngineScore = {
  engineId?: string;
  modelSlug?: string;
  fidelity?: number;
  motion?: number;
  anatomy?: number;
  textRendering?: number;
  consistency?: number;
  lipsyncQuality?: number;
  sequencingQuality?: number;
};

export type EngineScoresFile = {
  version?: string;
  last_updated?: string;
  scores?: EngineScore[];
};

export type RankedPick = {
  slug: string;
  engine?: EngineCatalogEntry;
  rank: number;
  criterion: string;
  score?: number;
  accent: string;
  reason: string;
  bullets: string[];
};

export type ExamplePreviewPick = RankedPick & {
  examplesSlug: string;
  heroThumbUrl?: string | null;
};

export function buildPublicBestForEntries(
  entries: readonly BestForEntry[],
  models: readonly RuntimeModelEntry[] = listRuntimeModels(),
): BestForEntry[] {
  return entries.map((entry) => ({
    ...entry,
    topPicks: filterPublicCurrentModelSlugs(entry.topPicks ?? [], models),
  }));
}

export const BEST_FOR_PAGES = buildPublicBestForEntries(compareConfig.bestForPages as BestForEntry[]);
export const ENGINE_CATALOG = engineCatalog as EngineCatalogEntry[];
export const ENGINE_BY_SLUG = new Map(ENGINE_CATALOG.map((entry) => [entry.modelSlug, entry]));

export const DETAIL_COPY: Record<
  AppLocale,
  {
    eyebrow: string;
    shortlist: string;
    shortlistDescription: string;
    ranked: string;
    rank: string;
    topPick: string;
    provider: string;
    fit: string;
    evidence: string;
    topReason: string;
    shortlistReason: string;
    viewModel: string;
    viewExamples: string;
    compareWith: string;
    compareShortlistCta: string;
    examplesCta: string;
    alsoAvailable: string;
    chooseTitle: string;
    examplesTitle: string;
    examplesDescription: string;
    whyTitle: string;
    mistakesTitle: string;
    fullAnalysis: string;
    relatedGuides: string;
    allGuides: string;
    score: string;
    overall: string;
    criteriaNote: string;
    compareShortlist: string;
    compareDescription: string;
    contentComing: string;
    backToHub: string;
    backToTop: string;
    criteria: string;
    quickLinks: string;
    tier: string;
    browseAllExamples: string;
  }
> = {
  en: {
    eyebrow: 'Best for',
    shortlist: 'Recommended shortlist',
    shortlistDescription: 'Model cards use the same visual language as the model pages, with the strongest engines shown first.',
    ranked: 'Ranked picks',
    rank: 'Rank',
    topPick: 'Top pick',
    provider: 'Provider',
    fit: 'Best fit',
    evidence: 'Why it fits',
    topReason: 'Primary recommendation for this search intent, based on the criteria above.',
    shortlistReason: 'Strong shortlist option when this criterion matters for the final video.',
    viewModel: 'View model',
    viewExamples: 'View examples',
    compareWith: 'Compare vs',
    compareShortlistCta: 'Compare the shortlist',
    examplesCta: 'View cinematic examples',
    alsoAvailable: 'Also available',
    chooseTitle: 'When should you choose each engine?',
    examplesTitle: 'Examples to review first',
    examplesDescription: 'Preview real output direction before making a decision.',
    whyTitle: 'Why these models fit this use case',
    mistakesTitle: 'Avoid these mistakes',
    fullAnalysis: 'Read the full analysis',
    relatedGuides: 'Related best-for guides',
    allGuides: 'View all guides',
    score: 'Score',
    overall: 'Best overall',
    criteriaNote: 'Scores combine quality, control, consistency, and cost efficiency.',
    compareShortlist: 'Compare the shortlist',
    compareDescription: 'Useful side-by-side pages for validating tradeoffs before picking a model.',
    contentComing: 'Content coming soon.',
    backToHub: 'Back to Best-for hub',
    backToTop: 'Back to top',
    criteria: 'Decision criteria',
    quickLinks: 'Quick links',
    tier: 'Tier',
    browseAllExamples: 'Browse all examples',
  },
  fr: {
    eyebrow: 'Meilleur pour',
    shortlist: 'Shortlist recommandée',
    shortlistDescription: 'Les cards reprennent le style des pages modèles, avec les modèles les plus adaptés en premier.',
    ranked: 'Sélection classée',
    rank: 'Rang',
    topPick: 'Premier choix',
    provider: 'Fournisseur',
    fit: 'Meilleur usage',
    evidence: 'Pourquoi ça matche',
    topReason: 'Recommandation principale pour cette intention de recherche, d’après les critères ci-dessus.',
    shortlistReason: 'Option forte de la shortlist quand ce critère compte dans la vidéo finale.',
    viewModel: 'Voir le modèle',
    viewExamples: 'Voir les exemples',
    compareWith: 'Comparer avec',
    compareShortlistCta: 'Comparer la shortlist',
    examplesCta: 'Voir les exemples cinéma',
    alsoAvailable: 'Aussi disponible',
    chooseTitle: 'Quand choisir chaque modèle ?',
    examplesTitle: 'Exemples à vérifier d’abord',
    examplesDescription: 'Prévisualisez le rendu avant de choisir un modèle.',
    whyTitle: 'Pourquoi ces modèles conviennent',
    mistakesTitle: 'Erreurs à éviter',
    fullAnalysis: 'Lire l’analyse complète',
    relatedGuides: 'Guides Best-for liés',
    allGuides: 'Voir tous les guides',
    score: 'Score',
    overall: 'Meilleur choix',
    criteriaNote: 'Les scores combinent qualité, contrôle, cohérence et efficacité coût.',
    compareShortlist: 'Comparer la shortlist',
    compareDescription: 'Des pages côte à côte utiles pour valider les compromis avant de choisir un modèle.',
    contentComing: 'Contenu bientôt disponible.',
    backToHub: 'Retour au hub Best-for',
    backToTop: 'Retour en haut',
    criteria: 'Critères de décision',
    quickLinks: 'Liens rapides',
    tier: 'Niveau',
    browseAllExamples: 'Voir tous les exemples',
  },
  es: {
    eyebrow: 'Mejor para',
    shortlist: 'Shortlist recomendada',
    shortlistDescription: 'Las cards reutilizan el lenguaje visual de las páginas de modelos, con los modelos ideales primero.',
    ranked: 'Selección ordenada',
    rank: 'Puesto',
    topPick: 'Primera opción',
    provider: 'Proveedor',
    fit: 'Ideal para',
    evidence: 'Por qué encaja',
    topReason: 'Recomendación principal para esta intención de búsqueda, según los criterios anteriores.',
    shortlistReason: 'Opción fuerte de la shortlist cuando este criterio pesa en el video final.',
    viewModel: 'Ver modelo',
    viewExamples: 'Ver ejemplos',
    compareWith: 'Comparar con',
    compareShortlistCta: 'Comparar la shortlist',
    examplesCta: 'Ver ejemplos cinematográficos',
    alsoAvailable: 'También disponible',
    chooseTitle: '¿Cuándo elegir cada modelo?',
    examplesTitle: 'Ejemplos para revisar primero',
    examplesDescription: 'Previsualiza la dirección del resultado antes de elegir un modelo.',
    whyTitle: 'Por qué estos modelos encajan',
    mistakesTitle: 'Evita estos errores',
    fullAnalysis: 'Leer el análisis completo',
    relatedGuides: 'Guías Mejor para relacionadas',
    allGuides: 'Ver todas las guías',
    score: 'Puntuación',
    overall: 'Mejor opción',
    criteriaNote: 'Las puntuaciones combinan calidad, control, consistencia y eficiencia de precio.',
    compareShortlist: 'Comparar la shortlist',
    compareDescription: 'Páginas lado a lado útiles para validar compromisos antes de elegir modelo.',
    contentComing: 'Contenido próximamente.',
    backToHub: 'Volver al espacio Mejor para',
    backToTop: 'Volver arriba',
    criteria: 'Criterios de decisión',
    quickLinks: 'Enlaces rápidos',
    tier: 'Nivel',
    browseAllExamples: 'Ver todos los ejemplos',
  },
  zh: {
    eyebrow: '最佳选择',
    shortlist: '推荐入围清单',
    shortlistDescription: '模型卡片采用与模型页面相同的视觉规范，最适合的引擎优先展示。',
    ranked: '综合推荐排名',
    rank: '排名',
    topPick: '首要推荐',
    provider: '提供商',
    fit: '最适场景',
    evidence: '入选理由',
    topReason: '基于上述评选标准，针对此搜索意图的首要推荐模型。',
    shortlistReason: '当该考量维度对最终成品至关重要时的强力备选方案。',
    viewModel: '查看模型',
    viewExamples: '查看示例',
    compareWith: '对比',
    compareShortlistCta: '对比入围模型',
    examplesCta: '查看电影级示例',
    alsoAvailable: '其他可用模型',
    chooseTitle: '各模型适用场景解析',
    examplesTitle: '建议优先查阅的生成范例',
    examplesDescription: '在决策前直观了解真实渲染效果与方向。',
    whyTitle: '入选本应用场景的核心理由',
    mistakesTitle: '务必避免的常见误区',
    fullAnalysis: '阅读完整分析报告',
    relatedGuides: '相关最佳推荐指南',
    allGuides: '查看全部场景指南',
    score: '评分',
    overall: '综合最佳',
    criteriaNote: '评分综合权衡了生成质量、可控性、一致性及成本效益。',
    compareShortlist: '对比入围清单',
    compareDescription: '在最终选型前，通过详尽的横向对比验证各项权衡。',
    contentComing: '内容即将上线。',
    backToHub: '返回场景中心',
    backToTop: '返回顶部',
    criteria: '决策考量标准',
    quickLinks: '快捷链接',
    tier: '层级',
    browseAllExamples: '浏览全部示例',
  },
};

export type BestForDetailCopy = (typeof DETAIL_COPY)[AppLocale];

export const USECASE_CRITERIA: Record<string, Record<AppLocale, string[]>> = {
  'image-to-video': {
    en: ['Image fidelity after motion', 'Camera control from a still', 'Clean product and subject preservation'],
    fr: ['Fidélité de l’image après mouvement', 'Contrôle caméra depuis une image fixe', 'Préservation propre du produit ou sujet'],
    es: ['Fidelidad de imagen tras el movimiento', 'Control de cámara desde una imagen fija', 'Preservación limpia del producto o sujeto'],
    zh: ['运动后的图像还原度', '静态帧镜头运镜控制', '主体与产品细节保真'],
  },
  'cinematic-realism': {
    en: ['Camera language and lighting', 'Natural motion physics', 'High-end visual polish'],
    fr: ['Langage caméra et lumière', 'Physique du mouvement naturelle', 'Rendu visuel premium'],
    es: ['Lenguaje de cámara e iluminación', 'Física de movimiento natural', 'Pulido visual premium'],
    zh: ['镜头语言与光影质感', '自然运动物理法则', '影视级高阶质感'],
  },
  'character-reference': {
    en: ['Stable identity', 'Wardrobe and prop retention', 'Reference-aware shot control'],
    fr: ['Identité stable', 'Tenue et accessoires conservés', 'Contrôle des plans par référence'],
    es: ['Identidad estable', 'Vestuario y accesorios consistentes', 'Control de planos con referencia'],
    zh: ['角色面容特征稳定', '服装与道具连贯保留', '基于参考的镜头控制'],
  },
  'reference-to-video': {
    en: ['Strong visual reference following', 'Flexible image or clip guidance', 'Good result with approved assets'],
    fr: ['Respect fort des références visuelles', 'Guidage flexible par image ou clip', 'Bon rendu depuis assets validés'],
    es: ['Seguimiento fuerte de referencias visuales', 'Guía flexible por imagen o clip', 'Buen resultado con assets aprobados'],
    zh: ['高精度视觉参考还原', '灵活的图片或片段引导', '基于已有素材的出色成片'],
  },
  'multi-shot-video': {
    en: ['Several shots from one prompt', 'Sequence continuity', 'Edited-feeling final output'],
    fr: ['Plusieurs plans depuis un prompt', 'Continuité de séquence', 'Résultat final déjà monté'],
    es: ['Varios planos desde un prompt', 'Continuidad de secuencia', 'Resultado final con sensación de montaje'],
    zh: ['单次提示生成多镜头', '镜头分镜转场连贯', '自带剪辑质感的成片'],
  },
  '4k-video': {
    en: ['Native or practical high resolution', 'Detail retention', 'Delivery-ready upscale path'],
    fr: ['Haute résolution native ou exploitable', 'Conservation du détail', 'Chemin clair vers une livraison finale'],
    es: ['Alta resolución nativa o práctica', 'Retención de detalle', 'Ruta clara hacia entrega final'],
    zh: ['原生或实用的超高清分辨率', '极致细节保留', '交付级画质提升流程'],
  },
  ads: {
    en: ['Product clarity', 'Campaign-grade polish', 'Variation-friendly output'],
    fr: ['Clarté produit', 'Finition niveau campagne', 'Sorties faciles à décliner'],
    es: ['Claridad de producto', 'Acabado de campaña', 'Salida fácil de versionar'],
    zh: ['产品主体清晰明确', '商业级成片质感', '便于多版本派生'],
  },
  'ugc-ads': {
    en: ['Creator-style realism', 'Dialogue and social proof', 'Fast hook testing'],
    fr: ['Réalisme style créateur', 'Dialogue et preuve sociale', 'Tests rapides de hooks'],
    es: ['Realismo estilo creador', 'Diálogo y prueba social', 'Pruebas rápidas de hooks'],
    zh: ['创作者口播真实质感', '对白与社交背书', '快速测试吸睛开头'],
  },
  'product-videos': {
    en: ['Packshot stability', 'Material and texture quality', 'Clean ecommerce motion'],
    fr: ['Stabilité packshot', 'Qualité matière et texture', 'Mouvement ecommerce propre'],
    es: ['Estabilidad de packshot', 'Calidad de materiales y textura', 'Movimiento ecommerce limpio'],
    zh: ['静物拍摄稳定性', '材质与纹理表现力', '干净利落的电商动态'],
  },
  'lipsync-dialogue': {
    en: ['Mouth timing', 'Voice and native audio options', 'Face consistency'],
    fr: ['Timing bouche', 'Options voix et audio natif', 'Cohérence du visage'],
    es: ['Sincronía de boca', 'Opciones de voz y audio nativo', 'Consistencia facial'],
    zh: ['口型动作精准同步', '原生音频与配音选项', '面部神态连贯一致'],
  },
  'fast-drafts': {
    en: ['Iteration speed', 'Low-cost variants', 'Enough control for review'],
    fr: ['Vitesse d’itération', 'Variantes à coût réduit', 'Contrôle suffisant pour valider'],
    es: ['Velocidad de iteración', 'Variantes de bajo precio', 'Control suficiente para revisar'],
    zh: ['极速迭代验证', '低成本多方案生成', '满足快速评审的控制度'],
  },
  'stylized-anime': {
    en: ['Stylized motion', 'Illustration coherence', 'Non-photoreal flexibility'],
    fr: ['Mouvement stylisé', 'Cohérence d’illustration', 'Flexibilité non photoréaliste'],
    es: ['Movimiento estilizado', 'Coherencia de ilustración', 'Flexibilidad no fotorrealista'],
    zh: ['风格化艺术动态', '插画画风一致性', '非写实视觉表现力'],
  },
};

export const USECASE_CHIPS: Record<string, Record<AppLocale, string[]>> = {
  'image-to-video': {
    en: ['Image fidelity', 'Motion control', 'Subject lock', 'Reference frames', 'Cost control'],
    fr: ['Fidélité image', 'Contrôle du mouvement', 'Sujet verrouillé', 'Frames de référence', 'Contrôle du coût'],
    es: ['Fidelidad de imagen', 'Control de movimiento', 'Sujeto estable', 'Frames de referencia', 'Control de precio'],
    zh: ['图像还原', '运动控制', '主体锁定', '参考关键帧', '成本控制'],
  },
  'cinematic-realism': {
    en: ['Camera language', 'Lighting', 'Motion physics', 'Visual polish', 'Cost control'],
    fr: ['Langage caméra', 'Lumière', 'Physique du mouvement', 'Rendu visuel', 'Contrôle du coût'],
    es: ['Lenguaje de cámara', 'Iluminación', 'Física del movimiento', 'Pulido visual', 'Control de precio'],
    zh: ['镜头语言', '光影表现', '运动物理', '视觉质感', '成本控制'],
  },
  'character-reference': {
    en: ['Identity lock', 'Wardrobe', 'Props', 'Shot continuity', 'Input limits'],
    fr: ['Identité verrouillée', 'Tenue', 'Accessoires', 'Continuité des plans', 'Limites d’entrée'],
    es: ['Identidad estable', 'Vestuario', 'Props', 'Continuidad de planos', 'Límites de entrada'],
    zh: ['身份锁定', '服饰连贯', '道具保持', '镜头连续性', '输入限制'],
  },
  'reference-to-video': {
    en: ['References', 'Style frames', 'Audio cues', 'Product consistency', 'Output control'],
    fr: ['Références', 'Style frames', 'Repères audio', 'Cohérence produit', 'Contrôle du rendu'],
    es: ['Referencias', 'Style frames', 'Señales de audio', 'Consistencia de producto', 'Control de salida'],
    zh: ['参考素材', '风格关键帧', '音频提示', '产品一致性', '输出控制'],
  },
  'multi-shot-video': {
    en: ['Shot order', 'Continuity', 'Scene labels', 'Prompt structure', 'Final edit'],
    fr: ['Ordre des plans', 'Continuité', 'Labels de scène', 'Structure du prompt', 'Montage final'],
    es: ['Orden de planos', 'Continuidad', 'Etiquetas de escena', 'Estructura del prompt', 'Edición final'],
    zh: ['镜头顺序', '连贯性', '分镜标签', '提示词结构', '最终成片'],
  },
  '4k-video': {
    en: ['Native 4K', 'Detail retention', 'Upscale path', 'Final delivery', 'Cost control'],
    fr: ['4K native', 'Détails conservés', 'Chemin upscale', 'Livraison finale', 'Contrôle du coût'],
    es: ['4K nativo', 'Retención de detalle', 'Ruta de upscale', 'Entrega final', 'Control de precio'],
    zh: ['原生 4K', '细节保留', '画质提升', '交付标准', '成本控制'],
  },
  ads: {
    en: ['Product clarity', 'Offer framing', 'Visual polish', 'Variant testing', 'Review speed'],
    fr: ['Clarté produit', 'Angle offre', 'Rendu propre', 'Tests de variantes', 'Vitesse de review'],
    es: ['Claridad de producto', 'Marco de oferta', 'Pulido visual', 'Pruebas de variantes', 'Velocidad de revisión'],
    zh: ['产品清晰', '卖点构图', '视觉质感', '多版本测试', '评审效率'],
  },
  'ugc-ads': {
    en: ['Creator realism', 'Dialogue', 'Face consistency', 'Hook testing', 'Social proof'],
    fr: ['Réalisme créateur', 'Dialogue', 'Cohérence visage', 'Tests de hooks', 'Preuve sociale'],
    es: ['Realismo de creador', 'Diálogo', 'Consistencia facial', 'Pruebas de hooks', 'Prueba social'],
    zh: ['真实博主感', '对白表达', '面部一致性', '开头黄金3秒', '社交背书'],
  },
  'product-videos': {
    en: ['Packshot stability', 'Textures', 'Clean reveals', 'Ecommerce motion', 'Brand fit'],
    fr: ['Stabilité packshot', 'Textures', 'Reveals propres', 'Mouvement ecommerce', 'Fit marque'],
    es: ['Estabilidad de packshot', 'Texturas', 'Reveals limpios', 'Movimiento ecommerce', 'Encaje de marca'],
    zh: ['静物拍摄稳定', '材质纹理', '干净亮相', '电商运镜', '契合品牌'],
  },
  'lipsync-dialogue': {
    en: ['Mouth timing', 'Voice sync', 'Face consistency', 'Audio options', 'Short dialogue'],
    fr: ['Timing bouche', 'Sync voix', 'Cohérence visage', 'Options audio', 'Dialogue court'],
    es: ['Timing de boca', 'Sync de voz', 'Consistencia facial', 'Opciones de audio', 'Diálogo corto'],
    zh: ['口型同步', '声音对齐', '面部一致性', '音频选项', '短对白生成'],
  },
  'fast-drafts': {
    en: ['Speed', 'Low cost', 'Rough timing', 'Variant testing', 'Review loop'],
    fr: ['Vitesse', 'Coût bas', 'Timing brouillon', 'Tests de variantes', 'Boucle de review'],
    es: ['Velocidad', 'Bajo precio', 'Timing preliminar', 'Pruebas de variantes', 'Ciclo de revisión'],
    zh: ['极速生成', '极低成本', '大致节奏', '多版本测试', '快速评审'],
  },
  'stylized-anime': {
    en: ['Line quality', 'Style consistency', 'Color blocks', 'Stylized motion', 'Creative tests'],
    fr: ['Qualité du trait', 'Cohérence de style', 'Aplats de couleur', 'Mouvement stylisé', 'Tests créatifs'],
    es: ['Calidad de línea', 'Consistencia de estilo', 'Bloques de color', 'Movimiento estilizado', 'Pruebas creativas'],
    zh: ['线条质量', '画风一致性', '色彩色块', '风格化动态', '创意探索'],
  },
};

export const DECISION_CRITERIA_FILLERS: Record<AppLocale, string[]> = {
  en: ['Cost efficiency and speed', 'Reliability and consistency'],
  fr: ['Efficacité coût et vitesse', 'Fiabilité et cohérence'],
  es: ['Eficiencia de precio y velocidad', 'Fiabilidad y consistencia'],
  zh: ['成本效益与生成速度', '稳定性与跨帧连贯性'],
};

export const USECASE_MISTAKE_FALLBACKS: Record<AppLocale, string[]> = {
  en: [
    'Choosing a model without matching the use case.',
    'Ignoring references, style frames, or input limits.',
    'Overcomplicating the first-pass prompt.',
    'Skipping draft passes and going straight to premium.',
    'Not checking cost before generation.',
  ],
  fr: [
    'Choisir un modèle sans matcher le cas d’usage.',
    'Ignorer les références, style frames ou limites d’input.',
    'Complexifier le prompt dès la première passe.',
    'Sauter les tests et aller directement sur du premium.',
    'Ne pas vérifier le coût avant génération.',
  ],
  es: [
    'Elegir un modelo sin ajustar el objetivo creativo.',
    'Ignorar referencias, style frames o límites de entrada.',
    'Complicar demasiado el primer prompt.',
    'Saltar los borradores e ir directo a premium.',
    'No revisar el precio antes de generar.',
  ],
  zh: [
    '未根据具体应用场景挑选最匹配的模型。',
    '忽略参考图、风格关键帧或输入格式限制。',
    '初次尝试时将提示词写得过于冗长繁复。',
    '跳过低成本草稿预览，直接使用高规格模型。',
    '在正式生成前未仔细核实预估成本。',
  ],
};
