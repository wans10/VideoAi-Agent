import type { AppLocale } from '@/i18n/locales';
import type { CreatorToolId } from '@/lib/toolbox/creator-availability';

type Detail = { title: string; intro: string; steps: [string, string, string]; artAlt: string; action: string };
type DetailDictionary = {
  tools: Record<CreatorToolId, Detail>;
  photoMode: string; videoMode: string; mineral: string; light: string;
  comparisonNote: string; continuationTitle: string; continuationBody: string;
  captionContinuation: string; media: string; studio: string; export: string;
};

const en: DetailDictionary = {
  tools: {
    subtitles: {
      action: 'Caption my video',
      title: 'The words are yours. So is the style.',
      intro: 'Correct a name. Give a line more room. Choose captions that belong in your video.',
      steps: ['Start with the voice', 'Refine every line', 'Choose your format'],
      artAlt: 'Presentation artwork: a woman in a red coat speaking beside an ocean observatory at sunset.',
    },
    'lip-sync': {
      action: 'Animate a face',
      title: 'One voice. Two ways to begin.',
      intro: 'Bring a still portrait to life or change the words in an existing shot. Your recording sets the pace.',
      steps: ['Choose the face', 'Add your voice', 'Review the performance'],
      artAlt: 'Presentation artwork: a cinematic portrait with a sculptural chrome collar, blue background and warm light.',
    },
    'product-photo-editor': {
      action: 'Edit my product photo',
      title: 'One photo. More directions.',
      intro: 'A sculptural setting, softer light, a campaign world. Your instruction gives the image its direction.',
      steps: ['Prepare your image', 'Describe the change', 'Compare the details'],
      artAlt: 'Presentation artwork: a blue and chrome sneaker in a red canyon with flowing metallic forms.',
    },
    'product-video-editor': {
      action: 'Edit my product video',
      title: 'A new world for your shot.',
      intro: 'Explore a change of setting, light or style. Compare the entire edited passage with the video you started from.',
      steps: ['Select your passage', 'Set the direction', 'Watch both versions'],
      artAlt: 'Presentation artwork: a blue and chrome sneaker surrounded by golden light and reflective columns.',
    },
    'motion-transfer': {
      action: 'Animate my character',
      title: 'Start with a gesture.',
      intro: 'A character image meets a filmed performance. Select the movement you want to guide your animation.',
      steps: ['Choose your character', 'Find the movement', 'Make it move'],
      artAlt: 'Presentation artwork: a dancer in flowing lime fabric in a sculptural red architectural space.',
    },
  },
  photoMode: 'Start with a still portrait. Add a voice recording to create a speaking video.',
  videoMode: 'Start with a filmed face. Match the lips to a new recording, using passages of equal length.',
  mineral: 'Mineral setting', light: 'Light studio',
  comparisonNote: 'Two art directions to explore. Still presentation images, not a before-and-after tool result.',
  continuationTitle: 'Keep creating, in one place.',
  continuationBody: 'Find the result in Media. Add it to a film in Studio, or download it.',
  captionContinuation: 'Keep your editable captions in the subtitle library. Download SRT or VTT, or use a saved revision in Studio.',
  media: 'Media', studio: 'Studio', export: 'Export',
};

