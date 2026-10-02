// Fotoradaru dati: tipi, nosaukumi, ģeometrija un avotu parsētāji.
export type RadarKind = 'fixed' | 'average' | 'mobile' | 'toll';

export interface Radar {
  id: number;
  kind: RadarKind;
  name: string;
  region: string | null;
  road: string | null;
  lat: number | null;
  lng: number | null;
  geom: [number, number][][] | null;
  speed: number | null;
  direction: string | null;
  note: string | null;
  source: string;
  approx: boolean;
  active: boolean;
  updated_at: string;
}

export type RadarInput = Omit<Radar, 'id' | 'active' | 'updated_at'>;

export const KIND: Record<RadarKind, { label: string; short: string; color: string; hint: string }> = {
  fixed: { label: 'Stacionārie fotoradari', short: 'Stacionārais', color: '#d91d2b', hint: 'CSDD stacionārie fotoradari — fiksēta vieta, pirms tās brīdinājuma zīme.' },
  average: { label: 'Vidējā ātruma posmi', short: 'Vidējā ātruma posms', color: '#f59e0b', hint: 'Mēra vidējo ātrumu starp diviem punktiem — svarīgs viss posms, ne tikai kamera.' },
  mobile: { label: 'Pārvietojamo radaru iespējamās vietas', short: 'Iespējama mobilā kontrole', color: '#3b82f6', hint: 'Valsts policijas publicētās vietas, kur var atrasties pārvietojamais fotoradars. Tas tur nav vienmēr.' },
  toll: { label: 'Ceļu nodevas kontrole', short: 'Nodevas kontrole', color: '#8b5cf6', hint: 'Autoceļu lietošanas nodevas automātiskā kontrole (kravas auto).' },
};

