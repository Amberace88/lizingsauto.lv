// Zīmes uz auto bildēm: definīcijas (nosaukums, krāsa, ieslēgta), automātiskie noteikumi un secība.
// Viss glabājas settings.badges; adminam pilna kontrole, ieskaitot savas zīmes.
import type { Car } from './types';
import { odometerOk } from './format';
import { DEFAULT_EKII, ekiiForCar, type EkiiSettings } from './ekii';

// ---------- Noteikumi ----------
export type RuleField =
  | 'fuel' | 'drive' | 'body' | 'gear' | 'seats' | 'mileage' | 'km_per_year' | 'age_years' | 'year' | 'price' | 'ta_months' | 'days_listed'
  | 'price_drop' | 'vat' | 'csdd' | 'featured' | 'ekii' | 'text';
export type RuleOp = 'in' | 'gte' | 'lte' | 'true' | 'contains';
export type Rule = { field: RuleField; op: RuleOp; value?: string | number | string[] };

export const RULE_FIELDS: Record<RuleField, { label: string; ops: RuleOp[]; unit?: string; options?: Record<string, string>; hint?: string }> = {
  fuel: { label: 'Degviela', ops: ['in'], options: { petrol: 'Benzīns', diesel: 'Dīzelis', hybrid: 'Hibrīds', plugin_hybrid: 'Plug-in hibrīds', electric: 'Elektro', lpg: 'Benzīns/gāze', cng: 'Gāze (CNG)' } },
  drive: { label: 'Piedziņa', ops: ['in'], options: { fwd: 'Priekšējā', rwd: 'Aizmugurējā', awd: 'Pilnpiedziņa (4x4)' } },
  body: { label: 'Virsbūve', ops: ['in'], options: { sedan: 'Sedans', wagon: 'Universālis', hatchback: 'Hečbeks', suv: 'Apvidus (SUV)', minivan: 'Minivens', coupe: 'Kupeja', convertible: 'Kabriolets', van: 'Mikroautobuss', pickup: 'Pikaps' } },
  gear: { label: 'Ātrumkārba', ops: ['in'], options: { automatic: 'Automāts', manual: 'Manuālā' } },
  seats: { label: 'Sēdvietas', ops: ['gte', 'lte'] },
  mileage: { label: 'Nobraukums', ops: ['lte', 'gte'], unit: 'km' },
  km_per_year: { label: 'Nobraukums gadā (vidēji)', ops: ['lte', 'gte'], unit: 'km' },
  age_years: { label: 'Auto vecums', ops: ['lte', 'gte'], unit: 'gadi' },
  year: { label: 'Izlaiduma gads', ops: ['gte', 'lte'] },
  price: { label: 'Cena', ops: ['lte', 'gte'], unit: '€' },
  ta_months: { label: 'TA derīga vēl', ops: ['gte'], unit: 'mēn.' },
  days_listed: { label: 'Dienas pārdošanā', ops: ['lte'], unit: 'dienas' },
  price_drop: { label: 'Norādīta vecā (augstāka) cena', ops: ['true'] },
  vat: { label: 'Cena ar PVN', ops: ['true'] },
  csdd: { label: 'Ievadīta CSDD nobraukuma vēsture bez kritumiem', ops: ['true'] },
  featured: { label: 'Atzīmēts kā “Izcelts”', ops: ['true'] },
  ekii: { label: 'Atbilst EKII atbalstam', ops: ['true'] },
  text: { label: 'Aprakstā / ekstrās ir vārds', ops: ['contains'], hint: 'Vairākus vārdus atdali ar komatu' },
};
export const OP_LABEL: Record<RuleOp, string> = { in: 'ir', gte: 'vismaz', lte: 'ne vairāk kā', true: '', contains: 'satur' };

