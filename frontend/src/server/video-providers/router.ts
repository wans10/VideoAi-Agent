import type { Mode } from '@/types/engines';
import { isAlibabaDirectEngine, isAlibabaDirectModeSupported, isAlibabaFalFallbackCompatible } from './alibaba-model-studio/model-map';
import { isGoogleVertexOmniEngine, isGoogleVertexOmniModeSupported } from './google-vertex-omni/model-map';
import { isGoogleVertexVeoEngine, isGoogleVertexVeoModeSupported } from './google-vertex-veo/model-map';
import { isKlingDirectEngine, isKlingDirectModeSupported } from './kling-direct/model-map';
import {
  isLumaAgentsVideoEngine,
  isLumaAgentsVideoModeSupported,
} from './luma-agents/model-map';
import { resolveLlmhubVideoModel } from './llmhub/model-map';
import { parseGoogleVertexServiceAccount } from './google-vertex-auth';

export type VideoProviderRoutingEnv = Readonly<Partial<Record<
  | 'PRICING_SANDBOX'
  | 'KLING_DIRECT_ENABLED'
  | 'KLING_ACCESS_KEY'
  | 'KLING_SECRET_KEY'
  | 'ALIBABA_MODEL_STUDIO_ENABLED'
  | 'ALIBABA_MODEL_STUDIO_API_KEY'
  | 'ALIBABA_MODEL_STUDIO_PUBLIC_ROUTING_ENABLED'
  | 'ALIBABA_MODEL_STUDIO_ADMIN_ONLY'
  | 'ALIBABA_MODEL_STUDIO_FALLBACK_TO_FAL_ENABLED'
  | 'KLING_DIRECT_PUBLIC_ROUTING_ENABLED'
  | 'KLING_DIRECT_FALLBACK_TO_FAL_ENABLED'
  | 'KLING_DIRECT_FALLBACK_ON_CREDITS_DEPLETED_ENABLED'
  | 'KLING_DIRECT_ELEMENT_REGISTRATION_ENABLED'
  | 'KLING_DIRECT_ADMIN_ONLY'
  | 'LUMA_AGENTS_ENABLED'
  | 'LUMA_AGENTS_API_KEY'
  | 'LUMA_AGENTS_PUBLIC_ROUTING_ENABLED'
  | 'LUMA_AGENTS_ADMIN_ONLY'
  | 'LUMA_AGENTS_FALLBACK_TO_FAL_ENABLED'
  | 'LUMA_AGENTS_ADVANCED_DIRECT_ONLY_ENABLED'
  | 'LUMA_AGENTS_VIDEO_DIRECT_ENABLED'
  | 'GOOGLE_VERTEX_VEO_ENABLED'
  | 'GOOGLE_VERTEX_PROJECT_ID'
  | 'GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON'
  | 'GOOGLE_VERTEX_VEO_PUBLIC_ROUTING_ENABLED'
  | 'GOOGLE_VERTEX_VEO_PUBLIC_EXTEND_ROUTING_ENABLED'
  | 'GOOGLE_VERTEX_VEO_INPUT_GCS_URI'
  | 'GOOGLE_VERTEX_VEO_ADMIN_ONLY'
  | 'GOOGLE_VERTEX_OMNI_ENABLED'
  | 'GOOGLE_VERTEX_OMNI_PROJECT_ID'
  | 'GOOGLE_VERTEX_OMNI_SERVICE_ACCOUNT_JSON'
  | 'GOOGLE_VERTEX_OMNI_PUBLIC_ROUTING_ENABLED'
  | 'GOOGLE_VERTEX_OMNI_ADMIN_ONLY'
  | 'LLMHUB_INFERENCE_ROUTING_ENABLED'
  | 'LLMHUB_API_KEY',
  string | undefined
>>>;

