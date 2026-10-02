import type { AppLocale } from '@/i18n/locales';
const en = {
  title: 'Screening room', subtitle: 'Study the shot before planning your own.', lead: 'Open a sample for its prompt, settings and recorded cost.', filter: 'Technical index · browse by model',
  notes: 'Three questions for the next viewing.', intro: 'Treat each sample as one result under specific settings. Use it to plan a test, not to predict every future take.',
  rows: [
    ['Framing', 'Where does your eye go? Check subject placement, scale and the space left for action.', 'Plan camera coverage'],
    ['Motion', 'Does the movement serve the scene? Watch the full clip, including its start and end.', 'Plan the storyboard'],
    ['Continuity', 'Do the face, costume and objects hold together as the shot moves?', 'Prepare character references'],
  ], reference: 'Model specifications and further reading',
};
type Copy = typeof en;
const zh: Copy = {
  title: '镜头放映室', subtitle: '先看清这一镜，再筹备你的一镜。', lead: '打开样片，查看提示词、设置与记录成本。', filter: '技术索引 · 按模型查找',
  notes: '再看一遍，带着这三个问题。', intro: '每个样片都是特定设置下的一次结果。用它规划试拍，不能据此保证之后每次生成的表现。',
  rows: [['构图', '视线先落在哪里？观察主体位置、景别，以及留给动作的空间。', '规划机位'], ['运动', '运动是否服务于这场戏？完整播放，尤其留意起幅和落幅。', '安排分镜'], ['连续性', '随着画面运动，面部、服装与物体形态是否保持稳定？', '准备角色参考']], reference: '模型规格与延伸资料',
};
const fr: Copy = {
  title: 'Salle de projection', subtitle: 'Étudiez le plan avant de préparer le vôtre.', lead: 'Ouvrez un exemple pour retrouver prompt, réglages et coût enregistré.', filter: 'Index technique · par modèle', notes: 'Trois questions pour une nouvelle projection.', intro: 'Un exemple est un résultat obtenu avec des réglages précis. Utilisez-le pour préparer un essai, sans présumer des prochaines prises.',
  rows: [['Cadrage', 'Où va le regard ? Observez le sujet, son échelle et l’espace laissé au mouvement.', 'Préparer les axes'], ['Mouvement', 'Le mouvement sert-il la scène ? Regardez le plan entier, du début à la fin.', 'Préparer le découpage'], ['Continuité', 'Visage, costume et objets restent-ils cohérents pendant le mouvement ?', 'Préparer les références']], reference: 'Fiches techniques et lectures complémentaires',
};
const es: Copy = {
  title: 'Sala de proyección', subtitle: 'Estudia el plano antes de preparar el tuyo.', lead: 'Abre un ejemplo para consultar prompt, ajustes y coste registrado.', filter: 'Índice técnico · por modelo', notes: 'Tres preguntas para volver a mirar.', intro: 'Cada ejemplo es un resultado con ajustes concretos. Úsalo para planificar una prueba, no para predecir todas las tomas.',
  rows: [['Encuadre', '¿Adónde va la mirada? Revisa posición, escala y espacio para la acción.', 'Planificar la cámara'], ['Movimiento', '¿El movimiento sirve a la escena? Mira el clip completo, del inicio al final.', 'Preparar el storyboard'], ['Continuidad', '¿Se mantienen el rostro, el vestuario y los objetos durante el movimiento?', 'Preparar referencias']], reference: 'Especificaciones y lecturas complementarias',
};
export function getScreeningRoomCopy(locale: AppLocale) { return ({ en, zh, fr, es })[locale]; }
