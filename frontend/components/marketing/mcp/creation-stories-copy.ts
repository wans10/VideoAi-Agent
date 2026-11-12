import type { AppLocale } from '@/i18n/locales';

type Story = { id: string; title: string; body: string; method: string; duration: string };
type StoryCopy = { eyebrow: string; title: string; intro: string; details: string; connect: string; bridge: string; bridgeLink: string; credit: string; stories: Story[] };

const en: StoryCopy = {
  eyebrow: 'MADE WITH AN ASSISTANT', title: 'Your idea. Your direction. An edited film.',
  intro: 'Build the story in the conversation. Your assistant can generate the shots through Keyvo and handle the edit with its own tools. These Codex productions show the result without the creator opening an editing application.',
  details: 'How it was made', connect: 'Create with Codex',
  bridge: 'Explore films generated and edited with an assistant in Codex. Editing tools depend on the host; these examples are separate from the connection checks for this assistant.',
  bridgeLink: 'Explore the creative examples',
  credit: 'Music: “Funkorama” by Kevin MacLeod. Excerpted, mixed and faded for this film.',
  stories: [
    { id: 'main-character', title: 'Turn a product image into a short ad', duration: '18 seconds', body: 'A fictional yellow backpack becomes the star of six shots, a character reaction and a visual punchline. Direct the idea in the conversation; let the assistant shape the film.', method: 'Image and video sources generated through Keyvo MCP. The assistant selected the shots and handled the edit, titles and sound. The product is fictional.' },
    { id: 'the-hat-stays', title: 'Build a scene around dialogue and action', duration: '27 seconds', body: 'An oversized purple hat sets a small commercial in motion. Spoken lines, character reactions and physical action come together in one edited scene.', method: 'Created in Codex desktop with Wan 3 dialogue shots and MiniMax H3 action through Keyvo MCP. The assistant assembled the film, captions and sound using its editing tools.' },
    { id: 'daylight-afterparty', title: 'Make a music video with a character of your own', duration: '30 seconds', body: 'A fictional performer, an original track and a bright daytime setting become a short music video. The assistant carries the idea from individual shots to the final rhythm.', method: 'Kling shots generated through Keyvo MCP. Music was composed by the assistant with local tools; the assistant also edited and mixed the film. The music was not a generation input.' },
  ],
};
const fr: StoryCopy = {
  eyebrow: 'CRÉÉ AVEC UN ASSISTANT', title: 'Votre idée. Votre direction. Un film monté.',
  intro: 'Construisez l’histoire dans la conversation. Votre assistant peut générer les plans via Keyvo et réaliser le montage avec ses outils. Ces productions dans Codex montrent le résultat, sans que le créateur ouvre un logiciel de montage.',
  details: 'Comment ce film a été créé', connect: 'Créer avec Codex',
  bridge: 'Découvrez des films générés et montés avec un assistant dans Codex. Les outils de montage dépendent de l’hôte ; ces exemples sont distincts des contrôles de connexion de cet assistant.',
  bridgeLink: 'Découvrir les exemples créatifs',
  credit: 'Musique : « Funkorama » de Kevin MacLeod. Extrait, mixage et fondus adaptés à ce film.',
  stories: [
    { id: 'main-character', title: 'D’une image produit à une publicité', duration: '18 secondes', body: 'Un sac à dos jaune fictif devient la vedette de six plans, d’une réaction de personnage et d’une chute visuelle. Dirigez l’idée dans la conversation ; l’assistant donne forme au film.', method: 'Images et vidéos générées via Keyvo MCP. L’assistant a sélectionné les plans et réalisé le montage, les titres et le son. Le produit est fictif.' },
    { id: 'the-hat-stays', title: 'Construire une scène dialoguée et vivante', duration: '27 secondes', body: 'Un immense chapeau violet met une petite publicité en mouvement. Répliques, réactions et action physique se répondent dans une scène montée.', method: 'Créé dans Codex desktop avec des plans dialogués Wan 3 et une action MiniMax H3 via Keyvo MCP. L’assistant a assemblé le film, les sous-titres et le son avec ses outils de montage.' },
    { id: 'daylight-afterparty', title: 'Créer un clip avec votre propre personnage', duration: '30 secondes', body: 'Un interprète fictif, une musique originale et un décor lumineux deviennent un clip court. L’assistant accompagne l’idée des premiers plans jusqu’au rythme du montage.', method: 'Plans Kling générés via Keyvo MCP. L’assistant a composé la musique avec ses outils locaux, puis monté et mixé le film. La musique n’a pas été fournie comme entrée de génération.' },
  ],
};
const es: StoryCopy = {
  eyebrow: 'CREADO CON UN ASISTENTE', title: 'Tu idea. Tu dirección. Una película editada.',
  intro: 'Desarrolla la historia en la conversación. Tu asistente puede generar los planos con Keyvo y realizar el montaje con sus herramientas. Estas producciones en Codex muestran el resultado sin que el creador abra una aplicación de edición.',
  details: 'Cómo se creó', connect: 'Crear con Codex',
  bridge: 'Descubre películas generadas y editadas con un asistente en Codex. Las herramientas de edición dependen del cliente; estos ejemplos son distintos de las comprobaciones de conexión de este asistente.',
  bridgeLink: 'Ver los ejemplos creativos',
  credit: 'Música: «Funkorama» de Kevin MacLeod. Fragmento, mezcla y fundidos adaptados a esta película.',
  stories: [
    { id: 'main-character', title: 'De una imagen de producto a un anuncio', duration: '18 segundos', body: 'Una mochila amarilla ficticia protagoniza seis planos, una reacción y un remate visual. Dirige la idea en la conversación y deja que el asistente dé forma a la película.', method: 'Imágenes y videos generados mediante Keyvo MCP. El asistente seleccionó los planos y realizó el montaje, los títulos y el sonido. El producto es ficticio.' },
    { id: 'the-hat-stays', title: 'Construye una escena con diálogo y acción', duration: '27 segundos', body: 'Un enorme sombrero morado pone en marcha un pequeño anuncio. Diálogo, reacciones y acción física se unen en una escena editada.', method: 'Creado en Codex desktop con planos dialogados de Wan 3 y acción de MiniMax H3 mediante Keyvo MCP. El asistente montó la película, los subtítulos y el sonido con sus herramientas de edición.' },
    { id: 'daylight-afterparty', title: 'Crea un videoclip con tu propio personaje', duration: '30 segundos', body: 'Un intérprete ficticio, música original y un escenario luminoso se convierten en un videoclip corto. El asistente lleva la idea desde los planos individuales hasta el ritmo final.', method: 'Planos Kling generados mediante Keyvo MCP. El asistente compuso la música con herramientas locales y realizó el montaje y la mezcla. La música no se utilizó como entrada de generación.' },
  ],
};
const zh: StoryCopy = {
  eyebrow: '与助手共同创作', title: '你的创意。你的导演。一部剪辑完成的影片。',
  intro: '在对话中构建故事。你的助手可以通过 Keyvo 生成镜头，并用自己的工具完成剪辑。这些 Codex 作品展示了成片效果，创作者无需打开任何剪辑软件。',
  details: '制作方式', connect: '用 Codex 创作',
  bridge: '浏览在 Codex 中由助手生成并剪辑的影片。剪辑工具取决于所用的宿主应用；这些示例与该助手的连接检查相互独立。',
  bridgeLink: '查看创意示例',
  credit: '音乐：Kevin MacLeod 的《Funkorama》。已为本片截取、混音并添加淡入淡出。',
  stories: [
    { id: 'main-character', title: '把产品图变成一支短广告', duration: '18 秒', body: '一只虚构的黄色背包成为六个镜头、一次角色反应和一个视觉笑点的主角。在对话中说出你的想法，让助手来塑造影片。', method: '图像与视频素材通过 Keyvo MCP 生成。助手挑选镜头，并完成剪辑、字幕和声音。产品为虚构。' },
    { id: 'the-hat-stays', title: '围绕对白与动作构建一场戏', duration: '27 秒', body: '一顶超大的紫色帽子让一支小型广告动了起来。台词、角色反应与肢体动作汇聚在一场剪辑完成的戏中。', method: '在 Codex 桌面版中创作，通过 Keyvo MCP 使用 Wan 3 对白镜头与 MiniMax H3 动作镜头。助手用其剪辑工具完成影片、字幕和声音的合成。' },
    { id: 'daylight-afterparty', title: '用你自己的角色制作音乐视频', duration: '30 秒', body: '一位虚构的表演者、一首原创曲目和明亮的白天场景，组成一支短音乐视频。助手把创意从单个镜头一路带到最终的节奏。', method: 'Kling 镜头通过 Keyvo MCP 生成。音乐由助手用本地工具创作，助手同时完成影片的剪辑与混音。音乐并非生成输入。' },
  ],
};
export function getCreationStoriesCopy(locale: AppLocale): StoryCopy { return { en, fr, es, zh }[locale]; }
