import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { gzipSync } from 'zlib';
import { isDatabaseConfigured } from '@/lib/db';
import { buildDsarPayload } from '@/server/dsar';
import { createSignedDownloadUrl, isStorageConfigured, uploadFileBuffer } from '@/server/storage';
import { getRouteAuthContext } from '@/lib/supabase-ssr';
import { exportRetryAfterSeconds, markExportGenerated, recordPrivacyEvent } from '@/server/account-privacy';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'Database unavailable' }, { status: 503 });
  }
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { ok: false, code: 'storage_unavailable', error: '数据导出服务暂未开通，请联系客服获取您的数据副本。' },
      { status: 503 },
    );
  }

  // Also available during an account-deletion cooling-off: the owner may still take their data.
  const { userId } = await getRouteAuthContext(req, { allowScheduledDeletion: true });
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const retryAfter = await exportRetryAfterSeconds(userId);
  if (retryAfter > 0) {
    return NextResponse.json(
      { ok: false, code: 'rate_limited', retryAfterSeconds: retryAfter, error: '导出过于频繁，请稍后再试。' },
      { status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'private, no-store' } },
    );
  }
  markExportGenerated(userId);

  try {
    const payload = await buildDsarPayload(userId);
    const json = JSON.stringify(payload, null, 2);
    const compressed = gzipSync(Buffer.from(json, 'utf8'));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `keyvo-data-export-${timestamp}.json.gz`;

    const upload = await uploadFileBuffer({
      data: compressed,
      mime: 'application/gzip',
      userId,
      fileName,
      prefix: 'exports',
      cacheControl: 'private, max-age=0, must-revalidate',
      acl: 'private',
    });

    const expiresInSeconds = 60 * 60 * 48; // 48 hours
    const signedUrl = await createSignedDownloadUrl(upload.key, { expiresInSeconds });

    await recordPrivacyEvent(userId, 'export_generated', { bytes: compressed.length });
    console.info('[dsar] export generated', { userId, key: upload.key });

    return NextResponse.json({
      ok: true,
      url: signedUrl,
      fileName,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    });
  } catch (error) {
    console.error('[dsar] export failed', error);
    return NextResponse.json(
      { ok: false, code: 'export_failed', error: '导出失败，请稍后再试。' },
      { status: 500 }
    );
  }
}
