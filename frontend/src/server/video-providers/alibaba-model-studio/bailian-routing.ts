import { hasUnsupportedMinimaxOfficialInputs, isSupportedLlmhubMinimaxRequest } from '@/server/llmhub-minimax-capabilities';
import { classifyKlingDirectError } from '../kling-direct/errors';
import { MINIMAX_MESSAGES } from '../minimax-official/client';
import { classifyAlibabaModelStudioError } from './errors';
import {
  isBailianHostedModeSupported,
  resolveBailianHostedEngine,
  type BailianRouteFamily,
} from './bailian-models';

/**
 * Route order for the Kling / MiniMax models Bailian hosts (owner decision 2026-11-11): Bailian first, the
 * vendor's own API second. The order is chosen BEFORE any provider task exists. The second route is tried only
 * after a definite pre-acceptance rejection of the first; once either side accepted a task, or the outcome of a
 * send is unknown (timeout, network, 5xx, unreadable answer), the job stays with that provider: no second paid task.
 */
export type BailianRouteLeg = 'bailian' | 'direct';
export const DEFAULT_BAILIAN_ROUTE_ORDER: readonly BailianRouteLeg[] = ['bailian', 'direct'];
export const BAILIAN_ROUTE_ORDER_ENV: Readonly<Record<BailianRouteFamily, 'KLING_ROUTE_ORDER' | 'MINIMAX_H3_ROUTE_ORDER'>> = {
  kling: 'KLING_ROUTE_ORDER',
  minimax_h3: 'MINIMAX_H3_ROUTE_ORDER',
};

/** `bailian,direct` (default), `direct,bailian`, or a single leg (`bailian` / `direct`) to disable the fallback. */
export function parseBailianRouteOrder(value: string | null | undefined): BailianRouteLeg[] {
  const legs: BailianRouteLeg[] = [];
  for (const token of (value ?? '').split(/[\s,>|]+/u)) {
    const leg = token.trim().toLowerCase();
    if ((leg === 'bailian' || leg === 'direct') && !legs.includes(leg)) legs.push(leg);
  }
  return legs.length ? legs : [...DEFAULT_BAILIAN_ROUTE_ORDER];
}

const present = (value: unknown): boolean =>
  typeof value === 'string' ? value.trim().length > 0
    : Array.isArray(value) ? value.length > 0
      : value && typeof value === 'object' ? Object.keys(value).length > 0
        : value !== null && value !== undefined && value !== false;

function extraValues(request: Record<string, unknown>): Record<string, unknown> {
  const extra = request.extraInputValues;
  return extra && typeof extra === 'object' && !Array.isArray(extra) ? extra as Record<string, unknown> : {};
}

/**
 * Whether Bailian can serve this request at all. Kling subjects (Keyvo-registered elements), voice binding,
 * camera control and motion brush exist only on Kling's own API (Bailian element IDs are a separate catalogue),
 * so such requests use the direct route alone. Finer limits are enforced by bailian-payload.ts before the paid
 * call, where a local rejection still allows the direct fallback.
 */
export function isBailianHostedRequestCompatible(engineId: string, mode: string, request?: Record<string, unknown>): boolean {
  const engine = resolveBailianHostedEngine(engineId);
  if (!engine || !isBailianHostedModeSupported(engineId, mode)) return false;
  if (!request) return true;
  if (engine.routeFamily === 'kling') {
    const extra = extraValues(request);
    return !['elements', 'voiceIds', 'voiceControl'].some((field) => present(request[field]))
      && !['camera_control', 'static_mask', 'dynamic_masks', 'element_list', 'voice_ids'].some((field) => present(extra[field]));
  }
  // MiniMax-H3 on Bailian takes exactly what MiniMax's own V2 API takes (frames or multimodal references).
  return isSupportedLlmhubMinimaxRequest({
    engineId,
    mode,
    durationSec: request.durationSec ?? request.duration,
    resolution: request.resolution,
    official: true,
  }) && !hasUnsupportedMinimaxOfficialInputs(request, mode, engineId);
}

const LOCAL_MEDIA_FAILURES = new Set(['REFERENCE_INVALID', 'REFERENCE_ACCESS_FAILED']);

/**
 * Bailian (primary) → vendor direct. Definite pre-acceptance failures only: local validation or capacity
 * guard, HTTP 400/404/422 (model not available / parameters refused), 401/403 (key, model not activated),
 * 402/quota, 413, 429 and region mismatch. Never after a task ID, never for timeouts, network errors, 5xx or
 * unreadable answers (the task may exist), never for content moderation or our own media-access failures.
 */
export function shouldFallbackFromBailianSubmit(params: { acceptedProviderJobId: string | null | undefined; error: unknown }): boolean {
  if (params.acceptedProviderJobId) return false;
  const normalized = classifyAlibabaModelStudioError(params.error);
  if (normalized.code && LOCAL_MEDIA_FAILURES.has(normalized.code)) return false;
  return ['rate_limit', 'auth_error', 'billing_or_access', 'region_mismatch', 'invalid_request', 'payload_too_large']
    .includes(normalized.errorClass);
}

/** Kling direct (primary) → Bailian: documented 1xxx business rejections and 401/429, except content review. */
export function shouldFallbackFromKlingDirectToBailian(params: { acceptedProviderJobId: string | null | undefined; error: unknown }): boolean {
  if (params.acceptedProviderJobId) return false;
  const normalized = classifyKlingDirectError(params.error);
  return [
    'auth_error', 'provider_account_error', 'provider_access_denied', 'insufficient_provider_credits',
    'rate_limited', 'provider_quota_or_rate_limit', 'invalid_request',
  ].includes(normalized.errorClass);
}

/** MiniMax official (primary) → Bailian: the client's definite rejections, except content review. */
export function shouldFallbackFromMinimaxDirectToBailian(params: {
  acceptedProviderJobId: string | null | undefined;
  definiteRejection: boolean;
  userMessage?: unknown;
}): boolean {
  if (params.acceptedProviderJobId || !params.definiteRejection) return false;
  return params.userMessage !== MINIMAX_MESSAGES.inputSensitive && params.userMessage !== MINIMAX_MESSAGES.outputSensitive;
}