const fr: DetailDictionary = {
  tools: {
    subtitles: {
      action: 'Sous-titrer ma vidéo',
      title: 'Vos mots. Votre style.',
      intro: 'Corrigez un nom. Laissez respirer une phrase. Choisissez des sous-titres qui font partie de votre vidéo.',
      steps: ['Partez de la voix', 'Affinez chaque phrase', 'Choisissez le format'],
      artAlt: 'Visuel de présentation : une femme en manteau rouge parle près d’un observatoire au bord de l’océan, au coucher du soleil.',
    },
    'lip-sync': {
      action: 'Animer un visage',
      title: 'Une voix. Deux points de départ.',
      intro: 'Animez un portrait ou changez les mots d’un plan existant. Votre enregistrement donne le rythme.',
      steps: ['Choisissez le visage', 'Ajoutez votre voix', 'Regardez et écoutez'],
      artAlt: 'Visuel de présentation : portrait cinématographique avec un col sculptural chromé, un fond bleu et une lumière chaude.',
    },
    'product-photo-editor': {
      action: 'Retoucher ma photo',
      title: 'Une photo. Plusieurs directions.',
      intro: 'Un décor sculptural, une lumière plus douce, un univers de campagne. Votre consigne donne le cap.',
      steps: ['Préparez votre image', 'Décrivez le changement', 'Comparez les détails'],
      artAlt: 'Visuel de présentation : une sneaker bleue et chromée dans un canyon rouge, entourée de formes métalliques fluides.',
    },
    'product-video-editor': {
      action: 'Retoucher mon clip',
      title: 'Un autre univers pour votre plan.',
      intro: 'Explorez un changement de décor, de lumière ou de style. Comparez tout le passage retouché avec votre vidéo de départ.',
      steps: ['Sélectionnez le passage', 'Donnez une direction', 'Regardez les deux versions'],
      artAlt: 'Visuel de présentation : une sneaker bleue et chromée entourée de lumière dorée et de colonnes réfléchissantes.',
    },
    'motion-transfer': {
      action: 'Animer mon personnage',
      title: 'Tout commence par un geste.',
      intro: 'Une image de personnage rencontre un mouvement filmé. Choisissez le passage qui guidera votre animation.',
      steps: ['Choisissez le personnage', 'Trouvez le mouvement', 'Donnez-lui vie'],
      artAlt: 'Visuel de présentation : une personne danse dans un tissu vert citron, au milieu d’une architecture rouge sculpturale.',
    },
  },
  photoMode: 'Partez d’un portrait fixe. Ajoutez un enregistrement vocal pour créer une vidéo parlante.',
  videoMode: 'Partez d’un visage filmé. Adaptez les lèvres à une nouvelle voix avec deux passages de même durée.',
  mineral: 'Décor minéral', light: 'Studio de lumière',
  comparisonNote: 'Deux directions artistiques à explorer. Images fixes de présentation, pas un avant-après produit par l’outil.',
  continuationTitle: 'Continuez là où vous créez.',
  continuationBody: 'Retrouvez le résultat dans Médias. Ajoutez-le à un film dans Studio ou téléchargez-le.',
  captionContinuation: 'Retrouvez vos textes modifiables dans la bibliothèque de sous-titres. Téléchargez un SRT ou VTT, ou utilisez une révision enregistrée dans Studio.',
  media: 'Médias', studio: 'Studio', export: 'Export',
};

const es: DetailDictionary = {
  tools: {
    subtitles: {
      action: 'Subtitular mi vídeo',
      title: 'Tus palabras. Tu estilo.',
      intro: 'Corrige un nombre. Dale espacio a una frase. Elige subtítulos que formen parte de tu vídeo.',
      steps: ['Empieza por la voz', 'Afina cada frase', 'Elige el formato'],
      artAlt: 'Imagen de presentación: una mujer con abrigo rojo habla junto a un observatorio frente al mar al atardecer.',
    },
    'lip-sync': {
      action: 'Animar un rostro',
      title: 'Una voz. Dos puntos de partida.',
      intro: 'Anima un retrato o cambia las palabras de un plano existente. Tu grabación marca el ritmo.',
      steps: ['Elige el rostro', 'Añade tu voz', 'Mira y escucha'],
      artAlt: 'Imagen de presentación: retrato cinematográfico con un cuello cromado escultural, fondo azul y luz cálida.',
    },
    'product-photo-editor': {
      action: 'Editar mi foto de producto',
      title: 'Una foto. Más posibilidades.',
      intro: 'Un escenario escultural, una luz más suave, un universo de campaña. Tus indicaciones marcan la dirección.',
      steps: ['Prepara tu imagen', 'Describe el cambio', 'Compara los detalles'],
      artAlt: 'Imagen de presentación: una zapatilla azul y cromada en un cañón rojo con formas metálicas fluidas.',
    },
    'product-video-editor': {
      action: 'Editar mi vídeo de producto',
      title: 'Otro universo para tu plano.',
      intro: 'Explora un cambio de escenario, luz o estilo. Compara todo el fragmento editado con tu vídeo original.',
      steps: ['Selecciona el fragmento', 'Define la dirección', 'Mira las dos versiones'],
      artAlt: 'Imagen de presentación: una zapatilla azul y cromada rodeada de luz dorada y columnas reflectantes.',
    },
    'motion-transfer': {
      action: 'Animar mi personaje',
      title: 'Todo empieza con un gesto.',
      intro: 'Una imagen de personaje se encuentra con un movimiento grabado. Elige el fragmento que guiará tu animación.',
      steps: ['Elige el personaje', 'Busca el movimiento', 'Dale movimiento'],
      artAlt: 'Imagen de presentación: una persona baila con tela verde lima en un espacio arquitectónico rojo y escultural.',
    },
  },
  photoMode: 'Empieza con un retrato fijo. Añade una grabación de voz para crear un vídeo en el que hable.',
  videoMode: 'Empieza con un rostro grabado. Adapta los labios a una nueva voz usando dos fragmentos de igual duración.',
  mineral: 'Escenario mineral', light: 'Estudio de luz',
  comparisonNote: 'Dos direcciones artísticas para explorar. Imágenes fijas de presentación, no un antes y después creado por la herramienta.',
  continuationTitle: 'Sigue creando, en un solo lugar.',
  continuationBody: 'Encuentra el resultado en Medios. Añádelo a una película en Studio o descárgalo.',
  captionContinuation: 'Conserva tus textos editables en la biblioteca de subtítulos. Descarga SRT o VTT, o utiliza una revisión guardada en Studio.',
  media: 'Medios', studio: 'Studio', export: 'Export',
};

