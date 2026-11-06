/**
 * MiniMax official video API (V2). Only the MiniMax-H3 family is served there; Hailuo 02 stays on LLM Hub.
 * The class mirrors LlmhubVideoClient's create/status/content shapes so submission and polling need no changes.
 */
const DEFAULT_BASE_URL = 'https://api.minimax.cn';

export const MINIMAX_OFFICIAL_MODELS = new Set(['MiniMax-H3']);

/** Official task IDs are numeric strings; LLM Hub IDs always carry a letter prefix. */
export function isMinimaxOfficialTaskId(id: string): boolean {
  return /^\d{6,}$/.test(id);
}

export function isMinimaxOfficialEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return ['1', 'true', 'yes', 'on'].includes((env.MINIMAX_OFFICIAL_ENABLED ?? '').trim().toLowerCase())
    && Boolean(env.MINIMAX_API_KEY?.trim());
}

export function shouldUseMinimaxOfficial(model: string, env: Record<string, string | undefined> = process.env): boolean {
  return MINIMAX_OFFICIAL_MODELS.has(model) && isMinimaxOfficialEnabled(env);
}

type TaskStatus = 'queued' | 'running' | 'completed' | 'failed';

function httpError(message: string, status: number): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

export class MinimaxOfficialVideoClient {
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey = process.env.MINIMAX_API_KEY,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly resolveImageUrl: (url: string) => Promise<string> = async (url) => url,
    baseUrl = process.env.MINIMAX_API_BASE,
  ) {
    this.baseUrl = (baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  private auth(): Record<string, string> {
    if (!this.apiKey?.trim()) throw new Error('MiniMax API key is missing.');
    return { Authorization: `Bearer ${this.apiKey.trim()}` };
  }

  async create(input: {
    model: string;
    prompt: string;
    seconds: number;
    resolution?: string | null;
    aspectRatio?: string | null;
    imageUrl?: string | null;
  }): Promise<{ id: string; raw: unknown }> {
    const content: Array<Record<string, unknown>> = [{ type: 'text', text: input.prompt }];
    if (input.imageUrl) {
      content.push({
        type: 'image_url',
        image_url: { url: await this.resolveImageUrl(input.imageUrl) },
        role: 'first_frame',
      });
    }
    const ratio = input.aspectRatio?.trim();
    const body: Record<string, unknown> = {
      model: input.model,
      content,
      resolution: (input.resolution ?? '768P').toUpperCase(),
      duration: input.seconds,
      // A first-frame render takes its ratio from the image; text-to-video needs an explicit one.
      ...(!input.imageUrl && ratio && ratio !== 'auto' && ratio !== 'adaptive' ? { ratio } : {}),
    };
    const response = await this.fetchFn(`${this.baseUrl}/v2/video_generation`, {
      method: 'POST',
      headers: { ...this.auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const raw = await response.json().catch(() => null);
    if (!response.ok) {
      // 4xx (bad request, 402 balance, 422 sensitive content, 429) means no task was created.
      throw httpError(`MiniMax video submission failed (${response.status}).`, response.status);
    }
    const id = record(raw)?.task_id;
    if (typeof id !== 'string' || !id.trim()) throw new Error('MiniMax video response has no task ID.');
    return { id, raw };
  }

  private async task(id: string): Promise<{ task: Record<string, unknown>; raw: unknown }> {
    const response = await this.fetchFn(`${this.baseUrl}/v2/query/video_generation/${encodeURIComponent(id)}`, {
      headers: this.auth(),
      signal: AbortSignal.timeout(30_000),
    });
    const raw = await response.json().catch(() => null);
    if (!response.ok) throw httpError(`MiniMax video status failed (${response.status}).`, response.status);
    const task = record(record(raw)?.task);
    if (!task) throw new Error('MiniMax video status has no task.');
    return { task, raw };
  }

  async status(id: string): Promise<{ status: TaskStatus; progress: number; raw: unknown }> {
    const { task, raw } = await this.task(id);
    const status = typeof task.status === 'string' ? task.status.toLowerCase() : '';
    switch (status) {
      case 'queued': return { status: 'queued', progress: 0, raw };
      case 'running': return { status: 'running', progress: 0, raw };
      case 'succeeded': return { status: 'completed', progress: 100, raw };
      case 'failed':
      case 'cancelled': return { status: 'failed', progress: 0, raw };
      default: throw new Error('MiniMax video status is unknown.');
    }
  }

  async content(id: string): Promise<Response> {
    const { task } = await this.task(id);
    const url = record(task.content)?.url;
    if (task.status !== 'succeeded' || typeof url !== 'string') throw new Error('MiniMax video content is unavailable.');
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new Error('MiniMax video content URL is invalid.'); }
    // The URL is time limited and signed; accept only HTTPS on a named host, never an IP literal.
    if (parsed.protocol !== 'https:' || /^[\d.]+$|^\[/.test(parsed.hostname)) {
      throw new Error('MiniMax video content URL is not allowed.');
    }
    const response = await this.fetchFn(url, { signal: AbortSignal.timeout(300_000) });
    if (!response.ok || !response.headers.get('content-type')?.toLowerCase().includes('video/mp4')) {
      throw new Error(`MiniMax video content is unavailable (${response.status}).`);
    }
    return response;
  }
}
