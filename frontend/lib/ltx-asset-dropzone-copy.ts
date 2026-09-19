import type { AppLocale } from '@/i18n/locales';

type UiLocale = Extract<AppLocale, 'en' | 'fr' | 'es' | 'zh'>;

export type AssetDropzoneCopy = {
  formats: (value: string) => string;
  mbMax: (value: number) => string;
  secondsMax: (value: number) => string;
  secondsRequired: (min: number, max: number) => string;
  videoLengthFollowsAudio: string;
  upToFiles: (count: number) => string;
  atLeastFiles: (count: number) => string;
  slotsRemaining: (count: number) => string;
  primaryImageFallback: string;
  additionalReferencesFallback: string;
  frameFallback: string;
  primaryRoleDescription: string;
  referenceRoleDescription: string;
  frameRoleDescription: string;
  startImageSlot: string;
  endImageSlot: string;
  firstFrameSlot: string;
  lastFrameSlot: string;
  referenceImageSlot: (index: number) => string;
  referenceVideoSlot: (index: number) => string;
  referenceAudioSlot: (index: number) => string;
  sourceVideoSlot: string;
  sourceAudioSlot: string;
  slotSuffix: (label: string) => string;
  addFile: (details: string) => string;
  addMedia: string;
  chooseMedia: string;
  chooseMediaHint: string;
  dragDropHint: string;
  neededBeforeGenerating: string;
  upload: string;
  selectAsset: string;
  createImage: string;
  changeAngle: string;
  characterBuilder: string;
  info: string;
  library: string;
  remove: string;
  required: string;
  optional: string;
  uploading: string;
  uploadFailed: string;
  imageSlot: string;
  videoIncludesAudio: string;
  dropImageFile: string;
  dropVideoFile: string;
  dropAudioFile: string;
  formatNotSupported: (value: string) => string;
  unableToReadAudioDuration: string;
  unableToReadVideoDuration: string;
  audioMinDuration: (seconds: number) => string;
  audioMaxDuration: (seconds: number) => string;
  videoMaxDuration: (seconds: number) => string;
  fileTooLarge: (size: number) => string;
};

