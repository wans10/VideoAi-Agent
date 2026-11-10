import type { AppLocale } from '@/i18n/locales';

// Exact capability phrases only: unknown values keep their original meaning.
// fr/es are optional: entries added for zh only return null for those locales,
// exactly as an unknown phrase did before.
const CAPABILITY_COPY: Record<string, { fr?: string; es?: string; zh?: string }> = {
  "up to 10 images total, including the opening image": { fr: "Jusqu’à 10 images au total, image de départ comprise", es: "Hasta 10 imágenes en total, incluida la imagen inicial", zh: '最多 10 张图片，含首帧' },
  "up to 5 reference videos; 30s combined with video elements": { fr: "Jusqu’à 5 vidéos de référence ; 30 s au total avec les éléments vidéo", es: "Hasta 5 videos de referencia; 30 s en total con los elementos de video", zh: '最多 5 个参考视频；含视频元素时合计 30 秒' },
  "provider-set; no fps selector": { fr: "Cadence définie par le fournisseur ; aucun sélecteur FPS", es: "Cadencia definida por el proveedor; sin selector de FPS", zh: '由服务商设定；无 FPS 选项' },
  "native audio directed by prompt; no audio switch": { fr: "Audio natif guidé par le prompt ; aucun interrupteur audio", es: "Audio nativo guiado por el prompt; sin interruptor de audio", zh: '原生音频由提示词引导；无音频开关' },
  "provider-selected image format": { fr: "Format d’image choisi par le fournisseur", es: "Formato de imagen elegido por el proveedor", zh: '图片格式由服务商选择' },
  "video editing": { fr: "modification vidéo", es: "edición de video", zh: '视频编辑' },
  "optional generated audio": { fr: "Audio généré facultatif", es: "Audio generado opcional", zh: '可选生成音频' },
  "optional": { fr: "Facultatif", es: "Opcional", zh: '可选' },
  'no separate lip-sync control': { fr: 'Aucun réglage distinct de synchronisation labiale', es: 'Sin ajuste independiente de sincronización labial', zh: '无单独的口型同步控制' },
  'recast / relight; specialized source tools': { fr: 'Recast / Relight ; outils spécialisés sur vidéo source', es: 'Recast / Relight; herramientas especializadas sobre video de origen', zh: 'Recast / Relight；专用源视频工具' },
  'fast edit; source timing and framing': { fr: 'FAST Edit ; durée et cadrage de la source', es: 'FAST Edit; duración y encuadre del origen', zh: 'FAST Edit；沿用源视频时长与构图' },
  'enhance draft; owned paired draft cache': { fr: 'Enhance Draft ; cache apparié d’un Draft de votre compte', es: 'Enhance Draft; caché emparejada de un Draft de tu cuenta', zh: 'Enhance Draft；需要账户自有的配对 Draft 缓存' },
  'reference / edit; source timing and framing for edit': { fr: 'Reference / Edit ; durée et cadrage hérités pour Edit', es: 'Reference / Edit; duración y encuadre heredados para Edit', zh: 'Reference / Edit；Edit 沿用源视频时长与构图' },
  'modify / reframe / owned-generation extend': { fr: 'Modify / Reframe / Extend depuis une génération de votre compte', es: 'Modify / Reframe / Extend desde una generación propia', zh: 'Modify / Reframe / 基于自有生成内容的 Extend' },
  'generate 5s/10s; modify source up to 18s; reframe source up to 10s; extend five new seconds': { fr: 'Génération 5s/10s ; source Modify jusqu’à 18s ; source Reframe jusqu’à 10s ; Extend : cinq nouvelles secondes', es: 'Generación 5s/10s; origen Modify hasta 18s; origen Reframe hasta 10s; Extend: cinco segundos nuevos', zh: '生成 5 秒 / 10 秒；Modify 源视频最长 18 秒；Reframe 源视频最长 10 秒；Extend 新增 5 秒' },
  'start image, first/last frames, or 1–10 indexed keyframe images': { fr: 'Image de départ, première/dernière image ou 1–10 images clés indexées', es: 'Imagen inicial, primera/última imagen o 1–10 fotogramas clave indexados', zh: '首帧图、首尾帧或 1–10 张带序号的关键帧图' },
  'native extend; fast edit': { fr: 'Extend natif ; FAST Edit', es: 'Extend nativo; FAST Edit', zh: '原生 Extend；FAST Edit' },
  'native draft extend; enhance requires an owned paired draft cache': { fr: 'Extend natif de Draft ; Enhance exige un cache Draft apparié de votre compte', es: 'Extend nativo de Draft; Enhance exige una caché Draft emparejada propia', zh: '原生 Draft Extend；Enhance 需要账户自有的配对 Draft 缓存' },
  '720p native draft; 1080p paired-cache enhance': { fr: 'Draft natif 720p ; Enhance avec cache apparié 1080p', es: 'Draft nativo 720p; Enhance con caché emparejada 1080p', zh: '原生 720p Draft；1080p 配对缓存增强' },
  'extend / retake / reframe': { fr: 'Extend / Retake / Reframe', es: 'Extend / Retake / Reframe', zh: 'Extend / Retake / Reframe' },
  'generate 6–10s; audio/extend/retake up to 20s; reframe source up to 60s': { fr: 'Génération 6–10s ; Audio/Extend/Retake jusqu’à 20s ; source Reframe jusqu’à 60s', es: 'Generación 6–10s; Audio/Extend/Retake hasta 20s; origen Reframe hasta 60s', zh: '生成 6–10 秒；音频 / 延长 / 重拍最长 20 秒；Reframe 源视频最长 60 秒' },
  '4k on t2v/i2v generate; reframe 720p/1080p; other workflow-specific limits': { fr: '4K en génération texte/image ; Reframe 720p/1080p ; autres limites selon le workflow', es: '4K en generación de texto/imagen; Reframe 720p/1080p; otros límites según el flujo', zh: '文生视频 / 图生视频支持 4K；Reframe 支持 720p/1080p；其他限制因流程而异' },
  'edit, extend, and conversational refine': { fr: 'modification, extension et retouches par conversation', es: 'edición, extensión y refinamiento mediante conversación', zh: '编辑、延长与对话式精修' },
  'extend from one source video': { fr: 'extension à partir d’une vidéo source', es: 'extensión a partir de un video de origen', zh: '从一个源视频延长' },
  'short source video for edit; previous interaction id for refine': { fr: 'courte vidéo source pour la modification ; interaction précédente pour les retouches par conversation', es: 'video de origen corto para editar; interacción anterior para refinar mediante conversación', zh: '编辑需短源视频；精修需上一次交互 ID' },
  'one source clip for extend': { fr: 'un clip source pour l’extension', es: 'un clip de origen para la extensión', zh: '延长需 1 个源片段' },
  'image-to-video: 1 start image; reference-to-video: 1-3 stills': { fr: 'Image vers vidéo : 1 image de départ ; génération avec références : 1 à 3 images', es: 'Imagen a video: 1 imagen inicial; generación con referencias: de 1 a 3 imágenes', zh: '图生视频：1 张首帧；参考生视频：1–3 张静态参考图' },
  'supported in current omni 1.2 route': { fr: 'Pris en charge avec Omni 1.2 dans Keyvo', es: 'Compatible con Omni 1.2 en Keyvo', zh: 'Omni 1.2 当前路线支持' },
  'supported through native dialogue and audio generation': { fr: 'Pris en charge via le dialogue et l’audio natifs', es: 'Compatible mediante diálogo y audio nativos', zh: '通过原生对白与音频生成支持' },
  'prompt-based sound, camera and edit directions': { fr: 'Son, caméra et modifications guidés par le prompt', es: 'Sonido, cámara y edición guiados por el prompt', zh: '基于提示词的声音、运镜与编辑指令' },
  'no visible maxvideoai watermark; provider/model provenance markers may apply': { fr: 'Aucun filigrane Keyvo visible ; des marqueurs de provenance du fournisseur ou du modèle peuvent être présents', es: 'Sin marca de agua visible de Keyvo; puede haber marcadores de procedencia del proveedor o del modelo', zh: '无可见 Keyvo 水印；可能保留提供商或模型标注' },
  'optional end frame': { fr: 'image de fin facultative', es: 'imagen final opcional', zh: '可选尾帧' },
  'single start image plus optional end frame': { fr: 'Une image de départ et une image de fin facultative', es: 'Una imagen inicial y una imagen final opcional', zh: '单张起始图加可选尾帧' },
  'supported through synchronized audio and audio-to-video workflows': { fr: 'Via l’audio synchronisé et la génération audio-vers-vidéo', es: 'Mediante audio sincronizado y generación de audio a video', zh: '通过同步音频和音频生视频工作流支持' },
  'dolly, jib, static and focus-shift presets': { fr: 'Préréglages : travelling, grue, plan fixe et changement de mise au point', es: 'Preajustes: travelling, grúa, plano fijo y cambio de enfoque', zh: '推拉、摇臂、定格与变焦预设' },
  'no visible maxvideoai watermark': { fr: 'Aucun filigrane Keyvo visible', es: 'Sin marca de agua visible de Keyvo', zh: '无可见 Keyvo 水印' },
  'no visible maxvideoai watermark; provider provenance markers may apply': { fr: 'Aucun filigrane Keyvo visible ; des marqueurs de provenance du fournisseur peuvent être présents', es: 'Sin marca de agua visible de Keyvo; puede haber marcadores de procedencia del proveedor', zh: '无可见 Keyvo 水印；可能保留提供商标注' },
  'prompt-directed native dialogue': { fr: 'Dialogue natif guidé par le prompt', es: 'Diálogo nativo guiado por el prompt', zh: '提示词控制的原生对白' },
  'prompt-based; native multi-shot storyboard support': { fr: 'Guidage par prompt et storyboard de plusieurs plans', es: 'Guía por prompt y storyboard de varias tomas', zh: '基于提示词；支持原生多镜头分镜' },
  'supported by provider for editing and extension through reference video': { fr: 'Le fournisseur permet la modification et l’extension à partir d’une vidéo de référence', es: 'El proveedor permite editar y extender a partir de un video de referencia', zh: '提供商支持通过参考视频进行编辑和延长' },
  'native stereo audio': { fr: 'Audio stéréo natif', es: 'Audio estéreo nativo', zh: '原生立体声音频' },
  'native audio': { fr: 'Audio natif', es: 'Audio nativo', zh: '原生音频' },
  'optional native audio': { fr: 'Audio natif en option', es: 'Audio nativo opcional', zh: '可选原生音频' },
  'supported as a reference-to-video input': { fr: 'Vidéo acceptée comme référence pour la génération', es: 'Video aceptado como referencia para la generación', zh: '支持作为参考视频输入' },
  'start image + optional end image': { fr: 'image de départ et image de fin facultative', es: 'imagen inicial e imagen final opcional', zh: '起始图 + 可选尾帧图' },
  'start image, end image, or both': { fr: 'image de début, image de fin ou les deux', es: 'imagen inicial, imagen final o ambas', zh: '首帧、尾帧或两者' },
  'video editing and extension': { fr: 'modification et extension vidéo', es: 'edición y extensión de video', zh: '视频编辑与延长' },
  'prompt-based camera and multi-shot control': { fr: 'Caméra et séquence de plans guidées par le prompt', es: 'Cámara y secuencia de tomas guiadas por el prompt', zh: '基于提示词的相机运镜与多镜头控制' },
  'prompt-based camera control': { fr: 'Caméra guidée par le prompt', es: 'Cámara guiada por el prompt', zh: '基于提示词的相机运镜控制' },
  'no visible keyvo watermark': { zh: '无可见 Keyvo 水印' },
  'no visible videoai watermark': { zh: '无可见 Keyvo 水印' },
  'no visible videoai watermark; provider provenance markers may apply': { zh: '无可见 Keyvo 水印；可能保留提供商标注' },
  'related image-start workflow': { zh: '关联的图生视频工作流' },
  'camera_fixed + prompt-based controls': { zh: 'camera_fixed 与基于提示词的控制' },
  'shot type + multi-shot prompt structure + prompt-based camera control': { zh: '镜头类型 + 多镜头提示词结构 + 基于提示词的运镜控制' },
  'single start image; optional end frame in i2v': { zh: '单张起始图；图生视频可选尾帧' },
  'i2v start image + optional end frame; optional start/end frames in reference mode': { zh: '图生视频首帧 + 可选尾帧；参考模式可选首尾帧' },
  'image-to-video: 1 source image; optional end frame': { zh: '图生视频：1 张源图；可选尾帧' },
  'image-to-video: 1 start image; reference mode: 1-3 stills': { zh: '图生视频：1 张首帧；参考模式：1–3 张静态图' },
  'reference-to-video: @image references plus kling elements; i2v: one start image': { zh: '参考生视频：@图片参考 + Kling 元素；图生视频：1 张首帧' },
  'reference-to-video and v2v: @image references plus kling elements; i2v: one start image': { zh: '参考生视频与视频生视频：@图片参考 + Kling 元素；图生视频：1 张首帧' },
  'one start image in image-to-video mode': { zh: '图生视频模式下支持单张首帧图' },
  '1-9 reference stills': { zh: '1–9 张参考静态图' },
  'single start image; no style-reference stack': { zh: '单张起始图；无风格参考图堆栈' },
  'single start image; no separate style-reference stack': { zh: '单张起始图；无独立风格参考图堆栈' },
  '4k on the standard dreamina seedance 2.0 route': { zh: '标准 Dreamina Seedance 2.0 路线支持 4K' },
  'supported in current omni 1.1 route': { fr: 'Pris en charge avec Omni 1.1 sur Keyvo', es: 'Compatible con Omni 1.1 en Keyvo', zh: 'Omni 1.1 当前路线支持' },
};