const zh: DetailDictionary = {
  tools: {
    subtitles: {
      action: '为我的视频加字幕',
      title: '文字由你决定，样式也是。',
      intro: '改一个名字，给某一句留出更多时间，选择与你的视频相配的字幕。',
      steps: ['从声音开始', '打磨每一行', '选择导出格式'],
      artAlt: '展示用插图：一位身穿红色外套的女士，在日落时分的海边天文台旁说话。',
    },
    'lip-sync': {
      action: '让人脸动起来',
      title: '一段声音，两种开始方式。',
      intro: '让静态肖像活起来，或更换现有镜头中的台词。节奏由你的录音决定。',
      steps: ['选择人脸', '添加你的声音', '检查表演效果'],
      artAlt: '展示用插图：一幅带有雕塑感镀铬衣领的电影感肖像，蓝色背景，暖色光线。',
    },
    'product-photo-editor': {
      action: '编辑我的产品图',
      title: '一张照片，更多方向。',
      intro: '雕塑感场景、更柔和的光线、广告大片般的世界。由你的指令决定画面的方向。',
      steps: ['准备图片', '描述修改', '对比细节'],
      artAlt: '展示用插图：一双蓝色与镀铬配色的运动鞋，置身红色峡谷，周围是流动的金属形态。',
    },
    'product-video-editor': {
      action: '编辑我的产品视频',
      title: '为你的镜头换一个新世界。',
      intro: '探索场景、光线或风格的变化。将编辑后的完整片段与原始视频对比。',
      steps: ['选择片段', '设定方向', '观看两个版本'],
      artAlt: '展示用插图：一双蓝色与镀铬配色的运动鞋，被金色光线和反光立柱环绕。',
    },
    'motion-transfer': {
      action: '让我的角色动起来',
      title: '从一个动作开始。',
      intro: '角色图像遇上拍摄的表演。选择你想用来引导动画的动作。',
      steps: ['选择角色', '找到动作', '让它动起来'],
      artAlt: '展示用插图：一位舞者身披飘逸的青柠色织物，置身红色雕塑感建筑空间。',
    },
  },
  photoMode: '从一张静态肖像开始。添加语音录音，即可生成一段说话的视频。',
  videoMode: '从一张拍摄好的人脸开始。用等长的片段，让口型对上新的录音。',
  mineral: '矿物质场景', light: '光影影棚',
  comparisonNote: '两种可供探索的艺术方向。均为展示用静态图，并非工具生成的前后对比。',
  continuationTitle: '继续创作，一站完成。',
  continuationBody: '在“素材”中找到结果。可将其添加到 Studio 的影片中，或直接下载。',
  captionContinuation: '可编辑的字幕保存在字幕库中。下载 SRT 或 VTT，或在 Studio 中使用已保存的修订版本。',
  media: '素材', studio: 'Studio', export: '导出',
};

export function getCreatorDetailCopy(locale: AppLocale) { return { en, fr, es, zh }[locale]; }
