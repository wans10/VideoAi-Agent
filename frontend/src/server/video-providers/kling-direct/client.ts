import { createHmac } from 'node:crypto';
import { ENV } from '@/lib/env';
import { KlingDirectError } from './errors';
import {
  normalizeKlingDirectElementTask,
  type KlingDirectElementCreatePayload,
  type NormalizedKlingDirectElementTask,
} from './elements';
import { firstString, normalizeKlingDirectTask, normalizeKlingDirectV2Task, parseKlingJsonResponse } from './response';
import type { KlingDirectPayload } from './payload';
import type { KlingDirectV2Payload } from './payload-v2';
import { KLING_DIRECT_V2_TASKS_PATH } from './model-map';
import type { NormalizedVideoProviderTask } from '../types';
import { hasKlingCredentials } from './credentials';

const DEFAULT_TIMEOUT_MS = 45_000;
/** Mainland (China) endpoint per klingai.com/document-api/api/get-started/authentication.md. */
export const KLING_DEFAULT_API_BASE_URL = 'https://api-beijing.klingai.com';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function createKlingJwt(params: {
  accessKey: string;
  secretKey: string;
  nowSeconds?: number;
}): string {
  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: 'HS256', typ: 'JWT' });
  const payload = base64UrlJson({
    iss: params.accessKey,
    exp: now + 1800,
    nbf: now - 5,
  });
  const signature = createHmac('sha256', params.secretKey)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function getKlingDirectConfig() {
  return {
    apiKey: ENV.KLING_API_KEY,
    accessKey: ENV.KLING_ACCESS_KEY,
    secretKey: ENV.KLING_SECRET_KEY,
    baseUrl: trimTrailingSlash(ENV.KLING_API_BASE_URL ?? KLING_DEFAULT_API_BASE_URL),
  };
}

function timeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs).unref?.();
  return controller.signal;
}

export class KlingDirectClient {
  private readonly apiKey: string | null;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(params: {
    /** Preferred: sent as the Bearer token as is. */
    apiKey?: string | null;
    accessKey?: string;
    secretKey?: string;
    baseUrl: string;
    timeoutMs?: number;
  }) {
    this.apiKey = params.apiKey?.trim() || null;
    this.accessKey = params.accessKey ?? '';
    this.secretKey = params.secretKey ?? '';
    if (!hasKlingCredentials({ KLING_API_KEY: this.apiKey ?? undefined, KLING_ACCESS_KEY: this.accessKey, KLING_SECRET_KEY: this.secretKey })) {
      throw new KlingDirectError('Kling direct API keys are not configured.', { code: 'KLING_CREDENTIALS_MISSING' });
    }
    this.baseUrl = trimTrailingSlash(params.baseUrl);
    this.timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private authHeader(): string {
    if (this.apiKey) return `Bearer ${this.apiKey}`;
    return `Bearer ${createKlingJwt({ accessKey: this.accessKey, secretKey: this.secretKey })}`;
  }

  private assertApiKeyForV2(path: string) {
    if (!path.startsWith('/v1/') && !this.apiKey) {
      // The new design ("model version in the path") accepts only an API Key, never an AK/SK JWT.
      throw new KlingDirectError('Kling new-design endpoints require KLING_API_KEY.', { code: 'KLING_API_KEY_REQUIRED' });
    }
  }

  async createTask(payload: KlingDirectPayload | KlingDirectV2Payload): Promise<NormalizedVideoProviderTask> {
    this.assertApiKeyForV2(payload.createPath);
    const response = await fetch(`${this.baseUrl}${payload.createPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader(),
      },
      body: JSON.stringify(payload.body),
      cache: 'no-store',
      signal: timeoutSignal(this.timeoutMs),
    });
    const parsed = await parseKlingJsonResponse(response);
    const serviceCode = firstString(parsed, ['code']) ?? (typeof parsed.code === 'number' ? String(parsed.code) : null);
    if (!response.ok || (serviceCode && serviceCode !== '0')) {
      throw new KlingDirectError(firstString(parsed, ['message', 'msg']) ?? 'Kling direct submit failed.', {
        status: response.status,
        code: serviceCode,
        providerMessage: firstString(parsed, ['message', 'msg']),
        body: parsed,
      });
    }
    const task = normalizeKlingDirectTask(parsed);
    if (!task.providerJobId) {
      throw new KlingDirectError('Kling direct response did not include a task id.', {
        status: response.status,
        code: 'KLING_TASK_ID_MISSING',
        body: parsed,
      });
    }
    return task;
  }

  async createElement(payload: KlingDirectElementCreatePayload): Promise<NormalizedKlingDirectElementTask> {
    const response = await fetch(`${this.baseUrl}/v1/general/advanced-custom-elements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader(),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: timeoutSignal(this.timeoutMs),
    });
    const parsed = await parseKlingJsonResponse(response);
    const serviceCode = firstString(parsed, ['code']);
    if (!response.ok || (serviceCode && serviceCode !== '0')) {
      throw new KlingDirectError(firstString(parsed, ['message', 'msg']) ?? 'Kling element creation failed.', {
        status: response.status,
        code: serviceCode,
        providerMessage: firstString(parsed, ['message', 'msg']),
        body: parsed,
      });
    }
    const task = normalizeKlingDirectElementTask(parsed);
    if (!task.providerTaskId) {
      throw new KlingDirectError('Kling element response did not include a task id.', {
        status: response.status,
        code: 'KLING_TASK_ID_MISSING',
        body: parsed,
      });
    }
    return task;
  }