export type VideoProviderRoutingPlan =
  | { kind: 'llmhub_primary'; primaryProvider: 'llmhub'; modelId: string }
  | {
      kind: 'fal_only';
      primaryProvider: 'fal';
      fallbackEnabled: false;
    }
  | {
      kind: 'alibaba_model_studio_primary';
      primaryProvider: 'alibaba_model_studio';
      fallbackProvider: 'fal';
      fallbackEnabled: boolean;
    }
  | {
      kind: 'alibaba_model_studio_unavailable';
      reason: 'direct_not_configured' | 'public_routing_disabled' | 'admin_only';
    }
  | {
      kind: 'kling_direct_primary';
      primaryProvider: 'kling_direct';
      fallbackProvider: 'fal';
      fallbackEnabled: boolean;
      fallbackOnCreditsDepletedEnabled: boolean;
      elementRegistrationEnabled: boolean;
    }
  | {
      kind: 'google_vertex_veo_primary';
      primaryProvider: 'google_vertex_veo_direct';
    }
  | {
      kind: 'google_vertex_omni_primary';
      primaryProvider: 'google_vertex_omni_direct';
    }
  | {
      kind: 'google_vertex_unavailable';
      reason: 'vertex_not_configured' | 'public_routing_disabled' | 'admin_only' | 'unsupported_mode';
    }
  | {
      kind: 'luma_agents_direct_primary';
      primaryProvider: 'luma_agents_direct';
      fallbackProvider: 'fal';
      fallbackEnabled: boolean;
      advancedDirectOnlyEnabled: boolean;
    };

function flagEnabled(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value ?? '').trim().toLowerCase());
}

function readEnv(
  env: VideoProviderRoutingEnv | undefined,
  key: keyof VideoProviderRoutingEnv,
): string | undefined {
  return env?.[key] ?? process.env[key];
}

function isGcsUriConfigured(value: string | undefined): boolean {
  return /^gs:\/\/[^/]+(?:\/.*)?$/i.test((value ?? '').trim());
}

function isGoogleVertexCredentialConfigured(projectId: string | undefined, serviceAccount: string | undefined): boolean {
  if (!projectId?.trim() || !serviceAccount?.trim()) return false;
  try {
    parseGoogleVertexServiceAccount(serviceAccount);
    return true;
  } catch {
    return false;
  }
}

function isVerifiedLlmhubVeoRequest(mode: string, request?: Record<string, unknown>): boolean {
  if (mode !== 't2v') return false;
  if (!request) return true;
  const duration = request.durationSec ?? request.duration ?? request.durationOption;
  const resolution = request.resolution;
  const aspectRatio = request.aspectRatio ?? request.aspect_ratio;
  return (duration === undefined || duration === null || duration === 8 || duration === '8' || duration === '8s')
    && (resolution === undefined || resolution === null || resolution === '720p')
    && (aspectRatio === undefined || aspectRatio === null || aspectRatio === '16:9');
}

export function isLlmhubVideoRoutingSelected(
  engineId: string,
  mode: string,
  env?: VideoProviderRoutingEnv,
  request?: Record<string, unknown>,
): boolean {
  const isVeo = ['veo-3-1', 'veo-3-1-fast', 'veo-3-1-lite'].includes(engineId);
  return Boolean(resolveLlmhubVideoModel(engineId, mode))
    && (!isVeo || isVerifiedLlmhubVeoRequest(mode, request))
    && flagEnabled(readEnv(env, 'LLMHUB_INFERENCE_ROUTING_ENABLED'))
    && (!request || !hasUnsupportedLlmhubVideoInputs(request, mode));
}

