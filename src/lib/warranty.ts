// Pagarinātā garantija sadarbībā ar Mango Insurance (Car Warranty).
// Dati no Mango Insurance informatīvajiem materiāliem. Cenas norāda admins iestatījumos.

export type PlanId = 'deluxe' | 'advantage' | 'comfort' | 'plus';
export const PLAN_ORDER: PlanId[] = ['plus', 'comfort', 'advantage', 'deluxe'];

export const PLANS: Record<PlanId, { name: string; maxAge: number; maxKm: number; perClaim: number | 'price'; total: number | 'price'; tagline: string }> = {
  plus: { name: 'PLUS', maxAge: 15, maxKm: 300000, perClaim: 1000, total: 2000, tagline: 'Dzinējs, kārba un diferenciālis — svarīgākais vecākam auto' },
  comfort: { name: 'COMFORT', maxAge: 10, maxKm: 250000, perClaim: 3000, total: 8000, tagline: 'Plašs segums: turbo, stūre, bremzes, sajūgs, elektrība' },
  advantage: { name: 'ADVANTAGE', maxAge: 6, maxKm: 200000, perClaim: 6000, total: 'price', tagline: 'Arī elektronika, mehatronika un kondicionētājs' },
  deluxe: { name: 'DELUXE', maxAge: 6, maxKm: 160000, perClaim: 'price', total: 'price', tagline: 'Maksimālais segums — viss, kas nav skaidri izslēgts' },
};

// Segums: D A C P (deluxe, advantage, comfort, plus)
type Row = [string, string];
export const COVERAGE: { group: string; icon: string; note?: string; rows: Row[] }[] = [
  { group: 'Dzinējs', icon: 'engine', rows: [['Visas iekšējās eļļotās sastāvdaļas', 'DACP'], ['Gaisa ieplūdes kolektors', 'DAC'], ['Spararats', 'DAC'], ['Gredzenveida zobrats', 'DAC'], ['Turbokompresors', 'DAC'], ['Elektroniskais dzinēja vadības bloks', 'DA'], ['Citas sastāvdaļas, kas nav skaidri izslēgtas', 'D']] },
  { group: 'Dzinēja dzesēšanas sistēma', icon: 'cooling', rows: [['Ūdens sūknis', 'DAC'], ['Radiators', 'DA'], ['Eļļas dzesētājs', 'DA'], ['Citas sastāvdaļas', 'D']] },
  { group: 'Pārnesumkārba', icon: 'gearbox', note: 'Manuālā, automātiskā vai CVT', rows: [['Visas iekšējās eļļotās sastāvdaļas', 'DACP'], ['Mehatronika', 'DA'], ['Vadības bloki', 'DA'], ['Citas sastāvdaļas', 'D']] },
  { group: 'Griezes momenta pārveidotājs', icon: 'torque', rows: [['Visas iekšējās mehāniskās sastāvdaļas', 'DAC'], ['Citas sastāvdaļas', 'D']] },
  { group: 'Diferenciālis', icon: 'diff', rows: [['Visas iekšējās eļļotās sastāvdaļas', 'DACP'], ['Citas sastāvdaļas', 'D']] },
  { group: 'Pilnpiedziņa', icon: 'awd', rows: [['Visas iekšējās eļļotās piedziņas sastāvdaļas', 'DAC'], ['Citas sastāvdaļas', 'D']] },
  { group: 'Stūres iekārta', icon: 'steering', note: 'Ieskaitot stūres pastiprinātāju', rows: [['Stūres statnis un zobrats', 'DAC'], ['Stūres pastiprinātāja sūknis un statnis', 'DAC'], ['Elektriskais stūres pastiprinātāja motors', 'DAC'], ['Citas sastāvdaļas', 'D']] },
  { group: 'Bremzes', icon: 'brakes', rows: [['Galvenais un riteņu bremžu cilindri', 'DAC'], ['Spiediena ierobežošanas vārsts', 'DAC'], ['Bremžu pastiprinātājs', 'DA'], ['ABS modulis un sensori', 'DA'], ['Citas sastāvdaļas', 'D']] },
  { group: 'Sajūgs', icon: 'clutch', rows: [['Spiediena disks', 'DAC'], ['Atlaišanas gultnis', 'DAC'], ['Galvenais un darba cilindrs', 'DAC'], ['Citas sastāvdaļas', 'D']] },
  { group: 'Degvielas sistēma', icon: 'fuel', rows: [['Mehāniskie un elektriskie degvielas sūkņi', 'DAC'], ['Droseļvārsts, gaisa plūsmas mērītājs, inžektori', 'DA'], ['EGR vārsts', 'DA'], ['DPF filtrs', 'D'], ['Citas sastāvdaļas', 'D']] },
  { group: 'Elektriskās sastāvdaļas', icon: 'electric', rows: [['Startera motors un ģenerators', 'DAC'], ['Aizdedzes spole, sprieguma regulators', 'DAC'], ['Tīrītāju un mazgātāju motori', 'DAC'], ['Logu, jumta, centrālās atslēgas motori', 'DA'], ['Sildītāja ventilatora motors', 'DA'], ['Citas sastāvdaļas', 'D']] },
  { group: 'Gaisa kondicionētājs', icon: 'ac', rows: [['Kompresora bloks', 'DA'], ['Gaisa kontroles amortizatori', 'DA'], ['Citas sastāvdaļas', 'D']] },
  { group: 'Ekspluatācijas materiāli un korpusi', icon: 'fluids', note: 'Ja jāmaina apdrošinātas sastāvdaļas bojājuma dēļ', rows: [['Šķidrumi un filtri', 'DACP'], ['Korpusi', 'DACP']] },
  { group: 'Evakuators', icon: 'tow', rows: [['Transportēšana līdz 200 € vienā gadījumā', 'DACP']] },
];
export const PLAN_LETTER: Record<PlanId, string> = { deluxe: 'D', advantage: 'A', comfort: 'C', plus: 'P' };

