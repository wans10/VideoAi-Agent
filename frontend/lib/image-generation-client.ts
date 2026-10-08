import { authFetch } from '@/lib/authFetch';
import { getJobStatus, type JobStatusResult } from '@/lib/api-job-status';
import { readLastKnownUserId } from '@/lib/last-known';
import { LIVE_PRICING_POLICY_REVISION, PRICING_POLICY_HEADER } from '@/lib/membership-policy';
import type { ImageGenerationRequest, ImageGenerationResponse } from '@/types/image-generation';

type Dependencies = {
  fetch: typeof authFetch;
  getStatus: typeof getJobStatus;
  sleep: () => Promise<void>;
  isCurrent: () => boolean;
};

function completedResponse(status: JobStatusResult, payload: ImageGenerationRequest): ImageGenerationResponse | null {
  const urls = status.renderIds?.filter(url => typeof url === 'string' && /^https?:\/\//i.test(url)) ?? [];
  if (status.status !== 'completed' || !urls.length) return null;
  return {
    ok: true, jobId: status.jobId, mode: payload.mode, engineId: payload.engineId,
    images: urls.map((url, index) => ({ url, thumbUrl: status.renderThumbUrls?.[index] ?? null })),
    thumbUrl: status.thumbUrl, aspectRatio: status.aspectRatio, resolution: payload.resolution,
    pricing: status.pricing, costCents: status.finalPriceCents, currency: status.currency,
    paymentStatus: status.paymentStatus,
  };
}

async function recoverImageResponse(payload: ImageGenerationRequest, deps: Dependencies): Promise<ImageGenerationResponse> {
  if (!payload.jobId) throw new Error('Image response could not be read. Check generation history before submitting again.');
  // Read the same account-owned job only; never repeat the paid generation POST.
  for (let attempt = 0; attempt < 24; attempt++) {
    if (!deps.isCurrent()) throw new Error('The account changed. Check this image in the original account’s history.');
    let status: JobStatusResult | null = null;
    try { status = await deps.getStatus(payload.jobId); } catch { /* A proxy timeout may precede job creation or completion. */ }
    if (!deps.isCurrent()) throw new Error('The account changed. Check this image in the original account’s history.');
    if (status?.jobId === payload.jobId) {
      const completed = completedResponse(status, payload);
      if (completed) return completed;
      if (status.status === 'failed') throw new Error(status.message ?? 'Image generation failed. Check generation history.');
    }
    if (attempt < 23) await deps.sleep();
  }
  throw new Error('The image request connection was interrupted. Its result could not yet be confirmed. Check generation history before submitting again.');
}

export async function submitImageGeneration(payload: ImageGenerationRequest, overrides: Partial<Dependencies> = {}): Promise<ImageGenerationResponse> {
  const principal = readLastKnownUserId();
  const deps: Dependencies = {
    fetch: authFetch, getStatus: getJobStatus,
    sleep: () => new Promise(resolve => setTimeout(resolve, 5_000)),
    isCurrent: () => readLastKnownUserId() === principal,
    ...overrides,
  };
  let response: Response;
  try {
    response = await deps.fetch('/api/images/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', [PRICING_POLICY_HEADER]: LIVE_PRICING_POLICY_REVISION },
      body: JSON.stringify(payload),
    });
  } catch {
    return recoverImageResponse(payload, deps);
  }
  const data = await response.json().catch(() => null) as ImageGenerationResponse | null;
  if (!data || typeof data !== 'object' || typeof data.ok !== 'boolean') {
    if (response.ok || [408, 502, 503, 504].includes(response.status)) return recoverImageResponse(payload, deps);
    throw new Error(`Image request failed (${response.status}). Check generation history before submitting again.`);
  }
  if (!response.ok || !data.ok) {
    const error = new Error(data.error?.message ?? `Image generation failed (${response.status})`);
    Object.assign(error, { code: data.error?.code ?? 'image_generation_failed', detail: data.error?.detail, status: response.status });
    throw error;
  }
  if (!Array.isArray(data.images) || !data.images.length || data.images.some(image => !image || typeof image.url !== 'string')) {
    return recoverImageResponse(payload, deps);
  }
  return data;
}
