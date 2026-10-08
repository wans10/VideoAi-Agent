import type { AppLocale } from '@/i18n/locales';
const en = {
  eyebrow: 'PRODUCTION PIPELINE / MCP', title: 'Bring generation into your production workflow.',
  intro: 'Carry a shot brief from your assistant into a priced generation request. Review the settings, approve the quote and retrieve the result for your next production step.',
  choose: 'Choose a connection', prompt: 'Prepare a test for one establishing shot: slow forward movement, 5 seconds. Show the available settings and exact quote before generating.',
  clientsEyebrow: 'CONNECTION POINTS', clientsTitle: 'Where does your shot brief start?', clientsIntro: 'Choose the environment that holds your brief. Setup, supported actions and verification differ by client; check the guide before connecting.',
  workflowEyebrow: 'SHOT HANDOFF', workflowTitle: 'A brief becomes a request. A request becomes a take.',
  workflowIntro: 'MCP connects compatible assistants to VideoAI generation and account media. Keep creative decisions, the exact quote and the completed file visible at each handoff.',
  stages: ['Brief', 'Approval', 'Result'], stageTitles: ['Specify the shot.', 'Approve this attempt.', 'Review the returned take.'],
  stageBodies: ['State the subject, framing, motion and target duration. Include references only where the model and connection support them.', 'Check the chosen model, supported settings and exact price. Paid generation begins only after your confirmation.', 'Retrieve the completed video from your VideoAI library. Review it before the next attempt; inline playback depends on the client.'],
};
type Copy = typeof en;
const zh: Copy = {
  eyebrow: '制作管线 / MCP', title: '把镜头生成，接入你的制作流程。', intro: '将助手里的镜头需求转为有明确报价的生成请求。核对设置、确认费用，再取回结果，进入下一道制作工序。', choose: '选择接入方式', prompt: '准备一个建立镜头的试拍：镜头缓慢前推，时长 5 秒。请先列出支持的设置和准确报价，等我确认后再生成。',
  clientsEyebrow: '流程接入点', clientsTitle: '你的镜头需求，起草在哪里？', clientsIntro: '从保存制作需求的助手或自动化工具接入。不同客户端的设置、支持操作与验证范围不同，请先查看对应指南。',
  workflowEyebrow: '镜头任务交接', workflowTitle: '需求变成请求，请求产出一条镜头。', workflowIntro: 'MCP 将兼容的助手连接到 VideoAI 的生成能力与账户媒体。每次交接都保留清晰的创作要求、准确报价与结果文件。',
  stages: ['镜头需求', '本次确认', '结果审看'], stageTitles: ['说清楚要拍什么。', '确认这一次尝试。', '审看返回的镜头。'],
  stageBodies: ['说明主体、构图、运动与目标时长。仅在模型和接入方式支持时加入参考素材。', '核对模型、可用设置与准确费用。付费生成在你确认后开始。', '在 VideoAI 媒体库取回完成的视频，审看后再决定下一次尝试。能否直接在对话中播放取决于客户端。'],
};
const fr: Copy = {
  eyebrow: 'PIPELINE DE PRODUCTION / MCP', title: 'Intégrez la génération à votre production.', intro: 'Transformez le brief de votre assistant en demande chiffrée. Vérifiez les réglages, approuvez le devis et récupérez le résultat pour la suite de la production.', choose: 'Choisir la connexion', prompt: 'Prépare un essai de plan général : travelling avant lent, 5 secondes. Présente les réglages disponibles et le devis exact avant toute génération.',
  clientsEyebrow: 'POINTS DE CONNEXION', clientsTitle: 'Où commence le brief du plan ?', clientsIntro: 'Choisissez l’environnement de votre brief. Configuration, actions et vérification varient selon le client : consultez son guide.',
  workflowEyebrow: 'TRANSMISSION DU PLAN', workflowTitle: 'Du brief à la demande. De la demande à la prise.', workflowIntro: 'MCP relie les assistants compatibles à la génération et aux médias VideoAI. Gardez visibles les décisions créatives, le devis exact et le fichier obtenu.',
  stages: ['Brief', 'Validation', 'Résultat'], stageTitles: ['Décrivez le plan.', 'Validez cet essai.', 'Examinez la prise.'], stageBodies: ['Précisez sujet, cadrage, mouvement et durée. Ajoutez des références uniquement si le modèle et la connexion le permettent.', 'Vérifiez modèle, réglages disponibles et prix exact. La génération payante commence après votre confirmation.', 'Retrouvez la vidéo dans votre médiathèque VideoAI. Examinez-la avant un nouvel essai ; la lecture dans la conversation dépend du client.'],
};
const es: Copy = {
  eyebrow: 'FLUJO DE PRODUCCIÓN / MCP', title: 'Integra la generación en tu producción.', intro: 'Convierte el brief del asistente en una solicitud con precio. Revisa ajustes, aprueba el presupuesto y recupera el resultado para el siguiente paso.', choose: 'Elegir conexión', prompt: 'Prepara una prueba de plano general: avance lento de cámara, 5 segundos. Muestra ajustes disponibles y precio exacto antes de generar.',
  clientsEyebrow: 'PUNTOS DE CONEXIÓN', clientsTitle: '¿Dónde empieza el brief del plano?', clientsIntro: 'Elige el entorno donde preparas el brief. Configuración, acciones y verificación cambian según el cliente; consulta su guía.',
  workflowEyebrow: 'ENTREGA DEL PLANO', workflowTitle: 'Del brief a la solicitud. De la solicitud a la toma.', workflowIntro: 'MCP conecta asistentes compatibles con la generación y los medios de VideoAI. Mantén visibles decisiones creativas, precio exacto y archivo final.',
  stages: ['Brief', 'Aprobación', 'Resultado'], stageTitles: ['Define el plano.', 'Aprueba este intento.', 'Revisa la toma.'], stageBodies: ['Indica sujeto, encuadre, movimiento y duración. Incluye referencias solo si el modelo y la conexión lo permiten.', 'Revisa modelo, ajustes compatibles y precio exacto. La generación de pago empieza tras tu confirmación.', 'Recupera el vídeo en tu biblioteca VideoAI. Revísalo antes del siguiente intento; la reproducción en la conversación depende del cliente.'],
};
export function getMcpProductionCopy(locale: AppLocale) { return ({ en, zh, fr, es })[locale]; }