export const REGIONS = ['Rīga', 'Pierīga', 'Zemgale', 'Vidzeme', 'Kurzeme', 'Latgale'] as const;

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;
/** Attālums metros. */
export function distance(a: [number, number], b: [number, number]) {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** Virziens grādos (0 = ziemeļi). */
export function bearing(a: [number, number], b: [number, number]) {
  const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
  const x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
export const compass = (deg: number) => ['Z', 'ZA', 'A', 'DA', 'D', 'DR', 'R', 'ZR'][Math.round(deg / 45) % 8];
export const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',')} km`);

/** Tuvākais punkts uz radara (posmam — tuvākā virsotne). */
export function radarPoint(r: Pick<Radar, 'lat' | 'lng' | 'geom'>, from?: [number, number]): [number, number] | null {
  if (r.geom?.length && from) {
    let best: [number, number] | null = null;
    let bd = Infinity;
    for (const line of r.geom) for (const p of line) {
      const d = distance(from, p);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }
  if (r.lat != null && r.lng != null) return [r.lat, r.lng];
  return r.geom?.[0]?.[0] || null;
}

export function roadOf(s: string) {
  const m = s.match(/\(([APV]\d{1,4})\)/) || s.match(/\b([APV]\d{1,4})\b/);
  return m ? m[1] : null;
}

const CITY_REGION: Record<string, string> = {
  Rīga: 'Rīga', Jūrmala: 'Pierīga', Jelgava: 'Zemgale', Bauska: 'Zemgale', Dobele: 'Zemgale', Aizkraukle: 'Zemgale', Jēkabpils: 'Zemgale', Tukums: 'Kurzeme',
  Liepāja: 'Kurzeme', Ventspils: 'Kurzeme', Kuldīga: 'Kurzeme', Talsi: 'Kurzeme', Saldus: 'Kurzeme', Valmiera: 'Vidzeme', Cēsis: 'Vidzeme', Sigulda: 'Vidzeme',
  Ogre: 'Pierīga', Salaspils: 'Pierīga', Olaine: 'Pierīga', Ādaži: 'Pierīga', Daugavpils: 'Latgale', Rēzekne: 'Latgale', Ludza: 'Latgale', Krāslava: 'Latgale', Preiļi: 'Latgale', Balvi: 'Latgale', Gulbene: 'Vidzeme', Madona: 'Vidzeme', Alūksne: 'Vidzeme', Limbaži: 'Vidzeme', Valka: 'Vidzeme', Smiltene: 'Vidzeme',
};
/** Reģions pēc koordinātām (aptuveni) — kad nosaukumā nav pilsētas. */
export function regionOf(name: string, lat?: number | null, lng?: number | null): string {
  const city = name.split(',')[0].trim().replace(/ novads$/, '');
  if (CITY_REGION[city]) return CITY_REGION[city];
  if (lat == null || lng == null) return 'Latvija';
  if (distance([lat, lng], [56.9496, 24.1052]) < 9000) return 'Rīga';
  if (distance([lat, lng], [56.9496, 24.1052]) < 35000) return 'Pierīga';
  if (lng > 26.2 && lat < 56.9) return 'Latgale';
  if (lng < 22.9) return 'Kurzeme';
  if (lat > 56.95) return lng < 23.6 ? 'Kurzeme' : 'Vidzeme';
  if (lng > 25.9) return 'Latgale';
  return 'Zemgale';
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();

/** CSDD Google My Maps KML → stacionārie un nodevas kontroles punkti. */
export function parseCsddKml(xml: string): RadarInput[] {
  const out: RadarInput[] = [];
  const folders = xml.split(/<Folder>/).slice(1);
  for (const f of folders) {
    const fname = decode(f.match(/<name>([\s\S]*?)<\/name>/)?.[1] || '');
    const kind: RadarKind = /nodev/i.test(fname) ? 'toll' : /vidēj/i.test(fname) ? 'average' : 'fixed';
    for (const pm of f.split(/<Placemark>/).slice(1)) {
      const name = decode(pm.match(/<name>([\s\S]*?)<\/name>/)?.[1] || '');
      const c = pm.match(/<coordinates>\s*([-\d.]+),([-\d.]+)/);
      if (!name || !c) continue;
      const lat = +(+c[2]).toFixed(6);
      const lng = +(+c[1]).toFixed(6);
      const note = decode(pm.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '').slice(0, 600) || null;
      out.push({ kind, name: name.slice(0, 300), region: regionOf(name, lat, lng), road: roadOf(name), lat, lng, geom: null, speed: null, direction: null, note, source: 'csdd', approx: false });
    }
  }
  return out;
}

/** VP lapa → pārvietojamo radaru iespējamo vietu saraksts (bez koordinātām). */
export function parseVpMobile(html: string): { region: string; name: string }[] {
  const text = decode(html.replace(/<\/(p|li|div|h\d|tr)>/gi, '\n'));
  const i = text.search(/Pārvietojamo fotoradaru iespējamās/i);
  if (i < 0) return [];
  const regions = ['Rīga', 'Zemgale', 'Vidzeme', 'Kurzeme', 'Latgale'];
  let reg = 'Latvija';
  const out: { region: string; name: string }[] = [];
  for (const raw of text.slice(i).split('\n').slice(1)) {
    const l = raw.trim();
    if (!l) continue;
    if (regions.includes(l)) {
      reg = l;
      continue;
    }
    if (/Publicēts|Kontaktinform|Sīkdat|Saturs nav pieejams/.test(l)) break;
    if (l.length < 12) continue;
    out.push({ region: reg, name: l.replace(/\s+/g, ' ').slice(0, 300) });
  }
  return out;
}

type OsmEl = { type: string; id: number; tags?: Record<string, string>; members?: { type: string; ref: number; role: string; geometry?: { lat: number; lon: number }[]; lat?: number; lon?: number }[] };
/** Overpass (relation enforcement=average_speed, out geom) → vidējā ātruma posmi. */
export function parseOsmAverage(json: { elements: OsmEl[] }): RadarInput[] {
  const ways = new Map(json.elements.filter((e) => e.type === 'way').map((w) => [w.id, w.tags || {}]));
  const MONTH: Record<string, string> = { Jan: 'janv.', Feb: 'febr.', Mar: 'marts', Apr: 'apr.', May: 'maijs', Jun: 'jūn.', Jul: 'jūl.', Aug: 'aug.', Sep: 'sept.', Oct: 'okt.', Nov: 'nov.', Dec: 'dec.' };
  const out: RadarInput[] = [];
  for (const r of json.elements.filter((e) => e.type === 'relation')) {
    const members = r.members || [];
    const secs = members.filter((m) => m.type === 'way' && (m.role === 'section' || m.role === '') && m.geometry?.length);
    const pts = members.filter((m) => m.type === 'node' && m.lat != null).map((m) => [+m.lat!.toFixed(5), +m.lon!.toFixed(5)] as [number, number]);
    if (!secs.length && !pts.length) continue;
    const geom = secs.length ? secs.map((m) => m.geometry!.map((g) => [+g.lat.toFixed(5), +g.lon.toFixed(5)] as [number, number])) : null;
    const wt = secs.map((m) => ways.get(m.ref) || {});
    const road = wt.map((t) => t.ref).find((x) => x && /^[APV]\d+/.test(x)) || (r.tags?.name && roadOf(r.tags.name)) || null;
    const street = wt.map((t) => t.name).find(Boolean) || r.tags?.name || null;
    const from = members.find((m) => m.role === 'from' && m.lat != null);
    const start: [number, number] = from ? [+from.lat!.toFixed(5), +from.lon!.toFixed(5)] : geom ? geom[0][0] : pts[0];
    let km = r.tags?.distance ? parseFloat(r.tags.distance) : NaN;
    if (km > 100) km /= 1000; // dažkārt norādīts metros
    const len = Number.isFinite(km) ? `${km.toFixed(1).replace('.', ',')} km` : null;
    const name = [road ? `Autoceļš ${road}` : street || 'Vidējā ātruma posms', len ? `posms ${len}` : null].filter(Boolean).join(', ');
    const cond = r.tags?.['maxspeed:conditional']?.match(/^(\d+)\s*@\s*\((\w{3}) (\d+)\s*-\s*(\w{3}) (\d+)\)/);
    out.push({
      kind: 'average',
      name,
      region: regionOf(name, start[0], start[1]),
      road,
      lat: start[0],
      lng: start[1],
      geom,
      speed: r.tags?.maxspeed ? parseInt(r.tags.maxspeed) || null : null,
      direction: null,
      note: cond ? `No ${cond[3]}. ${MONTH[cond[2]] || cond[2]} līdz ${cond[5]}. ${MONTH[cond[4]] || cond[4]} atļauts ${cond[1]} km/h.` : null,
      source: 'osm',
      approx: !geom,
    });
  }
  return out;
}

export const OVERPASS_AVG = `[out:json][timeout:50];area(id:3600072594)->.a;relation["enforcement"="average_speed"](area.a)->.r;.r out geom;way(r.r);out tags;`;

/** Ģeokodēšanas vaicājums no VP apraksta (adresēm; autoceļu km punktiem atgriež null). */
export function geocodeQuery(name: string): string | null {
  if (/\d+(,\d+)?\s*\.?\s*km/i.test(name) && !/ēka|māja|iela|prospekt|gatv/i.test(name)) return null;
  const parts = name.replace(/\.$/, '').split(',').map((s) => s.trim());
  const city = parts[0].replace(/ novads$/, '');
  const addr = parts.find((p) => /(iela|prospekts|gatve|bulvāris|šoseja|aleja|krastmala|ceļš)/i.test(p) && !/^autoceļš/i.test(p)) || '';
  const street = addr.replace(/\s+(pie|pretim|pretī)\s+(ēkas|ēkai|mājas|mājai|nama|namam)\s+Nr\.?\s*/i, ' ').replace(/\s+pie krustojuma ar.*$/i, '').replace(/\s*\(.*\)\s*/g, ' ').replace(/\s+pie\s.*$/i, '').trim();
  const village = parts.find((p) => /apdzīvota vieta/i.test(p))?.replace(/apdzīvota vieta\s*/i, '');
  if (street) return `${street}, ${village || city}, Latvia`;
  if (village) return `${village}, Latvia`;
  return null;
}
