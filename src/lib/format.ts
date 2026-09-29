import type { Car, Fuel } from './types';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lizingsauto.lv';

export const FUEL_LABEL: Record<Fuel, string> = {
  petrol: 'Benzīns',
  diesel: 'Dīzelis',
  electric: 'Elektro',
  hybrid: 'Hibrīds',
  plugin_hybrid: 'Plug-in hibrīds',
  lpg: 'Benzīns/gāze',
  cng: 'Dabasgāze',
};

export const BODY_LABEL: Record<string, string> = {
  suv: 'Apvidus',
  wagon: 'Universāls',
  sedan: 'Sedans',
  hatchback: 'Hečbeks',
  coupe: 'Kupeja',
  minivan: 'Minivens',
  van: 'Mikroautobuss',
  convertible: 'Kabriolets',
  pickup: 'Pikaps',
};

export const GEAR_LABEL = { automatic: 'Automāts', manual: 'Manuāla' } as const;
export const DRIVE_LABEL = { fwd: 'Priekšpiedziņa', rwd: 'Aizmugurpiedziņa', awd: 'Pilnpiedziņa 4x4' } as const;

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Melnraksts',
  published: 'Pārdošanā',
  reserved: 'Rezervēts',
  sold: 'Pārdots',
  archived: 'Arhīvā',
};

/** Zīmes uz galvenās bildes. `auto` = aprēķina automātiski, citas admins ieķeksē. */
export const BADGES: Record<string, { label: string; tone: 'signal' | 'petrol' | 'ok' | 'ink' | 'bad'; auto?: boolean; hint?: string }> = {
  fresh_ta: { label: 'Svaiga TA', tone: 'ok' },
  warranty: { label: 'Garantija', tone: 'petrol' },
  low_price: { label: 'Zema cena', tone: 'signal' },
  price_drop: { label: 'Cena samazināta', tone: 'bad', auto: true, hint: 'Parādās, ja norādīta vecā cena' },
  electric: { label: 'Elektroauto', tone: 'petrol', auto: true, hint: 'Pēc degvielas veida' },
  hybrid: { label: 'Hibrīds', tone: 'petrol', auto: true, hint: 'Pēc degvielas veida' },
  ekii: { label: 'EKII atbalsts', tone: 'ok' },
  like_new: { label: 'Kā jauns', tone: 'ink' },
  low_mileage: { label: 'Mazs nobraukums', tone: 'ink' },
  one_owner: { label: '1 īpašnieks', tone: 'ink' },
  service_history: { label: 'Servisa vēsture', tone: 'ink' },
  just_arrived: { label: 'Tikko ievests', tone: 'signal' },
  top_offer: { label: 'Top piedāvājums', tone: 'signal' },
  vat: { label: 'Ar PVN', tone: 'ink', auto: true, hint: 'Ja atzīmēts “Cena ar PVN”' },
  csdd: { label: 'CSDD nobraukums', tone: 'ok', auto: true, hint: 'Ja ievadīta CSDD nobraukuma vēsture' },
  awd: { label: '4x4', tone: 'ink', auto: true, hint: 'Pēc piedziņas' },
  seven_seats: { label: '7 vietas', tone: 'ink' },
  tow_hook: { label: 'Sakabe', tone: 'ink' },
};

export const MANUAL_BADGES = Object.entries(BADGES).filter(([, b]) => !b.auto).map(([k]) => k);

/** Noklusētā svarīguma secība (ja admins auto zīmes nav kārtojis pats). */
export const DEFAULT_BADGE_ORDER = ['top_offer', 'ekii', 'price_drop', 'low_price', 'just_arrived', 'fresh_ta', 'warranty', 'csdd', 'electric', 'hybrid', 'like_new', 'low_mileage', 'one_owner', 'service_history', 'awd', 'seven_seats', 'tow_hook', 'vat'];
/** Marķieris `badges` masīvā: admins secību noteicis pats. `!kods` = paslēpta automātiskā zīme. */
export const BADGE_ORDER_MARK = '*';

type BadgeCar = Pick<Car, 'badges' | 'fuel' | 'old_price' | 'price' | 'vat_included' | 'drive'> & { odometer_history?: Car['odometer_history'] };