// ---------- Definīcijas ----------
export type BadgeTone = 'signal' | 'petrol' | 'ok' | 'ink' | 'bad';
export type BadgeDef = { id: string; label: string; tone: BadgeTone; enabled: boolean; rules: Rule[]; custom?: boolean };

const R = (field: RuleField, op: RuleOp, value?: Rule['value']): Rule => ({ field, op, value });

/** Sākotnējās zīmes ar saprātīgiem automātiskajiem noteikumiem. Bez noteikumiem = tikai manuāli. */
export const DEFAULT_BADGES: BadgeDef[] = [
  { id: 'top_offer', label: 'Top piedāvājums', tone: 'signal', enabled: true, rules: [R('featured', 'true')] },
  { id: 'ekii', label: 'EKII atbalsts', tone: 'ok', enabled: true, rules: [R('ekii', 'true')] },
  { id: 'price_drop', label: 'Cena samazināta', tone: 'bad', enabled: true, rules: [R('price_drop', 'true')] },
  { id: 'low_price', label: 'Zema cena', tone: 'signal', enabled: true, rules: [] },
  { id: 'just_arrived', label: 'Tikko ievests', tone: 'signal', enabled: true, rules: [R('days_listed', 'lte', 14)] },
  { id: 'fresh_ta', label: 'Svaiga TA', tone: 'ok', enabled: true, rules: [R('ta_months', 'gte', 10)] },
  { id: 'warranty', label: 'Garantija', tone: 'petrol', enabled: true, rules: [] },
  { id: 'csdd', label: 'CSDD nobraukums', tone: 'ok', enabled: true, rules: [R('csdd', 'true')] },
  { id: 'electric', label: 'Elektroauto', tone: 'petrol', enabled: true, rules: [R('fuel', 'in', ['electric'])] },
  { id: 'hybrid', label: 'Hibrīds', tone: 'petrol', enabled: true, rules: [R('fuel', 'in', ['hybrid', 'plugin_hybrid'])] },
  { id: 'like_new', label: 'Kā jauns', tone: 'ink', enabled: true, rules: [R('age_years', 'lte', 2), R('mileage', 'lte', 30000)] },
  { id: 'low_mileage', label: 'Mazs nobraukums', tone: 'ink', enabled: true, rules: [R('km_per_year', 'lte', 12000)] },
  { id: 'one_owner', label: '1 īpašnieks', tone: 'ink', enabled: true, rules: [R('text', 'contains', '1 īpašnieks, viens īpašnieks, pirmais īpašnieks, 1 owner')] },
  { id: 'service_history', label: 'Servisa vēsture', tone: 'ink', enabled: true, rules: [R('text', 'contains', 'servisa vēsture, servisa grāmatiņa, apkopes vēsture, service history')] },
  { id: 'awd', label: '4x4', tone: 'ink', enabled: true, rules: [R('drive', 'in', ['awd'])] },
  { id: 'seven_seats', label: '7 vietas', tone: 'ink', enabled: true, rules: [R('seats', 'gte', 7)] },
  { id: 'tow_hook', label: 'Sakabe', tone: 'ink', enabled: true, rules: [R('text', 'contains', 'sakabe, sakabes āķis, vilkšanas āķis, āķis')] },
  { id: 'vat', label: 'Ar PVN', tone: 'ink', enabled: true, rules: [R('vat', 'true')] },
];
const DEFAULT_BY_ID = Object.fromEntries(DEFAULT_BADGES.map((d) => [d.id, d]));
/** Zīmes, kas vecajā versijā bija automātiskas (lai pareizi nolasītu jau saglabātos auto). */
const LEGACY_AUTO = new Set(['price_drop', 'electric', 'hybrid', 'vat', 'csdd', 'awd']);
export const DEFAULT_BADGE_ORDER = DEFAULT_BADGES.map((d) => d.id);

