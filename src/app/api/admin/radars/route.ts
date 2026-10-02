import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/admin-guard';
import { OVERPASS_AVG, parseCsddKml, parseOsmAverage, parseVpMobile } from '@/lib/radars';

export const runtime = 'nodejs';
export const maxDuration = 26;

const CSDD_KML = 'https://www.google.com/maps/d/kml?mid=1DbGaups3ELitC9XYVVouGAZk3ps&forcekml=1';
const VP_PAGE = 'https://www.vp.gov.lv/lv/fotoradaru-atrasanas-vietas';
const UA = { 'user-agent': 'TavsAuto/1.0 (+https://tavsauto.eu; lizingsauto@gmail.com)' };

async function get(url: string, init?: RequestInit) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(url, { ...init, headers: { ...UA, ...(init?.headers || {}) }, signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(`${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

/** Nolasa radaru avotus (CSDD, VP, OpenStreetMap) un atgriež normalizētus datus adminam. */
export async function GET() {
  const ctx = await requireAdmin({ api: true });
  if (!ctx) return NextResponse.json({ error: 'Nav piekļuves' }, { status: 401 });
  const [kml, vp, osm] = await Promise.allSettled([
    get(CSDD_KML),
    get(VP_PAGE),
    get('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(OVERPASS_AVG)}` }),
  ]);
  const errors: string[] = [];
  const csdd = kml.status === 'fulfilled' ? parseCsddKml(kml.value) : (errors.push(`CSDD: ${(kml as PromiseRejectedResult).reason}`), []);
  const mobile = vp.status === 'fulfilled' ? parseVpMobile(vp.value) : (errors.push(`VP: ${(vp as PromiseRejectedResult).reason}`), []);
  let average: ReturnType<typeof parseOsmAverage> = [];
  if (osm.status === 'fulfilled') {
    try {
      average = parseOsmAverage(JSON.parse(osm.value));
    } catch {
      errors.push('OSM: nederīga atbilde');
    }
  } else errors.push(`OSM: ${(osm as PromiseRejectedResult).reason}`);
  return NextResponse.json({ fixed: csdd.filter((r) => r.kind !== 'average'), average, mobile, errors });
}
