export function referenceRoleHelpCopy(locale: string) {
  return locale === 'fr' ? {
    label: 'À propos de',
    image: { title: 'Images', description: 'Guident les sujets, le style et la composition.' },
    video: { title: 'Vidéos', description: 'Guident les mouvements et le style visuel.' },
    audio: { title: 'Audio', description: 'Guide le son, le rythme ou la voix, selon le modèle.' },
    start: { title: 'Image de début', description: 'Définit l’image d’ouverture du clip.' },
    end: { title: 'Image de fin', description: 'Définit l’image de clôture du clip.' },
    guide: { title: 'Image guide', description: 'Une image guide unique pour modifier la vidéo. Utilisez-la à la place des images clés.' },
    source: { title: 'Vidéo source', description: 'Le clip à modifier ou à prolonger, selon le mode choisi.' },
  } : locale === 'es' ? {
    label: 'Acerca de',
    image: { title: 'Imágenes', description: 'Guían los sujetos, el estilo y la composición.' },
    video: { title: 'Vídeos', description: 'Guían el movimiento y el estilo visual.' },
    audio: { title: 'Audio', description: 'Guía el sonido, el ritmo o la voz, según el modelo.' },
    start: { title: 'Imagen inicial', description: 'Define la imagen de apertura del clip.' },
    end: { title: 'Imagen final', description: 'Define la imagen de cierre del clip.' },
    guide: { title: 'Imagen guía', description: 'Una sola imagen guía para modificar el vídeo. Úsala en lugar de los fotogramas clave.' },
    source: { title: 'Vídeo fuente', description: 'El clip que se modifica o amplía, según el modo elegido.' },
  } : locale.startsWith('zh') ? {
    label: '关于',
    image: { title: '图片', description: '引导主体、风格和构图。' },
    video: { title: '视频', description: '引导动作和视觉风格。' },
    audio: { title: '音频', description: '引导声音、节奏或人声，具体取决于模型。' },
    start: { title: '起始图', description: '设定片段的开场画面。' },
    end: { title: '结束图', description: '设定片段的收尾画面。' },
    guide: { title: '引导帧', description: '用于修改视频的单张引导图片。请用它代替多个关键帧。' },
    source: { title: '源视频', description: '在所选模式下要修改或延长的片段。' },
  } : {
    label: 'About',
    image: { title: 'Images', description: 'Guide subjects, style and composition.' },
    video: { title: 'Videos', description: 'Guide motion and visual style.' },
    audio: { title: 'Audio', description: 'Guides sound, rhythm or voice, depending on the model.' },
    start: { title: 'Start image', description: 'Sets the opening image of your clip.' },
    end: { title: 'End image', description: 'Sets the closing image of your clip.' },
    guide: { title: 'Guide frame', description: 'A single guide image for modifying the video. Use it instead of multiple keyframes.' },
    source: { title: 'Source video', description: 'The clip to modify or extend in the selected mode.' },
  };
}