// ---------- Izskats ----------
export type BadgePosition = 'top' | 'left' | 'right' | 'bottom';
export type BadgeShape = 'pill' | 'rounded' | 'square';
export interface BadgeStyle {
  order: string[];
  colors: Record<string, string>;
  position: BadgePosition;
  shape: BadgeShape;
  defs: Record<string, BadgeDef>;
  /** Cik zīmes rādīt uz bildes katalogā (pārējās kā „+N”) */
  max: number;
  /** EKII nosacījumi (no iestatījumiem) automātiskajai EKII zīmei */
  ekii?: EkiiSettings;
}
export const BADGE_POSITIONS: { id: BadgePosition; label: string }[] = [
  { id: 'top', label: 'Augšā, rindā' },
  { id: 'left', label: 'Kreisajā pusē, stabiņā' },
  { id: 'right', label: 'Labajā pusē, stabiņā' },
  { id: 'bottom', label: 'Apakšā, rindā' },
];
export const BADGE_SHAPES: { id: BadgeShape; label: string }[] = [
  { id: 'pill', label: 'Apaļas' },
  { id: 'rounded', label: 'Noapaļotas' },
  { id: 'square', label: 'Taisnstūra' },
];
const HEX = /^#[0-9a-f]{6}$/i;
const TONES: BadgeTone[] = ['signal', 'petrol', 'ok', 'ink', 'bad'];

function cleanRule(r: unknown): Rule | null {
  const o = r as Rule;
  if (!o || !RULE_FIELDS[o.field] || !RULE_FIELDS[o.field].ops.includes(o.op)) return null;
  if (o.op === 'in') return { field: o.field, op: 'in', value: (Array.isArray(o.value) ? o.value : []).filter((x) => typeof x === 'string' && RULE_FIELDS[o.field].options?.[x]) };
  if (o.op === 'contains') return { field: o.field, op: 'contains', value: String(o.value ?? '').slice(0, 300) };
  if (o.op === 'true') return { field: o.field, op: 'true' };
  const n = Number(o.value);
  return isFinite(n) ? { field: o.field, op: o.op, value: n } : null;
}

export function normalizeBadgeStyle(v?: unknown): BadgeStyle {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const saved = (o.defs && typeof o.defs === 'object' ? o.defs : {}) as Record<string, Partial<BadgeDef>>;
  const defs: Record<string, BadgeDef> = {};
  for (const d of DEFAULT_BADGES) {
    const s = saved[d.id] || {};
    defs[d.id] = {
      ...d,
      label: typeof s.label === 'string' && s.label.trim() ? s.label.trim().slice(0, 40) : d.label,
      enabled: s.enabled !== false,
      rules: Array.isArray(s.rules) ? (s.rules.map(cleanRule).filter(Boolean) as Rule[]) : d.rules,
    };
  }
  for (const [id, s] of Object.entries(saved)) {
    if (DEFAULT_BY_ID[id] || !/^c_[a-z0-9]{3,20}$/.test(id) || !s?.label) continue;
    defs[id] = { id, label: String(s.label).trim().slice(0, 40), tone: TONES.includes(s.tone as BadgeTone) ? (s.tone as BadgeTone) : 'ink', enabled: s.enabled !== false, rules: Array.isArray(s.rules) ? (s.rules.map(cleanRule).filter(Boolean) as Rule[]) : [], custom: true };
  }
  const colors: Record<string, string> = {};
  if (o.colors && typeof o.colors === 'object') for (const [k, c] of Object.entries(o.colors as Record<string, unknown>)) if (defs[k] && typeof c === 'string' && HEX.test(c)) colors[k] = c.toLowerCase();
  const savedOrder = Array.isArray(o.order) ? (o.order as unknown[]).filter((b): b is string => typeof b === 'string' && !!defs[b]) : [];
  const order = [...new Set([...savedOrder, ...DEFAULT_BADGE_ORDER, ...Object.keys(defs)])];
  const position = BADGE_POSITIONS.some((p) => p.id === o.position) ? (o.position as BadgePosition) : 'top';
  const shape = BADGE_SHAPES.some((p) => p.id === o.shape) ? (o.shape as BadgeShape) : 'pill';
  const max = Math.min(12, Math.max(1, Math.round(Number(o.max) || 4)));
  return { order, colors, position, shape, defs, max };
}

