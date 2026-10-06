import type { AppLocale } from '@/i18n/locales';

export type BenchmarkScoreAnchor = 2 | 5 | 8 | 10;

export type BenchmarkCopy = {
  meta: { title: string; description: string };
  hero: { eyebrow: string; title: string; intro: string; proof: string };
  ownership: {
    label: string;
    methodologyVersion: string;
    effective: string;
    about: string;
    standards: string;
  };
  nav: { scores: string; specs: string; speed: string; method: string };
  evidence: Array<{ title: string; body: string }>;
  scores: { title: string; intro: string; model: string; overall: string; updated: string; source: string };
  specs: {
    title: string;
    intro: string;
    source: string;
    routeContract: string;
    apiMechanics: string;
    release: string;
    modes: string;
    audio: string;
    references: string;
    modeLabels: Record<'textToVideo' | 'imageToVideo' | 'videoToVideo', string>;
  };
  latency: { title: string; intro: string; median: string; p90: string; window: string; unavailable: string; more: string };
  methodology: {
    title: string;
    intro: string;
    formula: string;
    scale: string;
    scoreAnchors: Record<BenchmarkScoreAnchor, string>;
    prompts: string;
    canonicalPrompt: string;
    limitations: string;
    changelog: string;
    criteria: Record<string, { label: string; definition: string }>;
    methodNotes: string[];
    initialRelease: string;
  };
  refundNote: string;
  cta: { title: string; body: string; models: string; compare: string; pricing: string; generate: string };
  scoreLabels: Array<{ id: string; label: string }>;
};

const SCORE_LABELS = {
  en: ['Prompt', 'Visual', 'Motion', 'Consistency', 'Human', 'Text', 'Audio', 'Sequencing', 'Control', 'Stability', 'Value'],
  fr: ['Prompt', 'Visuel', 'Mouvement', 'Cohérence', 'Humain', 'Texte', 'Audio', 'Séquences', 'Contrôle', 'Stabilité', 'Valeur'],
  es: ['Prompt', 'Visual', 'Movimiento', 'Consistencia', 'Personas', 'Texto', 'Audio', 'Secuencias', 'Control', 'Estabilidad', 'Valor'],
  zh: ['提示词', '视觉', '运动', '连贯性', '人物', '文本', '音频', '序列', '控制力', '稳定性', '性价比'],
} as const;

const SCORE_IDS = ['fidelity', 'visualQuality', 'motion', 'consistency', 'anatomy', 'textRendering', 'lipsyncQuality', 'sequencingQuality', 'controllability', 'speedStability', 'pricing'];

