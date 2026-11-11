import type { NormalizedVideoProviderTask, NormalizedVideoProviderUsage } from '../types';
import { computeKlingDirectProviderCostUsd, computeKlingDirectV2ProviderCostUsd } from './cost';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function firstString(value: unknown, keys: string[]): string | null {
  if (!isRecord(value)) return null;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

function firstRecord(value: unknown, keys: string[]): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  for (const key of keys) {
    const candidate = value[key];
    if (isRecord(candidate)) return candidate;
  }
  return null;
}

function firstNumber(value: unknown, keys: string[]): number | null {
  if (!isRecord(value)) return null;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === 'string' && candidate.trim()) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function extractVideoUrl(value: unknown): string | null {
  const result = firstRecord(value, ['task_result', 'result', 'data']);
  const videos = isRecord(result) && Array.isArray(result.videos) ? result.videos : null;
  const firstVideo = videos?.find(isRecord) ?? null;
  return firstString(firstVideo, ['url', 'video_url', 'videoUrl']) ?? firstString(result, ['url', 'video_url', 'videoUrl']);
}

function normalizeStatus(rawStatus: string | null): NormalizedVideoProviderTask['status'] {
  const normalized = rawStatus?.toLowerCase() ?? '';
  if (normalized === 'succeed' || normalized === 'succeeded' || normalized === 'success') return 'completed';
  if (normalized === 'failed' || normalized === 'fail' || normalized === 'error') return 'failed';
  if (normalized === 'processing' || normalized === 'running') return 'running';
  return 'queued';
}

function extractUsage(): NormalizedVideoProviderUsage | null {
  return null;
}

export function normalizeKlingDirectTask(raw: unknown, fallbackTaskId?: string | null): NormalizedVideoProviderTask {
  const data = firstRecord(raw, ['data']) ?? raw;
  const providerJobId = firstString(data, ['task_id', 'taskId', 'id']) ?? fallbackTaskId ?? '';
  const rawStatus = firstString(data, ['task_status', 'taskStatus', 'status'])?.toLowerCase() ?? null;
  const providerCostUnits = firstNumber(data, ['final_unit_deduction', 'finalUnitDeduction']);

  return {
    providerJobId,
    status: normalizeStatus(rawStatus),
    rawStatus,
    videoUrl: extractVideoUrl(data) ?? extractVideoUrl(raw),
    message:
      firstString(data, ['task_status_msg', 'taskStatusMsg', 'message', 'msg']) ??
      firstString(raw, ['message', 'msg']),
    usage: extractUsage(),
    providerCostUnits,
    providerCostUsd: computeKlingDirectProviderCostUsd(providerCostUnits),
    raw,
  };
}

export type KlingDirectV2Usage = {
  inputDurationSec: number | null;
  outputDurationSec: number | null;
  /** Credits (CNY at list price) from `billing[]`; null when absent or not expressible in credits. */
  billedCredits: number | null;
};

export function pickKlingDirectV2Task(raw: unknown, expectedId?: string | null, by: 'id' | 'external_id' = 'id'): Record<string, unknown> | null {
  const data = isRecord(raw) ? raw.data : null;
  const candidates = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.result)
      ? data.result
      : isRecord(data)
        ? [data]
        : [];
  const tasks = candidates.filter(isRecord);
  if (!expectedId) return tasks[0] ?? null;
  return tasks.find((task) => firstString(task, [by]) === expectedId) ?? null;
}

export function extractKlingDirectV2Usage(task: unknown): KlingDirectV2Usage {
  const usage = firstRecord(task, ['usage']);
  const billing = isRecord(task) && Array.isArray(task.billing) ? task.billing.filter(isRecord) : [];
  let billedCredits: number | null = billing.length ? 0 : null;
  for (const entry of billing) {
    const amount = firstNumber(entry, ['amount']);
    const chargeType = firstString(entry, ['charge_type'])?.toLowerCase();
    const currency = firstString(entry, ['currency'])?.toUpperCase();
    if (amount === null || (chargeType === 'cash' && currency !== 'CNY') || (chargeType !== 'cash' && chargeType !== 'unit')) {
      billedCredits = null;
      break;
    }
    billedCredits = Number(((billedCredits ?? 0) + amount).toFixed(6));
  }
  return {
    inputDurationSec: firstNumber(usage, ['input_duration']),
    outputDurationSec: firstNumber(usage, ['output_duration']),
    billedCredits,
  };
}

/** New-design (`/tasks`, `outputs[]`) task normalization; `null` when the expected task is absent. */
export function normalizeKlingDirectV2Task(
  raw: unknown,
  expected?: { id?: string | null; externalId?: string | null }
): NormalizedVideoProviderTask | null {
  const task = expected?.externalId
    ? pickKlingDirectV2Task(raw, expected.externalId, 'external_id')
    : pickKlingDirectV2Task(raw, expected?.id ?? null, 'id');
  if (!task) return null;
  const rawStatus = firstString(task, ['status'])?.toLowerCase() ?? null;
  const outputs = Array.isArray(task.outputs) ? task.outputs.filter(isRecord) : [];
  const video = outputs.find((output) => firstString(output, ['type'])?.toLowerCase() === 'video' && firstString(output, ['url']));
  const usage = extractKlingDirectV2Usage(task);
  return {
    providerJobId: firstString(task, ['id']) ?? expected?.id ?? '',
    status: normalizeStatus(rawStatus),
    rawStatus,
    videoUrl: firstString(video, ['url']),
    message: firstString(task, ['message']) ?? null,
    usage: extractUsage(),
    providerCostUnits: usage.billedCredits,
    providerCostUsd: computeKlingDirectV2ProviderCostUsd(usage.billedCredits),
    raw,
  };
}

export async function parseKlingJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    const parsed = JSON.parse(text);
    return isRecord(parsed) ? parsed : { value: parsed };
  } catch {
    return { message: text };
  }
}
