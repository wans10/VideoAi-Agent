import { conversationCopy } from '@/lib/studio/conversation-copy';
import { findElevenVoice } from '@/lib/audio-eleven-voices';
import type {SeedanceEditSourceFacts} from '../seedance-edit-source';
import {seedanceEditSourceLabel} from '../seedance-edit-source-copy';
import type {ImageConversationTurn} from './image-conversation-contract';
import {isFlux3MaxEngineId,parseFlux3MaxKeyframeIndexes} from '@/lib/flux-3-max';
import {getGenerationFailureFallbackMessage,getKnownGenerationFailureMessage} from '@/lib/generation-failure-messages';
export type ConversationLocale = 'en' | 'fr' | 'es' | 'zh';
function safeFailureMessage(message: string | null | undefined): string | null {
  return message && !/https?:\/\/|gs:\/\/|[{}]/i.test(message) ? message : null;
}

/** General policy guidance only; a safety refusal does not identify the triggering element. */
export function conversationGoogleSafetyHelp(
  generation: ImageConversationTurn['generation'],
  locale: ConversationLocale,
) {
  if (generation?.status !== 'failed'
    || !/^Google blocked this request during safety checks\./i.test(safeFailureMessage(generation.message) ?? '')) return null;
  const copy = {
    en: {
      label: 'Safety check: what to review',
      explanation: 'Google may assess the words, meaning and context of the prompt, as well as reference images or videos and generated content. The refusal does not always identify the exact trigger.',
      examples: 'In the prompt and references, avoid explicit sexual content, graphic violence, hate or harassment, exploitation of minors, dangerous or illegal instructions, and other people’s private information.',
      next: 'Review the prompt and reference media, then describe a permitted scene without the problematic elements. Changing a few words while keeping the same meaning may still be refused.',
      policy: 'Google content rules',
    },
    fr: {
      label: 'Contrôle de sécurité : que vérifier ?',
      explanation: 'Google peut examiner les mots, le sens et le contexte du prompt, ainsi que les images ou vidéos de référence et le résultat généré. Le message ne précise pas forcément ce qui a déclenché le refus.',
      examples: 'Dans le prompt et les références, évitez notamment le contenu sexuel explicite, la violence graphique, la haine ou le harcèlement, l’exploitation de mineurs, les instructions dangereuses ou illégales et les informations privées d’autrui.',
      next: 'Relisez le prompt et les médias de référence, puis décrivez une scène autorisée sans les éléments problématiques. Changer quelques mots en gardant le même sens peut encore entraîner un refus.',
      policy: 'Règles Google sur les contenus',
    },
    es: {
      label: 'Control de seguridad: ¿qué revisar?',
      explanation: 'Google puede evaluar las palabras, el significado y el contexto del prompt, además de las imágenes o los vídeos de referencia y el contenido generado. El rechazo no siempre identifica el motivo exacto.',
      examples: 'En el prompt y las referencias, evita el contenido sexual explícito, la violencia gráfica, el odio o el acoso, la explotación de menores, las instrucciones peligrosas o ilegales y los datos privados de otras personas.',
      next: 'Revisa el prompt y los medios de referencia; después, describe una escena permitida sin los elementos problemáticos. Cambiar unas palabras sin cambiar el sentido puede seguir provocando un rechazo.',
      policy: 'Normas de contenido de Google',
    },
    zh: {
      label: '安全检查：需要检查的内容',
      explanation: 'Google 可能会评估提示词的文字、含义和上下文，以及参考图片或视频和生成内容。拒绝结果不一定会指出具体触发因素。',
      examples: '在提示词和参考素材中，请避免露骨的性内容、血腥暴力、仇恨或骚扰、对未成年人的剥削、危险或违法的指令，以及他人的隐私信息。',
      next: '请检查提示词和参考素材，然后描述一个允许的场景，去掉有问题的元素。仅更换几个词而保持原意，仍可能被拒绝。',
      policy: 'Google 内容政策',
    },
  }[locale];
  return {...copy, policyUrl: `https://policies.google.com/terms/generative-ai/use-policy?hl=${locale}`};
}