/** Automātiskās zīmes, kuru nosacījums šim auto izpildās. */
export function autoBadges(car: BadgeCar): string[] {
  const out: string[] = [];
  if (car.odometer_history && car.odometer_history.length > 0 && odometerOk(car.odometer_history)) out.push('csdd');
  if (car.old_price && car.old_price > car.price) out.push('price_drop');
  if (car.fuel === 'electric') out.push('electric');
  if (car.fuel === 'hybrid' || car.fuel === 'plugin_hybrid') out.push('hybrid');
  if (car.vat_included) out.push('vat');
  if (car.drive === 'awd') out.push('awd');
  return out;
}

/** Pilna secība: saglabātā + trūkstošās zīmes noklusētajā secībā. */
export function normalizeBadgeOrder(order?: unknown): string[] {
  const valid = Array.isArray(order) ? order.filter((b): b is string => typeof b === 'string' && !!BADGES[b]) : [];
  const all = [...DEFAULT_BADGE_ORDER, ...Object.keys(BADGES)];
  return [...new Set([...valid, ...all])];
}

/** Zīmes rādīšanas secībā: admina secība šim auto, ja noteikta, citādi pēc lapas noklusētā svarīguma. */
export function carBadges(car: BadgeCar, defaultOrder: string[] = DEFAULT_BADGE_ORDER): string[] {
  const rank = (b: string) => {
    const i = defaultOrder.indexOf(b);
    return i < 0 ? 99 : i;
  };
  const raw = car.badges || [];
  const hidden = new Set(raw.filter((b) => b.startsWith('!')).map((b) => b.slice(1)));
  const auto = autoBadges(car).filter((b) => !hidden.has(b));
  const manual = raw.filter((b) => BADGES[b] && !BADGES[b].auto);
  if (!raw.includes(BADGE_ORDER_MARK)) {
    return [...new Set([...manual, ...auto])].sort((a, b) => rank(a) - rank(b));
  }
  const out: string[] = [];
  for (const b of raw) {
    if (!BADGES[b] || out.includes(b)) continue;
    if (BADGES[b].auto ? auto.includes(b) : true) out.push(b);
  }
  // jaunas automātiskās zīmes, kuras admins vēl nav redzējis — beigās
  for (const b of auto.sort((a, c) => rank(a) - rank(c))) if (!out.includes(b)) out.push(b);
  return out;
}

/** Saglabājamā forma: marķieris + secība + paslēptās automātiskās zīmes. */
export function encodeBadges(order: string[], hiddenAuto: string[]): string[] {
  return [BADGE_ORDER_MARK, ...order, ...hiddenAuto.map((b) => `!${b}`)];
}

const eur = new Intl.NumberFormat('lv-LV', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const int = new Intl.NumberFormat('lv-LV', { maximumFractionDigits: 0 });

export const money = (n: number | null | undefined) => (n == null ? '—' : eur.format(n));
export const number = (n: number | null | undefined) => (n == null ? '—' : int.format(n));
export const km = (n: number | null | undefined) => (n == null ? '—' : `${int.format(n)} km`);

export function carName(car: Pick<Car, 'make' | 'model'>) {
  return `${car.make} ${car.model}`;
}

export function engineLabel(car: Pick<Car, 'engine_volume' | 'fuel' | 'power_kw'>) {
  const parts: string[] = [];
  if (car.engine_volume) parts.push(`${car.engine_volume.toFixed(1)} l`);
  if (car.fuel) parts.push(FUEL_LABEL[car.fuel]);
  if (car.power_kw) parts.push(`${car.power_kw} kW`);
  return parts.join(', ');
}

export function slugify(s: string) {
  const map: Record<string, string> = { ā: 'a', č: 'c', ē: 'e', ģ: 'g', ī: 'i', ķ: 'k', ļ: 'l', ņ: 'n', š: 's', ū: 'u', ž: 'z', ö: 'o', ü: 'u', ä: 'a', õ: 'o' };
  return s
    .toLowerCase()
    .replace(/[āčēģīķļņšūžöüäõ]/g, (c) => map[c] || c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export function carUrl(car: Pick<Car, 'slug'>) {
  return `/auto/${car.slug}`;
}

export function odometerOk(h: { date: string; km: number }[]) {
  const s = [...h].sort((a, b) => a.date.localeCompare(b.date));
  return s.every((p, i) => i === 0 || p.km >= s[i - 1].km);
}

export function coverImage(car: Car): string | null {
  const imgs = [...(car.car_images || [])].filter((i) => !i.is_promo).sort((a, b) => a.sort - b.sort);
  return imgs[0]?.url || null;
}

export function sortedImages(car: Car) {
  return [...(car.car_images || [])].filter((i) => !i.is_promo).sort((a, b) => a.sort - b.sort);
}