export const ASSET_DROPZONE_COPY: Record<UiLocale, AssetDropzoneCopy> = {
  en: {
    formats: (value) => `Formats: ${value}`,
    mbMax: (value) => `${value} MB max`,
    secondsMax: (value) => `${value}s max`,
    secondsRequired: (min, max) => `${min}–${max}s required`,
    videoLengthFollowsAudio: 'Video length follows audio length',
    upToFiles: (count) => `Up to ${count} files`,
    atLeastFiles: (count) => `At least ${count} files`,
    slotsRemaining: (count) => {
      if (count <= 0) return 'No slots remaining';
      if (count === 1) return '1 slot remaining';
      return `${count} slots remaining`;
    },
    primaryImageFallback: 'Primary reference image',
    additionalReferencesFallback: 'Additional references',
    frameFallback: 'Frame',
    primaryRoleDescription: 'This still is used as the start image / first frame that drives the motion.',
    referenceRoleDescription: 'Optional supporting stills to guide style or lighting.',
    frameRoleDescription: 'Defines the transition frame for this engine.',
    startImageSlot: 'Start image',
    endImageSlot: 'End image',
    firstFrameSlot: 'First frame',
    lastFrameSlot: 'Last frame',
    referenceImageSlot: (index) => `Reference image ${index}`,
    referenceVideoSlot: (index) => `Reference video ${index}`,
    referenceAudioSlot: (index) => `Reference audio ${index}`,
    sourceVideoSlot: 'Source video',
    sourceAudioSlot: 'Source audio',
    slotSuffix: (label) => `${label} slot`,
    addFile: (details) => `Drag & drop or click to add.${details ? ` ${details}` : ''}`,
    addMedia: 'Add media',
    chooseMedia: 'Choose media',
    chooseMediaHint: 'Upload a new file or choose an existing asset from Media.',
    dragDropHint: 'You can still drag and drop a file onto this field.',
    neededBeforeGenerating: 'Needed before generating.',
    upload: 'Upload',
    selectAsset: 'Select asset',
    createImage: 'Create image',
    changeAngle: 'Change angle',
    characterBuilder: 'Character builder',
    info: 'Field details',
    library: 'Choose from Media',
    remove: 'Remove',
    required: 'Required',
    optional: 'Optional',
    uploading: 'Uploading…',
    uploadFailed: 'Upload failed',
    imageSlot: 'Image',
    videoIncludesAudio: 'Video includes audio',
    dropImageFile: 'Please drop an image file (PNG, JPG, WebP...).',
    dropVideoFile: 'Please drop a video file (MP4, MOV...).',
    dropAudioFile: 'Please drop an audio file (MP3, WAV...).',
    formatNotSupported: (value) => `Format not supported. Allowed: ${value}`,
    unableToReadAudioDuration: 'Unable to read audio duration. Please try another file.',
    unableToReadVideoDuration: 'Unable to read video duration. Please try another MP4/MOV/WebM file.',
    audioMinDuration: (seconds) => `Audio must be at least ${seconds}s long.`,
    audioMaxDuration: (seconds) => `Audio must be ${seconds}s or shorter.`,
    videoMaxDuration: (seconds) => `Video must be ${seconds}s or shorter.`,
    fileTooLarge: (size) => `File exceeds the ${size} MB limit.`,
  },
  fr: {
    formats: (value) => `Formats : ${value}`,
    mbMax: (value) => `${value} Mo max`,
    secondsMax: (value) => `${value}s max`,
    secondsRequired: (min, max) => `${min}–${max}s requis`,
    videoLengthFollowsAudio: "La durée vidéo suit la durée de l'audio",
    upToFiles: (count) => `Jusqu'à ${count} fichiers`,
    atLeastFiles: (count) => `Au moins ${count} fichiers`,
    slotsRemaining: (count) => {
      if (count <= 0) return 'Plus aucun slot disponible';
      if (count === 1) return 'Encore 1 slot disponible';
      return `Encore ${count} slots disponibles`;
    },
    primaryImageFallback: 'Image de référence principale',
    additionalReferencesFallback: 'Références additionnelles',
    frameFallback: 'Frame',
    primaryRoleDescription: "Cette image sert d'image de départ / première frame pour piloter le mouvement.",
    referenceRoleDescription: 'Images complémentaires optionnelles pour guider le style ou la lumière.',
    frameRoleDescription: 'Définit la frame de transition pour ce moteur.',
    startImageSlot: 'Image de départ',
    endImageSlot: 'Image de fin',
    firstFrameSlot: 'Première frame',
    lastFrameSlot: 'Dernière frame',
    referenceImageSlot: (index) => `Image de référence ${index}`,
    referenceVideoSlot: (index) => `Vidéo de référence ${index}`,
    referenceAudioSlot: (index) => `Audio de référence ${index}`,
    sourceVideoSlot: 'Vidéo source',
    sourceAudioSlot: 'Audio source',
    slotSuffix: (label) => `Slot ${label}`,
    addFile: (details) => `Glissez-déposez ou cliquez pour ajouter.${details ? ` ${details}` : ''}`,
    addMedia: 'Ajouter un média',
    chooseMedia: 'Choisir un média',
    chooseMediaHint: 'Uploadez un nouveau fichier ou choisissez un asset dans Médias.',
    dragDropHint: 'Vous pouvez aussi glisser-déposer un fichier sur ce champ.',
    neededBeforeGenerating: 'Nécessaire avant génération.',
    upload: 'Upload',
    selectAsset: 'Sélectionner un asset',
    createImage: 'Créer une image',
    changeAngle: 'Changer l’angle',
    characterBuilder: 'Character Builder',
    info: 'Détails du champ',
    library: 'Choisir dans Médias',
    remove: 'Retirer',
    required: 'Obligatoire',
    optional: 'Optionnel',
    uploading: 'Upload…',
    uploadFailed: 'Échec de l’upload',
    imageSlot: 'Image',
    videoIncludesAudio: 'La vidéo inclut de l’audio',
    dropImageFile: 'Déposez un fichier image (PNG, JPG, WebP...).',
    dropVideoFile: 'Déposez un fichier vidéo (MP4, MOV...).',
    dropAudioFile: 'Déposez un fichier audio (MP3, WAV...).',
    formatNotSupported: (value) => `Format non pris en charge. Autorisés : ${value}`,
    unableToReadAudioDuration: "Impossible de lire la durée audio. Essayez un autre fichier.",
    unableToReadVideoDuration: 'Impossible de lire la durée vidéo. Essayez un autre fichier MP4/MOV/WebM.',
    audioMinDuration: (seconds) => `L'audio doit faire au moins ${seconds}s.`,
    audioMaxDuration: (seconds) => `L'audio doit faire ${seconds}s ou moins.`,
    videoMaxDuration: (seconds) => `La vidéo doit faire ${seconds}s ou moins.`,
    fileTooLarge: (size) => `Le fichier dépasse la limite de ${size} Mo.`,
  },
  es: {
    formats: (value) => `Formatos: ${value}`,
    mbMax: (value) => `${value} MB máx.`,
    secondsMax: (value) => `${value}s máx.`,
    secondsRequired: (min, max) => `${min}–${max}s requeridos`,
    videoLengthFollowsAudio: 'La duración del video sigue la duración del audio',
    upToFiles: (count) => `Hasta ${count} archivos`,
    atLeastFiles: (count) => `Al menos ${count} archivos`,
    slotsRemaining: (count) => {
      if (count <= 0) return 'No quedan slots';
      if (count === 1) return 'Queda 1 slot';
      return `Quedan ${count} slots`;
    },
    primaryImageFallback: 'Imagen de referencia principal',
    additionalReferencesFallback: 'Referencias adicionales',
    frameFallback: 'Frame',
    primaryRoleDescription: 'Esta imagen se usa como imagen inicial / primer frame que impulsa el movimiento.',
    referenceRoleDescription: 'Stills opcionales de apoyo para guiar estilo o iluminación.',
    frameRoleDescription: 'Define el frame de transición para este motor.',
    startImageSlot: 'Imagen inicial',
    endImageSlot: 'Imagen final',
    firstFrameSlot: 'Primer frame',
    lastFrameSlot: 'Último frame',
    referenceImageSlot: (index) => `Imagen de referencia ${index}`,
    referenceVideoSlot: (index) => `Video de referencia ${index}`,
    referenceAudioSlot: (index) => `Audio de referencia ${index}`,
    sourceVideoSlot: 'Video fuente',
    sourceAudioSlot: 'Audio fuente',
    slotSuffix: (label) => `Slot de ${label}`,
    addFile: (details) => `Arrastra y suelta o haz clic para añadir.${details ? ` ${details}` : ''}`,
    addMedia: 'Añadir medio',
    chooseMedia: 'Elegir medio',
    chooseMediaHint: 'Sube un archivo nuevo o elige un asset en Medios.',
    dragDropHint: 'También puedes arrastrar y soltar un archivo en este campo.',
    neededBeforeGenerating: 'Necesario antes de generar.',
    upload: 'Subir',
    selectAsset: 'Seleccionar asset',
    createImage: 'Crear imagen',
    changeAngle: 'Cambiar ángulo',
    characterBuilder: 'Character Builder',
    info: 'Detalles del campo',
    library: 'Elegir en Medios',
    remove: 'Eliminar',
    required: 'Obligatorio',
    optional: 'Opcional',
    uploading: 'Subiendo…',
    uploadFailed: 'La subida falló',
    imageSlot: 'Imagen',
    videoIncludesAudio: 'El video incluye audio',
    dropImageFile: 'Suelta un archivo de imagen (PNG, JPG, WebP...).',
    dropVideoFile: 'Suelta un archivo de video (MP4, MOV...).',
    dropAudioFile: 'Suelta un archivo de audio (MP3, WAV...).',
    formatNotSupported: (value) => `Formato no compatible. Permitidos: ${value}`,
    unableToReadAudioDuration: 'No se pudo leer la duración del audio. Prueba con otro archivo.',
    unableToReadVideoDuration: 'No se pudo leer la duración del video. Prueba con otro archivo MP4/MOV/WebM.',
    audioMinDuration: (seconds) => `El audio debe durar al menos ${seconds}s.`,
    audioMaxDuration: (seconds) => `El audio debe durar ${seconds}s o menos.`,
    videoMaxDuration: (seconds) => `El video debe durar ${seconds}s o menos.`,
    fileTooLarge: (size) => `El archivo supera el límite de ${size} MB.`,
  },
  zh: {
    formats: (value) => `格式：${value}`,
    mbMax: (value) => `最大 ${value} MB`,
    secondsMax: (value) => `最长 ${value} 秒`,
    secondsRequired: (min, max) => `需 ${min}–${max} 秒`,
    videoLengthFollowsAudio: '视频长度随音频长度确定',
    upToFiles: (count) => `最多 ${count} 个文件`,
    atLeastFiles: (count) => `至少 ${count} 个文件`,
    slotsRemaining: (count) => {
      if (count <= 0) return '无剩余槽位';
      return `剩余 ${count} 个槽位`;
    },
    primaryImageFallback: '主参考图',
    additionalReferencesFallback: '附加参考文件',
    frameFallback: '帧',
    primaryRoleDescription: '此静态图用作驱动动作的起始图像/第一帧。',
    referenceRoleDescription: '可选的辅助图像，用于指导风格或光影。',
    frameRoleDescription: '定义此引擎的过渡帧。',
    startImageSlot: '起始图像',
    endImageSlot: '结束图像',
    firstFrameSlot: '第一帧',
    lastFrameSlot: '最后一帧',
    referenceImageSlot: (index) => `参考图像 ${index}`,
    referenceVideoSlot: (index) => `参考视频 ${index}`,
    referenceAudioSlot: (index) => `参考音频 ${index}`,
    sourceVideoSlot: '源视频',
    sourceAudioSlot: '源音频',
    slotSuffix: (label) => `${label} 槽位`,
    addFile: (details) => `拖拽或点击添加。${details ? ` ${details}` : ''}`,
    addMedia: '添加媒体',
    chooseMedia: '选择媒体',
    chooseMediaHint: '上传新文件或从媒体库选择已有资产。',
    dragDropHint: '您也可以直接将文件拖放到此区域。',
    neededBeforeGenerating: '生成前必须添加。',
    upload: '上传',
    selectAsset: '选择资产',
    createImage: '创建图像',
    changeAngle: '变换视角',
    characterBuilder: '角色构建器',
    info: '信息',
    library: '媒体库',
    remove: '移除',
    required: '必填',
    optional: '可选',
    uploading: '上传中…',
    uploadFailed: '上传失败',
    imageSlot: '图像槽位',
    videoIncludesAudio: '包含音频的视频',
    dropImageFile: '拖放图像文件（PNG、JPG、WebP…）',
    dropVideoFile: '拖放视频文件（MP4、MOV…）',
    dropAudioFile: '拖放音频文件（MP3、WAV…）',
    formatNotSupported: (value) => `不支持的格式。允许格式：${value}`,
    unableToReadAudioDuration: '无法读取音频时长。请尝试其他文件。',
    unableToReadVideoDuration: '无法读取视频时长。请尝试其他 MP4/MOV/WebM 文件。',
    audioMinDuration: (seconds) => `音频时长至少需 ${seconds} 秒。`,
    audioMaxDuration: (seconds) => `音频时长不得超过 ${seconds} 秒。`,
    videoMaxDuration: (seconds) => `视频时长不得超过 ${seconds} 秒。`,
    fileTooLarge: (size) => `文件超过 ${size} MB 大小限制。`,
  },
};