/** The public video endpoint accepts a prompt and one starting image only. */
export function hasUnsupportedLlmhubVideoInputs(body: Record<string, unknown>, mode: string): boolean {
  if (body.audio === false || body.generate_audio === false) return true;
  const present = (value: unknown): boolean =>
    typeof value === 'string' ? value.trim().length > 0
      : Array.isArray(value) ? value.length > 0
        : value && typeof value === 'object' ? Object.keys(value).length > 0
          : value !== null && value !== undefined && value !== false;
  const unsupported = [
    'endImageUrl', 'lastFrameUrl', 'last_frame_url', 'end_image_url',
    'referenceImages', 'reference_images', 'imageUrls', 'image_urls', 'videoUrl', 'video_url',
    'audioUrl', 'audio_url', 'multiPrompt', 'elements', 'voiceIds',
    'voiceControl', 'seed', 'cameraFixed', 'safetyChecker', 'cfgScale',
    'negativePrompt', 'shotType', 'loop', 'extraInputValues',
  ];
  if (unsupported.some((field) => present(body[field]))) return true;
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  if (mode === 't2v' && (attachments.length > 0 || present(body.imageUrl) || present(body.image_url))) return true;
  if (attachments.length > 1) return true;
  const directImage = typeof body.imageUrl === 'string' ? body.imageUrl.trim()
    : typeof body.image_url === 'string' ? body.image_url.trim() : '';
  if (directImage && attachments.length === 1) {
    const attachment = attachments[0];
    if (!attachment || typeof attachment !== 'object'
      || (attachment as { url?: unknown }).url !== directImage) return true;
  }
  return attachments.some((item) => {
    if (!item || typeof item !== 'object') return false;
    const attachment = item as { kind?: unknown; slotId?: unknown; fieldId?: unknown };
    const slot = String(attachment.slotId ?? attachment.fieldId ?? '').toLowerCase();
    return attachment.kind === 'video' || attachment.kind === 'audio'
      || !['image_url', 'input_image', 'image', 'first_frame_url'].includes(slot);
  });
}

