// Patērētāju kreditēšanas reklāmas prasības (PTAL 8.³ pants, spēkā no 19.08.2026.).
// Viss, kas saistīts ar brīdinājumu, reprezentatīvo piemēru, GPL un aizliegtajiem formulējumiem — vienuviet.
import type { LeasingSettings } from './types';
import { monthlyPayment } from './leasing';

/** Obligātais brīdinājums katrā reklāmā, kas piedāvā kreditēšanu. */
export const CREDIT_WARNING = 'Brīdinām! Aizņemšanās maksā naudu.';

export const CREDIT_DEFAULTS = {
  exampleAmount: 10000,
  lender: 'Tavs Auto sadarbības līzinga devēji un ESTO LV AS (preču nomaksas kredīts)',
  extras: 'Līzinga devējs var pieprasīt KASKO apdrošināšanu; tās izmaksas nav iekļautas aprēķinā, jo nav zināmas iepriekš.',
};

/**
 * Gada procentu likme (GPL) pēc ES vienotās formulas:
 * kredīta summa = Σ maksājumi / (1+X)^(t), t — gados no līguma noslēgšanas.
 */
export function apr(credit: number, payments: { t: number; amount: number }[]) {
  if (credit <= 0) return 0;
  const f = (x: number) => payments.reduce((s, p) => s + p.amount / Math.pow(1 + x, p.t), 0) - credit;
  let lo = -0.99;
  let hi = 10;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) lo = mid;
    else hi = mid;
  }
  return Math.round(((lo + hi) / 2) * 10000) / 100; // procentos, 2 zīmes
}

export type CreditExample = {
  price: number;
  down: number;
  downPct: number;
  credit: number;
  term: number;
  rate: number;
  contractFee: number;
  monthlyFee: number;
  residual: number;
  monthly: number;
  total: number; // kopējā atmaksājamā summa (bez pirmās iemaksas)
  totalWithDown: number;
  apr: number;
};

/** Pilns kredīta piemērs konkrētai cenai un nosacījumiem. */
export function creditExample(price: number, s: Pick<LeasingSettings, 'rate' | 'term' | 'downPct' | 'residualPct' | 'contractFee' | 'monthlyFee'> & { aprOverride?: number | null }, opts: { downPct?: number; term?: number; down?: number } = {}): CreditExample {
  const term = opts.term ?? s.term;
  const downPct = opts.down != null ? (price ? (opts.down / price) * 100 : 0) : (opts.downPct ?? s.downPct);
  const down = opts.down ?? Math.round((price * downPct) / 100);
  const credit = Math.max(0, price - down);
  const residual = Math.round((price * (s.residualPct || 0)) / 100);
  const monthly = monthlyPayment({ price, down, rate: s.rate, term, residualPct: s.residualPct, monthlyFee: s.monthlyFee });
  const pay: { t: number; amount: number }[] = [];
  if (s.contractFee) pay.push({ t: 0, amount: s.contractFee });
  for (let k = 1; k <= term; k++) pay.push({ t: k / 12, amount: monthly });
  if (residual) pay.push({ t: term / 12, amount: residual });
  const total = monthly * term + residual + (s.contractFee || 0);
  return {
    price,
    down,
    downPct: Math.round(downPct * 10) / 10,
    credit,
    term,
    rate: s.rate,
    contractFee: s.contractFee || 0,
    monthlyFee: s.monthlyFee || 0,
    residual,
    monthly: Math.round(monthly),
    total: Math.round(total),
    totalWithDown: Math.round(total + down),
    apr: s.aprOverride && s.aprOverride > 0 ? s.aprOverride : apr(credit, pay),
  };
}

export const pct = (n: number) => `${n.toLocaleString('lv-LV', { maximumFractionDigits: 2 })}%`;
const eur = (n: number) => `${Math.round(n).toLocaleString('lv-LV')} €`;

/** Reprezentatīvā piemēra teksts (viens teikums), ko var likt jebkur — arī portālu sludinājumos. */
export function exampleText(e: CreditExample, lender?: string) {
  return [
    `Reprezentatīvais piemērs: auto cena ${eur(e.price)}, pirmā iemaksa ${eur(e.down)} (${pct(e.downPct)}), kredīta kopējā summa ${eur(e.credit)}`,
    `termiņš ${e.term} mēn.`,
    `aizņēmuma likme ${pct(e.rate)} gadā`,
    e.contractFee ? `līguma noformēšanas maksa ${eur(e.contractFee)}` : null,
    e.monthlyFee ? `ikmēneša komisija ${eur(e.monthlyFee)}` : null,
    e.residual ? `atlikusī vērtība ${eur(e.residual)}` : null,
    `ikmēneša maksājums ${eur(e.monthly)}`,
    `kopējā atmaksājamā summa ${eur(e.total)}`,
    `GPL ${pct(e.apr)}.`,
  ]
    .filter(Boolean)
    .join(', ')
    .concat(lender ? ` Kredītu izsniedz ${lender}; galīgos nosacījumus nosaka kredīta devējs pēc kredītspējas izvērtēšanas.` : ' Galīgos nosacījumus nosaka kredīta devējs pēc kredītspējas izvērtēšanas.');
}

/**
 * Formulējumi, ko kreditēšanas reklāmā lietot nedrīkst (PTAL 8.³ panta otrā daļa):
 * informācija par kredītu personām ar negatīvu kredītvēsturi, viegluma/ātruma uzsvēršana u.c.
 */
export const BANNED_CREDIT_PHRASES: RegExp[] = [
  /(saboj|bojāt|bojat|negatīv|slikt|problemātisk)\S*\s+kredīt\S*\s*vēstur/i,
  /(плох|испорч|негатив)\S*\s+кредитн/i,
  /kredīt\S*\s*vēstur\S*\s+(nav\s+)?(problēm|šķērsl)/i,
  /banka\s+atteica|bankā\s+atteica|ja\s+banka\s+ir\s+atteikusi|citur\s+atteica/i,
  /līzing\S*(\s+iespēj\S*)?\s+(arī\s+)?visiem|лизинг\S*\s+для\s+всех/i,
  /bez\s+pārbaud/i,
  /lēmums\s+(dažu\s+)?(minūš|stundu)/i,
  /(apstiprin\S*|kredīt\S*|līzing\S*)\s+(dažās\s+)?minūt/i,
  /neierobežot\S*\s+kredīt/i,
  /nedomā\s+par\s+naudu|bez\s+raizēm/i,
];

export const isCreditCompliant = (text?: string | null) => !text || !BANNED_CREDIT_PHRASES.some((r) => r.test(text));

/** Ja admin ievadītais teksts satur aizliegtu formulējumu, rādām drošo noklusējumu. */
export const compliantOr = (text: string | null | undefined, fallback: string) => (text && isCreditCompliant(text) ? text : fallback);

/** Tirgotāja teksts publicēšanai: bez izmaiņām, tikai izlaižot rindas ar aizliegtiem kredīta formulējumiem. */
export const publicText = (text?: string | null) => (text || '').replace(/\r/g, '').split('\n').filter((l) => isCreditCompliant(l)).join('\n').trim();
