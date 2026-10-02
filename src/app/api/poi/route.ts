import { NextResponse, type NextRequest } from 'next/server';
import { isPoiCat } from '@/lib/poi';
import { supabasePublic } from '@/lib/supabase/public';

// Kartes slāņi navigācijā. Dati no OpenStreetMap tiek atjaunoti admin panelī (Fotoradari → Kartes slāņi)
// un glabājas datubāzē; šeit tos tikai izsniedzam ar CDN kešu.
export const dynamic = 'force-dynamic';
const CACHE = 'public, s-maxage=21600, stale-while-revalidate=604800';

export async function GET(req: NextRequest) {
  const c = req.nextUrl.searchParams.get('c') || 'fuel';
  if (!isPoiCat(c)) return NextResponse.json({ error: 'nezināma kategorija' }, { status: 400 });
  const { data, error } = await supabasePublic.from('poi_sets').select('data').eq('cat', c).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'nav datu' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  return NextResponse.json(data.data, { headers: { 'cache-control': CACHE, 'netlify-cdn-cache-control': `${CACHE}, durable`, 'netlify-vary': 'query=c' } });
}
