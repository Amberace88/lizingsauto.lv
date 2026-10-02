// Navigācija: adrešu meklēšana (Photon), maršruti (OSRM, routing.openstreetmap.de), ģeometrija un norādes latviski.
import { distance, type Radar } from './radars';
import { compactPois, overpassBboxQuery, type Poi, type PoiCat } from './poi';

export type LL = [number, number]; // [lat, lng]
export type Place = { id: string; name: string; sub: string; lat: number; lng: number; kind?: string; special?: 'tavsauto' };

export const TAVS_AUTO: Place = { id: 'tavsauto', name: 'Tavs Auto — autoplacis', sub: 'Krustabaznīcas iela 24, Rīga', lat: 56.9896441, lng: 24.1881428, special: 'tavsauto' };

const ROUTER = 'https://routing.openstreetmap.de/routed-car/route/v1/driving';
const PHOTON = 'https://photon.komoot.io/api/';

/** Adrešu un vietu ieteikumi rakstot (Latvijā, tuvākie vispirms). */
export async function searchPlaces(q: string, near?: LL | null, signal?: AbortSignal): Promise<Place[]> {
  const u = new URL(PHOTON);
  u.searchParams.set('q', q);
  u.searchParams.set('limit', '8');
  u.searchParams.set('bbox', '20.9,55.6,28.3,58.1');
  if (near) {
    u.searchParams.set('lat', String(near[0]));
    u.searchParams.set('lon', String(near[1]));
  }
  const r = await fetch(u, { signal });
  if (!r.ok) return [];
  const j = (await r.json()) as { features: { geometry: { coordinates: [number, number] }; properties: Record<string, string> }[] };
  const seen = new Set<string>();
  return j.features
    .map((f) => {
      const p = f.properties;
      const addr = [p.street, p.housenumber].filter(Boolean).join(' ');
      const name = p.name || addr || p.city || p.county || '';
      const sub = [p.name ? addr : null, p.city || p.county || p.state].filter(Boolean).join(', ');
      return { id: `${p.osm_type}${p.osm_id}`, name, sub, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], kind: p.osm_value };
    })
    .filter((x) => x.name && !seen.has(`${x.name}|${x.sub}`) && seen.add(`${x.name}|${x.sub}`));
}

export type Step = { at: number; loc: LL; type: string; modifier?: string; exit?: number; name: string; ref?: string; text: string; icon: Maneuver };
export type Route = {
  coords: LL[];
  cum: number[]; // kumulatīvais attālums līdz katram punktam
  distance: number;
  duration: number;
  steps: Step[];
  radars: { r: Radar; at: number }[];
  summary: string;
};
export type Maneuver = 'straight' | 'slight-right' | 'right' | 'sharp-right' | 'slight-left' | 'left' | 'sharp-left' | 'uturn' | 'roundabout' | 'arrive' | 'depart' | 'merge' | 'fork-left' | 'fork-right';

const DIR: Record<string, string> = {
  uturn: 'apgriezieties',
  'sharp right': 'strauji pa labi',
  right: 'pa labi',
  'slight right': 'nedaudz pa labi',
  straight: 'taisni',
  'slight left': 'nedaudz pa kreisi',
  left: 'pa kreisi',
  'sharp left': 'strauji pa kreisi',
};

function icon(type: string, mod?: string): Maneuver {
  if (type === 'arrive') return 'arrive';
  if (type === 'depart') return 'depart';
  if (type === 'roundabout' || type === 'rotary' || type === 'roundabout turn') return 'roundabout';
  if (type === 'merge') return 'merge';
  if (type === 'fork') return mod?.includes('left') ? 'fork-left' : 'fork-right';
  if (!mod) return 'straight';
  return (mod.replace(' ', '-') as Maneuver) || 'straight';
}

/** Norādes teksts latviski (bez ielas nosaukuma — tas rādās atsevišķi). */
export function instruction(type: string, mod?: string, exit?: number) {
  const d = mod ? DIR[mod] || '' : '';
  switch (type) {
    case 'depart':
      return 'Sāciet braucienu';
    case 'arrive':
      return 'Esat galamērķī';
    case 'roundabout':
    case 'rotary':
      return exit ? `Aplī brauciet uz ${exit}. izbrauktuvi` : 'Iebrauciet aplī';
    case 'exit roundabout':
    case 'exit rotary':
      return 'Izbrauciet no apļa';
    case 'merge':
      return 'Iekļaujieties satiksmē';
    case 'on ramp':
      return d && d !== 'taisni' ? `Uzbrauktuve ${d}` : 'Uzbrauciet uz ceļa';
    case 'off ramp':
      return d && d !== 'taisni' ? `Nobrauktuve ${d}` : 'Nobrauciet no ceļa';
    case 'fork':
      return mod?.includes('left') ? 'Pie atzarojuma turieties pa kreisi' : 'Pie atzarojuma turieties pa labi';
    case 'end of road':
      return `Ceļa galā ${d === 'apgriezieties' ? 'apgriezieties' : `pagriezieties ${d}`}`;
    case 'continue':
    case 'new name':
      return mod && mod !== 'straight' ? `Turpiniet ${d}` : 'Turpiniet taisni';
    default:
      if (mod === 'uturn') return 'Apgriezieties';
      if (mod === 'straight') return 'Turpiniet taisni';
      return `Pagriezieties ${d}`;
  }
}

