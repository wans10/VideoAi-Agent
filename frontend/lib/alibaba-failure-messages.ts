/**
 * Customer copy for the direct Alibaba Model Studio route. The server stores the English canonical text
 * (frontend/src/server/video-providers/alibaba-model-studio/capacity.ts and frontend/server/alibaba-model-studio-poll.ts);
 * readers localize it here. Keyvo publishes zh; en stays the canonical stored form.
 */
const BUSY_PATTERN = /^This model is at capacity right now\./i;
/** Bailian (DashScope) content inspection: `DataInspectionFailed` / "Input data may contain inappropriate content." and the output-side variants. */
const CONTENT_INSPECTION_PATTERN = /inappropriate content|DataInspectionFailed|data[\s_-]*inspection|content[\s_-]*(?:security|inspection)[\s_-]*(?:check|fail)/i;
const TASK_LOST_PATTERN = /^The render task could no longer be found, so it was stopped\./i;

const copy = {
  en: {
    busy: 'This model is at capacity right now. Please try again in about a minute.',
    taskLost: 'The render task could no longer be found, so it was stopped.',
    contentInspection: 'Your content did not pass the safety review. Change the prompt or media and try again.',
  },
  zh: {
    busy: '该模型当前繁忙，已达到服务商的并发或请求频率上限。请约一分钟后重试。',
    taskLost: '渲染任务已无法查询（可能已过期或不存在），任务已终止。',
    contentInspection: '您的内容未通过安全审核，请修改提示词或素材后重试。',
  },
  fr: {
    busy: 'Ce modèle est saturé pour le moment. Réessayez dans une minute environ.',
    taskLost: 'La tâche de rendu est introuvable ; elle a été arrêtée.',
    contentInspection: 'Votre contenu n’a pas passé le contrôle de sécurité. Modifiez le prompt ou les médias puis réessayez.',
  },
  es: {
    busy: 'Este modelo está saturado en este momento. Vuelve a intentarlo en un minuto aproximadamente.',
    taskLost: 'La tarea de renderizado ya no se encuentra, por lo que se ha detenido.',
    contentInspection: 'Tu contenido no ha superado la revisión de seguridad. Cambia el prompt o los medios e inténtalo de nuevo.',
  },
};

function language(locale = 'en') {
  return locale.startsWith('zh') ? copy.zh : locale.startsWith('fr') ? copy.fr : locale.startsWith('es') ? copy.es : copy.en;
}

export function getAlibabaFailureMessage(message: string | null | undefined, locale = 'en'): string | null {
  const normalized = message?.trim() ?? '';
  if (BUSY_PATTERN.test(normalized)) return language(locale).busy;
  if (TASK_LOST_PATTERN.test(normalized)) return language(locale).taskLost;
  if (normalized.length <= 400 && CONTENT_INSPECTION_PATTERN.test(normalized)) return language(locale).contentInspection;
  return null;
}