/** Shared exact capability translation for model and comparison pages. */
export function localizeCapabilityDetail(value: string, locale: AppLocale): string | null {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  if (locale !== 'en') {
    const exact = CAPABILITY_COPY[lower];
    if (exact) return exact[locale] ?? null;
    const unavailable = normalized.match(/^Not exposed in current (.+) endpoint set$/i);
    if (unavailable) return locale === 'fr' ? `Non disponible actuellement avec ${unavailable[1]}` : locale === 'es' ? `No disponible actualmente con ${unavailable[1]}` : `当前 ${unavailable[1]} 接口集中未开放`;
    const clips = lower.match(/^up to (\d+) clips, (\d+)s total$/);
    if (clips) return locale === 'fr' ? `Jusqu’à ${clips[1]} clips, ${clips[2]} s au total` : locale === 'es' ? `Hasta ${clips[1]} clips, ${clips[2]} s en total` : `最多 ${clips[1]} 个片段，总计 ${clips[2]} 秒`;
    const images = lower.match(/^up to (\d+) (?:image references|reference images)$/);
    if (images) return locale === 'fr' ? `Jusqu’à ${images[1]} images de référence` : locale === 'es' ? `Hasta ${images[1]} imágenes de referencia` : `最多 ${images[1]} 张参考图像`;
    const videoReferences = lower.match(/^up to (\d+) (?:video references|reference videos)$/);
    if (videoReferences) return locale === 'fr' ? `Jusqu’à ${videoReferences[1]} vidéos de référence` : locale === 'es' ? `Hasta ${videoReferences[1]} videos de referencia` : `最多 ${videoReferences[1]} 个参考视频`;
    const videos = lower.match(/^up to (\d+) video references; (\d+)-(\d+)s each and (\d+)s combined$/);
    if (videos) return locale === 'fr'
      ? `Jusqu’à ${videos[1]} vidéos de référence ; ${videos[2]}–${videos[3]} s chacune, ${videos[4]} s au total`
      : locale === 'es'
        ? `Hasta ${videos[1]} videos de referencia; ${videos[2]}–${videos[3]} s cada uno, ${videos[4]} s en total`
        : `最多 ${videos[1]} 个参考视频；每个 ${videos[2]}–${videos[3]} 秒，总计 ${videos[4]} 秒`;
    if (locale === 'zh') return localizeZhTemplate(normalized);
  }
  return null;
}

// zh-only templates. Numeric values and model/feature names are copied verbatim.
function localizeZhTemplate(value: string): string | null {
  const route = value.match(/^Not exposed in current (.+) route$/i);
  if (route) return `当前 ${route[1].replace(/\b(?:max)?videoai\b/gi, 'Keyvo')} 路线暂未开放`;
  const perGeneration = value.match(/^Up to (\d+)s \(per generation\)$/i);
  if (perGeneration) return `单次生成最长 ${perGeneration[1]} 秒`;
  const maxResolution = value.match(/^Up to (\d+p|4K)$/i);
  if (maxResolution) return `最高 ${maxResolution[1].replace(/k$/i, 'K')}`;
  const canonical = value.match(/^Up to (4K) canonical sizes$/i);
  if (canonical) return `最高 ${canonical[1]} 标准尺寸`;
  const duration = value.match(/^Generate (\d+)–(\d+)s; Audio\/Extend\/Retake up to (\d+)s$/i);
  if (duration) return `生成 ${duration[1]}–${duration[2]} 秒；音频 / 延长 / 重拍最长 ${duration[3]} 秒`;
  return null;
}
