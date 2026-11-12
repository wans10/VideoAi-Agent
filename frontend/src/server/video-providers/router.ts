import { videoOperationEndpoint } from '@/lib/video-operation';
import type { Mode } from '@/types/engines';
import { isAlibabaDirectEngine, isAlibabaDirectModeSupported, isAlibabaFalFallbackCompatible } from './alibaba-model-studio/model-map';
import { isGoogleVertexOmniEngine, isGoogleVertexOmniModeSupported } from './google-vertex-omni/model-map';
import { isGoogleVertexVeoEngine, isGoogleVertexVeoModeSupported } from './google-vertex-veo/model-map';
import { isKlingDirectEngine, isKlingDirectModeSupported, isKlingDirectV2Engine } from './kling-direct/model-map';
import {
  isLumaAgentsVideoEngine,
  isLumaAgentsVideoModeSupported,
} from './luma-agents/model-map';
import { resolveLlmhubVideoModel } from './llmhub/model-map';
import {
  hasUnsupportedMinimaxOfficialInputs,
  isMinimaxOfficialEngineRoute,
  isSupportedLlmhubMinimaxRequest,
  minimaxRequestHasEndImage,
} from '@/server/llmhub-minimax-capabilities';
import { hasKlingCredentials } from './kling-direct/credentials';
import { parseGoogleVertexServiceAccount } from './google-vertex-auth';
import { resolveBailianHostedEngine } from './alibaba-model-studio/bailian-models';
import {
  BAILIAN_ROUTE_ORDER_ENV,
  isBailianHostedRequestCompatible,
  parseBailianRouteOrder,
} from './alibaba-model-studio/bailian-routing';

export type VideoProviderRoutingEnv = Readonly<Partial<Record<
  | 'PRICING_SANDBOX'
  | 'KLING_DIRECT_ENABLED'
  | 'KLING_API_KEY'
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
  | 'LLMHUB_API_KEY'
  | 'MINIMAX_OFFICIAL_ENABLED'
  | 'MINIMAX_API_KEY'
  | 'KLING_ROUTE_ORDER'
  | 'MINIMAX_H3_ROUTE_ORDER'
  | 'FAL_API_KEY'
  | 'FAL_KEY',
  string | undefined
>>>;

export type LlmhubPrimaryRoutingPlan = {
  kind: 'llmhub_primary';
  primaryProvider: 'llmhub';
  modelId: string;
  /** MiniMax-H3: on a definite pre-acceptance rejection, submit to the Bailian-hosted model instead. */
  bailianFallback?: true;
};

export type KlingDirectPrimaryRoutingPlan = {
  kind: 'kling_direct_primary';
  primaryProvider: 'kling_direct';
  fallbackProvider: 'fal';
  fallbackEnabled: boolean;
  fallbackOnCreditsDepletedEnabled: boolean;
  elementRegistrationEnabled: boolean;
  /** Kling 4.0 / 4.0 Flash new-design API (API Key only, no Fal fallback). Absent for legacy V3/O3. */
  apiDesign?: 'v2';
  /** Kling 3 family: on a definite pre-acceptance rejection, submit to the Bailian-hosted model instead. */
  bailianFallback?: true;
};

/** Vendor direct plan that may follow a Bailian-hosted primary (or precede it with `bailianFallback`). */
export type BailianDirectFallbackPlan = KlingDirectPrimaryRoutingPlan | LlmhubPrimaryRoutingPlan;