export function conversationFailurePresentation(
  generation: ImageConversationTurn['generation'],
  locale: ConversationLocale,
): string {
  const copy = {
    en: {
      unknown: 'Creation failed. The precise reason is not available. Review your request.',
      unsupported: 'This request is not supported with the selected inputs. Review the prompt, media or settings.',
      reference: 'Keyvo could not read the reference media. Select it again or upload a new file.',
      timeout: 'This render exceeded the expected processing window.',
      busy: 'The render queue is temporarily busy. Wait before making another attempt.',
      storage: 'The render finished, but Keyvo could not prepare the output for download.',
      noOutput: 'The render finished without a usable output. Review your request.',
      review: 'This render needs manual review. Contact support before preparing another attempt.',
      refund: ' Your payment was refunded to your wallet.', next: ' A new attempt needs a new quote.',
    },
    fr: {
      unknown: 'La création a échoué. Le motif précis n’est pas disponible. Vérifiez votre demande.',
      unsupported: 'Cette demande n’est pas compatible avec les entrées sélectionnées. Vérifiez le prompt, les médias ou les réglages.',
      reference: 'Le média de référence n’a pas pu être lu. Sélectionnez-le à nouveau ou importez un autre fichier.',
      timeout: 'Ce rendu a dépassé le délai de traitement prévu.',
      busy: 'La file de création est temporairement saturée. Patientez avant une nouvelle tentative.',
      storage: 'Le rendu est terminé, mais Keyvo n’a pas pu préparer le résultat pour le téléchargement.',
      noOutput: 'Le rendu s’est terminé sans résultat exploitable. Vérifiez votre demande.',
      review: 'Ce rendu nécessite une vérification manuelle. Contactez le support avant de préparer une nouvelle tentative.',
      refund: ' Le paiement a été remboursé sur votre wallet.', next: ' Une nouvelle tentative nécessite un nouveau devis.',
    },
    es: {
      unknown: 'La creación ha fallado. El motivo preciso no está disponible. Revisa tu solicitud.',
      unsupported: 'Esta solicitud no es compatible con las entradas seleccionadas. Revisa el prompt, los medios o los ajustes.',
      reference: 'No se ha podido leer el medio de referencia. Selecciónalo de nuevo o sube otro archivo.',
      timeout: 'Este renderizado ha superado el plazo de procesamiento previsto.',
      busy: 'La cola de creación está temporalmente saturada. Espera antes de otro intento.',
      storage: 'El renderizado ha terminado, pero no se ha podido preparar el resultado para su descarga.',
      noOutput: 'El renderizado ha terminado sin un resultado utilizable. Revisa tu solicitud.',
      review: 'Este renderizado necesita una revisión manual. Contacta con soporte antes de preparar otro intento.',
      refund: ' El pago se ha reembolsado a tu monedero.', next: ' Un nuevo intento requiere un nuevo presupuesto.',
    },
    zh: {
      unknown: '生成失败。无法获取具体原因，请检查您的请求。',
      unsupported: '当前所选输入不支持此请求。请检查提示词、媒体或设置。',
      reference: '无法读取参考媒体。请重新选择或上传新文件。',
      timeout: '本次渲染超出了预期的处理时间。',
      busy: '渲染队列暂时繁忙。请稍后再尝试。',
      storage: '渲染已完成，但无法准备结果以供下载。',
      noOutput: '渲染已完成，但没有可用的结果。请检查您的请求。',
      review: '本次渲染需要人工审核。请先联系支持，再准备新的尝试。',
      refund: ' 款项已退回钱包。', next: ' 再次生成需要新报价。',
    },
  }[locale];
  const safeMessage = safeFailureMessage(generation?.message);
  const known = getKnownGenerationFailureMessage({
    message:safeMessage,
    failureCode:generation?.failureCode,locale,
  });
  // These are fixed public journal messages, never raw supplier payloads or inferred prompt content.
  const journalReason = safeMessage && ([
    [/^This request is not supported with the selected inputs\./i,'unsupported'],
    [/^(?:Keyvo|MaxVideoAI) could not read the reference media(?: for this render)?\./i,'reference'],
    [/^This render exceeded the expected processing window\./i,'timeout'],
    [/^The render queue is temporarily busy\./i,'busy'],
    [/^The render finished, but (?:Keyvo|MaxVideoAI) could not prepare the output for download\./i,'storage'],
    [/^The render finished without a usable output\./i,'noOutput'],
    [/^This render needs manual review\./i,'review'],
  ] as const).find(([pattern])=>pattern.test(safeMessage))?.[1];
  const failure = known && known !== getGenerationFailureFallbackMessage(locale)
    ? known : journalReason ? copy[journalReason] : copy.unknown;
  const refund = generation?.paymentStatus === 'refunded_wallet'
    ? copy.refund
    : '';
  return failure + refund + copy.next;
}
export function conversationQuotePresentation(request: NonNullable<ImageConversationTurn['quote']>['summary'], locale: ConversationLocale, outputDurationSec?:number, sourceVideoOutput?:SeedanceEditSourceFacts) {
  const t = (en: string, fr: string, es: string) => conversationCopy(locale, en, fr, es);
  const referenceLabels = (request.references ?? []).map(reference => {
    switch(reference.role) {
      case 'source_video': return t('source video','vidéo source', "vídeo original");
      case 'voice_sample': return t('voice sample','échantillon de voix', "muestra de voz");
      case 'first_frame': return t('start frame','image de départ', "imagen inicial");
      case 'last_frame': return t('end frame','image de fin', "imagen final");
      case 'mask': return t('mask','masque', "máscara");
      case 'source': return request.mode==='a2v' ? t('source audio','audio source', "audio original")
        : ['extend','v2v','r2v','retake','reframe'].includes(request.mode) ? t('source clip','clip source', "clip original") : t('source image','image source', "imagen original");
      default: return t('reference','référence', "referencia");
    }
  });
  const referenceCounts=new Map<string,number>();
  for(const label of referenceLabels)referenceCounts.set(label,(referenceCounts.get(label)??0)+1);
  const referenceSummary=[...referenceCounts].map(([label,count])=>count>1?`${count} × ${label}`:label).join(' · ');
  if (request.surface === 'audio') {
    const voice = request.mode === 'voice_only';
    const titles={
      voice_only:t('Voiceover','Voix off', "Voz en off"), music_only:t('Music','Musique', "Música"),
      sfx_only:t('Sound effect','Effet sonore', "Efecto de sonido"), song:t('Song','Chanson', "Canción"), ambience_only:t('Ambience','Ambiance sonore', "Ambiente sonoro"),
      cinematic:t('Video soundtrack','Bande-son vidéo', "Banda sonora de vídeo"), cinematic_voice:t('Video soundtrack with voice','Bande-son vidéo avec voix', "Banda sonora de vídeo con voz"),
    };
    const cloned=request.references?.some(reference=>reference.role==='voice_sample');
    return {title: titles[request.mode],operation:'',
      create: voice ? t('Create voiceover', 'Créer la voix', "Crear voz en off") : request.mode==='music_only' ? t('Create music','Créer la musique', "Crear música")
        : request.mode==='cinematic'||request.mode==='cinematic_voice' ? t('Create soundtrack','Créer la bande-son', "Crear banda sonora") : t('Create audio','Créer le son', "Crear audio"),
      direction: voice ? request.settings.script ?? '' : [request.prompt,
        request.settings.script ? `${t('Narration','Narration', "Narración")}: ${request.settings.script}` : '',
        request.settings.lyrics ? `${t('Lyrics','Paroles', "Letra")}: ${request.settings.lyrics}` : ''].filter(Boolean).join('\n\n'),
      referenceSummary,
      settings: [voice ? '' : request.settings.durationSec ? `${request.settings.durationSec} s` : '',
        request.settings.language, findElevenVoice(request.settings.elevenVoiceId)?.name, cloned ? t('cloned voice','voix clonée', "voz clonada") : request.settings.voiceModel,
        voice ? request.settings.seedAudioOutputFormat : request.settings.musicModel, request.settings.mood,
        request.settings.musicEnabled===false ? t('no music','sans musique', "sin música") : ''].filter(Boolean).join(' · ')};
  }
  const subjects = request.subjects?.map((subject,index)=>{
    const slots=subject.kind==='video'?[subject.referenceSlot]:[subject.frontalReferenceSlot,...subject.referenceSlots];
    return `${t('Subject','Sujet', "Sujeto")} ${index+1} · ${subject.kind==='video'?t('video','vidéo', "vídeo"):t('image views','vues image', "vistas de imagen")} · ${t('reference positions','positions des références', "posiciones de referencia")} ${slots.map(slot=>slot+1).join(', ')}`;
  }).join('\n');
  const video = request.surface === 'video';
  const fluxMax = video && isFlux3MaxEngineId(request.engineId);
  const keyframeIndexes = fluxMax && request.mode === 'ref2v' ? parseFlux3MaxKeyframeIndexes(request.settings.keyframeIndexes) : null;
  const keyframeTimes = keyframeIndexes?.map(index => `${new Intl.NumberFormat(locale, {maximumFractionDigits:3}).format(index / 24)} s`).join(', ');
  const maxControls = fluxMax ? [
    keyframeTimes ? `${t('keyframes','images clés', "fotogramas clave")} ${keyframeTimes}` : '',
    request.settings.reasoningLevel === 'low' || request.settings.reasoningLevel === 'high'
      ? `${t('reasoning','analyse', "análisis")} ${request.settings.reasoningLevel === 'high' ? t('high','approfondie', "detallado") : t('low','rapide', "rápido")}` : '',
    typeof request.settings.seed === 'number' ? `${t('seed','graine', "semilla")} ${request.settings.seed}` : '',
  ] : [];
  const duration=typeof outputDurationSec==='number'&&Number.isFinite(outputDurationSec)&&outputDurationSec>0
    ? outputDurationSec : request.settings.durationSec;
  const dimensions=!video&&typeof request.settings.imageWidth==='number'&&typeof request.settings.imageHeight==='number'
    ? `${request.settings.imageWidth} × ${request.settings.imageHeight} px` : '';
  const segment=video&&request.mode==='retake'&&typeof request.settings.startTimeSec==='number'&&typeof request.settings.durationSec==='number'
    ? `${t('segment','passage', "segmento")} ${request.settings.startTimeSec}–${request.settings.startTimeSec+request.settings.durationSec} s` : '';
  const videoTitle=request.mode==='extend' ? t('Clip extension','Extension du clip', "Extensión del clip") : request.mode==='v2v' ? t('Video edit','Modification vidéo', "Edición de vídeo")
    : request.mode==='r2v' ? t('Video from clips','Vidéo depuis des clips', "Vídeo a partir de clips") : request.mode==='a2v' ? t('Audio-driven video','Vidéo guidée par le son', "Vídeo guiado por audio")
      : request.mode==='retake' ? t('Clip retake','Reprise du clip', "Nueva toma del clip") : request.mode==='reframe' ? t('Reframed video','Vidéo recadrée', "Vídeo reencuadrado") : t('Video','Vidéo', "Vídeo");
  const operation=!video?'':request.mode==='extend'
    ? t('This quote generates an extension. If delivered as a separate continuation, it needs assembly with the original to play the full sequence.','Ce devis génère une prolongation. Si elle est livrée dans un clip distinct, elle doit être assemblée avec l’original pour lire la séquence complète.', "Este presupuesto genera una extensión. Si se entrega como una continuación independiente, hay que unirla al original para reproducir la secuencia completa.")
    : request.mode==='v2v'
      ? t('This quote regenerates visuals using the source video as guidance.','Ce devis régénère les images à partir de la vidéo source.', "Este presupuesto regenera las imágenes utilizando el vídeo original como guía.")
      : request.mode==='t2v'
        ? t('This quote creates a new video from your description.','Ce devis crée une nouvelle vidéo à partir de votre description.', "Este presupuesto crea un vídeo nuevo a partir de tu descripción.") : '';
  return {title: video ? videoTitle : t('Image', 'Une image', "Imagen"),operation, create: video ? request.mode==='extend' ? t('Extend clip','Prolonger le clip', "Extender clip") : t('Create video', 'Créer la vidéo', "Crear vídeo") : t('Create image', 'Créer l’image', "Crear imagen"),
    direction: [Array.isArray(request.settings.multiPrompt)
      ? request.settings.multiPrompt.map((shot,index)=>`${t('Shot','Plan', "Plano")} ${index+1} · ${shot.durationSec} s\n${shot.prompt}`).join('\n\n')
      : request.prompt, subjects].filter(Boolean).join('\n\n'),

    referenceSummary,
    settings: [video&&sourceVideoOutput?seedanceEditSourceLabel(sourceVideoOutput,locale):request.settings.aspectRatio, dimensions,dimensions&&request.settings.resolution==='custom'?'':request.settings.resolution,
      segment || (video && duration && !sourceVideoOutput ? `${duration} s` : ''),
      video ? request.settings.audio === false ? t('silent', 'sans audio', "sin audio") : '' : request.settings.outputFormat ?? 'PNG', ...maxControls].filter(Boolean).join(' · ')};
}
