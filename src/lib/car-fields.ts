// Auto tehnisko datu lauki: kurus rādīt (adminā un lapā) un kādā secībā. Glabājas settings.car_fields.
export type SpecKey =
  | 'fuel' | 'transmission' | 'body_type' | 'drive' | 'mileage' | 'engine_volume' | 'power_kw' | 'consumption' | 'co2'
  | 'battery_kwh' | 'range_km' | 'color' | 'doors' | 'seats' | 'euro_class' | 'vin' | 'reg_number' | 'first_registration' | 'ta_until';

export type SpecKind = 'select' | 'int' | 'dec' | 'text' | 'date' | 'vin' | 'reg';
export type SpecDef = { key: SpecKey; label: string; kind: SpecKind; unit?: string; placeholder?: string; ev?: boolean; hint?: string; min?: number; max?: number; decimals?: number };

export const SPEC_FIELDS: SpecDef[] = [
  { key: 'fuel', label: 'Degviela', kind: 'select' },
  { key: 'transmission', label: 'Ātrumkārba', kind: 'select' },
  { key: 'body_type', label: 'Virsbūve', kind: 'select' },
  { key: 'drive', label: 'Piedziņa', kind: 'select' },
  { key: 'mileage', label: 'Nobraukums', kind: 'int', unit: 'km', placeholder: '185 000', max: 2_000_000 },
  { key: 'engine_volume', label: 'Dzinēja tilpums', kind: 'dec', unit: 'l', placeholder: '2,0', min: 0.6, max: 8.5, decimals: 1, hint: 'Var ievadīt arī cm³ (piem., 1968) — pārvērsīs litros' },
  { key: 'power_kw', label: 'Jauda', kind: 'int', unit: 'kW', placeholder: '110', min: 20, max: 1200 },
  { key: 'consumption', label: 'Vid. patēriņš', kind: 'dec', unit: 'l/100 km', placeholder: '5,8', min: 1, max: 30, decimals: 1 },
  { key: 'co2', label: 'CO₂ izmeši', kind: 'int', unit: 'g/km', placeholder: '139', min: 0, max: 600 },
  { key: 'battery_kwh', label: 'Baterija', kind: 'dec', unit: 'kWh', ev: true, min: 1, max: 250, decimals: 1 },
  { key: 'range_km', label: 'Nobraukums ar uzlādi', kind: 'int', unit: 'km', ev: true, min: 1, max: 1500 },
  { key: 'color', label: 'Krāsa', kind: 'text', placeholder: 'piem., melna metālika' },
  { key: 'doors', label: 'Durvis', kind: 'int', min: 2, max: 6 },
  { key: 'seats', label: 'Sēdvietas', kind: 'int', min: 1, max: 9 },
  { key: 'euro_class', label: 'Euro klase', kind: 'text', placeholder: 'Euro 6' },
  { key: 'vin', label: 'VIN', kind: 'vin' },
  { key: 'reg_number', label: 'Valsts numurs', kind: 'reg', hint: 'Lapā netiek rādīts' },
  { key: 'first_registration', label: 'Pirmā reģistrācija', kind: 'date' },
  { key: 'ta_until', label: 'Tehniskā apskate līdz', kind: 'date' },
];

export const SPEC_BY_KEY = Object.fromEntries(SPEC_FIELDS.map((f) => [f.key, f])) as Record<SpecKey, SpecDef>;
export const DEFAULT_HIDDEN: SpecKey[] = ['co2', 'euro_class', 'doors'];

export type CarFieldsSettings = { order: SpecKey[]; hidden: SpecKey[]; bumpOnEdit: boolean };

export function normalizeCarFields(v: unknown): CarFieldsSettings {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<CarFieldsSettings>;
  const known = new Set(SPEC_FIELDS.map((f) => f.key));
  const order = (Array.isArray(o.order) ? o.order : []).filter((k): k is SpecKey => known.has(k as SpecKey));
  for (const f of SPEC_FIELDS) if (!order.includes(f.key)) order.push(f.key);
  const hidden = Array.isArray(o.hidden) ? o.hidden.filter((k): k is SpecKey => known.has(k as SpecKey)) : DEFAULT_HIDDEN;
  return { order, hidden, bumpOnEdit: o.bumpOnEdit !== false };
}

/** Vai lauks redzams (EV laukus rāda tikai elektroauto/PHEV; CO₂ PHEV vienmēr, jo vajadzīgs EKII atbalstam). */
export function fieldVisible(s: CarFieldsSettings, key: SpecKey, fuel?: string | null) {
  const ev = fuel === 'electric' || fuel === 'plugin_hybrid';
  if (SPEC_BY_KEY[key].ev && !ev) return false;
  if (key === 'co2' && fuel === 'plugin_hybrid') return true;
  return !s.hidden.includes(key);
}

// ---------- Datumi: DD.MM.GGGG ↔ ISO ----------
export function isoToLv(iso?: string | null) {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
}
/** Atgriež ISO datumu vai null (tukšs), vai undefined (nederīgs). Pieņem 5.3.2019, 05.03.2019, 05/03/2019, 05032019. */
export function lvToIso(s: string): string | null | undefined {
  const t = s.trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2})[./\-\s](\d{1,2})[./\-\s](\d{4})$/) || t.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!m) return undefined;
  const d = +m[1], mo = +m[2], y = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (y < 1950 || y > 2100 || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return undefined;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ---------- Skaitļi ----------
/** "1 968", "2,0", "5.8 l" → skaitlis; tukšs → null; nederīgs → undefined. */
export function parseNum(s: string): number | null | undefined {
  const t = s.replace(/[\s ]/g, '').replace(/[^\d.,-]/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return isFinite(n) ? n : undefined;
}
export const fmtNum = (n: number | null | undefined, decimals = 0) =>
  n == null ? '' : decimals ? n.toLocaleString('lv-LV', { minimumFractionDigits: decimals, maximumFractionDigits: 2 }) : Math.round(n).toLocaleString('lv-LV');