// --- ģeometrija metros (lokāla plakne) ---
const M = 111320;
function toXY(p: LL, lat0: number): [number, number] {
  return [p[1] * M * Math.cos((lat0 * Math.PI) / 180), p[0] * M];
}
/** Punkta projekcija uz maršruta: attālums no līnijas, attālums pa maršrutu, segmenta indekss. */
export function project(route: Pick<Route, 'coords' | 'cum'>, p: LL, from = 0, to = Infinity) {
  const c = route.coords;
  const lat0 = p[0];
  const [px, py] = toXY(p, lat0);
  let best = { off: Infinity, at: 0, i: 0 };
  const end = Math.min(c.length - 1, to);
  for (let i = Math.max(0, from); i < end; i++) {
    const [ax, ay] = toXY(c[i], lat0);
    const [bx, by] = toXY(c[i + 1], lat0);
    const dx = bx - ax;
    const dy = by - ay;
    const L = dx * dx + dy * dy;
    let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
    t = Math.max(0, Math.min(1, t));
    const qx = ax + t * dx;
    const qy = ay + t * dy;
    const off = Math.hypot(px - qx, py - qy);
    if (off < best.off) best = { off, at: route.cum[i] + Math.sqrt(L) * t, i };
  }
  return best;
}
/** Punkts maršrutā pēc attāluma no sākuma. */
export function pointAt(route: Pick<Route, 'coords' | 'cum'>, at: number): { p: LL; i: number } {
  const { coords: c, cum } = route;
  if (at <= 0) return { p: c[0], i: 0 };
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= at) lo = mid;
    else hi = mid;
  }
  const seg = cum[hi] - cum[lo] || 1;
  const t = Math.min(1, (at - cum[lo]) / seg);
  return { p: [c[lo][0] + (c[hi][0] - c[lo][0]) * t, c[lo][1] + (c[hi][1] - c[lo][1]) * t], i: lo };
}

/** Radari, kas atrodas tieši uz maršruta (ar attālumu no sākuma). */
function radarsOn(route: Pick<Route, 'coords' | 'cum'>, radars: Radar[]) {
  const out: { r: Radar; at: number }[] = [];
  const box = route.coords.reduce((b, [la, lo]) => [Math.min(b[0], la), Math.min(b[1], lo), Math.max(b[2], la), Math.max(b[3], lo)], [90, 180, -90, -180]);
  const pad = 0.01;
  for (const r of radars) {
    if (r.kind === 'toll') continue;
    const pts: LL[] = r.geom?.length ? [r.geom[0][0], r.geom[r.geom.length - 1].at(-1)!] : r.lat != null ? [[r.lat, r.lng!]] : [];
    if (!pts.length) continue;
    const [la, lo] = pts[0];
    if (la < box[0] - pad || la > box[2] + pad || lo < box[1] - pad || lo > box[3] + pad) continue;
    const tol = r.kind === 'mobile' ? (r.approx ? 90 : 50) : 35;
    const a = project(route, pts[0]);
    if (a.off > tol) continue;
    if (r.geom?.length) {
      // posms jāšķērso pareizajā virzienā: beigām jābūt tālāk pa maršrutu
      const b = project(route, pts[1]);
      if (b.off > tol || b.at <= a.at) continue;
    }
    out.push({ r, at: a.at });
  }
  return out.sort((x, y) => x.at - y.at);
}

type OsrmStep = { maneuver: { type: string; modifier?: string; exit?: number; location: [number, number] }; name: string; ref?: string; distance: number };
type OsrmRoute = { distance: number; duration: number; geometry: { coordinates: [number, number][] }; legs: { steps: OsrmStep[]; summary?: string }[] };

