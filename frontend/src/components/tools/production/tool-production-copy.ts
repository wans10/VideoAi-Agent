import type { AppLocale } from '@/i18n/locales';

const en = {
  index: 'Production departments', title: 'Prepare the scene. Then roll.',
  intro: 'Start with the decision your next shot depends on. Prepare a character, plan coverage, or bring an existing plate into shape.',
  jump: 'Find your next task', open: 'Open the production desk', output: 'Prepare', action: 'Go to department',
  stages: [
    { title: 'Who is in the scene?', body: 'Establish appearance before changing the pose, costume or location.', output: 'A portrait and character reference sheet', link: 'Character development' },
    { title: 'Where does the camera stand?', body: 'Explore a view, then decide how the next shot will connect to it.', output: 'Viewpoint studies for your shot planning', link: 'Camera studies' },
    { title: 'How does the scene unfold?', body: 'Lay out the beats and framing before spending on moving footage.', output: 'A storyboard to guide the sequence', link: 'Storyboard planning' },
  ],
  finishing: 'An existing shot needs attention.', finishingBody: 'Choose the issue in your source. Inspect the result before carrying it into the edit.',
  sources: 'Still missing the starting material?', sourceBody: 'Explore a look in the image workspace, or develop voices and sound in the audio workspace.', image: 'Visual development', audio: 'Sound design',
  dossier: 'Character continuity notes', dossierTitle: 'Decide what must stay recognisable.',
  dossierBody: 'Use these notes alongside your references. They are a preparation guide, not saved project settings.',
  dossierRows: [
    ['Identity', 'Face shape, age cues and distinctive features.', 'Compare the portrait with each view.'],
    ['Costume', 'Silhouette, colours and recurring accessories.', 'Check seams, patterns and accessory placement.'],
    ['Continuity', 'The same reference across your planned shots.', 'Review each result; AI references do not guarantee an identical character.'],
  ],
  finishingTitle: 'Inspect at the scale you will deliver.', finishingIntro: 'More pixels are useful only when the image holds up. Start with a representative frame or short clip.',
  finishingChecks: [['Texture', 'Check skin, fabric and fine patterns for invented detail.'], ['Motion', 'Play the clip and look for flicker, shifting edges and unstable grain.'], ['Delivery', 'Compare at the intended display size before processing more material.']],
  separationTitle: 'Plan the handoff before the cutout.', separationIntro: 'Choose the destination for this shot first. A transparent export and a background-filled video serve different editing workflows.',
  separationChecks: [['Edges', 'Check hair, motion blur and semi-transparent objects.'], ['Background', 'Choose transparency or a supported background treatment for the next application.'], ['Handoff', 'Test a short export in your editor; container and alpha support vary.']],
};
type Copy = typeof en;
const zh: Copy = {
  index: '摄影与美术', title: '先把这一场戏准备好。', intro: '从下一镜需要解决的问题出发：确定人物、规划机位与分镜，或整理已有素材。', jump: '找到当前制作任务', open: '进入制作工具台', output: '准备成果', action: '进入制作环节',
  stages: [
    { title: '谁出现在这一场戏里？', body: '先确定面部特征、服装与轮廓，再尝试动作和场景变化。', output: '角色肖像与多视图参考图', link: '角色设定' },
    { title: '摄影机站在哪里？', body: '研究当前画面的不同视角，再考虑它与下一镜的衔接。', output: '用于镜头规划的机位参考图', link: '机位勘景' },
    { title: '这一场戏怎样展开？', body: '先安排叙事节奏与景别，再投入动态镜头的生成。', output: '指导镜头顺序的分镜图', link: '分镜规划' },
  ],
  finishing: '已有镜头，还需要哪一步？', finishingBody: '根据源素材的问题选择处理方式，检查结果后再进入剪辑。', sources: '还没有起始素材？', sourceBody: '先在图像工作台探索视觉方向，或进入音频工作台设计配音与声音。', image: '视觉开发', audio: '声音设计',
  dossier: '角色连续性备忘', dossierTitle: '先确定哪些特征不能变。', dossierBody: '结合参考图整理这些要点。这是筹备建议，不是已保存的项目设置。',
  dossierRows: [['人物辨识', '脸型、年龄感与标志性特征。', '逐张对照肖像与不同视图。'], ['服装造型', '轮廓、配色与重复出现的配饰。', '检查衣物纹样、接缝与配饰位置。'], ['镜头连续性', '为计划中的镜头使用同一组参考。', '逐次审看生成结果；参考图不能保证角色完全一致。']],
  finishingTitle: '按最终观看尺寸，检查这一镜。', finishingIntro: '像素增加以后，画面也要经得起检查。先用有代表性的一帧或一小段素材试处理。', finishingChecks: [['纹理', '检查皮肤、织物与细密图案是否出现虚构细节。'], ['运动', '播放片段，观察闪烁、边缘游移与颗粒是否稳定。'], ['交付', '按目标显示尺寸对照，再决定是否处理更多素材。']],
  separationTitle: '先想清楚，这个主体要交到哪里。', separationIntro: '先确定镜头的下一道工序。透明素材与带背景的视频，适用于不同的剪辑和合成流程。', separationChecks: [['边缘检查', '重点检查发丝、运动模糊与半透明物体。'], ['背景选择', '根据后续软件，选择透明输出或支持的背景处理方式。'], ['交接验证', '先在剪辑软件里测试短片段；不同容器的透明通道支持不同。']],
};
const fr: Copy = {
  index: 'Image et direction artistique', title: 'Préparez la scène. Puis tournez.', intro: 'Partez de la décision qui conditionne le prochain plan : personnage, point de vue, découpage ou préparation des rushes.', jump: 'Trouver la prochaine tâche', open: 'Ouvrir les outils de production', output: 'À préparer', action: 'Ouvrir cet atelier',
  stages: [
    { title: 'Qui entre dans la scène ?', body: 'Fixez les traits et le costume avant de varier la pose ou le décor.', output: 'Un portrait et une planche de référence', link: 'Conception du personnage' },
    { title: 'Où placer la caméra ?', body: 'Étudiez le point de vue, puis son raccord avec le plan suivant.', output: 'Des études de cadrage pour le découpage', link: 'Études de caméra' },
    { title: 'Comment se déroule la scène ?', body: 'Organisez les temps forts et les cadrages avant de générer du mouvement.', output: 'Un storyboard pour guider la séquence', link: 'Préparer le storyboard' },
  ], finishing: 'Un plan existant à reprendre.', finishingBody: 'Choisissez selon le défaut de la source. Examinez le résultat avant le montage.', sources: 'Il manque encore la matière première ?', sourceBody: 'Cherchez une direction visuelle dans Image ou développez les voix et le son dans Audio.', image: 'Développement visuel', audio: 'Création sonore',
  dossier: 'Notes de continuité', dossierTitle: 'Décidez des traits à préserver.', dossierBody: 'Ces notes accompagnent vos références. Ce sont des conseils de préparation, pas des réglages enregistrés.', dossierRows: [['Identité', 'Forme du visage, âge apparent et signes distinctifs.', 'Comparez le portrait à chaque vue.'], ['Costume', 'Silhouette, couleurs et accessoires récurrents.', 'Vérifiez motifs, coutures et position des accessoires.'], ['Continuité', 'Les mêmes références pour les plans prévus.', 'Vérifiez chaque résultat : les références IA ne garantissent pas un personnage identique.']],
  finishingTitle: 'Examinez à la taille de diffusion.', finishingIntro: 'Plus de pixels ne suffisent pas. Testez une image ou un court extrait représentatif.', finishingChecks: [['Texture', 'Vérifiez peau, tissus et motifs : des détails peuvent être inventés.'], ['Mouvement', 'Repérez scintillement, contours instables et variations du grain.'], ['Livraison', 'Comparez à la taille cible avant de traiter davantage de matière.']],
  separationTitle: 'Préparez le relais avant le détourage.', separationIntro: 'Choisissez la destination du plan. Un export transparent et une vidéo avec fond répondent à des besoins différents.', separationChecks: [['Contours', 'Vérifiez cheveux, flou de mouvement et objets translucides.'], ['Fond', 'Choisissez la transparence ou un fond compatible avec la suite du travail.'], ['Relais', 'Testez un court export dans le logiciel de montage ; le canal alpha dépend du format.']],
};
const es: Copy = {
  index: 'Cámara y dirección de arte', title: 'Prepara la escena. Después, rueda.', intro: 'Empieza por la decisión que necesita el siguiente plano: personaje, punto de vista, storyboard o preparación del material.', jump: 'Encontrar la siguiente tarea', open: 'Abrir herramientas de producción', output: 'Qué preparar', action: 'Ir al departamento',
  stages: [
    { title: '¿Quién aparece en la escena?', body: 'Define rasgos y vestuario antes de cambiar la pose o el lugar.', output: 'Un retrato y una hoja de referencia', link: 'Diseño de personaje' },
    { title: '¿Dónde está la cámara?', body: 'Estudia el punto de vista y su relación con el plano siguiente.', output: 'Estudios de encuadre para planificar planos', link: 'Estudios de cámara' },
    { title: '¿Cómo avanza la escena?', body: 'Organiza el ritmo y los encuadres antes de generar movimiento.', output: 'Un storyboard que guíe la secuencia', link: 'Planificación del storyboard' },
  ], finishing: 'Un plano existente necesita atención.', finishingBody: 'Elige según el problema del original. Revisa el resultado antes del montaje.', sources: '¿Todavía falta el material inicial?', sourceBody: 'Explora la dirección visual en Imagen o desarrolla voces y sonido en Audio.', image: 'Desarrollo visual', audio: 'Diseño sonoro',
  dossier: 'Notas de continuidad', dossierTitle: 'Decide qué rasgos deben permanecer.', dossierBody: 'Usa estas notas junto a las referencias. Son una guía de preparación, no ajustes guardados.', dossierRows: [['Identidad', 'Forma del rostro, edad aparente y rasgos distintivos.', 'Compara el retrato con cada vista.'], ['Vestuario', 'Silueta, colores y accesorios recurrentes.', 'Revisa costuras, estampados y posición de los accesorios.'], ['Continuidad', 'Las mismas referencias para los planos previstos.', 'Revisa cada resultado; las referencias de IA no garantizan un personaje idéntico.']],
  finishingTitle: 'Revisa al tamaño de entrega.', finishingIntro: 'Más píxeles solo ayudan si la imagen resiste la revisión. Prueba un fotograma o un clip representativo.', finishingChecks: [['Textura', 'Busca detalles inventados en piel, tejidos y patrones finos.'], ['Movimiento', 'Reproduce el clip y revisa parpadeos, bordes y grano inestable.'], ['Entrega', 'Compara al tamaño de destino antes de procesar más material.']],
  separationTitle: 'Planifica la entrega antes del recorte.', separationIntro: 'Decide el destino del plano. Un archivo transparente y un vídeo con fondo sirven para flujos distintos.', separationChecks: [['Bordes', 'Revisa pelo, desenfoque de movimiento y objetos translúcidos.'], ['Fondo', 'Elige transparencia o un fondo compatible con el siguiente programa.'], ['Entrega', 'Prueba un clip corto en el editor; la compatibilidad alfa depende del formato.']],
};
const copy: Record<AppLocale, Copy> = { en, zh, fr, es };
export function getToolProductionCopy(locale: AppLocale) { return copy[locale]; }
