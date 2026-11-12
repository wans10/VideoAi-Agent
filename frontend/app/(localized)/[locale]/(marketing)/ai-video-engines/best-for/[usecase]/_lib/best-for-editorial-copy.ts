import type { AppLocale } from '@/i18n/locales';

export type LocalizedText = Record<AppLocale, string>;
export const text = (en: string, fr: string, es: string, zh: string): LocalizedText => ({ en, fr, es, zh });

export const EDITORIAL_COPY = {
  reviewed: text('Selection reviewed', 'Sélection revue le', 'Selección revisada el', "精选审核于"),
  watch: text('Start with a scene.', 'Tout commence par une scène.', 'Todo empieza con una escena.', "从一个场景开始。"),
  watchNote: text('Real generations, different briefs. Open a clip to watch, then explore its prompt.', 'De vraies générations, des briefs différents. Ouvrez un clip, puis explorez son prompt.', 'Generaciones reales, con briefs distintos. Abre un clip y explora su prompt.', "真实生成的作品，来自不同的创作需求。打开片段观看，再查看对应提示词。"),
  play: text('Watch the scene', 'Voir la scène', 'Ver la escena', "观看场景"),
  prompt: text('See the prompt & create', 'Voir le prompt et créer', 'Ver el prompt y crear', "查看提示词并创作"),
  look: text('Look for', 'À observer', 'Fíjate en', "观察要点"),
  shortlist: text('Find your starting point.', 'Trouvez votre point de départ.', 'Encuentra tu punto de partida.', "找到你的起点。"),
  shortlistNote: text('Our recommended starting order, with alternatives for different needs.', 'Notre ordre de départ conseillé, avec des alternatives selon vos besoins.', 'Nuestro orden inicial recomendado, con alternativas según tus necesidades.', "我们推荐的尝试顺序，并附上适合不同需求的备选模型。"),
  limitation: text('Keep in mind', 'À garder en tête', 'Ten en cuenta', "请注意"),
  method: text('How we choose', 'Comment nous choisissons', 'Cómo elegimos', "我们如何挑选"),
  methodNote: text('This is an editorial order for starting your tests, not a measured quality ranking. We consider the available inputs, duration, audio and output options for this task. The clips use different prompts and settings; a single result cannot establish which model is best. Check the full model details before you create.', 'Cette sélection éditoriale tient compte des entrées disponibles, de la durée, du son et des formats utiles pour ce projet. L’ordre propose un point de départ pour vos essais ; il ne mesure pas une supériorité de qualité. Les clips ont des prompts et des réglages différents : un seul résultat ne départage pas les modèles. Vérifiez la fiche du modèle avant de créer.', 'Esta selección editorial considera las entradas, duración, audio y formatos útiles para este proyecto. El orden propone por dónde empezar las pruebas; no mide una superioridad de calidad. Los clips tienen prompts y ajustes distintos: un resultado no decide qué modelo es mejor. Consulta la ficha del modelo antes de crear.', "这是供你开始测试的编辑推荐顺序，而不是实测画质排名。我们综合考虑该任务可用的输入方式、时长、音频与输出选项。片段使用的提示词和设置各不相同，单个结果无法证明哪个模型最好。创作前请查看完整的模型详情。"),
  createTitle: text('Your idea. Your way in.', 'Votre idée. À vous de jouer.', 'Tu idea. Tu forma de crear.', "你的创意，由你开启。"),
  create: text('Choose your own settings', 'Choisir mes réglages', 'Elegir mis ajustes', "自行选择设置"),
  createBody: text('Pick a model, add your prompt or reference, then check the quote.', 'Choisissez un modèle, ajoutez votre prompt ou votre référence, puis vérifiez le devis.', 'Elige un modelo, añade un prompt o referencia y revisa el presupuesto.', "选择模型，添加提示词或参考素材，然后确认报价。"),
  studio: text('Shape it in Studio', 'Développer mon idée dans Studio', 'Dar forma a mi idea en Studio', "在 Studio 中打磨创意"),
  studioBody: text('Bring a rough idea. Develop the direction in conversation and approve the quote for each creation.', 'Partez d’une idée. Affinez la direction en conversation et validez le devis de chaque création.', 'Parte de una idea. Afina la dirección en una conversación y aprueba cada creación.', "带上一个初步想法，通过对话完善创作方向，并逐次确认每次创作的报价。"),
  assistant: text('Stay with your assistant', 'Rester avec mon assistant', 'Seguir con mi asistente', "继续使用你的助手"),
  assistantBody: text('Explore the MCP connections for your assistant, with setup and capabilities for each host.', 'Découvrez les connexions MCP, leur installation et les possibilités de chaque assistant.', 'Explora las conexiones MCP, su instalación y las opciones de cada asistente.', "了解适用于你的助手的 MCP 连接，包含各个宿主应用的安装方式与功能。"),
  costs: text('Studio assistance and media generation have separate costs. Always review the current generation quote.', 'L’assistance Studio et la génération de médias ont des coûts distincts. Vérifiez toujours le devis de génération.', 'La asistencia de Studio y la generación de medios tienen costes distintos. Revisa siempre el presupuesto.', "Studio 辅助与媒体生成分别计费。请务必核对当前的生成报价。"),
  details: text('A few things worth checking', 'Quelques repères avant de créer', 'Antes de crear', "创作前值得确认的几点"),
  choose: text('Explore the models', 'Explorer les modèles', 'Explorar los modelos', "探索模型"),
  noVideo: text('Explore all public examples', 'Explorer les exemples publics', 'Explorar los ejemplos públicos', "浏览全部公开示例"),
} as const;
