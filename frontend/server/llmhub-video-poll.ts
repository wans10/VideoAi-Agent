import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { claimGenerationPoll } from '@/server/generation-poll-state';
import { LlmhubVideoClient } from '@/server/video-providers/llmhub/client';
import { LLMHUB_VIDEO_PROVIDER } from '@/server/video-providers/llmhub/model-map';
import { copyProviderVideoOriginal } from '@/server/provider-video-original-copy';
import { ensureJobThumbnail, isPlaceholderThumbnail } from '@/server/thumbnails';
import { detectHasAudioStream, detectVideoMetadata } from '@/server/media/detect-has-audio';
import { formatAspectRatioLabel } from '@/server/fal-webhook-media';
import { upsertLegacyJobOutputs } from '@/server/media-library';
import { generateAndPersistJobPreviewVideo } from '@/server/video-preview';
import { generateAndPersistJobKeyframes } from '@/server/video-keyframes';
import { buildUserFacingRefundDescription } from '@/server/user-facing-failure-messages';
import { matchesLlmhubVideoGeometry } from '@/server/video-providers/llmhub/video-size';
import {
  findProviderAttemptForJob,
  markProviderAttemptFailed,
  markProviderAttemptFinished,
} from '@/server/video-providers/provider-attempts';

type QueryFn = <T = unknown>(sql: string, params?: unknown[]) => Promise<T[]>;
type PendingJob = {
  job_id: string;
  user_id: string | null;
  engine_id: string;
  engine_label: string;
  provider_job_id: string;
  status: string;
  duration_sec: number;
  thumb_url: string | null;
  preview_video_url: string | null;
  keyframe_urls: unknown;
  aspect_ratio: string | null;
  has_audio: boolean | null;
  final_price_cents: number | null;
  pricing_snapshot: unknown;
  settings_snapshot: unknown;
  currency: string | null;
  payment_status: string | null;
  created_at: string;
};
const ACTIVE = ['pending', 'queued', 'running', 'processing', 'in_progress'];
const MAX_AGE_MS = 185 * 60_000;

