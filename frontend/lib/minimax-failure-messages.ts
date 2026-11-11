/**
 * Customer copy for MiniMax's own video API. The server stores the English canonical text
 * (MINIMAX_MESSAGES in frontend/src/server/video-providers/minimax-official/client.ts); readers localize it here.
 * Keyvo publishes zh; en stays the canonical stored form.
 */
const PATTERNS = {
  rateLimited: /^MiniMax is receiving too many requests right now\./i,
  overloaded: /^MiniMax is overloaded right now\./i,
  inputSensitive: /^MiniMax rejected the prompt or reference media during its content review\./i,
  outputSensitive: /^MiniMax blocked the generated video during its content review\./i,
  taskExpired: /^The MiniMax task is older than 7 days/i,
  invalidRequest: /^MiniMax rejected the render settings\./i,
  balance: /^The MiniMax service account has insufficient balance\./i,
} as const;

type Key = keyof typeof PATTERNS;

const copy: Record<'en' | 'zh' | 'fr' | 'es', Record<Key, string>> = {
  en: {
    rateLimited: 'MiniMax is receiving too many requests right now. Please try again in about a minute. No credits were charged.',
    overloaded: 'MiniMax is overloaded right now. Please try again in a few minutes. No credits were charged.',
    inputSensitive: 'MiniMax rejected the prompt or reference media during its content review. Change them before trying again.',
    outputSensitive: 'MiniMax blocked the generated video during its content review. Change the prompt before trying again.',
    taskExpired: 'The MiniMax task is older than 7 days and can no longer be queried, so it was stopped.',
    invalidRequest: 'MiniMax rejected these render settings. Check the duration, resolution and input images, then try again.',
    balance: 'The MiniMax service is temporarily unavailable. Please try again later or choose another model.',
  },
  zh: {
    rateLimited: 'MiniMax 当前请求过多，已达到服务商的请求频率或并发上限。请约一分钟后重试，本次未扣费。',
    overloaded: 'MiniMax 服务当前负载过高。请几分钟后重试，本次未扣费。',
    inputSensitive: '提示词或参考素材未通过 MiniMax 的内容审核。请修改后重试。',
    outputSensitive: '生成的视频未通过 MiniMax 的内容审核。请修改提示词后重试。',
    taskExpired: 'MiniMax 任务已超过 7 天的查询期限，无法再获取结果，任务已终止。',
    invalidRequest: 'MiniMax 不接受当前的生成设置。请检查时长、分辨率和输入图片后重试。',
    balance: 'MiniMax 服务暂时不可用。请稍后重试或选择其他模型。',
  },
  fr: {
    rateLimited: 'MiniMax reçoit trop de requêtes pour le moment. Réessayez dans une minute environ. Aucun crédit n’a été débité.',
    overloaded: 'MiniMax est surchargé pour le moment. Réessayez dans quelques minutes. Aucun crédit n’a été débité.',
    inputSensitive: 'MiniMax a refusé le prompt ou les médias de référence lors de sa modération. Modifiez-les avant de réessayer.',
    outputSensitive: 'MiniMax a bloqué la vidéo générée lors de sa modération. Modifiez le prompt avant de réessayer.',
    taskExpired: 'La tâche MiniMax date de plus de 7 jours et ne peut plus être consultée ; elle a été arrêtée.',
    invalidRequest: 'MiniMax a refusé ces réglages. Vérifiez la durée, la résolution et les images, puis réessayez.',
    balance: 'Le service MiniMax est temporairement indisponible. Réessayez plus tard ou choisissez un autre modèle.',
  },
  es: {
    rateLimited: 'MiniMax está recibiendo demasiadas solicitudes. Vuelve a intentarlo en un minuto aproximadamente. No se han descontado créditos.',
    overloaded: 'MiniMax está sobrecargado en este momento. Vuelve a intentarlo en unos minutos. No se han descontado créditos.',
    inputSensitive: 'MiniMax ha rechazado el prompt o los medios de referencia en su moderación. Cámbialos antes de intentarlo de nuevo.',
    outputSensitive: 'MiniMax ha bloqueado el vídeo generado en su moderación. Cambia el prompt antes de intentarlo de nuevo.',
    taskExpired: 'La tarea de MiniMax tiene más de 7 días y ya no se puede consultar, por lo que se ha detenido.',
    invalidRequest: 'MiniMax ha rechazado estos ajustes. Revisa la duración, la resolución y las imágenes e inténtalo de nuevo.',
    balance: 'El servicio de MiniMax no está disponible temporalmente. Vuelve a intentarlo más tarde o elige otro modelo.',
  },
};

function language(locale = 'en') {
  return locale.startsWith('zh') ? copy.zh : locale.startsWith('fr') ? copy.fr : locale.startsWith('es') ? copy.es : copy.en;
}

export function getMinimaxFailureMessage(message: string | null | undefined, locale = 'en'): string | null {
  const normalized = message?.trim() ?? '';
  if (!normalized) return null;
  for (const key of Object.keys(PATTERNS) as Key[]) {
    if (PATTERNS[key].test(normalized)) return language(locale)[key];
  }
  return null;
}
