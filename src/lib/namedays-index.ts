// Tikai serverim: pilnais (paplašinātais) vārdu indekss vārdu lapām un meklēšanai.
import ext from '@/data/namedays-extended.json';
import { NAMEDAYS, slugName } from './namedays';

export const EXT_NAMEDAYS = ext as Record<string, string[]>;

export type NameEntry = { name: string; slug: string; days: string[]; main: boolean };

let cache: Map<string, NameEntry> | null = null;
export function nameIndex() {
  if (cache) return cache;
  const m = new Map<string, NameEntry>();
  const add = (name: string, day: string, main: boolean) => {
    const slug = slugName(name);
    if (!slug) return;
    const e = m.get(slug) || { name, slug, days: [], main: false };
    if (!e.days.includes(day)) e.days.push(day);
    if (main) {
      e.main = true;
      e.name = name;
    }
    m.set(slug, e);
  };
  for (const [day, names] of Object.entries(NAMEDAYS)) names.forEach((n) => add(n, day, true));
  for (const [day, names] of Object.entries(EXT_NAMEDAYS)) names.forEach((n) => add(n, day, false));
  cache = m;
  return m;
}
