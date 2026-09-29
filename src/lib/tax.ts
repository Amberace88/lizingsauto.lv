// Transportlīdzekļa ekspluatācijas nodoklis (M1) — 2026. gada likmes pēc likuma 4. panta.
import type { Car } from './types';

export const CO2: [number, number][] = [[50, 0], [95, 15], [115, 54], [130, 93], [155, 132], [175, 159], [200, 186], [225, 237], [250, 291], [275, 369], [300, 450], [350, 609], [Infinity, 831]];
export const CC: [number, number][] = [[1500, 12], [2000, 27], [2500, 42], [3000, 60], [3500, 102], [4000, 177], [5000, 252], [Infinity, 327]];
export const KW: [number, number][] = [[55, 12], [92, 27], [129, 42], [166, 60], [203, 102], [240, 177], [300, 252], [Infinity, 327]];
export const MASS: [number, number][] = [[1500, 42], [1800, 90], [2100, 150], [2600, 192], [3000, 231], [3500, 267], [Infinity, 303]];
export const pickRate = (t: [number, number][], v: number) => t.find(([lim]) => v <= lim)![1];

/** Aptuvens gada nodoklis konkrētam auto (ja pietiek datu), citādi null. */
export function carTax(car: Pick<Car, 'fuel' | 'co2' | 'engine_volume' | 'power_kw' | 'year'>): { total: number; parts: [string, number][] } | null {
  if (car.fuel === 'electric') return { total: 0, parts: [['Elektroauto', 0]] };
  if (!car.year || car.year < 2009 || car.co2 == null || !car.engine_volume || !car.power_kw) return null;
  const parts: [string, number][] = [
    ['Par CO₂ izmešiem', pickRate(CO2, car.co2)],
    ['Par motora tilpumu', pickRate(CC, Math.round(car.engine_volume * 1000))],
    ['Par motora jaudu', pickRate(KW, car.power_kw)],
  ];
  return { total: parts.reduce((a, [, v]) => a + v, 0), parts };
}
