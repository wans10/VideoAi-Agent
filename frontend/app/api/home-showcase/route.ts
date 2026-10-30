import { NextRequest, NextResponse } from 'next/server';
import { HOME_SHOWCASE_FIRST_BATCH, listShowcaseCards } from '@/app/(localized)/[locale]/(marketing)/(home)/_lib/home-route-data/showcase';

/**
 * The next batches of the home works wall. Unlike `/api/examples`, it reads only the showcase sequence
 * (bundled, orderable, Chinese-vendor examples), has no engine filter that could reach hidden families,
 * and quotes no prices, so it needs no database.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const offset = Number(params.get('offset') ?? '0');
  const limit = Number(params.get('limit') ?? String(HOME_SHOWCASE_FIRST_BATCH));
  const { cards, total, hasMore } = listShowcaseCards(
    Number.isFinite(offset) ? offset : 0,
    Number.isFinite(limit) ? limit : HOME_SHOWCASE_FIRST_BATCH,
  );
  return NextResponse.json(
    { ok: true, cards, total, hasMore },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' } },
  );
}