/** Saglabājamā forma (defs tikai ar atšķirībām no noklusējuma + savas zīmes). */
export function serializeBadgeStyle(s: BadgeStyle) {
  const defs: Record<string, Partial<BadgeDef>> = {};
  for (const d of Object.values(s.defs)) {
    const base = DEFAULT_BY_ID[d.id];
    if (!base) defs[d.id] = { label: d.label, tone: d.tone, enabled: d.enabled, rules: d.rules };
    else {
      const diff: Partial<BadgeDef> = {};
      if (d.label !== base.label) diff.label = d.label;
      if (!d.enabled) diff.enabled = false;
      if (JSON.stringify(d.rules) !== JSON.stringify(base.rules)) diff.rules = d.rules;
      if (Object.keys(diff).length) defs[d.id] = diff;
    }
  }
  return { order: s.order, colors: s.colors, position: s.position, shape: s.shape, max: s.max, defs };
}

export const DEFAULT_BADGE_STYLE: BadgeStyle = normalizeBadgeStyle();

/** Lasāma teksta krāsa uz dotā fona. */
export function badgeTextColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.4 ? '#161616' : '#ffffff';
}

// ---------- Noteikumu pārbaude ----------
export type BadgeCar = Partial<Pick<Car, 'badges' | 'fuel' | 'old_price' | 'price' | 'vat_included' | 'drive' | 'odometer_history' | 'body_type' | 'transmission' | 'seats' | 'mileage' | 'year' | 'ta_until' | 'published_at' | 'created_at' | 'featured' | 'equipment' | 'description' | 'title' | 'co2'>>;

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function fieldValue(car: BadgeCar, f: RuleField, ekii: EkiiSettings): unknown {
  const now = Date.now();
  const ageYears = car.year ? Math.max(0.5, new Date().getFullYear() - car.year + new Date().getMonth() / 12) : null;
  switch (f) {
    case 'fuel': return car.fuel;
    case 'drive': return car.drive;
    case 'body': return car.body_type;
    case 'gear': return car.transmission;
    case 'seats': return car.seats;
    case 'mileage': return car.mileage;
    case 'km_per_year': return car.mileage != null && ageYears ? car.mileage / ageYears : null;
    case 'age_years': return ageYears;
    case 'year': return car.year;
    case 'price': return car.price;
    case 'ta_months': return car.ta_until ? (+new Date(car.ta_until) - now) / (30.44 * 864e5) : null;
    case 'days_listed': { const d = car.published_at || car.created_at; return d ? (now - +new Date(d)) / 864e5 : 0; }
    case 'price_drop': return !!(car.old_price && car.price && car.old_price > car.price);
    case 'vat': return !!car.vat_included;
    case 'csdd': return !!(car.odometer_history && car.odometer_history.length > 0 && odometerOk(car.odometer_history));
    case 'featured': return !!car.featured;
    case 'ekii': return car.price != null && !!ekiiForCar(ekii, { fuel: car.fuel ?? null, price: car.price ?? 0, vat_included: !!car.vat_included, year: car.year ?? null, mileage: car.mileage ?? null, seats: car.seats ?? null, co2: car.co2 ?? null } as never);
    case 'text': return norm([car.title, car.description, ...(car.equipment || [])].filter(Boolean).join(' \n '));
  }
}

