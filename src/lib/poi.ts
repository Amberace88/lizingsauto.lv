// Kartes slāņi (vietas) — kopīgi serverim (Overpass vaicājumi) un klientam (krāsas, nosaukumi).
export type PoiCat = 'fuel' | 'ev' | 'parking' | 'shop' | 'pharmacy' | 'health' | 'gov' | 'auto';

export type Poi = {
  k: PoiCat;
  s: string; // apakštips (supermarket, police, ...)
  n: string; // nosaukums
  b: string; // zīmols / operators
  a: string; // adrese
  h: string; // darba laiks
  x: string; // papildus (degviela, savienotāji, maks. laiks)
  c: number | null; // ietilpība / uzlādes vietas
  f: '' | 'yes' | 'no'; // maksa (stāvvietām)
  ph: string; // tālrunis
  lat: number;
  lng: number;
};

const NOPRIV = '["access"!~"^(private|no|customers|delivery)$"]';

export const POI_CATS: Record<PoiCat, { label: string; hint: string; color: string; q: string[] }> = {
  fuel: { label: 'Degviela un gāze', hint: 'DUS, LPG un CNG uzpildes', color: '#16a34a', q: ['nwr["amenity"="fuel"]'] },
  ev: { label: 'EV uzlāde', hint: 'Elektroauto uzlādes vietas', color: '#0891b2', q: ['nwr["amenity"="charging_station"]'] },
  parking: {
    label: 'Stāvvietas',
    hint: 'Maksas un bezmaksas',
    color: '#2563eb',
    q: [`nwr["amenity"="parking"]${NOPRIV}["fee"]`, `nwr["amenity"="parking"]${NOPRIV}["name"]`, `nwr["amenity"="parking"]${NOPRIV}["parking"~"^(multi-storey|underground)$"]`, `nwr["amenity"="parking"]${NOPRIV}(if: number(t["capacity"]) >= 20)`],
  },
  shop: { label: 'Veikali', hint: 'Lielveikali, TC, būvpreces', color: '#ea580c', q: ['nwr["shop"~"^(supermarket|mall|department_store|doityourself|hardware|convenience)$"]'] },
  pharmacy: { label: 'Aptiekas', hint: 'Visas aptiekas', color: '#db2777', q: ['nwr["amenity"="pharmacy"]'] },
  health: { label: 'Medicīna', hint: 'Slimnīcas un poliklīnikas', color: '#be123c', q: ['nwr["amenity"~"^(hospital|clinic)$"]'] },
  gov: { label: 'Iestādes', hint: 'Pašvaldības, policija, pasts', color: '#7c3aed', q: ['nwr["amenity"~"^(townhall|police|post_office|courthouse)$"]', 'nwr["office"="government"]'] },
  auto: { label: 'Auto serviss', hint: 'Serviss, riepas, mazgātavas, TA', color: '#475569', q: ['nwr["shop"~"^(car_repair|tyres|car_parts)$"]', 'nwr["amenity"~"^(car_wash|vehicle_inspection)$"]'] },
};
export const POI_ORDER: PoiCat[] = ['fuel', 'ev', 'parking', 'shop', 'pharmacy', 'health', 'gov', 'auto'];
export const isPoiCat = (s: string | null): s is PoiCat => !!s && s in POI_CATS;

export const SUB_LABEL: Record<string, string> = {
  fuel: 'Degvielas uzpilde', fuel_gas: 'Degviela + gāze (LPG/CNG)', gas: 'Gāzes uzpilde (LPG/CNG)', charging_station: 'Elektroauto uzlāde', parking: 'Stāvvieta',
  supermarket: 'Lielveikals', mall: 'Tirdzniecības centrs', department_store: 'Universālveikals', doityourself: 'Būvniecības preces', hardware: 'Saimniecības preces', convenience: 'Pārtikas veikals',
  pharmacy: 'Aptieka', hospital: 'Slimnīca', clinic: 'Poliklīnika / klīnika',
  townhall: 'Pašvaldība', police: 'Policija', post_office: 'Pasts', courthouse: 'Tiesa', government: 'Valsts iestāde',
  car_repair: 'Autoserviss', tyres: 'Riepu serviss', car_parts: 'Auto rezerves daļas', car_wash: 'Auto mazgātava', vehicle_inspection: 'Tehniskā apskate',
};

