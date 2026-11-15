import { NextResponse } from 'next/server';
import { SITE_ORIGIN } from '@/lib/siteOrigin';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
// The host is the site's own origin (NEXT_PUBLIC_SITE_URL / SITE_URL, default https://app.keyvo.cn); the key file is served at its root.
const HOST = new URL(SITE_ORIGIN).host;

type IndexNowRequest = {
  url?: string;
};

export async function POST(req: Request) {
  try {
    const payload = (await req.json().catch(() => ({}))) as IndexNowRequest;
    const targetUrl = typeof payload.url === 'string' ? payload.url.trim() : '';
    if (!targetUrl) {
      return NextResponse.json({ ok: false, error: 'Missing url' }, { status: 400 });
    }

    const key = process.env.INDEXNOW_KEY;
    if (!key) {
      return NextResponse.json({ ok: false, error: 'Missing INDEXNOW_KEY' }, { status: 503 });
    }

    const keyLocation = `https://${HOST}/${key}.txt`;
    const body = {
      host: HOST,
      key,
      keyLocation,
      urlList: [targetUrl],
    };

    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (process.env.NODE_ENV !== 'production') {
      console.info(`[indexnow] submitted ${targetUrl} (${response.status})`);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => null);
      return NextResponse.json(
        { ok: false, error: detail ?? `IndexNow responded with ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