export type VideoProviderRoutingPlan =
  | LlmhubPrimaryRoutingPlan
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
      /** Kling / MiniMax hosted on Bailian (bailian-routing.ts); Fal is never their fallback. */
      bailianHosted?: true;
      /** The vendor's own route, tried only after a definite pre-acceptance rejection by Bailian. */
      directFallback?: BailianDirectFallbackPlan;
    }
  | {
      kind: 'alibaba_model_studio_unavailable';
      reason: 'direct_not_configured' | 'public_routing_disabled' | 'admin_only';
    }
  | KlingDirectPrimaryRoutingPlan
  | {
      kind: 'kling_direct_unavailable';
      reason: 'direct_not_configured' | 'public_routing_disabled' | 'admin_only' | 'unsupported_mode';
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
      kind: 'luma_agents_unavailable';
      reason: 'direct_not_configured' | 'public_routing_disabled' | 'admin_only';
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

function minimaxOfficialEnv(env?: VideoProviderRoutingEnv): Record<string, string | undefined> {
  return {
    MINIMAX_OFFICIAL_ENABLED: readEnv(env, 'MINIMAX_OFFICIAL_ENABLED'),
    MINIMAX_API_KEY: readEnv(env, 'MINIMAX_API_KEY'),
  };
}

/**
 * MiniMax engines served by MiniMax's own API (MINIMAX_OFFICIAL_ENABLED) keep the llmhub job provider, but do not
 * need LLM Hub itself and accept what that API accepts (last frame, references, the Hailuo matrix).
 */
function isMinimaxOfficialRequestSupported(engineId: string, mode: string, request?: Record<string, unknown>): boolean {
  return isSupportedLlmhubMinimaxRequest({
    engineId,
    mode,
    durationSec: request ? request.durationSec ?? request.duration : undefined,
    resolution: request?.resolution,
    official: true,
    hasEndImage: request ? minimaxRequestHasEndImage(request) : false,
  }) && (!request || !hasUnsupportedMinimaxOfficialInputs(request, mode, engineId));
}

export function isLlmhubVideoRoutingSelected(
  engineId: string,
  mode: string,
  env?: VideoProviderRoutingEnv,
  request?: Record<string, unknown>,
): boolean {
  const minimaxEnv = minimaxOfficialEnv(env);
  if (isMinimaxOfficialEngineRoute(engineId, minimaxEnv)) {
    return Boolean(resolveLlmhubVideoModel(engineId, mode, minimaxEnv))
      && isMinimaxOfficialRequestSupported(engineId, mode, request);
  }
  const isVeo = ['veo-3-1', 'veo-3-1-fast', 'veo-3-1-lite'].includes(engineId);
  return Boolean(resolveLlmhubVideoModel(engineId, mode, minimaxEnv))
    && (!isVeo || isVerifiedLlmhubVeoRequest(mode, request))
    && flagEnabled(readEnv(env, 'LLMHUB_INFERENCE_ROUTING_ENABLED'))
    && isSupportedLlmhubMinimaxRequest({
      engineId,
      mode,
      durationSec: request ? request.durationSec ?? request.duration : undefined,
      resolution: request?.resolution,
    })
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

type VideoProviderRoutingParams = {
  operation?: unknown;
  engineId: string;
  mode: Mode | string;
  isAdmin: boolean;
  env?: VideoProviderRoutingEnv;
  request?: Record<string, unknown>;
};

/** Bailian's own gates: the same switches as the first-party Alibaba route (enabled, key, admin-only, public). */
function isBailianRouteReady(params: VideoProviderRoutingParams): boolean {
  if (!flagEnabled(readEnv(params.env, 'ALIBABA_MODEL_STUDIO_ENABLED'))) return false;
  if (!readEnv(params.env, 'ALIBABA_MODEL_STUDIO_API_KEY')?.trim() && readEnv(params.env, 'PRICING_SANDBOX') !== '1') return false;
  if (flagEnabled(readEnv(params.env, 'ALIBABA_MODEL_STUDIO_ADMIN_ONLY') ?? 'true') && !params.isAdmin) return false;
  return params.isAdmin || flagEnabled(readEnv(params.env, 'ALIBABA_MODEL_STUDIO_PUBLIC_ROUTING_ENABLED'));
}

/**
 * Kling 3 / 3.0 Omni / 3.0 Turbo and MiniMax-H3 are hosted on Bailian as well as on the vendor's own API.
 * KLING_ROUTE_ORDER / MINIMAX_H3_ROUTE_ORDER (default `bailian,direct`) pick the primary before any task exists;
 * the other leg is attached as a pre-acceptance fallback only. An unusable leg is skipped; when neither is
 * usable the vendor plan (including its unavailable/Fal result) is returned unchanged.
 */
function applyBailianRouteOrder(params: VideoProviderRoutingParams, vendorPlan: VideoProviderRoutingPlan): VideoProviderRoutingPlan {
  const hosted = resolveBailianHostedEngine(params.engineId);
  if (!hosted || videoOperationEndpoint(params.engineId, params.mode, params.operation)) return vendorPlan;
  const directPlan = (hosted.routeFamily === 'kling'
    ? vendorPlan.kind === 'kling_direct_primary' && vendorPlan.apiDesign !== 'v2'
    : vendorPlan.kind === 'llmhub_primary') ? vendorPlan as BailianDirectFallbackPlan : null;
  const bailianUsable = isBailianHostedRequestCompatible(params.engineId, params.mode, params.request)
    && isBailianRouteReady(params);
  const legs = parseBailianRouteOrder(readEnv(params.env, BAILIAN_ROUTE_ORDER_ENV[hosted.routeFamily]))
    .filter((leg) => (leg === 'bailian' ? bailianUsable : directPlan !== null));
  if (!legs.length) return vendorPlan;
  const withFallback = legs.length > 1;
  if (legs[0] === 'direct' && directPlan) return withFallback ? { ...directPlan, bailianFallback: true } : directPlan;
  return {
    kind: 'alibaba_model_studio_primary',
    primaryProvider: 'alibaba_model_studio',
    fallbackProvider: 'fal',
    fallbackEnabled: false,
    bailianHosted: true,
    ...(withFallback && directPlan ? { directFallback: directPlan } : {}),
  };
}

export function resolveVideoProviderRoutingPlan(params: VideoProviderRoutingParams): VideoProviderRoutingPlan {
  return applyBailianRouteOrder(params, resolveVendorVideoProviderRoutingPlan(params));
}

function resolveVendorVideoProviderRoutingPlan(params: VideoProviderRoutingParams): VideoProviderRoutingPlan {
  const falOnly: VideoProviderRoutingPlan = { kind: 'fal_only', primaryProvider: 'fal', fallbackEnabled: false };
  if (videoOperationEndpoint(params.engineId, params.mode, params.operation)) return falOnly;
  const minimaxEnv = minimaxOfficialEnv(params.env);
  const llmhubModel = resolveLlmhubVideoModel(params.engineId, params.mode, minimaxEnv);
  const llmhubFallback = (): VideoProviderRoutingPlan | null => {
    if (!llmhubModel || !isLlmhubVideoRoutingSelected(params.engineId, params.mode, params.env, params.request)
      || (!readEnv(params.env, 'LLMHUB_API_KEY')?.trim()
        && !isMinimaxOfficialEngineRoute(params.engineId, minimaxEnv))) return null;
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
    if (isKlingDirectV2Engine(params.engineId)) {
      // Kling 4.0 / 4.0 Flash: official new-design API only. Without it, keep upstream's Fal route only
      // where Fal is configured; otherwise refuse before any charge (Keyvo has no Fal).
      const falConfigured = Boolean(readEnv(params.env, 'FAL_API_KEY')?.trim() || readEnv(params.env, 'FAL_KEY')?.trim());
      const unavailable = (reason: 'direct_not_configured' | 'public_routing_disabled' | 'admin_only' | 'unsupported_mode'):
        VideoProviderRoutingPlan => falConfigured ? falOnly : { kind: 'kling_direct_unavailable', reason };
      if (!isKlingDirectModeSupported(params.engineId, params.mode)) return unavailable('unsupported_mode');
      if (!flagEnabled(readEnv(params.env, 'KLING_DIRECT_ENABLED'))
        || !readEnv(params.env, 'KLING_API_KEY')?.trim()) return unavailable('direct_not_configured');
      const adminOnly = flagEnabled(readEnv(params.env, 'KLING_DIRECT_ADMIN_ONLY') ?? 'true');
      if (adminOnly && !params.isAdmin) return unavailable('admin_only');
      if (!flagEnabled(readEnv(params.env, 'KLING_DIRECT_PUBLIC_ROUTING_ENABLED')) && !params.isAdmin) {
        return unavailable('public_routing_disabled');
      }
      return {
        kind: 'kling_direct_primary',
        primaryProvider: 'kling_direct',
        fallbackProvider: 'fal',
        fallbackEnabled: false,
        fallbackOnCreditsDepletedEnabled: false,
        elementRegistrationEnabled: flagEnabled(readEnv(params.env, 'KLING_DIRECT_ELEMENT_REGISTRATION_ENABLED')),
        apiDesign: 'v2',
      };
    }
    if (!isKlingDirectModeSupported(params.engineId, params.mode)) return falOnly;
    if (!flagEnabled(readEnv(params.env, 'KLING_DIRECT_ENABLED'))) return falOnly;
    if (!hasKlingCredentials({
      KLING_API_KEY: readEnv(params.env, 'KLING_API_KEY'),
      KLING_ACCESS_KEY: readEnv(params.env, 'KLING_ACCESS_KEY'),
      KLING_SECRET_KEY: readEnv(params.env, 'KLING_SECRET_KEY'),
    })) return falOnly;

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
    const unavailable = (reason: 'direct_not_configured' | 'public_routing_disabled' | 'admin_only'): VideoProviderRoutingPlan =>
      params.mode === 'v2v' || params.mode === 'reframe' || params.mode === 'extend'
        ? { kind: 'luma_agents_unavailable', reason }
        : falOnly;
    const advancedDirectOnlyEnabled = flagEnabled(
      readEnv(params.env, 'LUMA_AGENTS_ADVANCED_DIRECT_ONLY_ENABLED')
    );
    if (!isLumaAgentsVideoModeSupported(params.mode)) {
      return falOnly;
    }
    if (!flagEnabled(readEnv(params.env, 'LUMA_AGENTS_ENABLED'))) return unavailable('direct_not_configured');
    if (!flagEnabled(readEnv(params.env, 'LUMA_AGENTS_VIDEO_DIRECT_ENABLED'))) return unavailable('direct_not_configured');
    if (!readEnv(params.env, 'LUMA_AGENTS_API_KEY')?.trim()) return falOnly;

    const publicRoutingEnabled = flagEnabled(readEnv(params.env, 'LUMA_AGENTS_PUBLIC_ROUTING_ENABLED'));
    const adminOnly = flagEnabled(readEnv(params.env, 'LUMA_AGENTS_ADMIN_ONLY') ?? 'true');
    if (adminOnly && !params.isAdmin) return unavailable('admin_only');
    if (!publicRoutingEnabled && !params.isAdmin) return unavailable('public_routing_disabled');

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
    params.providerRoutingPlan.apiDesign !== 'v2' &&
    params.elementCount > 0 &&
    !params.providerRoutingPlan.elementRegistrationEnabled
  );
}