/** Maršruts(-i) no A uz B. */
export async function fetchRoutes(from: LL, to: LL, radars: Radar[], signal?: AbortSignal, opts: { heading?: number | null; alternatives?: boolean } = {}): Promise<Route[]> {
  // Braukšanas virziens sākumā: maršruts turpinās uz priekšu, nevis liek apgriezties
  const b = opts.heading != null && !Number.isNaN(opts.heading) ? `&bearings=${Math.round((opts.heading + 360) % 360)},50;&radiuses=60;unlimited` : '';
  const url = `${ROUTER}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true&alternatives=${opts.alternatives === false ? 'false' : 'true'}${b}`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`Maršruts nav pieejams (${r.status})`);
  const j = (await r.json()) as { code: string; routes: OsrmRoute[] };
  if (j.code !== 'Ok' || !j.routes?.length) throw new Error('Maršrutu neizdevās atrast');
  return j.routes.slice(0, 3).map((o) => {
    const coords = o.geometry.coordinates.map(([lng, lat]) => [lat, lng] as LL);
    const cum = [0];
    for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + distance(coords[i - 1], coords[i]));
    const base = { coords, cum };
    let from = 0;
    const steps: Step[] = o.legs.flatMap((l) => l.steps).map((s) => {
      const loc: LL = [s.maneuver.location[1], s.maneuver.location[0]];
      const pr = project(base, loc, Math.max(0, from - 2), from + 4000);
      from = pr.i;
      return { at: pr.at, loc, type: s.maneuver.type, modifier: s.maneuver.modifier, exit: s.maneuver.exit, name: s.name || '', ref: s.ref, text: instruction(s.maneuver.type, s.maneuver.modifier, s.maneuver.exit), icon: icon(s.maneuver.type, s.maneuver.modifier) };
    });
    const names = o.legs.flatMap((l) => l.steps).filter((s) => s.distance > 1500 && (s.ref || s.name)).sort((a, b) => b.distance - a.distance).slice(0, 2).map((s) => s.ref?.split(';')[0] || s.name);
    return { coords, cum, distance: o.distance, duration: o.duration, steps, radars: radarsOn(base, radars), summary: [...new Set(names)].join(', ') };
  });
}

export const fmtDur = (s: number) => {
  const m = Math.round(s / 60);
  if (m < 60) return `${Math.max(1, m)} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
};
export const fmtClock = (secFromNow: number) => new Date(Date.now() + secFromNow * 1000).toLocaleTimeString('lv-LV', { hour: '2-digit', minute: '2-digit' });

/** Attāluma formulējums balss norādēm. */
export function sayDist(m: number) {
  if (m >= 1000) return `Pēc ${(Math.round(m / 100) / 10).toString().replace('.', ',')} kilometriem`;
  if (m >= 100) return `Pēc ${Math.round(m / 50) * 50} metriem`;
  return 'Tūlīt';
}

// Pēdējie galamērķi (tikai šajā pārlūkā)
const KEY = 'ta_nav_recent';
export function recentPlaces(): Place[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]').slice(0, 5);
  } catch {
    return [];
  }
}
export function rememberPlace(p: Place) {
  if (p.special) return;
  try {
    const list = [p, ...recentPlaces().filter((x) => x.id !== p.id)].slice(0, 5);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

export const TAVS_CONTACT = { phone: '+371 23776197', wa: '37123776197', hours: 'P–Pk 9:00–18:00 · S 10:00–15:00' };

const poiCache = new Map<PoiCat, Promise<Poi[]>>();
/** Kartes slāņa vietas (ielādē vienreiz katrai kategorijai). */
export function loadPois(cat: PoiCat): Promise<Poi[]> {
  let p = poiCache.get(cat);
  if (!p) {
    p = fetch(`/api/poi?c=${cat}`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []) as Promise<Poi[]>;
    poiCache.set(cat, p);
    p.then((x) => {
      if (!x.length) poiCache.delete(cat);
    });
  }
  return p;
}

const OVERPASS = ['https://overpass.private.coffee/api/interpreter', 'https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
const nearCache = new Map<string, Promise<Poi[]>>();
/** Rezerves variants: vietas ap punktu tieši no OpenStreetMap (~25 km rādiusā). */
export function loadPoisNear(cat: PoiCat, c: LL): Promise<Poi[]> {
  const key = `${cat}:${c[0].toFixed(1)},${c[1].toFixed(1)}`;
  let p = nearCache.get(key);
  if (!p) {
    const b: [number, number, number, number] = [c[0] - 0.22, c[1] - 0.38, c[0] + 0.22, c[1] + 0.38];
    const body = 'data=' + encodeURIComponent(overpassBboxQuery(cat, b));
    p = (async () => {
      for (const u of OVERPASS) {
        try {
          const r = await fetch(u, { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(20000) });
          if (!r.ok) continue;
          const j = await r.json();
          return compactPois(cat, j.elements || []);
        } catch {}
      }
      return [];
    })();
    nearCache.set(key, p);
    p.then((x) => {
      if (!x.length) nearCache.delete(key);
    });
  }
  return p;
}
