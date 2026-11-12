import type { NormalizedProviderError } from '../types';

export class KlingDirectError extends Error {
  status: number | null;
  code: string | null;
  providerMessage: string | null;
  body: unknown;

  constructor(
    message: string,
    options: {
      status?: number | null;
      code?: string | null;
      providerMessage?: string | null;
      body?: unknown;
      cause?: unknown;
    } = {}
  ) {
    super(message);
    this.name = 'KlingDirectError';
    this.status = options.status ?? null;
    this.code = options.code ?? null;
    this.providerMessage = options.providerMessage ?? null;
    this.body = options.body ?? null;
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

function errorCode(error: unknown): string | null {
  if (error instanceof KlingDirectError) return error.code ?? bodyErrorCode(error.body);
  const candidate = (error as { code?: unknown } | null | undefined)?.code;
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(Math.trunc(candidate));
  return bodyErrorCode((error as { body?: unknown } | null | undefined)?.body);
}

function errorStatus(error: unknown): number | null {
  if (error instanceof KlingDirectError) return error.status;
  const candidate = (error as { status?: unknown } | null | undefined)?.status;
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null;
}

function errorMessage(error: unknown): string {
  if (error instanceof KlingDirectError && error.providerMessage) return error.providerMessage;
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'Kling direct request failed.';
}

function bodyErrorCode(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const candidate = (body as { code?: unknown }).code;
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(Math.trunc(candidate));
  return null;
}

function isNetworkOrTimeout(error: unknown, code: string | null, message: string): boolean {
  if ((error as { name?: string } | null | undefined)?.name === 'AbortError') return true;
  const normalized = `${code ?? ''} ${message}`.toLowerCase();
  return (
    normalized.includes('timeout') ||
    normalized.includes('network') ||
    normalized.includes('fetch failed') ||
    normalized.includes('econnreset') ||
    normalized.includes('enotfound') ||
    normalized.includes('eai_again') ||
    normalized.includes('und_err_connect_timeout')
  );
}

export function classifyKlingDirectError(error: unknown): NormalizedProviderError {
  const status = errorStatus(error);
  const code = errorCode(error);
  const message = errorMessage(error);
  const serviceCode = code ? Number.parseInt(code, 10) : null;
  let errorClass = 'provider_error';
  let fallbackEligible = false;

  if (isNetworkOrTimeout(error, code, message)) {
    errorClass = 'network_or_timeout';
    fallbackEligible = true;
  } else if (code === 'KLING_V2_REQUEST_INVALID') {
    errorClass = 'invalid_request';
  } else if (code === 'KLING_TASK_ID_MISSING' || code === 'KLING_INVALID_RESPONSE') {
    errorClass = 'invalid_provider_response';
    fallbackEligible = true;
  } else if (status === 401 || (serviceCode !== null && serviceCode >= 1000 && serviceCode <= 1004)) {
    errorClass = 'auth_error';
  } else if (serviceCode === 1100) {
    // HTTP 429 "account abnormal": an account configuration problem, never a transient limit.
    errorClass = 'provider_account_error';
  } else if (serviceCode === 1304) {
    // HTTP 429 IP whitelist policy: retrying from the same egress cannot succeed.
    errorClass = 'provider_access_denied';
  } else if (serviceCode === 1101 || serviceCode === 1102) {
    errorClass = 'insufficient_provider_credits';
  } else if (serviceCode === 1103) {
    errorClass = 'provider_access_denied';
  } else if (serviceCode !== null && serviceCode >= 1200 && serviceCode <= 1203) {
    errorClass = 'invalid_request';
  } else if (serviceCode === 1300 || serviceCode === 1301) {
    errorClass = 'moderation';
  } else if (status === 429 && (code === null || serviceCode === 1302 || serviceCode === 1303)) {
    errorClass = 'rate_limited';
    fallbackEligible = true;
  } else if ((serviceCode !== null && serviceCode >= 5000 && serviceCode <= 5002) || (status !== null && status >= 500)) {
    errorClass = 'provider_unavailable';
    fallbackEligible = true;
  } else if (status === 429) {
    errorClass = 'provider_quota_or_rate_limit';
  }

  return {
    provider: 'kling_direct',
    message,
    status,
    code,
    errorClass,
    fallbackEligible,
    raw: error instanceof KlingDirectError ? error.body ?? error : error,
  };
}

/**
 * 1302 (request rate) and 1303 (parallel tasks over the resource-pack limit) are definite rejections:
 * no task was created. The docs recommend exponential backoff starting at 1 s.
 */
export function isKlingDirectBusyRejection(error: unknown): boolean {
  const code = errorCode(error);
  return code === '1302' || code === '1303';
}

/** Rejections where the provider certainly created no task, so a refund is safe. */
export function isKlingDirectDefiniteRejection(error: unknown): boolean {
  const normalized = classifyKlingDirectError(error);
  if (normalized.code === 'KLING_V2_REQUEST_INVALID' || normalized.code === 'KLING_API_KEY_REQUIRED'
    || normalized.code === 'KLING_ELEMENT_REGISTRATION_DISABLED') return true;
  const serviceCode = normalized.code && /^\d+$/.test(normalized.code) ? Number(normalized.code) : null;
  // Every documented 1xxx business code is a rejection of the request itself; 5xxx and transport are ambiguous.
  return serviceCode !== null && serviceCode >= 1000 && serviceCode < 2000;
}

export function shouldFallbackFromKlingDirectSubmit(params: {
  acceptedProviderJobId: string | null | undefined;
  error: unknown;
  fallbackToFalEnabled: boolean;
  fallbackOnCreditsDepletedEnabled?: boolean;
  /** V4 preparation must recover ambiguous submissions instead of creating a second paid job. */
  requireDefiniteRejection?: boolean;
}): boolean {
  if (!params.fallbackToFalEnabled) return false;
  if (params.acceptedProviderJobId) return false;
  const normalized = classifyKlingDirectError(params.error);
  if (params.requireDefiniteRejection &&
    normalized.errorClass !== 'rate_limited' && normalized.errorClass !== 'insufficient_provider_credits') return false;
  if (normalized.fallbackEligible) return true;
  return (
    params.fallbackOnCreditsDepletedEnabled === true &&
    normalized.errorClass === 'insufficient_provider_credits' &&
    normalized.code === '1102'
  );
}
