// Latvijas svētku (brīvdienas), atceres un atzīmējamās dienas — pēc likuma "Par svētku, atceres un atzīmējamām dienām".
export type Holiday = { date: string; name: string; off: boolean }; // date: YYYY-MM-DD

function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, month - 1, day));
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const add = (d: Date, n: number) => new Date(d.getTime() + n * 864e5);
/** n-tā nedēļas diena mēnesī (wd: 0=svētdiena) */
const nth = (y: number, m: number, wd: number, n: number) => {
  const first = new Date(Date.UTC(y, m - 1, 1));
  return add(first, ((wd - first.getUTCDay() + 7) % 7) + (n - 1) * 7);
};

export function holidays(y: number): Holiday[] {
  const e = easter(y);
  const f = (md: string, name: string, off = false): Holiday => ({ date: `${y}-${md}`, name, off });
  const list: Holiday[] = [
    f('01-01', 'Jaungada diena', true),
    f('01-20', 'Barikāžu aizstāvju atceres diena'),
    f('02-14', 'Valentīndiena'),
    f('03-08', 'Starptautiskā sieviešu diena'),
    f('03-25', 'Komunistiskā genocīda upuru piemiņas diena'),
    { date: iso(add(e, -2)), name: 'Lielā Piektdiena', off: true },
    { date: iso(e), name: 'Lieldienas', off: true },
    { date: iso(add(e, 1)), name: 'Otrās Lieldienas', off: true },
    f('05-01', 'Darba svētki, Satversmes sapulces sasaukšanas diena', true),
    f('05-04', 'Latvijas Republikas Neatkarības atjaunošanas diena', true),
    f('05-08', 'Nacisma sagrāves un Otrā pasaules kara upuru piemiņas diena'),
    f('05-09', 'Eiropas diena'),
    { date: iso(nth(y, 5, 0, 2)), name: 'Mātes diena', off: false },
    { date: iso(add(e, 49)), name: 'Vasarsvētki', off: false },
    f('06-14', 'Komunistiskā genocīda upuru piemiņas diena'),
    f('06-17', 'Latvijas Republikas okupācijas diena'),
    f('06-22', 'Varoņu piemiņas diena'),
    f('06-23', 'Līgo diena', true),
    f('06-24', 'Jāņu diena', true),
    f('07-04', 'Ebreju tautas genocīda upuru piemiņas diena'),
    f('08-23', 'Baltijas ceļa diena'),
    { date: iso(nth(y, 9, 0, 2)), name: 'Tēva diena', off: false },
    f('09-29', 'Miķeļdiena'),
    f('10-05', 'Skolotāju diena'),
    f('11-10', 'Mārtiņdiena'),
    f('11-11', 'Lāčplēša diena'),
    f('11-18', 'Latvijas Republikas proklamēšanas diena', true),
    f('12-24', 'Ziemassvētku vakars', true),
    f('12-25', 'Pirmie Ziemassvētki', true),
    f('12-26', 'Otrie Ziemassvētki', true),
    f('12-31', 'Vecgada vakars', true),
  ];
  // 4. maijs un 18. novembris brīvdienā → pārceļ uz nākamo darbdienu
  for (const md of ['05-04', '11-18']) {
    const d = new Date(`${y}-${md}T00:00:00Z`);
    const wd = d.getUTCDay();
    if (wd === 0 || wd === 6) list.push({ date: iso(add(d, wd === 6 ? 2 : 1)), name: 'Pārceltā brīvdiena', off: true });
  }
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

/** Šodienas svētki un nākamie svētki (brīvdienas prioritāte). */
export function holidayInfo(today: { y: number; m: number; d: number }) {
  const key = `${today.y}-${String(today.m).padStart(2, '0')}-${String(today.d).padStart(2, '0')}`;
  const all = [...holidays(today.y), ...holidays(today.y + 1)];
  const now = all.filter((h) => h.date === key);
  const nextOff = all.find((h) => h.off && h.date > key);
  const nextAny = all.find((h) => h.date > key);
  const days = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${key}T00:00:00Z`)) / 864e5);
  return { today: now, nextOff: nextOff ? { ...nextOff, in: days(nextOff.date) } : null, next: nextAny ? { ...nextAny, in: days(nextAny.date) } : null };
}

/** Ziemas riepu atgādinājums: obligātas no 1. decembra līdz 1. martam (vieglajiem auto). */
export function tyreInfo(today: { y: number; m: number; d: number }) {
  const t = Date.UTC(today.y, today.m - 1, today.d);
  const m = today.m;
  if (m >= 10 && m <= 11) {
    const n = Math.round((Date.UTC(today.y, 11, 1) - t) / 864e5);
    return { active: false, text: `Ziemas riepas obligātas no 1. decembra`, sub: `pēc ${n} d.` };
  }
  if (m === 12 || m <= 2) return { active: true, text: 'Ziemas riepas obligātas līdz 1. martam', sub: '' };
  return null;
}
