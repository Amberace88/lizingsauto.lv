import type { LeasingSettings } from './types';

export const DEFAULT_LEASING: LeasingSettings = {
  rate: 9,
  term: 84,
  minTerm: 12,
  maxTerm: 96,
  downPct: 0,
  minDownPct: 0,
  maxDownPct: 50,
  residualPct: 0,
  contractFee: 0,
  monthlyFee: 0,
};

/** Anuitātes maksājums ar iespējamu atlikušo vērtību (balloon). */
export function monthlyPayment(opts: { price: number; downPct?: number; down?: number; rate: number; term: number; residualPct?: number; monthlyFee?: number }) {
  const down = opts.down ?? (opts.price * (opts.downPct ?? 0)) / 100;
  const principal = Math.max(0, opts.price - down);
  const residual = (opts.price * (opts.residualPct ?? 0)) / 100;
  const r = opts.rate / 100 / 12;
  const n = Math.max(1, opts.term);
  let pmt: number;
  if (r === 0) pmt = (principal - residual) / n;
  else pmt = (principal - residual / Math.pow(1 + r, n)) * (r / (1 - Math.pow(1 + r, -n)));
  return Math.max(0, pmt + (opts.monthlyFee ?? 0));
}

export function leasingSummary(opts: { price: number; downPct: number; rate: number; term: number; residualPct?: number; contractFee?: number; monthlyFee?: number }) {
  const down = (opts.price * opts.downPct) / 100;
  const residual = (opts.price * (opts.residualPct ?? 0)) / 100;
  const pmt = monthlyPayment(opts);
  const totalPaid = down + pmt * opts.term + residual + (opts.contractFee ?? 0);
  const financed = opts.price - down;
  const interest = totalPaid - opts.price;
  return { down, financed, residual, pmt, totalPaid, interest };
}

/** Cik lielu auto cenu var atļauties pie mēneša maksājuma. */
export function priceForPayment(opts: { payment: number; down: number; rate: number; term: number }) {
  const r = opts.rate / 100 / 12;
  const n = opts.term;
  const principal = r === 0 ? opts.payment * n : (opts.payment * (1 - Math.pow(1 + r, -n))) / r;
  return principal + opts.down;
}

export function fromPayment(price: number, s: Pick<LeasingSettings, 'rate' | 'term' | 'downPct' | 'residualPct' | 'monthlyFee'>) {
  return Math.round(monthlyPayment({ price, downPct: s.downPct, rate: s.rate, term: s.term, residualPct: s.residualPct, monthlyFee: s.monthlyFee }));
}
