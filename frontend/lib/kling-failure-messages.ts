/**
 * Customer copy for the direct Kling route (and the shared direct-submission rejections it reuses).
 * The server stores the English canonical text (frontend/app/api/generate/_lib/kling-direct-submission-shared.ts);
 * readers localize it here. Keyvo publishes zh; en stays the canonical stored form.
 */
const PATTERNS = {
  busy: /^This Kling model is busy right now\b/i,
  unsupportedInputs: /^This request is not supported with the selected inputs\./i,
  optionUnavailable: /^This render option is temporarily unavailable\./i,
  couldNotStart: /^The render could not start\. Please retry later\.$/i,
  manualReview: /^Provider acceptance needs manual review\.$/i,
} as const;

type Key = keyof typeof PATTERNS;

const copy: Record<'en' | 'zh' | 'fr' | 'es', Record<Key, string>> = {
  en: {
    busy: 'This Kling model is busy right now (concurrent task limit reached). Please try again in about a minute.',
    unsupportedInputs: 'This request is not supported with the selected inputs. Adjust the prompt, media, or settings and try again.',
    optionUnavailable: 'This render option is temporarily unavailable. Please retry later.',
    couldNotStart: 'The render could not start. Please retry later.',
    manualReview: 'The render status could not be confirmed and is being reviewed. Do not submit it again.',
  },
  zh: {
    busy: '可灵模型当前繁忙（已达到并发任务上限）。请约一分钟后重试。',
    unsupportedInputs: '当前所选的输入组合不受支持。请调整提示词、素材或参数后重试。',
    optionUnavailable: '该生成选项暂时不可用，请稍后重试。',
    couldNotStart: '渲染未能启动，请稍后重试。',
    manualReview: '无法确认本次渲染的状态，正在人工核查。请勿重复提交。',
  },
  fr: {
    busy: 'Ce modèle Kling est saturé pour le moment (limite de tâches simultanées atteinte). Réessayez dans une minute environ.',
    unsupportedInputs: 'Cette demande n’est pas compatible avec les entrées sélectionnées. Modifiez le prompt, les médias ou les réglages puis réessayez.',
    optionUnavailable: 'Cette option de rendu est temporairement indisponible. Réessayez plus tard.',
    couldNotStart: 'Le rendu n’a pas pu démarrer. Réessayez plus tard.',
    manualReview: 'Le statut du rendu n’a pas pu être confirmé et est en cours de vérification. Ne le soumettez pas à nouveau.',
  },
  es: {
    busy: 'Este modelo de Kling está saturado en este momento (límite de tareas simultáneas alcanzado). Vuelve a intentarlo en un minuto aproximadamente.',
    unsupportedInputs: 'Esta solicitud no es compatible con las entradas seleccionadas. Ajusta el prompt, los medios o los ajustes e inténtalo de nuevo.',
    optionUnavailable: 'Esta opción de renderizado no está disponible temporalmente. Inténtalo más tarde.',
    couldNotStart: 'No se pudo iniciar el renderizado. Inténtalo más tarde.',
    manualReview: 'No se pudo confirmar el estado del renderizado y se está revisando. No lo vuelvas a enviar.',
  },
};

function language(locale = 'en') {
  return locale.startsWith('zh') ? copy.zh : locale.startsWith('fr') ? copy.fr : locale.startsWith('es') ? copy.es : copy.en;
}

export function getKlingFailureMessage(message: string | null | undefined, locale = 'en'): string | null {
  const normalized = message?.trim() ?? '';
  if (!normalized) return null;
  for (const key of Object.keys(PATTERNS) as Key[]) {
    if (PATTERNS[key].test(normalized)) return language(locale)[key];
  }
  return null;
}
