import { referenceFile } from '@/server/images/llmhub-flare-generation';
import { createSignedDownloadUrl, extractStorageKeyFromUrl, isAllowedAssetHost, isStorageConfigured } from '@/server/storage';

const BASE_URL = 'https://api.llmhub.com.cn/v1/videos';

function key(apiKey: string | undefined): string {
  if (!apiKey?.trim()) throw new Error('LLM Hub inference key is missing.');
  return apiKey.trim();
}

function taskId(payload: unknown): string {
  const record = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null;
  if (typeof record?.id !== 'string' || !record.id.trim()) throw new Error('LLM Hub video response has no task ID.');
  return record.id;
}

function usesUrlReference(model: string): boolean {
  return model.startsWith('doubao-seedance-') || model.startsWith('wan3.0-video');
}

async function referenceUrl(url: string): Promise<string> {
  if (!isAllowedAssetHost(url)) throw new Error('LLM Hub reference image host is not allowed.');
  const storageKey = extractStorageKeyFromUrl(url);
  return storageKey && isStorageConfigured()
    ? createSignedDownloadUrl(storageKey, { expiresInSeconds: 60 * 60 })
    : url;
}

export class LlmhubVideoClient {
  constructor(private readonly apiKey = process.env.LLMHUB_API_KEY, private readonly fetchFn: typeof fetch = fetch) {}

  async create(input: {
    model: string;
    prompt: string;
    seconds: number;
    size?: string | null;
    resolution?: string | null;
    aspectRatio?: string | null;
    audioEnabled?: boolean;
    imageUrl?: string | null;
    jobId: string;
  }): Promise<{ id: string; raw: unknown }> {
    // The three Veo 3.1 channels accept JSON on the OpenAI video path.
    // Their multipart adapter rejects these models before creating a task.
    if (['veo-3.1-generate-001', 'veo-3.1-fast-generate-001', 'veo-3.1-lite-generate-001'].includes(input.model)
      && !input.imageUrl) {
      const response = await this.fetchFn(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key(this.apiKey)}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': input.jobId,
        },
        body: JSON.stringify({
          model: input.model,
          prompt: input.prompt,
          seconds: input.seconds,
          ...(input.resolution ? { resolution: input.resolution } : {}),
        }),
        signal: AbortSignal.timeout(60_000),
      });
      const raw = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(`LLM Hub video submission failed (${response.status}).`) as Error & { status: number };
        error.status = response.status;
        throw error;
      }
      return { id: taskId(raw), raw };
    }
    const form = new FormData();
    form.set('model', input.model);
    form.set('prompt', input.prompt);
    form.set('seconds', String(input.seconds));
    if (input.size) form.set('size', input.size);
    if (usesUrlReference(input.model)) {
      const isSeedance = input.model.startsWith('doubao-seedance-');
      const imageUrl = input.imageUrl ? await referenceUrl(input.imageUrl) : null;
      const content: Array<Record<string, unknown>> = [{ type: 'text', text: input.prompt }];
      if (imageUrl) {
        content.push({ type: 'image_url', image_url: { url: imageUrl }, role: 'first_frame' });
        form.set('input_reference', imageUrl);
      }
      const metadata = {
        ...(imageUrl ? { content } : {}),
        ...(isSeedance && input.resolution ? { resolution: input.resolution } : {}),
        ...(isSeedance && !imageUrl && input.aspectRatio && !['auto', 'adaptive'].includes(input.aspectRatio)
          ? { ratio: input.aspectRatio } : {}),
        ...(isSeedance && input.audioEnabled === true ? { generate_audio: true } : {}),
      };
      if (Object.keys(metadata).length) form.set('metadata', JSON.stringify(metadata));
    } else if (input.imageUrl) {
      form.set('input_reference', await referenceFile(input.imageUrl, 0, this.fetchFn));
    }
    const response = await this.fetchFn(BASE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key(this.apiKey)}`, 'Idempotency-Key': input.jobId },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
    const raw = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(`LLM Hub video submission failed (${response.status}).`) as Error & { status: number };
      error.status = response.status;
      throw error;
    }
    return { id: taskId(raw), raw };
  }

  async status(id: string): Promise<{ status: 'queued' | 'running' | 'completed' | 'failed'; progress: number; raw: unknown }> {
    const response = await this.fetchFn(`${BASE_URL}/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key(this.apiKey)}` },
      signal: AbortSignal.timeout(30_000),
    });
    const raw = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`LLM Hub video status failed (${response.status}).`);
    const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null;
    const status = typeof value?.status === 'string' ? value.status.toLowerCase() : '';
    if (!['queued', 'in_progress', 'running', 'completed', 'failed'].includes(status)) {
      throw new Error('LLM Hub video status is unknown.');
    }
    return {
      status: status === 'in_progress' ? 'running' : status as 'queued' | 'running' | 'completed' | 'failed',
      progress: typeof value?.progress === 'number' && Number.isFinite(value.progress) ? Math.max(0, Math.min(100, value.progress)) : 0,
      raw,
    };
  }

  async content(id: string): Promise<Response> {
    const response = await this.fetchFn(`${BASE_URL}/${encodeURIComponent(id)}/content`, {
      headers: { Authorization: `Bearer ${key(this.apiKey)}` },
      signal: AbortSignal.timeout(300_000),
    });
    if (!response.ok || !response.headers.get('content-type')?.toLowerCase().includes('video/mp4')) {
      throw new Error(`LLM Hub video content is unavailable (${response.status}).`);
    }
    return response;
  }
}
