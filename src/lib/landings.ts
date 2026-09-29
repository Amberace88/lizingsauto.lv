// SEO lapas pēc biežākajiem meklējumiem un kritēriji auto meklēšanas paziņojumiem.
import type { Car } from './types';
import { BODY_LABEL, FUEL_LABEL, slugify } from './format';

export type Criteria = {
  make?: string;
  model?: string;
  fuel?: string; // 'hybrid' ietver arī plug-in
  body?: string;
  gear?: string;
  drive?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxKm?: number;
  minSeats?: number;
};

export function matchCar(c: Pick<Car, 'make' | 'model' | 'fuel' | 'body_type' | 'transmission' | 'drive' | 'price' | 'year' | 'mileage' | 'seats'>, k: Criteria) {
  if (k.make && c.make.toLowerCase() !== k.make.toLowerCase()) return false;
  if (k.model && !c.model.toLowerCase().includes(k.model.toLowerCase())) return false;
  if (k.fuel && !(k.fuel === 'hybrid' ? c.fuel === 'hybrid' || c.fuel === 'plugin_hybrid' : c.fuel === k.fuel)) return false;
  if (k.body && c.body_type !== k.body) return false;
  if (k.gear && c.transmission !== k.gear) return false;
  if (k.drive && c.drive !== k.drive) return false;
  if (k.minPrice && c.price < k.minPrice) return false;
  if (k.maxPrice && c.price > k.maxPrice) return false;
  if (k.minYear && (c.year ?? 0) < k.minYear) return false;
  if (k.maxKm && (c.mileage ?? 0) > k.maxKm) return false;
  if (k.minSeats && (c.seats ?? 0) < k.minSeats) return false;
  return true;
}

/** Cilvēkam saprotams kritēriju apraksts. */
export function describeCriteria(k: Criteria) {
  const p: string[] = [];
  if (k.make) p.push(`${k.make}${k.model ? ` ${k.model}` : ''}`);
  if (k.body) p.push(BODY_LABEL[k.body]?.toLowerCase() || k.body);
  if (k.fuel) p.push(k.fuel === 'hybrid' ? 'hibrīds' : (FUEL_LABEL as Record<string, string>)[k.fuel]?.toLowerCase() || k.fuel);
  if (k.gear) p.push(k.gear === 'automatic' ? 'automāts' : 'manuāla kārba');
  if (k.drive === 'awd') p.push('4x4');
  if (k.minSeats) p.push(`${k.minSeats}+ vietas`);
  if (k.minYear) p.push(`no ${k.minYear}. gada`);
  if (k.maxKm) p.push(`līdz ${k.maxKm.toLocaleString('lv-LV')} km`);
  if (k.minPrice) p.push(`no ${k.minPrice.toLocaleString('lv-LV')} €`);
  if (k.maxPrice) p.push(`līdz ${k.maxPrice.toLocaleString('lv-LV')} €`);
  return p.join(', ') || 'jebkurš auto';
}

/** Kataloga filtru saite no kritērijiem. */
export function catalogHref(k: Criteria) {
  const q = new URLSearchParams();
  for (const [key, v] of Object.entries(k)) if (v != null && v !== '' && key !== 'minSeats') q.set(key, String(v));
  const s = q.toString();
  return s ? `/katalogs?${s}` : '/katalogs';
}

export type Landing = { slug: string; title: string; h1: string; lead: string; criteria: Criteria; group: 'budget' | 'body' | 'fuel' | 'feature' | 'make'; faq?: [string, string][] };

const budget = (n: number): Landing => ({
  slug: `lidz-${n}-eiro`,
  group: 'budget',
  title: `Lietoti auto līdz ${n.toLocaleString('lv-LV')} € ar līzingu`,
  h1: `Lietoti auto līdz ${n.toLocaleString('lv-LV')} €`,
  lead: `Pārbaudīti lietoti auto par cenu līdz ${n.toLocaleString('lv-LV')} €. Līzings no 0% pirmās iemaksas, arī ar sabojātu kredītvēsturi — mēneša maksājums redzams katram auto.`,
  criteria: { maxPrice: n },
});

