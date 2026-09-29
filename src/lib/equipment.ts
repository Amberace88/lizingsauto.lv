// Aprīkojuma kategorijas: klasificē brīvā teksta ekstras un dod adminam gatavu izvēles katalogu.

export type EquipCat = 'history' | 'safety' | 'media' | 'lights' | 'comfort' | 'interior' | 'exterior' | 'other';

export const EQUIP_CATS: { id: EquipCat; label: string }[] = [
  { id: 'comfort', label: 'Komforts un klimats' },
  { id: 'safety', label: 'Drošība un asistenti' },
  { id: 'media', label: 'Multivide un savienojamība' },
  { id: 'interior', label: 'Salons un sēdekļi' },
  { id: 'lights', label: 'Gaismas' },
  { id: 'exterior', label: 'Ārpuse, piedziņa, riteņi' },
  { id: 'history', label: 'Stāvoklis un vēsture' },
  { id: 'other', label: 'Citas ekstras' },
];

// Secība ir svarīga — pirmā atbilstība nosaka kategoriju.
const RULES: [EquipCat, RegExp][] = [
  ['history', /servis|garantij|apkop|ekii|veikt|maiņ|uzstādīt|jaun[as] |riepu komplekt|ziemas|vasaras|īpašniek|grāmatiņ|ekoloģ|daļiņ/i],
  ['lights', /lukt|gaism|xenon|ksenon|\bled\b|optik|miglas|tālo|tuvās|headlight|high-beam|fog/i],
  ['safety', /asist|kruīz|kruiz|distanc|kamer|sensor|parkoš|parkēš|parking|bremz|sadursm|zīmju|joslu|josl|līniju|aklo|spiedien|signaliz|imobil|\babs\b|\besp\b|\basr\b|air.?bag|drošīb|ārkārt|gājēj|active|protection|guard|isofix|iso-fix|trijstūr|pirmās palīdz|emergency|nakts redz|kurīz|stabilit|centrālā atslēg|alarm|warning|tyre|hill descent|x-mode/i],
  ['media', /navig|multim|multimed|radio|\bcd\b|audio|harman|bose|bowers|bluetooth|carplay|android|wlan|hotspot|displej|ekrān|digitāl|spidometr|borta dator|usb|mūzik|teleserv|connected|head.?up|uzlād|telefon|concierge|remote|attālin|satiksmes inform|speedo|mp3|aux|dvd|\btv\b|subwoof|hands.?free|loudspeaker|hifi|cockpit|telephon|gesture/i],
  ['comfort', /klimat|kondic|apsild|sildīt|autonom|keyless|komforta piekļ|comfort access|elektr\w* log|logi\b|bagāžn|bagāžas|soft.?close|pievelk|lūk|aizkar|saulessarg|start.?stop|loga apsild|lietus|ledus?skap|air conditioning|glazing|smokers|storage/i],
  ['interior', /sēd|sēdēk|krēsl|salon|(^|\s)ād|ādas|nappa|stūr|seat|steering|trim|roof-lining|lumbar|lāpstiņ|ambient|griest|paklāj|mats|interjer|roku balst|glāž|isofix|masāž|ventil|recaro|velour|sēdviet/i],
  ['exterior', /disk|sakab|pilnpiedz|4x4|awd|quattro|4motion|xdrive|piekar|balstiek|sporta pak|aerodinam|spoguļ|tonēt|reliņ|m sport|spoiler|sliekš|riep|runflat|ātrumkārb|pārslēg|režīm|drive select|pakete|pakotne|bremzes|outer skin|mirror|tow|hitch|wheel bolt|package|chrome|aerodynamics/i],
];

// Tukši virsraksti no ražotāju sarakstiem, kas nav ekstras
const NOISE = /^(comfort and interior equipment|driver assistance and lightning|wheels and drive|other equipment|editions and packages|environment and safety|un citas ekstras\.?)$/i;

