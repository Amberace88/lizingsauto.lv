// Latviešu vārda dienu kalendārs (dati: github.com/slikts/vardadienas, MIT). Formāts { 'MM-DD': string[] }.
import main from '@/data/namedays.json';

export const NAMEDAYS = main as Record<string, string[]>;

export const MONTHS = ['janvāris', 'februāris', 'marts', 'aprīlis', 'maijs', 'jūnijs', 'jūlijs', 'augusts', 'septembris', 'oktobris', 'novembris', 'decembris'];
export const MONTHS_LOC = ['janvārī', 'februārī', 'martā', 'aprīlī', 'maijā', 'jūnijā', 'jūlijā', 'augustā', 'septembrī', 'oktobrī', 'novembrī', 'decembrī'];
export const MONTHS_GEN = ['janvāra', 'februāra', 'marta', 'aprīļa', 'maija', 'jūnija', 'jūlija', 'augusta', 'septembra', 'oktobra', 'novembra', 'decembra'];

/** Datums Rīgas laikā kā { key: 'MM-DD', d, m, y }. */
export function rigaDay(offsetDays = 0, base = new Date()) {
  const t = new Date(base.getTime() + offsetDays * 864e5);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Riga', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(t);
  const get = (k: string) => parts.find((p) => p.type === k)!.value;
  const m = Number(get('month'));
  const d = Number(get('day'));
  return { key: `${get('month')}-${get('day')}`, d, m, y: Number(get('year')) };
}

export const dayLabel = (key: string) => {
  const [m, d] = key.split('-').map(Number);
  return `${d}. ${MONTHS_GEN[m - 1]}`;
};
export const dayLabelLoc = (key: string) => {
  const [m, d] = key.split('-').map(Number);
  return `${d}. ${MONTHS_LOC[m - 1]}`;
};

export function slugName(n: string) {
  const map: Record<string, string> = { ā: 'a', č: 'c', ē: 'e', ģ: 'g', ī: 'i', ķ: 'k', ļ: 'l', ņ: 'n', š: 's', ū: 'u', ž: 'z', ō: 'o', ŗ: 'r' };
  return n.toLowerCase().replace(/[āčēģīķļņšūžōŗ]/g, (c) => map[c] || c).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