/** Vaicājums tikai redzamajam apgabalam (rezerves variants, ja kopējie dati vēl nav ielādēti). */
export function overpassBboxQuery(cat: PoiCat, b: [number, number, number, number]) {
  const bb = b.map((x) => x.toFixed(4)).join(',');
  return `[out:json][timeout:25];(${POI_CATS[cat].q.map((q) => `${q}(${bb});`).join('')});out center tags;`;
}

export function overpassQuery(cat: PoiCat) {
  return `[out:json][timeout:120];area(id:3600072594)->.a;(${POI_CATS[cat].q.map((q) => `${q}(area.a);`).join('')});out center tags;`;
}

const FUELS: Record<string, string> = { diesel: 'DD', octane_95: '95', octane_98: '98', lpg: 'LPG', cng: 'CNG', e85: 'E85', adblue: 'AdBlue' };

/** Overpass elements → kompakts saraksts. */
export function compactPois(cat: PoiCat, els: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[]): Poi[] {
  const out: Poi[] = [];
  const seen = new Set<string>();
  for (const e of els) {
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    if (lat == null || lng == null) continue;
    const t = e.tags || {};
    let s = t.shop || (t.office === 'government' ? 'government' : '') || t.amenity || cat;
    if (cat === 'fuel') {
      const gas = t['fuel:lpg'] === 'yes' || t['fuel:cng'] === 'yes' || /lpg|gāz|gaz|cng/i.test(t.name || '');
      const liquid = ['diesel', 'octane_95', 'octane_98'].some((f) => t[`fuel:${f}`] === 'yes');
      s = gas && !liquid && /lpg|gāz|gaz|cng/i.test(`${t.name || ''} ${t.brand || ''}`) ? 'gas' : gas ? 'fuel_gas' : 'fuel';
    }
    const brand = (t.brand || t.operator || t.network || '').slice(0, 50);
    const name = (t.name || brand || SUB_LABEL[s] || '').slice(0, 80);
    let x = '';
    if (cat === 'fuel') x = Object.keys(FUELS).filter((f) => t[`fuel:${f}`] === 'yes').map((f) => FUELS[f]).join(' · ');
    else if (cat === 'ev') x = Object.keys(t).filter((k) => /^socket:[^:]+$/.test(k) && t[k] !== 'no').map((k) => k.slice(7).replace(/_/g, ' ').replace(/^type2 combo$/, 'CCS').replace(/^chademo$/, 'CHAdeMO').replace(/^type2$/, 'Type 2')).join(', ');
    else if (cat === 'parking') x = [t.parking === 'multi-storey' ? 'Daudzstāvu' : t.parking === 'underground' ? 'Pazemes' : '', t.maxstay ? `Maks. ${t.maxstay}` : '', t['fee:conditional'] || t.charge || ''].filter(Boolean).join(' · ');
    const key = `${Math.round(lat * 1e4)},${Math.round(lng * 1e4)},${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const fee = t.fee === 'yes' || t.fee === 'no' ? t.fee : t.fee && t.fee !== 'no' ? 'yes' : '';
    out.push({
      k: cat,
      s,
      n: name,
      b: brand && brand !== name ? brand : '',
      a: [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ') + (t['addr:city'] ? `${t['addr:street'] ? ', ' : ''}${t['addr:city']}` : ''),
      h: (t.opening_hours || '').slice(0, 70),
      x: x.slice(0, 90),
      c: Number(t.capacity) || null,
      f: cat === 'parking' ? (fee as Poi['f']) : '',
      ph: (t.phone || t['contact:phone'] || '').split(';')[0].slice(0, 25),
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
    });
  }
  return out;
}

/** Atvēršanas laika teksts saprotamāk (pamata gadījumi). */
export function hoursLabel(h: string) {
  if (!h) return '';
  if (h === '24/7') return 'Visu diennakti';
  return h.replace(/PH/g, 'Svētku d.').replace(/Mo/g, 'P').replace(/Tu/g, 'O').replace(/We/g, 'T').replace(/Th/g, 'C').replace(/Fr/g, 'Pk').replace(/Sa/g, 'S').replace(/Su/g, 'Sv').replace(/off/g, 'slēgts').replace(/;\s*/g, ' · ');
}
