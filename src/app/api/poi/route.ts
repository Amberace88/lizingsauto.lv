import { NextResponse, type NextRequest } from 'next/server';
import { compactPois, isPoiCat, overpassQuery } from '@/lib/poi';

// Kartes slāņi: degviela, uzlāde, stāvvietas, veikali, aptiekas, medicīna, iestādes, auto serviss (OpenStreetMap, Overpass API).
// Kešots 24 h CDN un datu kešā — Overpass ir bezmaksas kopienas serviss, to nedrīkst pārslogot.
export const dynamic = 'force-dynamic';

const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const CACHE = 'public, s-maxage=86400, stale-while-revalidate=604800';

export async function GET(req: NextRequest) {
  const c = req.nextUrl.searchParams.get('c') || 'fuel';
  if (!isPoiCat(c)) return NextResponse.json({ error: 'nezināma kategorija' }, { status: 400 });
  const body = 'data=' + encodeURIComponent(overpassQuery(c));
  for (const url of MIRRORS) {
    try {
      const r = await fetch(url, { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'tavsauto.eu (lizingsauto@gmail.com)' }, next: { revalidate: 86400 }, signal: AbortSignal.timeout(25000) });
      if (!r.ok) continue;
      const j = (await r.json()) as { elements: Parameters<typeof compactPois>[1] };
      const out = compactPois(c, j.elements || []);
      if (!out.length) continue;
      return NextResponse.json(out, { headers: { 'cache-control': CACHE, 'netlify-cdn-cache-control': `${CACHE}, durable`, 'netlify-vary': 'query=c' } });
    } catch {}
  }
  return NextResponse.json({ error: 'nav datu' }, { status: 503, headers: { 'cache-control': 'no-store' } });
}