const COPY: Record<AppLocale, Omit<BenchmarkCopy, 'scoreLabels'>> = {
  en: {
    meta: { title: 'AI Video Model Benchmarks & Methodology', description: 'Compare Keyvo editorial scores, sourced AI video model specifications, and observed median and P90 generation times.' },
    hero: { eyebrow: 'Keyvo Research', title: 'AI video model benchmarks, explained', intro: 'Compare editorial quality scores, sourced model capabilities, and observed generation times in one clear research hub.', proof: 'Built from Keyvo scorecards, current model specifications, and anonymized production latency.' },
    ownership: { label: 'Editorial lead', methodologyVersion: 'Methodology', effective: 'Effective', about: 'About the editor', standards: 'Editorial Standards' },
    nav: { scores: 'Scorecards', specs: 'Specifications', speed: 'Observed speed', method: 'Methodology' },
    evidence: [
      { title: 'Editorial scores', body: 'A consistent 0–10 framework for quality, motion, control, and production fit.' },
      { title: 'Sourced specifications', body: 'Current capabilities checked against provider sources and the Keyvo route.' },
      { title: 'Observed speed', body: 'Rolling 30-day median and P90 generation time for eligible models.' }
    ],
    scores: { title: 'Model scorecards', intro: 'Compare the current Keyvo editorial view across eleven production criteria.', model: 'Model', overall: 'Overall score (0–10)', updated: 'Score updated', source: 'Keyvo editorial score' },
    specs: { title: 'Verified model specifications', intro: 'Review the limits and workflows exposed through Keyvo.', source: 'Source', routeContract: 'Keyvo production route contract', apiMechanics: 'Generic API mechanics', release: 'Release', modes: 'Input modes', audio: 'Audio', references: 'References', modeLabels: { textToVideo: 'Text → video', imageToVideo: 'Image → video', videoToVideo: 'Video → video' } },
    latency: { title: 'Observed generation times', intro: 'Median and P90 end-to-end generation time over a rolling 30-day window.', median: 'Median', p90: 'P90', window: 'Rolling 30 days', unavailable: 'The current latency snapshot is being refreshed.', more: 'Additional models appear as their rolling history matures.' },
    methodology: {
      title: 'How the scores work', intro: 'One scoring language, one overall formula, and one canonical prompt pack for future documented runs.', formula: 'Overall score formula', scale: 'Evaluation scale', scoreAnchors: { 2: 'Major visible failures prevent practical use.', 5: 'Usable in selected shots with clear limitations.', 8: 'Strong production-ready behavior for the tested criterion.', 10: 'Exceptional behavior with no material issue in the evaluated outputs.' }, prompts: 'Canonical prompt pack', canonicalPrompt: 'Canonical prompt — English', limitations: 'Method notes', changelog: 'Methodology updates',
      criteria: {
        fidelity: { label: 'Prompt adherence', definition: 'How closely the output follows requested subjects, actions, composition, and constraints.' },
        visualQuality: { label: 'Visual quality', definition: 'Perceived detail, realism, lighting, material rendering, and absence of visible artifacts.' },
        motion: { label: 'Motion realism', definition: 'Smoothness, physical plausibility, camera movement, and temporal behavior of moving subjects.' },
        consistency: { label: 'Temporal consistency', definition: 'Identity, object, background, and style stability across the generated clip.' },
        anatomy: { label: 'Human fidelity', definition: 'Faces, hands, limbs, body proportions, contact, and human-object interactions.' },
        textRendering: { label: 'Text legibility', definition: 'Accuracy and stability of requested words, labels, interface elements, and signage.' },
        lipsyncQuality: { label: 'Audio and lip sync', definition: 'Alignment between visible speech, dialogue timing, and generated audio when supported.' },
        sequencingQuality: { label: 'Multi-shot sequencing', definition: 'Continuity, narrative order, and identity preservation across explicit shot changes.' },
        controllability: { label: 'Controllability', definition: 'Reliability of camera, reference, framing, and other supported production controls.' },
        speedStability: { label: 'Speed and stability', definition: 'Editorial assessment of delivery consistency; observed median and P90 latency are published separately.' },
        pricing: { label: 'Value score', definition: 'Relative production value at the current Keyvo price position; live pricing remains on pricing and generation surfaces.' }
      },
      methodNotes: ['Generative outputs vary between runs.', 'Not every model supports every criterion or prompt type.', 'Provider capacity and queues change over time.', 'Observed production traffic is not a controlled experiment.', 'Rolling performance may reflect incidents, routing changes, and user-selected settings.', 'Keyvo sells access to the compared models and discloses that commercial interest.'],
      initialRelease: 'Initial score definitions, overall formula, canonical prompt pack, and rolling latency rules.'
    },
    refundNote: 'Failed paid generations are automatically refunded.',
    cta: { title: 'Choose the right model for the next shot', body: 'Move from research to model specs, side-by-side comparisons, live pricing, or generation.', models: 'Browse video models', compare: 'Compare models', pricing: 'View pricing', generate: 'Generate video' }
  },
  fr: {
    meta: { title: 'Benchmarks des modèles vidéo IA et méthodologie', description: 'Comparez les scores éditoriaux Keyvo, les spécifications sourcées et les temps de génération médians et P90 observés.' },
    hero: { eyebrow: 'Recherche Keyvo', title: 'Les benchmarks des modèles vidéo IA, expliqués', intro: 'Comparez scores éditoriaux, capacités sourcées et temps de génération observés dans un même espace clair.', proof: 'Construit à partir des scorecards Keyvo, des spécifications actuelles et de la latence de production anonymisée.' },
    ownership: { label: 'Responsable éditorial', methodologyVersion: 'Méthodologie', effective: 'Applicable le', about: 'À propos du responsable', standards: 'Normes éditoriales' },
    nav: { scores: 'Scorecards', specs: 'Spécifications', speed: 'Vitesse observée', method: 'Méthodologie' },
    evidence: [
      { title: 'Scores éditoriaux', body: 'Un cadre cohérent sur 10 pour la qualité, le mouvement, le contrôle et le fit production.' },
      { title: 'Spécifications sourcées', body: 'Des capacités vérifiées selon les sources fournisseur et la route Keyvo.' },
      { title: 'Vitesse observée', body: 'Médiane et P90 sur 30 jours glissants pour les modèles éligibles.' }
    ],
    scores: { title: 'Scorecards des modèles', intro: 'Comparez la lecture éditoriale Keyvo actuelle sur onze critères de production.', model: 'Modèle', overall: 'Score global (0–10)', updated: 'Score mis à jour', source: 'Score éditorial Keyvo' },
    specs: { title: 'Spécifications vérifiées', intro: 'Consultez les limites et workflows réellement exposés dans Keyvo.', source: 'Source', routeContract: 'Contrat de la route de production Keyvo', apiMechanics: 'Mécanique API générique', release: 'Sortie', modes: 'Modes d’entrée', audio: 'Audio', references: 'Références', modeLabels: { textToVideo: 'Texte → vidéo', imageToVideo: 'Image → vidéo', videoToVideo: 'Vidéo → vidéo' } },
    latency: { title: 'Temps de génération observés', intro: 'Médiane et P90 du temps de génération de bout en bout sur 30 jours glissants.', median: 'Médiane', p90: 'P90', window: '30 jours glissants', unavailable: 'La mesure de latence actuelle est en cours d’actualisation.', more: 'D’autres modèles apparaissent à mesure que leur historique se consolide.' },
    methodology: {
      title: 'Comment fonctionnent les scores', intro: 'Un langage de notation commun, une formule globale et un pack de prompts canonique pour les futurs tests documentés.', formula: 'Formule du score global', scale: 'Échelle d’évaluation', scoreAnchors: { 2: 'Des défauts visibles majeurs empêchent une utilisation pratique.', 5: 'Utilisable pour certains plans, avec des limites nettes.', 8: 'Comportement solide, prêt pour la production sur le critère évalué.', 10: 'Comportement exceptionnel, sans problème notable dans les résultats évalués.' }, prompts: 'Pack de prompts canonique', canonicalPrompt: 'Prompt canonique — anglais', limitations: 'Notes méthodologiques', changelog: 'Mises à jour de la méthode',
      criteria: {
        fidelity: { label: 'Respect du prompt', definition: 'Fidélité du résultat aux sujets, actions, cadrage et contraintes demandés.' },
        visualQuality: { label: 'Qualité visuelle', definition: 'Niveau de détail, réalisme, lumière, rendu des matières et absence d’artefacts visibles.' },
        motion: { label: 'Réalisme du mouvement', definition: 'Fluidité, plausibilité physique, mouvements de caméra et comportement temporel des sujets.' },
        consistency: { label: 'Cohérence temporelle', definition: 'Stabilité des identités, objets, décors et styles pendant toute la vidéo.' },
        anatomy: { label: 'Fidélité humaine', definition: 'Visages, mains, membres, proportions, contacts et interactions entre personnes et objets.' },
        textRendering: { label: 'Lisibilité du texte', definition: 'Exactitude et stabilité des mots, étiquettes, interfaces et panneaux demandés.' },
        lipsyncQuality: { label: 'Audio et synchronisation labiale', definition: 'Alignement entre la parole visible, le dialogue et l’audio généré lorsque cette fonction est disponible.' },
        sequencingQuality: { label: 'Enchaînement multi-plans', definition: 'Continuité, ordre narratif et préservation des identités entre plusieurs plans.' },
        controllability: { label: 'Contrôlabilité', definition: 'Fiabilité des contrôles de caméra, références, cadrage et autres réglages de production.' },
        speedStability: { label: 'Vitesse et stabilité', definition: 'Évaluation éditoriale de la régularité de livraison ; la médiane et le P90 observés sont publiés séparément.' },
        pricing: { label: 'Rapport valeur-prix', definition: 'Valeur de production relative au positionnement tarifaire actuel de Keyvo ; les prix live restent sur les pages tarifaires et de génération.' }
      },
      methodNotes: ['Les résultats génératifs peuvent varier d’un essai à l’autre.', 'Tous les modèles ne prennent pas en charge chaque critère ou type de prompt.', 'La capacité et les files d’attente des fournisseurs évoluent.', 'Le trafic de production observé n’est pas une expérience contrôlée.', 'Les performances glissantes peuvent refléter des incidents, des changements de routage et les réglages choisis par les utilisateurs.', 'Keyvo commercialise l’accès aux modèles comparés et déclare cet intérêt commercial.'],
      initialRelease: 'Première version des définitions, de la formule globale, du pack de prompts canonique et des règles de latence glissante.'
    },
    refundNote: 'Les générations payantes échouées sont automatiquement remboursées.',
    cta: { title: 'Choisissez le bon modèle pour votre prochain plan', body: 'Passez de la recherche aux fiches modèles, comparaisons, prix live ou à la génération.', models: 'Voir les modèles vidéo', compare: 'Comparer les modèles', pricing: 'Voir les tarifs', generate: 'Générer une vidéo' }
  },
  es: {
    meta: { title: 'Benchmarks de modelos de video IA y metodología', description: 'Compara puntuaciones editoriales de Keyvo, especificaciones con fuentes y tiempos de generación medianos y P90 observados.' },
    hero: { eyebrow: 'Investigación de Keyvo', title: 'Benchmarks de modelos de video IA, explicados', intro: 'Compara puntuaciones editoriales de modelos de video, capacidades con fuentes y tiempos de generación observados en un solo centro de investigación.', proof: 'Creado con scorecards de Keyvo, especificaciones actuales y latencia de producción anonimizada.' },
    ownership: { label: 'Responsable editorial', methodologyVersion: 'Metodología', effective: 'Vigente desde', about: 'Acerca del responsable', standards: 'Estándares editoriales' },
    nav: { scores: 'Scorecards', specs: 'Especificaciones', speed: 'Velocidad observada', method: 'Metodología' },
    evidence: [
      { title: 'Puntuaciones editoriales', body: 'Un marco coherente de 0 a 10 para calidad, movimiento, control y uso en producción.' },
      { title: 'Especificaciones con fuentes', body: 'Capacidades actuales verificadas con fuentes del proveedor y la ruta de Keyvo.' },
      { title: 'Velocidad observada', body: 'Mediana y P90 de 30 días para modelos con historial suficiente.' }
    ],
    scores: { title: 'Scorecards de modelos', intro: 'Compara la evaluación editorial actual de Keyvo en once criterios de producción.', model: 'Modelo', overall: 'Puntuación global (0–10)', updated: 'Puntuación actualizada', source: 'Puntuación editorial de Keyvo' },
    specs: { title: 'Especificaciones verificadas', intro: 'Revisa los límites y flujos disponibles en Keyvo.', source: 'Fuente', routeContract: 'Contrato de la ruta de producción de Keyvo', apiMechanics: 'Mecánica de la API genérica', release: 'Lanzamiento', modes: 'Modos de entrada', audio: 'Audio', references: 'Referencias', modeLabels: { textToVideo: 'Texto → video', imageToVideo: 'Imagen → video', videoToVideo: 'Video → video' } },
    latency: { title: 'Tiempos de generación observados', intro: 'Mediana y P90 del tiempo total de generación durante una ventana móvil de 30 días.', median: 'Mediana', p90: 'P90', window: '30 días móviles', unavailable: 'La medición de latencia se está actualizando.', more: 'Aparecerán más modelos cuando su historial móvil esté consolidado.' },
    methodology: {
      title: 'Cómo funcionan las puntuaciones', intro: 'Un lenguaje de evaluación, una fórmula global y un pack de prompts canónico para futuras pruebas documentadas.', formula: 'Fórmula de puntuación global', scale: 'Escala de evaluación', scoreAnchors: { 2: 'Las fallas visibles importantes impiden un uso práctico.', 5: 'Utilizable en tomas seleccionadas, con limitaciones claras.', 8: 'Desempeño sólido y listo para producción en el criterio evaluado.', 10: 'Desempeño excepcional, sin problemas relevantes en los resultados evaluados.' }, prompts: 'Pack de prompts canónico', canonicalPrompt: 'Prompt canónico — inglés', limitations: 'Notas metodológicas', changelog: 'Actualizaciones de metodología',
      criteria: {
        fidelity: { label: 'Fidelidad al prompt', definition: 'Qué tan fielmente el resultado sigue los sujetos, acciones, composición y restricciones solicitados.' },
        visualQuality: { label: 'Calidad visual', definition: 'Detalle percibido, realismo, iluminación, materiales y ausencia de artefactos visibles.' },
        motion: { label: 'Realismo del movimiento', definition: 'Fluidez, plausibilidad física, movimiento de cámara y comportamiento temporal de los sujetos.' },
        consistency: { label: 'Consistencia temporal', definition: 'Estabilidad de identidades, objetos, fondos y estilos a lo largo del video.' },
        anatomy: { label: 'Fidelidad humana', definition: 'Rostros, manos, extremidades, proporciones, contacto e interacción entre personas y objetos.' },
        textRendering: { label: 'Legibilidad del texto', definition: 'Precisión y estabilidad de palabras, etiquetas, interfaces y letreros solicitados.' },
        lipsyncQuality: { label: 'Audio y sincronización labial', definition: 'Alineación entre el habla visible, el diálogo y el audio generado cuando la función está disponible.' },
        sequencingQuality: { label: 'Secuencias de varias tomas', definition: 'Continuidad, orden narrativo y preservación de identidades entre cambios de toma.' },
        controllability: { label: 'Control', definition: 'Confiabilidad de la cámara, referencias, encuadre y otros controles de producción disponibles.' },
        speedStability: { label: 'Velocidad y estabilidad', definition: 'Evaluación editorial de la consistencia de entrega; la mediana y el P90 observados se publican por separado.' },
        pricing: { label: 'Relación valor-precio', definition: 'Valor de producción relativo al precio actual en Keyvo; los precios en vivo permanecen en las páginas de precios y generación.' }
      },
      methodNotes: ['Los resultados generativos pueden variar entre ejecuciones.', 'No todos los modelos admiten cada criterio o tipo de prompt.', 'La capacidad y las colas de los proveedores cambian con el tiempo.', 'El tráfico de producción observado no es un experimento controlado.', 'El rendimiento de la ventana móvil puede reflejar incidentes, cambios de enrutamiento y configuraciones elegidas por los usuarios.', 'Keyvo vende acceso a los modelos comparados y declara ese interés comercial.'],
      initialRelease: 'Primera versión de las definiciones, la fórmula global, el pack de prompts canónico y las reglas de latencia móvil.'
    },
    refundNote: 'Las generaciones pagadas que fallan se reembolsan automáticamente.',
    cta: { title: 'Elige el modelo adecuado para tu siguiente toma', body: 'Pasa de la investigación a las fichas de modelo, comparaciones, precios en vivo o generación.', models: 'Ver modelos de video', compare: 'Comparar modelos', pricing: 'Ver precios', generate: 'Generar video' }
  },
  zh: {
    meta: { title: 'AI 视频模型基准测试与评测方法', description: '对比 Keyvo 编辑评分、已验证的 AI 视频模型规格，以及实测中位数和 P90 生成耗时。' },
    hero: { eyebrow: 'Keyvo 评测研究', title: 'AI 视频模型基准测试详解', intro: '在一个清晰的研究中心内，对比编辑质量评分、核实的模型功能与实测生成耗时。', proof: '基于 Keyvo 评分卡、当前模型规格及匿名化生产环境生成耗时构建。' },
    ownership: { label: '主编负责人', methodologyVersion: '评测方法', effective: '生效日期', about: '关于主编', standards: '编辑准则' },
    nav: { scores: '评分卡', specs: '规格参数', speed: '实测耗时', method: '评测方法' },
    evidence: [
      { title: '编辑评分', body: '统一的 0–10 分框架，涵盖质量、运动、控制力与生产契合度。' },
      { title: '核实规格', body: '比对供应商官方文档与 Keyvo 实际生产路由验证的功能。' },
      { title: '实测速度', body: '合格模型最近 30 天滚动中位数及 P90 生成耗时。' }
    ],
    scores: { title: '模型评分卡', intro: '在十一项生产级评测标准下对比 Keyvo 当前编辑视角。', model: '模型', overall: '综合得分 (0–10)', updated: '评分更新于', source: 'Keyvo 编辑评分' },
    specs: { title: '已核实模型规格', intro: '查看通过 Keyvo 开放的模型限制与工作流程。', source: '来源', routeContract: 'Keyvo 生产路由约定', apiMechanics: '通用 API 机制', release: '发布时间', modes: '输入模式', audio: '音频', references: '参考素材', modeLabels: { textToVideo: '文生视频', imageToVideo: '图生视频', videoToVideo: '视频转视频' } },
    latency: { title: '实测生成耗时', intro: '基于 30 天滚动窗口的端到端生成耗时中位数与 P90。', median: '中位数', p90: 'P90', window: '近 30 天滚动数据', unavailable: '当前延迟快照正在刷新。', more: '随着运行数据积累，将收录更多模型。' },
    methodology: {
      title: '评分运作机制', intro: '统一的评分语言、综合得分公式及供后续归档测试的规范提示词包。', formula: '综合得分公式', scale: '评估分级', scoreAnchors: { 2: '存在严重视觉缺陷，无法在实际场景中使用。', 5: '在明确限制下可在部分选定镜头中使用。', 8: '在受测标准下表现出色，符合生产级交付要求。', 10: '表现卓越，在评估输出中未发现实质性问题。' }, prompts: '规范提示词包', canonicalPrompt: '规范提示词 — 英文', limitations: '评测方法说明', changelog: '方法论更新记录',
      criteria: {
        fidelity: { label: '提示词遵循度', definition: '生成结果对要求的主体、动作、构图及限制条件的契合程度。' },
        visualQuality: { label: '视觉质量', definition: '感官细节、真实感、光影、材质渲染及无明显伪影的表现。' },
        motion: { label: '动态逼真度', definition: '平滑度、物理合理性、镜头运镜及运动主体的时序表现。' },
        consistency: { label: '时序连贯性', definition: '整个生成片段中主体身份、物体、背景和风格的稳定性。' },
        anatomy: { label: '人体还原度', definition: '面部、手部、肢体、身材比例、肢体接触及人机互动。' },
        textRendering: { label: '文本可读性', definition: '画面中要求的文字、标牌、界面元素及指示标志的准确度与稳定性。' },
        lipsyncQuality: { label: '音频与对口型', definition: '在支持音频时，人物口型、对话时序与生成音频的对齐质量。' },
        sequencingQuality: { label: '多镜头序列', definition: '在明确镜头切换时的连贯性、叙事顺序与主体一致性保持。' },
        controllability: { label: '可控度', definition: '摄像机视角、参考素材、构图及其他生产控制参数的可靠程度。' },
        speedStability: { label: '速度与稳定性', definition: '交付稳定性的编辑评级；实测中位数及 P90 延迟单独公布。' },
        pricing: { label: '性价比得分', definition: '在当前 Keyvo 价格定位下的相对生产价值；实时价格以定价和生成页为准。' }
      },
      methodNotes: ['生成式输出在不同批次间存在波动。', '并非每个模型都支持所有评测标准或提示词类型。', '供应商算力与排队情况会随时间变化。', '实测生产流量非受控实验室对照测试。', '滚动性能数据可能反映偶发事件、路由调整及用户自选参数。', 'Keyvo 销售所对比模型的访问权限，并公开此商业关联。'],
      initialRelease: '初始评分定义、综合公式、规范提示词包及滚动延迟规则。'
    },
    refundNote: '付费生成任务若失败将自动全额退款。',
    cta: { title: '为您的下一个镜头挑选合适模型', body: '从基准调研快速前往模型规格、并排对比、实时价格或直接开始生成。', models: '浏览视频模型', compare: '对比模型', pricing: '查看价格', generate: '生成视频' }
  }
};

export function getBenchmarkCopy(locale: AppLocale): BenchmarkCopy {
  return {
    ...(COPY[locale] ?? COPY.en),
    scoreLabels: SCORE_IDS.map((id, index) => ({ id, label: SCORE_LABELS[locale][index] ?? SCORE_LABELS.en[index]! })),
  };
}
