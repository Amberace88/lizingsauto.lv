import type { Car } from './types';

export interface EkiiSettings {
  active: boolean;
  newAmount: number;
  usedAmount: number;
  familyNew5: number;
  familyNew7: number;
  familyUsed5: number;
  familyUsed7: number;
  scrapBonus: number;
  extraChild: number;
  priceCap5: number; // bez PVN
  priceCap6: number; // bez PVN, 6+ vietas
  usedMaxAgeYears: number;
  usedMaxKm: number;
  newMaxKm: number;
  sourceUrl: string;
}

export const DEFAULT_EKII: EkiiSettings = {
  active: true,
  newAmount: 4000,
  usedAmount: 3000,
  familyNew5: 6750,
  familyNew7: 9000,
  familyUsed5: 5000,
  familyUsed7: 6750,
  scrapBonus: 2000,
  extraChild: 1000,
  priceCap5: 45000,
  priceCap6: 60000,
  usedMaxAgeYears: 7,
  usedMaxKm: 150000,
  newMaxKm: 6000,
  sourceUrl: 'https://www.lvif.gov.lv/',
};

export type EkiiInput = {
  price: number;
  vatIncluded: boolean;
  year: number | null;
  mileage: number | null;
  seats: number;
  isNew?: boolean;
  goda: boolean;
  children: number;
  scrap: boolean;
};

export function ekiiCalc(s: EkiiSettings, i: EkiiInput) {
  const reasons: string[] = [];
  const now = new Date().getFullYear();
  const isNew = i.isNew ?? ((i.mileage ?? 0) <= s.newMaxKm && (i.year ?? 0) >= now - 1);
  const priceNoVat = i.vatIncluded ? i.price / 1.21 : i.price;
  const cap = i.seats >= 6 ? s.priceCap6 : s.priceCap5;
  let eligible = s.active;
  if (!s.active) reasons.push('Programma šobrīd nav aktīva');
  if (priceNoVat > cap) {
    eligible = false;
    reasons.push(`Cena bez PVN pārsniedz ${cap.toLocaleString('lv-LV')} € limitu`);
  }
  if (!isNew) {
    if (i.year && now - i.year > s.usedMaxAgeYears) {
      eligible = false;
      reasons.push(`Lietotam auto jābūt ne vecākam par ${s.usedMaxAgeYears} gadiem`);
    }
    if (i.mileage && i.mileage > s.usedMaxKm) {
      eligible = false;
      reasons.push(`Nobraukums virs ${s.usedMaxKm.toLocaleString('lv-LV')} km`);
    }
  }
  let base = 0;
  if (i.goda && i.seats >= 5) base = isNew ? (i.seats >= 7 ? s.familyNew7 : s.familyNew5) : i.seats >= 7 ? s.familyUsed7 : s.familyUsed5;
  else base = isNew ? s.newAmount : s.usedAmount;
  const childBonus = i.goda && i.seats >= 5 && i.children >= 4 ? (i.children - 3) * s.extraChild : 0;
  const scrap = i.scrap ? s.scrapBonus : 0;
  const total = eligible ? base + childBonus + scrap : 0;
  return { eligible, isNew, base: eligible ? base : 0, childBonus: eligible ? childBonus : 0, scrap: eligible ? scrap : 0, total, finalPrice: Math.max(0, i.price - total), reasons };
}

/** Īss novērtējums auto kartiņai/profilam (bez papildu bonusiem) */
export function ekiiForCar(s: EkiiSettings, car: Pick<Car, 'fuel' | 'price' | 'vat_included' | 'year' | 'mileage' | 'seats'>) {
  if (car.fuel !== 'electric') return null;
  const r = ekiiCalc(s, { price: car.price, vatIncluded: car.vat_included, year: car.year, mileage: car.mileage, seats: car.seats || 5, goda: false, children: 0, scrap: false });
  return r.eligible ? r : null;
}
