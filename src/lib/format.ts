import type { Car, Fuel } from './types';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tavsauto.eu';
/** Domēns bez protokola, piem. „tavsauto.eu” — tekstiem lapā. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\/(www\.)?/, '');
/** Vai šis ir īstais publiskais domēns (tikai tad ļaujam meklētājiem indeksēt). */
export const IS_LIVE_DOMAIN = /^https:\/\/(www\.)?(lizingsauto\.lv|tavsauto\.eu)$/.test(SITE_URL);

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