export function resolveVideoProviderRoutingPlan(params: {
  engineId: string;
  mode: Mode | string;
  isAdmin: boolean;
  env?: VideoProviderRoutingEnv;
  request?: Record<string, unknown>;
}): VideoProviderRoutingPlan {
  const falOnly: VideoProviderRoutingPlan = { kind: 'fal_only', primaryProvider: 'fal', fallbackEnabled: false };
  const llmhubModel = resolveLlmhubVideoModel(params.engineId, params.mode);
  const llmhubFallback = (): VideoProviderRoutingPlan | null => {
    if (!llmhubModel || !isLlmhubVideoRoutingSelected(params.engineId, params.mode, params.env, params.request)
      || !readEnv(params.env, 'LLMHUB_API_KEY')?.trim()) return null;
    return { kind: 'llmhub_primary', primaryProvider: 'llmhub', modelId: llmhubModel };
  };
  if (isAlibabaDirectEngine(params.engineId)) {
    if (!isAlibabaDirectModeSupported(params.engineId, params.mode)) return falOnly;
    const fallbackCompatible = isAlibabaFalFallbackCompatible(params.engineId, params.mode);
    if (!flagEnabled(readEnv(params.env, 'ALIBABA_MODEL_STUDIO_ENABLED'))
      || (!readEnv(params.env, 'ALIBABA_MODEL_STUDIO_API_KEY')?.trim() && readEnv(params.env, 'PRICING_SANDBOX') !== '1')) {
      return llmhubFallback() ?? (fallbackCompatible
        ? falOnly
        : { kind: 'alibaba_model_studio_unavailable', reason: 'direct_not_configured' });
    }

    const publicRoutingEnabled = flagEnabled(readEnv(params.env, 'ALIBABA_MODEL_STUDIO_PUBLIC_ROUTING_ENABLED'));
    const adminOnly = flagEnabled(readEnv(params.env, 'ALIBABA_MODEL_STUDIO_ADMIN_ONLY') ?? 'true');
    if (adminOnly && !params.isAdmin) {
      return llmhubFallback() ?? (fallbackCompatible
        ? falOnly
        : { kind: 'alibaba_model_studio_unavailable', reason: 'admin_only' });
    }
    if (!publicRoutingEnabled && !params.isAdmin) {
      return llmhubFallback() ?? (fallbackCompatible
        ? falOnly
        : { kind: 'alibaba_model_studio_unavailable', reason: 'public_routing_disabled' });
    }

    return {
      kind: 'alibaba_model_studio_primary',
      primaryProvider: 'alibaba_model_studio',
      fallbackProvider: 'fal',
      fallbackEnabled:
        fallbackCompatible
        && flagEnabled(readEnv(params.env, 'ALIBABA_MODEL_STUDIO_FALLBACK_TO_FAL_ENABLED')),
    };
  }

  if (isGoogleVertexOmniEngine(params.engineId)) {
    if (!isGoogleVertexOmniModeSupported(params.engineId, params.mode)) {
      return { kind: 'google_vertex_unavailable', reason: 'unsupported_mode' };
    }
    if (!flagEnabled(readEnv(params.env, 'GOOGLE_VERTEX_OMNI_ENABLED'))
      || !isGoogleVertexCredentialConfigured(
        readEnv(params.env, 'GOOGLE_VERTEX_OMNI_PROJECT_ID') ?? readEnv(params.env, 'GOOGLE_VERTEX_PROJECT_ID'),
        readEnv(params.env, 'GOOGLE_VERTEX_OMNI_SERVICE_ACCOUNT_JSON')
          ?? readEnv(params.env, 'GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON'),
      )) {
      return { kind: 'google_vertex_unavailable', reason: 'vertex_not_configured' };
    }

    const publicRoutingEnabled = flagEnabled(readEnv(params.env, 'GOOGLE_VERTEX_OMNI_PUBLIC_ROUTING_ENABLED'));
    const adminOnly = flagEnabled(readEnv(params.env, 'GOOGLE_VERTEX_OMNI_ADMIN_ONLY') ?? 'false');
    if (adminOnly && !params.isAdmin) return { kind: 'google_vertex_unavailable', reason: 'admin_only' };
    if (!publicRoutingEnabled && !params.isAdmin) {
      return { kind: 'google_vertex_unavailable', reason: 'public_routing_disabled' };
    }

    return {
      kind: 'google_vertex_omni_primary',
      primaryProvider: 'google_vertex_omni_direct',
    };
  }

  if (isGoogleVertexVeoEngine(params.engineId)) {
    if (!isGoogleVertexVeoModeSupported(params.engineId, params.mode)) {
      return { kind: 'google_vertex_unavailable', reason: 'unsupported_mode' };
    }
    if (!flagEnabled(readEnv(params.env, 'GOOGLE_VERTEX_VEO_ENABLED'))
      || !isGoogleVertexCredentialConfigured(
        readEnv(params.env, 'GOOGLE_VERTEX_PROJECT_ID'),
        readEnv(params.env, 'GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON'),
      )) {
      return llmhubFallback() ?? { kind: 'google_vertex_unavailable', reason: 'vertex_not_configured' };
    }

    const publicRoutingEnabled = flagEnabled(readEnv(params.env, 'GOOGLE_VERTEX_VEO_PUBLIC_ROUTING_ENABLED'));
    const publicExtendRoutingEnabled = flagEnabled(
      readEnv(params.env, 'GOOGLE_VERTEX_VEO_PUBLIC_EXTEND_ROUTING_ENABLED')
    );
    const publicExtendInputStagingConfigured = isGcsUriConfigured(
      readEnv(params.env, 'GOOGLE_VERTEX_VEO_INPUT_GCS_URI')
    );
    const publicExtendRouteReady =
      params.mode === 'extend' && publicExtendRoutingEnabled && publicExtendInputStagingConfigured;
    const publicRoutingReadyForMode =
      params.mode === 'extend'
        ? (publicRoutingEnabled || publicExtendRoutingEnabled) && publicExtendInputStagingConfigured
        : publicRoutingEnabled;
    const adminOnly = flagEnabled(readEnv(params.env, 'GOOGLE_VERTEX_VEO_ADMIN_ONLY') ?? 'true');
    if (adminOnly && !params.isAdmin && !publicExtendRouteReady) {
      return llmhubFallback() ?? { kind: 'google_vertex_unavailable', reason: 'admin_only' };
    }
    if (!publicRoutingReadyForMode && !params.isAdmin) {
      return llmhubFallback() ?? { kind: 'google_vertex_unavailable', reason: 'public_routing_disabled' };
    }

    return {
      kind: 'google_vertex_veo_primary',
      primaryProvider: 'google_vertex_veo_direct',
    };
  }

  if (isKlingDirectEngine(params.engineId)) {
    if (!isKlingDirectModeSupported(params.engineId, params.mode)) return falOnly;
    if (!flagEnabled(readEnv(params.env, 'KLING_DIRECT_ENABLED'))) return falOnly;
    if (!readEnv(params.env, 'KLING_ACCESS_KEY')?.trim() || !readEnv(params.env, 'KLING_SECRET_KEY')?.trim()) return falOnly;

    const publicRoutingEnabled = flagEnabled(readEnv(params.env, 'KLING_DIRECT_PUBLIC_ROUTING_ENABLED'));
    const adminOnly = flagEnabled(readEnv(params.env, 'KLING_DIRECT_ADMIN_ONLY') ?? 'true');
    if (adminOnly && !params.isAdmin) return falOnly;
    if (!publicRoutingEnabled && !params.isAdmin) return falOnly;

    return {
      kind: 'kling_direct_primary',
      primaryProvider: 'kling_direct',
      fallbackProvider: 'fal',
      fallbackEnabled: flagEnabled(readEnv(params.env, 'KLING_DIRECT_FALLBACK_TO_FAL_ENABLED')),
      fallbackOnCreditsDepletedEnabled: flagEnabled(
        readEnv(params.env, 'KLING_DIRECT_FALLBACK_ON_CREDITS_DEPLETED_ENABLED')
      ),
      elementRegistrationEnabled: flagEnabled(readEnv(params.env, 'KLING_DIRECT_ELEMENT_REGISTRATION_ENABLED')),
    };
  }

  if (isLumaAgentsVideoEngine(params.engineId)) {
    const advancedDirectOnlyEnabled = flagEnabled(
      readEnv(params.env, 'LUMA_AGENTS_ADVANCED_DIRECT_ONLY_ENABLED')
    );
    if (!isLumaAgentsVideoModeSupported(params.mode)) {
      return falOnly;
    }
    if (!flagEnabled(readEnv(params.env, 'LUMA_AGENTS_ENABLED'))) return falOnly;
    if (!flagEnabled(readEnv(params.env, 'LUMA_AGENTS_VIDEO_DIRECT_ENABLED'))) return falOnly;
    if (!readEnv(params.env, 'LUMA_AGENTS_API_KEY')?.trim()) return falOnly;

    const publicRoutingEnabled = flagEnabled(readEnv(params.env, 'LUMA_AGENTS_PUBLIC_ROUTING_ENABLED'));
    const adminOnly = flagEnabled(readEnv(params.env, 'LUMA_AGENTS_ADMIN_ONLY') ?? 'true');
    if (adminOnly && !params.isAdmin) return falOnly;
    if (!publicRoutingEnabled && !params.isAdmin) return falOnly;

    return {
      kind: 'luma_agents_direct_primary',
      primaryProvider: 'luma_agents_direct',
      fallbackProvider: 'fal',
      fallbackEnabled:
        (params.mode === 't2v' || params.mode === 'i2v') &&
        flagEnabled(readEnv(params.env, 'LUMA_AGENTS_FALLBACK_TO_FAL_ENABLED')),
      advancedDirectOnlyEnabled,
    };
  }

  return llmhubFallback() ?? falOnly;
}

export function shouldRouteKlingDirectSourceElementsToFal(params: {
  providerRoutingPlan: VideoProviderRoutingPlan;
  elementCount: number;
}): boolean {
  return (
    params.providerRoutingPlan.kind === 'kling_direct_primary' &&
    params.elementCount > 0 &&
    !params.providerRoutingPlan.elementRegistrationEnabled
  );
}