/** Notīra ražotāja kodus (piem., "S6AE Teleservices") un liekās atstarpes. */
export function cleanEquip(s: string) {
  return s
    .replace(/^S[0-9A-Z]{3,4}\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export function equipCategory(s: string): EquipCat {
  for (const [cat, re] of RULES) if (re.test(s)) return cat;
  return 'other';
}

/** Sagrupē ekstras pa kategorijām, bez dublikātiem un tukšiem virsrakstiem. */
export type EquipIcon = 'thermometer' | 'shield' | 'monitor' | 'armchair' | 'lightbulb' | 'car' | 'clipboard' | 'sparkles' | 'wrench' | 'zap' | 'snowflake' | 'music' | 'battery' | 'star' | 'gauge' | 'key';
export const EQUIP_ICONS: EquipIcon[] = ['thermometer', 'shield', 'monitor', 'armchair', 'lightbulb', 'car', 'clipboard', 'sparkles', 'wrench', 'zap', 'snowflake', 'music', 'battery', 'star', 'gauge', 'key'];
const DEFAULT_ICON: Record<EquipCat, EquipIcon> = { comfort: 'thermometer', safety: 'shield', media: 'monitor', interior: 'armchair', lights: 'lightbulb', exterior: 'car', history: 'clipboard', other: 'sparkles' };

/** Admina rediģējama kategorija. `id` iebūvētajām sakrīt ar EquipCat — tām darbojas arī automātiskā atpazīšana. */
export interface EquipCatDef {
  id: string;
  label: string;
  icon: EquipIcon;
  items: string[];
  keywords?: string; // komatiem atdalīti vārdi, pēc kuriem brīvais teksts nonāk šajā kategorijā
}

export function defaultEquipCatalog(): EquipCatDef[] {
  return EQUIP_CATS.map((c) => ({ id: c.id, label: c.label, icon: DEFAULT_ICON[c.id], items: EQUIP_CATALOG.find((x) => x.id === c.id)?.items || [], keywords: '' }));
}

export function normalizeEquipCatalog(v?: unknown): EquipCatDef[] {
  const arr = (v && typeof v === 'object' && Array.isArray((v as { categories?: unknown }).categories) ? (v as { categories: unknown[] }).categories : null) as Record<string, unknown>[] | null;
  if (!arr || !arr.length) return defaultEquipCatalog();
  const out: EquipCatDef[] = [];
  for (const c of arr) {
    if (!c || typeof c.id !== 'string' || typeof c.label !== 'string') continue;
    out.push({
      id: c.id.slice(0, 40),
      label: c.label.slice(0, 60),
      icon: EQUIP_ICONS.includes(c.icon as EquipIcon) ? (c.icon as EquipIcon) : 'sparkles',
      items: Array.isArray(c.items) ? [...new Set((c.items as unknown[]).filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim().slice(0, 80)))] : [],
      keywords: typeof c.keywords === 'string' ? c.keywords.slice(0, 300) : '',
    });
  }
  if (!out.some((c) => c.id === 'other')) out.push({ id: 'other', label: 'Citas ekstras', icon: 'sparkles', items: [], keywords: '' });
  return out;
}

/** Sagrupē ekstras pēc admina kataloga: precīza atbilstība → atslēgvārdi → automātiskā atpazīšana → “Citas”. */
export function groupEquipment(items: string[], catalog: EquipCatDef[] = defaultEquipCatalog()) {
  const exact = new Map<string, string>();
  for (const c of catalog) for (const it of c.items) exact.set(it.toLowerCase(), c.id);
  const kw = catalog
    .filter((c) => c.keywords && c.keywords.trim())
    .map((c) => ({ id: c.id, words: c.keywords!.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean) }));
  const ids = new Set(catalog.map((c) => c.id));
  const seen = new Set<string>();
  const groups = new Map<string, string[]>();
  for (const raw of items || []) {
    const t = cleanEquip(raw);
    const key = t.toLowerCase();
    if (!t || NOISE.test(t) || seen.has(key)) continue;
    seen.add(key);
    let c = exact.get(key) || kw.find((k) => k.words.some((w) => key.includes(w)))?.id;
    if (!c) {
      const auto = equipCategory(t);
      c = ids.has(auto) ? auto : 'other';
    }
    groups.set(c, [...(groups.get(c) || []), t]);
  }
  return catalog.filter((c) => groups.has(c.id)).map((c) => ({ id: c.id, label: c.label, icon: c.icon, items: groups.get(c.id)! }));
}