  async retrieveElement(params: { providerTaskId: string }): Promise<NormalizedKlingDirectElementTask> {
    const response = await fetch(
      `${this.baseUrl}/v1/general/advanced-custom-elements/${encodeURIComponent(params.providerTaskId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: this.authHeader(),
        },
        cache: 'no-store',
        signal: timeoutSignal(this.timeoutMs),
      }
    );
    const parsed = await parseKlingJsonResponse(response);
    const serviceCode = firstString(parsed, ['code']);
    if (!response.ok || (serviceCode && serviceCode !== '0')) {
      throw new KlingDirectError(firstString(parsed, ['message', 'msg']) ?? 'Kling element polling failed.', {
        status: response.status,
        code: serviceCode,
        providerMessage: firstString(parsed, ['message', 'msg']),
        body: parsed,
      });
    }
    const task = normalizeKlingDirectElementTask(parsed, params.providerTaskId);
    return task.providerTaskId ? task : { ...task, providerTaskId: params.providerTaskId };
  }

  /** New-design unified query, `GET /tasks?task_ids=` or `?external_task_ids=` (one of the two only). */
  private async queryV2Tasks(params: { taskId?: string; externalTaskId?: string }): Promise<Record<string, unknown>> {
    this.assertApiKeyForV2(KLING_DIRECT_V2_TASKS_PATH);
    const query = params.externalTaskId
      ? `external_task_ids=${encodeURIComponent(params.externalTaskId)}`
      : `task_ids=${encodeURIComponent(params.taskId ?? '')}`;
    const response = await fetch(`${this.baseUrl}${KLING_DIRECT_V2_TASKS_PATH}?${query}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader(),
      },
      cache: 'no-store',
      signal: timeoutSignal(this.timeoutMs),
    });
    const parsed = await parseKlingJsonResponse(response);
    const serviceCode = firstString(parsed, ['code']) ?? (typeof parsed.code === 'number' ? String(parsed.code) : null);
    if (!response.ok || (serviceCode && serviceCode !== '0')) {
      throw new KlingDirectError(firstString(parsed, ['message', 'msg']) ?? 'Kling direct poll failed.', {
        status: response.status,
        code: serviceCode,
        providerMessage: firstString(parsed, ['message', 'msg']),
        body: parsed,
      });
    }
    return parsed;
  }

  /**
   * Recover an ambiguous submission by its `options.external_task_id` (our job id).
   * Returns null only when the provider answered and holds no such task.
   */
  async findTaskByExternalId(externalTaskId: string): Promise<NormalizedVideoProviderTask | null> {
    const parsed = await this.queryV2Tasks({ externalTaskId });
    const task = normalizeKlingDirectV2Task(parsed, { externalId: externalTaskId });
    return task?.providerJobId ? task : null;
  }

  async retrieveTask(params: {
    pollPathPrefix: string;
    providerJobId: string;
  }): Promise<NormalizedVideoProviderTask> {
    if (params.pollPathPrefix === KLING_DIRECT_V2_TASKS_PATH) {
      const parsed = await this.queryV2Tasks({ taskId: params.providerJobId });
      const task = normalizeKlingDirectV2Task(parsed, { id: params.providerJobId });
      if (!task) {
        throw new KlingDirectError('Kling direct poll response did not include the task.', {
          status: 200,
          code: 'KLING_INVALID_RESPONSE',
          body: parsed,
        });
      }
      return task.providerJobId ? task : { ...task, providerJobId: params.providerJobId };
    }
    const response = await fetch(`${this.baseUrl}${params.pollPathPrefix}/${encodeURIComponent(params.providerJobId)}`, {
      method: 'GET',
      headers: {
        Authorization: this.authHeader(),
      },
      cache: 'no-store',
      signal: timeoutSignal(this.timeoutMs),
    });
    const parsed = await parseKlingJsonResponse(response);
    const serviceCode = firstString(parsed, ['code']);
    if (!response.ok || (serviceCode && serviceCode !== '0')) {
      throw new KlingDirectError(firstString(parsed, ['message', 'msg']) ?? 'Kling direct poll failed.', {
        status: response.status,
        code: serviceCode,
        providerMessage: firstString(parsed, ['message', 'msg']),
        body: parsed,
      });
    }
    const task = normalizeKlingDirectTask(parsed, params.providerJobId);
    return task.providerJobId ? task : { ...task, providerJobId: params.providerJobId };
  }
}

export function getKlingDirectClient(): KlingDirectClient {
  return new KlingDirectClient(getKlingDirectConfig());
}
