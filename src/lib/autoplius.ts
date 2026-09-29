import type { Car } from './types';

// Autoplius.lt importa klasifikatori (no https://autoplius.lt/importhandler?datacollector=1&category_id=2)
export const AP_BODY: Record<string, number> = { sedan: 4, hatchback: 2, wagon: 5, minivan: 6, suv: 7, coupe: 1, convertible: 3, pickup: 10, van: 28055 };
export const AP_FUEL: Record<string, number> = { diesel: 32, petrol: 30, lpg: 31, hybrid: 36, plugin_hybrid: 36, electric: 35, cng: 33 };
export const AP_GEAR: Record<string, number> = { automatic: 38, manual: 37 };
export const AP_DRIVE: Record<string, number> = { fwd: 17363, rwd: 17362, awd: 17364 };
const AP_COLORS: [RegExp, number][] = [[/balt/i, 18938], [/melns|melna|black/i, 18930], [/zil|blue/i, 18931], [/pelēk|sudrab|silver|grey|gray/i, 18933], [/sarkan|red/i, 18937], [/zaļ|green/i, 18934], [/brūn|bēš|brown|beige/i, 18932], [/dzelten|zelt/i, 18939], [/oranž/i, 18935], [/violet/i, 18936]];

type Item = { id: string; title: string };
const BASE = 'https://autoplius.lt/importhandler?datacollector=1&category_id=2';

function parseItems(xml: string, tag: string): Item[] {
  const block = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!block) return [];
  const out: Item[] = [];
  const re = /<item>\s*<id>([^<]*)<\/id>\s*<title>([^<]*)<\/title>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block[1]))) out.push({ id: m[1], title: decode(m[2]) });
  return out;
}
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

async function fetchXml(url: string) {
  const r = await fetch(url, { next: { revalidate: 86400 } });
  if (!r.ok) throw new Error(`autoplius ${r.status}`);
  return r.text();
}

export async function resolveMakeModel(make: string, model: string) {
  const makes = parseItems(await fetchXml(BASE), 'make_id');
  const alias: Record<string, string> = { mercedesbenz: 'mercedesbenz', mini: 'mini', volkswagen: 'volkswagen' };
  const mk = makes.find((x) => norm(x.title) === (alias[norm(make)] || norm(make))) || makes.find((x) => norm(x.title).startsWith(norm(make)));
  if (!mk) return { makeId: null, modelId: null, warning: `Marka “${make}” nav atrasta Autoplius` };
  const models = parseItems(await fetchXml(`${BASE}&make_id=${mk.id}`), 'model_id');
  const want = norm(model.replace(/\(.*?\)/g, ''));
  let best: Item | undefined;
  for (const it of models) {
    const t = norm(it.title);
    if (!t) continue;
    if (want === t) { best = it; break; }
    if (want.startsWith(t) && (!best || t.length > norm(best.title).length)) best = it;
  }
  if (!best) {
    const first = want.slice(0, 3);
    best = models.find((it) => norm(it.title).startsWith(first));
  }
  return { makeId: mk.id, modelId: best?.id || null, warning: best ? null : `Modelis “${model}” nav atrasts — iestatīts “Kita”` };
}

export function apColor(color: string | null) {
  if (!color) return 18929;
  return AP_COLORS.find(([re]) => re.test(color))?.[1] ?? 18929;
}

export function xmlEscape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function carMakeDate(car: Car) {
  if (car.first_registration) return car.first_registration.slice(0, 7);
  return car.year ? `${car.year}-01` : '';
}
