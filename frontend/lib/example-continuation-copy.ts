import { PRODUCT_BRAND_NAME } from './product-brand';

const B = PRODUCT_BRAND_NAME;

function baseCopy(locale: string) {
  return locale === 'fr' ? {
    studio: 'Adapter dans Studio', continueWith: 'Continuer avec', ready: 'Votre exemple est prêt à adapter. Le prompt et les réglages sont dans votre demande ci-dessous.',
    copy: 'Copier la demande', copied: 'Demande copiée',
    copyError: 'Copie indisponible. Sélectionnez la demande ci-dessous.', manualCopy: 'Demande à copier manuellement',
    hint: 'Prompt, réglages et lien inclus. Si la demande n’apparaît pas, copiez-la ici.',
    connection: `Connecter ${B}`, newTab: 'nouvel onglet',
    intro: `Aide-moi à adapter cet exemple ${B}. Garde son modèle et ses réglages connus comme base, puis demande-moi ce que je souhaite changer.`,
    source: 'Exemple', video: 'Vidéo originale', prompt: 'Prompt original', settings: 'Réglages connus', model: 'Modèle', mode: 'Mode', duration: 'Durée', resolution: 'Résolution', recordedResolution: 'Résolution enregistrée', aspect: 'Format', audio: 'Audio', on: 'activé', off: 'désactivé', negative: 'Prompt négatif', references: 'Références publiques disponibles',
    missing: 'Les réglages d’origine sont incomplets. Vérifie les valeurs manquantes avec moi avant de préparer la génération.',
    inputs: 'Les fichiers de référence privés ne sont pas transférés. Si ce mode nécessite des références absentes, demande-moi de les fournir. Le lien de la vidéo est un exemple, pas une référence automatiquement importée.',
    approval: 'Vérifie les réglages actuellement acceptés par ce modèle, signale toute adaptation nécessaire et présente le devis exact avant toute génération. Ne lance rien sans mon accord sur ce devis.',
    connector: `Utilise les outils ${B} si la connexion est disponible. Sinon, guide-moi pour connecter ${B} ; ne prétends pas être connecté.`,
  } : locale === 'es' ? {
    studio: 'Adaptar en Studio', continueWith: 'Continuar con', ready: 'Tu ejemplo está listo para adaptar. El prompt y los ajustes están en tu solicitud a continuación.',
    copy: 'Copiar la solicitud', copied: 'Solicitud copiada',
    copyError: 'No se pudo copiar. Selecciona la solicitud a continuación.', manualCopy: 'Solicitud para copiar manualmente',
    hint: 'Incluye prompt, ajustes y enlace. Si no aparece la solicitud, cópiala aquí.',
    connection: `Conectar ${B}`, newTab: 'pestaña nueva',
    intro: `Ayúdame a adaptar este ejemplo de ${B}. Conserva su modelo y los ajustes conocidos como punto de partida y pregúntame qué quiero cambiar.`,
    source: 'Ejemplo', video: 'Vídeo original', prompt: 'Prompt original', settings: 'Ajustes conocidos', model: 'Modelo', mode: 'Modo', duration: 'Duración', resolution: 'Resolución', recordedResolution: 'Resolución registrada', aspect: 'Formato', audio: 'Audio', on: 'activado', off: 'desactivado', negative: 'Prompt negativo', references: 'Referencias públicas disponibles',
    missing: 'Los ajustes originales están incompletos. Confirma conmigo los valores que faltan antes de preparar la generación.',
    inputs: 'No se transfieren archivos de referencia privados. Si este modo necesita referencias que faltan, pídeme que las proporcione. El enlace del vídeo es un ejemplo, no una referencia importada automáticamente.',
    approval: 'Comprueba los ajustes que admite actualmente este modelo, explica cualquier adaptación necesaria y presenta el precio exacto antes de generar. No generes nada hasta que apruebe ese precio.',
    connector: `Usa las herramientas de ${B} si la conexión está disponible. Si no, guíame para conectar ${B}; no afirmes que ya está conectado.`,
  } : {
    studio: 'Adapt in Studio', continueWith: 'Continue with', ready: 'Your example is ready to adapt. Its prompt and settings are in your request below.',
    copy: 'Copy request', copied: 'Request copied',
    copyError: 'Copy unavailable. Select the request below.', manualCopy: 'Request for manual copying',
    hint: 'Prompt, settings and link included. If the request is missing, copy it here.',
    connection: `Connect ${B}`, newTab: 'new tab',
    intro: `Help me adapt this ${B} example. Keep its model and known settings as a starting point, then ask what I would like to change.`,
    source: 'Example', video: 'Original video', prompt: 'Original prompt', settings: 'Known settings', model: 'Model', mode: 'Mode', duration: 'Duration', resolution: 'Resolution', recordedResolution: 'Recorded resolution', aspect: 'Aspect ratio', audio: 'Audio', on: 'on', off: 'off', negative: 'Negative prompt', references: 'Available public references',
    missing: 'The original settings are incomplete. Check the missing values with me before preparing a generation.',
    inputs: 'Private reference files are not transferred. If this mode requires missing references, ask me to provide them. The video link is an example, not an automatically imported reference.',
    approval: 'Check the settings this model currently supports, explain any necessary adaptations and present an exact quote before generating. Do not generate until I approve that quote.',
    connector: `Use the ${B} tools if the connection is available. Otherwise guide me through connecting ${B}; do not claim to be connected.`,
  };
}

const zhCopy = {
  studio: '在 Studio 中调整', continueWith: '继续使用', ready: '示例已准备好，可以开始调整。提示词与参数已写入下方的请求。',
  copy: '复制请求', copied: '请求已复制',
  copyError: '无法复制，请手动选择下方的请求。', manualCopy: '请手动复制的请求',
  hint: '已包含提示词、参数和链接。若请求未显示，请在此处复制。',
  connection: `连接 ${B}`, newTab: '新标签页',
  intro: `请帮我改编这个 ${B} 示例。以它的模型和已知参数为起点，然后问我想修改什么。`,
  source: '示例', video: '原视频', prompt: '原提示词', settings: '已知参数', model: '模型', mode: '模式', duration: '时长', resolution: '分辨率', recordedResolution: '记录的分辨率', aspect: '画幅', audio: '音频', on: '开', off: '关', negative: '反向提示词', references: '可用的公开参考素材',
  missing: '原始参数不完整。请先与我确认缺失的值，再准备生成。',
  inputs: '私有参考文件不会被转移。若此模式需要缺失的参考素材，请让我提供。视频链接仅是示例，不是自动导入的参考素材。',
  approval: '请核对该模型当前支持的参数，说明必要的调整，并在生成前给出准确报价。在我确认该报价之前不要生成。',
  connector: `如果连接可用，请使用 ${B} 工具；否则请指导我如何连接 ${B}，不要假装已经连接。`,
};

export function exampleContinuationCopy(locale: string) {
  return locale.startsWith('zh') ? zhCopy : baseCopy(locale);
}