export function ruleMatches(car: BadgeCar, r: Rule, ekii: EkiiSettings = DEFAULT_EKII) {
  const v = fieldValue(car, r.field, ekii);
  switch (r.op) {
    case 'true': return v === true;
    case 'in': return typeof v === 'string' && Array.isArray(r.value) && r.value.includes(v);
    case 'gte': return typeof v === 'number' && v >= Number(r.value);
    case 'lte': return typeof v === 'number' && v <= Number(r.value);
    case 'contains': {
      if (typeof v !== 'string') return false;
      const words = String(r.value || '').split(',').map((w) => norm(w.trim())).filter(Boolean);
      return words.some((w) => new RegExp(`(^|[^\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'u').test(v));
    }
  }
}
export const isAutoBadge = (d: BadgeDef) => d.rules.length > 0;
export const autoMatches = (car: BadgeCar, d: BadgeDef, ekii?: EkiiSettings) => d.rules.length > 0 && d.rules.every((r) => ruleMatches(car, r, ekii));

/** Cilvēkam saprotams noteikuma teksts. */
export function ruleText(r: Rule) {
  const f = RULE_FIELDS[r.field];
  if (r.op === 'true') return f.label;
  if (r.op === 'in') return `${f.label}: ${(r.value as string[] | undefined)?.map((x) => f.options?.[x] || x).join(' / ') || '—'}`;
  if (r.op === 'contains') return `${f.label}: „${r.value}”`;
  return `${f.label} ${OP_LABEL[r.op]} ${Number(r.value).toLocaleString('lv-LV')}${f.unit ? ` ${f.unit}` : ''}`;
}

// ---------- Konkrēta auto zīmes ----------
// car.badges formāts v2: ['*2', '+id' (pielikts ar roku), '=id' (tikai secībai), '!id' (automātiskā paslēpta)]
// Vecais formāts: ['id', ...] manuālās; '*' + secība; '!id' paslēpta.
export type CarBadgeState = { custom: boolean; order: string[]; forced: Set<string>; hidden: Set<string> };

export function parseCarBadges(raw: string[] = []): CarBadgeState {
  const hidden = new Set(raw.filter((b) => b.startsWith('!')).map((b) => b.slice(1)));
  if (raw.includes('*2')) {
    const entries = raw.filter((b) => b.startsWith('+') || b.startsWith('='));
    return { custom: true, order: entries.map((b) => b.slice(1)), forced: new Set(entries.filter((b) => b.startsWith('+')).map((b) => b.slice(1))), hidden };
  }
  const plain = raw.filter((b) => !b.startsWith('!') && b !== '*');
  return { custom: raw.includes('*'), order: raw.includes('*') ? plain : [], forced: new Set(plain.filter((b) => !LEGACY_AUTO.has(b))), hidden };
}

export function encodeCarBadges(order: string[], forced: Set<string>, hidden: Set<string>): string[] {
  return ['*2', ...order.map((b) => (forced.has(b) ? `+${b}` : `=${b}`)), ...[...hidden].map((b) => `!${b}`)];
}

/** Zīmes, ko rādīt uz bildes, pareizā secībā. */
export function carBadges(car: BadgeCar, style: BadgeStyle = DEFAULT_BADGE_STYLE, ekii: EkiiSettings | undefined = style.ekii): string[] {
  const st = parseCarBadges(car.badges || []);
  const active = (id: string) => {
    const d = style.defs[id];
    if (!d || !d.enabled) return false;
    if (st.forced.has(id)) return true;
    return !st.hidden.has(id) && autoMatches(car, d, ekii);
  };
  const rank = (b: string) => {
    const i = style.order.indexOf(b);
    return i < 0 ? 999 : i;
  };
  const all = Object.keys(style.defs).filter(active).sort((a, b) => rank(a) - rank(b));
  if (!st.custom) return all;
  const out = st.order.filter((b) => all.includes(b));
  for (const b of all) if (!out.includes(b)) out.push(b);
  return out;
}

/** Tekstam (piem., portālu sludinājumiem): vai auto ir šī zīme. */
export const hasBadge = (car: BadgeCar, id: string, style?: BadgeStyle) => carBadges(car, style).includes(id);