export const STATIC_LANDINGS: Landing[] = [
  budget(3000),
  budget(5000),
  budget(8000),
  budget(10000),
  budget(15000),
  budget(20000),
  { slug: 'apvidus-auto', group: 'body', title: 'Lietoti apvidus auto (SUV) ar līzingu', h1: 'Lietoti apvidus auto', lead: 'Plašs salons, augstāka sēdvieta un bieži arī pilnpiedziņa. Apskati pārbaudītus SUV ar līzingu Rīgā.', criteria: { body: 'suv' } },
  { slug: 'universali', group: 'body', title: 'Lietoti universāļi ar līzingu', h1: 'Lietoti universāļi', lead: 'Ietilpīgi un ekonomiski ģimenes auto ar lielu bagāžnieku. Līzings no 0% pirmās iemaksas.', criteria: { body: 'wagon' } },
  { slug: 'sedani', group: 'body', title: 'Lietoti sedani ar līzingu', h1: 'Lietoti sedani', lead: 'Komfortabli sedani ikdienai un garākiem braucieniem — ar līzingu un iespēju atstāt veco auto kā iemaksu.', criteria: { body: 'sedan' } },
  { slug: 'minivens', group: 'body', title: 'Lietoti minivens un mikroautobusi ar līzingu', h1: 'Minivens un mikroautobusi', lead: 'Lielām ģimenēm un darbam — ietilpīgi auto ar līzingu. Arī 7 vietīgi modeļi.', criteria: { body: 'minivan' } },
  { slug: 'elektroauto', group: 'fuel', title: 'Lietoti elektroauto ar EKII atbalstu un līzingu', h1: 'Lietoti elektroauto', lead: 'Elektroauto ar valsts EKII atbalstu — mēs sakārtojam dokumentus un līzingu. Atbalsts var segt līdz 90% no auto cenas.', criteria: { fuel: 'electric' } },
  { slug: 'hibridi', group: 'fuel', title: 'Lietoti hibrīdauto ar līzingu', h1: 'Lietoti hibrīdi', lead: 'Zems patēriņš pilsētā bez uzlādes rūpēm. Hibrīdi un plug-in hibrīdi ar līzingu.', criteria: { fuel: 'hybrid' } },
  { slug: 'dizelis', group: 'fuel', title: 'Lietoti dīzeļa auto ar līzingu', h1: 'Lietoti dīzeļa auto', lead: 'Ekonomiski auto garākiem braucieniem. Pārbaudīti dīzeļa auto ar līzingu Rīgā.', criteria: { fuel: 'diesel' } },
  { slug: 'benzins', group: 'fuel', title: 'Lietoti benzīna auto ar līzingu', h1: 'Lietoti benzīna auto', lead: 'Benzīna auto ar līzingu no 0% pirmās iemaksas, arī ar sabojātu kredītvēsturi.', criteria: { fuel: 'petrol' } },
  { slug: 'automats', group: 'feature', title: 'Lietoti auto ar automātisko ātrumkārbu', h1: 'Auto ar automātisko kārbu', lead: 'Ērta braukšana pilsētā — lietoti auto ar automātisko ātrumkārbu un līzingu.', criteria: { gear: 'automatic' } },
  { slug: '4x4-pilnpiedzina', group: 'feature', title: 'Lietoti 4x4 pilnpiedziņas auto ar līzingu', h1: 'Pilnpiedziņas auto 4x4', lead: 'Droša braukšana ziemā un pa grants ceļiem. 4x4 auto ar līzingu Rīgā.', criteria: { drive: 'awd' } },
  { slug: '7-vietigi-auto', group: 'feature', title: 'Lietoti 7 vietīgi auto ar līzingu', h1: '7 vietīgi auto', lead: 'Lielām ģimenēm — 7 vietīgi auto. Goda ģimenēm elektroauto iegādei pieejams palielināts EKII atbalsts.', criteria: { minSeats: 7 } },
  { slug: 'auto-ar-mazu-nobraukumu', group: 'feature', title: 'Lietoti auto ar mazu nobraukumu', h1: 'Auto ar mazu nobraukumu', lead: 'Lietoti auto ar nobraukumu līdz 120 000 km — pārbaudīti un ar līzingu.', criteria: { maxKm: 120000 } },
  { slug: 'jaunaki-auto', group: 'feature', title: 'Jaunāki lietoti auto (5 gadi un jaunāki)', h1: 'Jaunāki lietoti auto', lead: 'Auto, kas nav vecāki par 5 gadiem — modernas drošības sistēmas un zemākas uzturēšanas izmaksas.', criteria: { minYear: new Date().getFullYear() - 5 } },
];

export function makeLanding(make: string): Landing {
  return {
    slug: slugify(make),
    group: 'make',
    title: `Lietoti ${make} auto ar līzingu Rīgā`,
    h1: `Lietoti ${make}`,
    lead: `Pārbaudīti lietoti ${make} auto no Eiropas. Līzings no 0% pirmās iemaksas, arī ar sabojātu kredītvēsturi un ārzemēs strādājošajiem.`,
    criteria: { make },
  };
}

export function allLandings(cars: Pick<Car, 'make'>[]) {
  const makes = [...new Set(cars.map((c) => c.make))].sort((a, b) => a.localeCompare(b));
  return [...STATIC_LANDINGS, ...makes.map(makeLanding)];
}