export interface WarrantySettings {
  enabled: boolean;
  provider: string;
  // cenas eiro pēc plāna un termiņa (12/24/36 mēn.); tukšs = "cena pēc pieprasījuma"
  prices: Record<PlanId, Record<'12' | '24' | '36', number | '' | null>>;
  rentalPerDay: number;
  rentalDays: number;
  towing: number;
  examples: string; // "Nosaukums; summa" katrā rindā
}

export const DEFAULT_WARRANTY: WarrantySettings = {
  enabled: true,
  provider: 'Mango Insurance',
  prices: {
    plus: { '12': null, '24': null, '36': null },
    comfort: { '12': null, '24': null, '36': null },
    advantage: { '12': null, '24': null, '36': null },
    deluxe: { '12': null, '24': null, '36': null },
  },
  rentalPerDay: 60,
  rentalDays: 7,
  towing: 200,
  examples: 'Ieplūdes kolektora nomaiņa (5 mēn. pēc iegādes); 550\nSajūga komplekta nomaiņa (11 mēn. pēc iegādes); 1050\nDiferenciāļa nomaiņa (18 mēn. pēc iegādes); 1775',
};

export function parseExamples(s: string) {
  return (s || '')
    .split('\n')
    .map((l) => l.split(';'))
    .filter((p) => p.length >= 2 && p[0].trim())
    .map(([label, cost]) => ({ label: label.trim(), cost: Number(String(cost).replace(/[^\d.]/g, '')) || 0 }));
}

export function planPrice(w: WarrantySettings, plan: PlanId, months: 12 | 24 | 36) {
  const v = w.prices?.[plan]?.[String(months) as '12'];
  return typeof v === 'number' && v > 0 ? v : null;
}

/** Kuri plāni pieejami konkrētam auto (pēc vecuma un nobraukuma). */
export function eligiblePlans(year: number | null, mileage: number | null): { plan: PlanId; ok: boolean; reason?: string }[] {
  const age = year ? new Date().getFullYear() - year : 0;
  return PLAN_ORDER.map((plan) => {
    const p = PLANS[plan];
    if (age > p.maxAge) return { plan, ok: false, reason: `Auto vecāks par ${p.maxAge} gadiem` };
    if ((mileage ?? 0) > p.maxKm) return { plan, ok: false, reason: `Nobraukums virs ${p.maxKm.toLocaleString('lv-LV')} km` };
    return { plan, ok: true };
  });
}

export function limitLabel(v: number | 'price') {
  return v === 'price' ? 'līdz auto iegādes cenai' : `${v.toLocaleString('lv-LV')} €`;
}