function requestedSetting(snapshot: unknown, key: string): string | null {
  const record = snapshot && typeof snapshot === 'object' ? snapshot as Record<string, unknown> : null;
  const core = record?.core && typeof record.core === 'object' ? record.core as Record<string, unknown> : null;
  const value = core?.[key] ?? record?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function requestedAudio(snapshot: unknown): boolean | null {
  const record = snapshot && typeof snapshot === 'object' ? snapshot as Record<string, unknown> : null;
  const core = record?.core && typeof record.core === 'object' ? record.core as Record<string, unknown> : null;
  return typeof core?.audio === 'boolean' ? core.audio : null;
}

function sourceDeterminesAspectRatio(snapshot: unknown, engineId: string): boolean {
  const record = snapshot && typeof snapshot === 'object' ? snapshot as Record<string, unknown> : null;
  return record?.inputMode === 'i2v' && engineId.startsWith('seedance-');
}

async function refundWallet(job: PendingJob, reason: string, queryFn: QueryFn): Promise<void> {
  if (job.payment_status !== 'paid_wallet' || !job.user_id || !job.final_price_cents) return;
  await queryFn(
    `INSERT INTO app_receipts
      (user_id, type, amount_cents, currency, description, job_id, surface,
       billing_product_key, pricing_snapshot, application_fee_cents,
       vendor_account_id, stripe_payment_intent_id, stripe_charge_id,
       platform_revenue_cents, destination_acct)
      VALUES ($1,'refund',$2,$3,$4,$5,'video',NULL,$6::jsonb,NULL,NULL,NULL,NULL,NULL,NULL)
      ON CONFLICT DO NOTHING`,
    [job.user_id, job.final_price_cents, (job.currency ?? 'CNY').toUpperCase(),
      buildUserFacingRefundDescription({ engineLabel: job.engine_label, durationSec: job.duration_sec, reason }),
      job.job_id, JSON.stringify(job.pricing_snapshot ?? {})],
  );
  const receipt = await queryFn<{ id: string }>(
    `SELECT id FROM app_receipts WHERE job_id = $1 AND type = 'refund' LIMIT 1`, [job.job_id],
  );
  if (!receipt.length) throw new Error('LLM Hub wallet refund receipt was not persisted.');
  await queryFn(
    `UPDATE app_jobs SET payment_status = 'refunded_wallet', updated_at = NOW()
      WHERE job_id = $1 AND payment_status = 'paid_wallet'`, [job.job_id],
  );
}

async function fail(job: PendingJob, message: string, queryFn: QueryFn): Promise<boolean> {
  // Keep the job active until the refund is durable, so a transient database error
  // can be retried by the next poll instead of stranding a paid failed job.
  await refundWallet(job, message, queryFn);
  const rows = await queryFn<{ job_id: string }>(
    `UPDATE app_jobs SET status = 'failed', progress = 0, message = $2,
      provisional = FALSE, updated_at = NOW()
      WHERE job_id = $1 AND status = ANY($3::text[]) RETURNING job_id`,
    [job.job_id, message, ACTIVE],
  );
  if (!rows.length) return false;
  const attempt = await findProviderAttemptForJob({
    publicJobId: job.job_id, provider: LLMHUB_VIDEO_PROVIDER,
    providerJobId: job.provider_job_id, queryFn,
  });
  if (attempt) {
    await markProviderAttemptFailed({
      attemptId: attempt.id, errorCode: 'PROVIDER_TERMINAL_FAILURE',
      errorClass: 'provider_terminal_failure', fallbackEligible: false, queryFn,
    });
    await markProviderAttemptFinished({ attemptId: attempt.id, status: 'failed', queryFn });
  }
  return true;
}

export async function runLlmhubVideoPoll(options: {
  jobId?: string;
  deps?: {
    queryFn?: QueryFn;
    client?: Pick<LlmhubVideoClient, 'status' | 'content'>;
    copyFn?: typeof copyProviderVideoOriginal;
    claimFn?: typeof claimGenerationPoll;
    metadataFn?: typeof detectVideoMetadata;
    audioFn?: typeof detectHasAudioStream;
    thumbnailFn?: typeof ensureJobThumbnail;
    upsertOutputsFn?: typeof upsertLegacyJobOutputs;
    previewFn?: typeof generateAndPersistJobPreviewVideo;
    keyframesFn?: typeof generateAndPersistJobKeyframes;
  };
} = {}) {
  const queryFn = options.deps?.queryFn ?? query;
  if (!process.env.LLMHUB_API_KEY?.trim() && !options.deps?.client) {
    return NextResponse.json({ ok: true, enabled: false, checked: 0, updates: 0 });
  }
  const rows = await queryFn<PendingJob>(
    `SELECT job_id, user_id, engine_id, engine_label, provider_job_id, status, duration_sec,
       thumb_url, to_jsonb(app_jobs)->>'preview_video_url' AS preview_video_url,
       to_jsonb(app_jobs)->'keyframe_urls' AS keyframe_urls, aspect_ratio, has_audio,
       final_price_cents, pricing_snapshot, settings_snapshot, currency, payment_status, created_at
       FROM app_jobs WHERE provider = $1 AND provider_job_id IS NOT NULL
       AND status = ANY($2::text[]) AND ($3::text IS NULL OR job_id = $3)
       ORDER BY updated_at ASC LIMIT 10`,
    [LLMHUB_VIDEO_PROVIDER, ACTIVE, options.jobId ?? null],
  );
  const client = options.deps?.client ?? new LlmhubVideoClient();
  let updates = 0;
  for (const job of rows) {
    if (Date.now() - Date.parse(job.created_at) > MAX_AGE_MS) {
      await queryFn(
        `UPDATE app_jobs SET status = 'provider_polling_stalled',
          message = 'Provider task needs manual review.', provisional = FALSE, updated_at = NOW()
          WHERE job_id = $1 AND status = ANY($2::text[])`, [job.job_id, ACTIVE],
      );
      const attempt = await findProviderAttemptForJob({
        publicJobId: job.job_id, provider: LLMHUB_VIDEO_PROVIDER,
        providerJobId: job.provider_job_id, queryFn,
      });
      if (attempt) await markProviderAttemptFinished({
        attemptId: attempt.id, status: 'polling_stalled', queryFn,
      });
      updates += 1;
      continue;
    }
    const claim = await (options.deps?.claimFn ?? claimGenerationPoll)(job.job_id, queryFn, { leaseDurationMs: 600_000 });
    if (!claim) continue;
    try {
      const task = await client.status(job.provider_job_id);
      await claim.checked();
      if (task.status === 'failed') {
        if (await fail(job, 'The render failed before producing a usable output.', queryFn)) updates += 1;
        continue;
      }
      if (task.status !== 'completed') {
        await queryFn(
          `UPDATE app_jobs SET status = $2, progress = GREATEST(progress, $3),
            message = 'Render is in progress.', updated_at = NOW()
            WHERE job_id = $1 AND status = ANY($4::text[])`,
          [job.job_id, task.status, task.progress || 10, ACTIVE],
        );
        updates += 1;
        continue;
      }
      const source = await client.content(job.provider_job_id);
      const videoUrl = await (options.deps?.copyFn ?? copyProviderVideoOriginal)(source, {
        jobId: job.job_id, userId: job.user_id,
      });
      const dimensions = await (options.deps?.metadataFn ?? detectVideoMetadata)(videoUrl).catch(() => null);
      if (!dimensions) throw new Error('LLM Hub output geometry could not be verified.');
      const requestedResolution = requestedSetting(job.settings_snapshot, 'resolution');
      if (!requestedResolution) throw new Error('LLM Hub job has no recorded resolution to verify.');
      if (Math.abs(dimensions.durationSec - job.duration_sec) > Math.max(1, job.duration_sec * 0.1)) {
        if (await fail(job, 'The render did not match the selected duration.', queryFn)) updates += 1;
        continue;
      }
      if (!matchesLlmhubVideoGeometry({
        resolution: requestedResolution,
        aspectRatio: sourceDeterminesAspectRatio(job.settings_snapshot, job.engine_id)
          ? null : requestedSetting(job.settings_snapshot, 'aspectRatio') ?? job.aspect_ratio,
        width: dimensions.width, height: dimensions.height,
      })) {
        if (await fail(job, 'The render did not match the selected size or aspect ratio.', queryFn)) updates += 1;
        continue;
      }
      const actualAudio = await (options.deps?.audioFn ?? detectHasAudioStream)(videoUrl).catch(() => null);
      if (actualAudio === null) throw new Error('LLM Hub output audio could not be verified.');
      const selectedAudio = requestedAudio(job.settings_snapshot);
      if (selectedAudio !== null && actualAudio !== selectedAudio) {
        if (await fail(job, 'The render did not match the selected audio option.', queryFn)) updates += 1;
        continue;
      }
      const aspectRatio = dimensions ? formatAspectRatioLabel(dimensions.width, dimensions.height) : job.aspect_ratio;
      let thumb = job.thumb_url ?? '/assets/frames/thumb-16x9.svg';
      if (isPlaceholderThumbnail(thumb)) {
        thumb = await (options.deps?.thumbnailFn ?? ensureJobThumbnail)({
          jobId: job.job_id, userId: job.user_id ?? undefined, videoUrl,
          aspectRatio: aspectRatio ?? '16:9', existingThumbUrl: thumb,
        }) ?? thumb;
      }
      const completed = await queryFn<{ job_id: string }>(
        `UPDATE app_jobs SET status = 'completed', progress = 100, video_url = $2,
          thumb_url = $3, preview_frame = $3, aspect_ratio = COALESCE($4, aspect_ratio), has_audio = $6,
          message = NULL, provisional = FALSE, updated_at = NOW()
          WHERE job_id = $1 AND status = ANY($5::text[]) RETURNING job_id`,
        [job.job_id, videoUrl, thumb, aspectRatio, ACTIVE, actualAudio],
      );
      if (!completed.length) continue;
      const attempt = await findProviderAttemptForJob({
        publicJobId: job.job_id, provider: LLMHUB_VIDEO_PROVIDER,
        providerJobId: job.provider_job_id, queryFn,
      });
      await (options.deps?.upsertOutputsFn ?? upsertLegacyJobOutputs)({
        job_id: job.job_id, user_id: job.user_id, surface: 'video', video_url: videoUrl,
        audio_url: null, thumb_url: thumb, preview_frame: thumb,
        preview_video_url: job.preview_video_url,
        video_width: dimensions?.width ?? null, video_height: dimensions?.height ?? null,
        render_ids: null, duration_sec: job.duration_sec, status: 'completed',
      });
      await Promise.allSettled([
        (options.deps?.previewFn ?? generateAndPersistJobPreviewVideo)({
          jobId: job.job_id, userId: job.user_id, videoUrl,
          existingPreviewVideoUrl: job.preview_video_url,
        }),
        (options.deps?.keyframesFn ?? generateAndPersistJobKeyframes)({
          jobId: job.job_id, userId: job.user_id, videoUrl,
          durationSec: job.duration_sec, existingKeyframeUrls: job.keyframe_urls,
        }),
      ]);
      if (attempt) await markProviderAttemptFinished({
        attemptId: attempt.id, status: 'completed', responseSnapshot: task.raw, queryFn,
      });
      updates += 1;
    } catch (error) {
      console.warn('[llmhub-video-poll] task check failed', { jobId: job.job_id, error });
    } finally {
      await claim.release();
    }
  }
  return NextResponse.json({ ok: true, enabled: true, checked: rows.length, updates });
}