/** Admina izvēles katalogs (līdzīgi ss.lv / carbuy.lv) — ātrai atzīmēšanai. */
export const EQUIP_CATALOG: { id: EquipCat; items: string[] }[] = [
  { id: 'comfort', items: ['Klimatkontrole', '2 zonu klimatkontrole', '3 zonu klimatkontrole', 'Kondicionieris', 'Autonomais sildītājs', 'Krēslu apsilde priekšā', 'Krēslu apsilde aizmugurē', 'Stūres apsilde', 'Priekšējā stikla apsilde', 'Keyless Go', 'Elektriskie logi', 'Elektriskais bagāžnieks', 'Soft-Close durvis', 'Lūka', 'Panorāmas lūka', 'Lietus sensors', 'Start-Stop sistēma', 'Aizmugurējie saulessargi'] },
  { id: 'safety', items: ['Kruīzkontrole', 'Adaptīvā kruīzkontrole', 'Parkošanās sensori priekšā', 'Parkošanās sensori aizmugurē', 'Atpakaļskata kamera', '360° kamera', 'Parkošanās asistents', 'Līniju asistents', 'Aklo zonu asistents', 'Ceļa zīmju atpazīšana', 'Avārijas bremzēšanas sistēma', 'Riepu spiediena kontrole', 'Nakts redzamības kamera', 'Signalizācija', 'Isofix stiprinājumi'] },
  { id: 'media', items: ['Navigācija', 'Multimēdiju ekrāns', 'Apple CarPlay / Android Auto', 'Bluetooth', 'Hands-free', 'Bezvadu telefona uzlāde', 'USB', 'Digitālais instrumentu panelis', 'Head-Up displejs', 'Premium audio sistēma', 'Borta dators', 'FM/CD radio'] },
  { id: 'interior', items: ['Ādas salons', 'Pusādas salons', 'Elektriski regulējami sēdekļi', 'Sēdekļi ar atmiņu', 'Ventilējami sēdekļi', 'Masāžas sēdekļi', 'Sporta sēdekļi', 'Multifunkcionāla stūre', 'Ādas stūre', 'Ambient apgaismojums', 'Melnie griesti', 'Roku balsti', '7 sēdvietas'] },
  { id: 'lights', items: ['LED lukturi', 'Matrix LED lukturi', 'Xenona lukturi', 'Adaptīvie lukturi', 'Tālo gaismu asistents', 'Miglas lukturi', 'Lukturu mazgātāji'] },
  { id: 'exterior', items: ['Vieglmetāla diski', 'Sakabes āķis', 'Pilnpiedziņa 4x4', 'Pneimopiekare', 'Sporta pakete', 'Jumta reliņi', 'Tonēti aizmugurējie logi', 'El. nolokāmi spoguļi', 'Apsildāmi spoguļi', 'Ziemas un vasaras riepu komplekti'] },
  { id: 'history', items: ['Servisa vēsture', 'Servisa grāmatiņa', '1 īpašnieks', 'Ražotāja garantija', 'Svaigi veikta apkope', '2 atslēgas'] },
];

/** Kategorijas identifikators no nosaukuma. */
export function slugCat(label: string) {
  const map: Record<string, string> = { ā: 'a', č: 'c', ē: 'e', ģ: 'g', ī: 'i', ķ: 'k', ļ: 'l', ņ: 'n', š: 's', ū: 'u', ž: 'z' };
  return (
    'c-' +
    label
      .toLowerCase()
      .replace(/[āčēģīķļņšūž]/g, (c) => map[c] || c)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30)
  );
}
