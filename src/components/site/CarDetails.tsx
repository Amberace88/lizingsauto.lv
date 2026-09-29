import { CalendarDays, Gauge, Fuel, Zap, Cog, Route, Car as CarIcon, Palette, Users, ClipboardCheck, Leaf, BatteryCharging, MapPin, Repeat2, Wallet, Phone, MessageCircle, ArrowRight, BadgePercent, KeyRound, ShieldCheck, FileText } from 'lucide-react';
import type { Car, CompanySettings } from '@/lib/types';
import { BODY_LABEL, DRIVE_LABEL, FUEL_LABEL, GEAR_LABEL, carName, number } from '@/lib/format';
import { groupEquipment, type EquipCatDef } from '@/lib/equipment';
import { EquipmentGroups } from './Equipment';

const mmYYYY = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

type Fact = { i: typeof Gauge; k: string; v: string; sub?: string };

/** Galvenie fakti ar ikonām — pārskatāmi uzreiz zem bildēm. */
export function KeyFacts({ car }: { car: Car }) {
  const now = new Date();
  const age = car.year ? Math.max(0.5, now.getFullYear() - car.year + now.getMonth() / 12) : null;
  const perYear = car.mileage != null && age ? Math.round(car.mileage / age / 100) * 100 : null;
  const ta = car.ta_until ? new Date(car.ta_until) : null;
  const taMonths = ta ? Math.round((+ta - +now) / (30.4 * 864e5)) : null;
  const facts: (Fact | null)[] = [
    car.year ? { i: CalendarDays, k: 'Izlaiduma gads', v: String(car.year), sub: car.first_registration ? `1. reģ. ${mmYYYY(new Date(car.first_registration))}` : undefined } : null,
    car.mileage != null ? { i: Gauge, k: 'Nobraukums', v: `${number(car.mileage)} km`, sub: perYear ? `~${number(perYear)} km gadā` : undefined } : null,
    car.fuel || car.engine_volume ? { i: Fuel, k: 'Dzinējs', v: [car.engine_volume ? `${car.engine_volume.toFixed(1)} l` : null, car.fuel ? FUEL_LABEL[car.fuel] : null].filter(Boolean).join(' ') } : null,
    car.power_kw ? { i: Zap, k: 'Jauda', v: `${car.power_kw} kW`, sub: `${Math.round(car.power_kw * 1.36)} ZS` } : null,
    car.transmission ? { i: Cog, k: 'Ātrumkārba', v: GEAR_LABEL[car.transmission] } : null,
    car.drive ? { i: Route, k: 'Piedziņa', v: DRIVE_LABEL[car.drive] } : null,
    car.body_type ? { i: CarIcon, k: 'Virsbūve', v: BODY_LABEL[car.body_type] || car.body_type } : null,
    car.color ? { i: Palette, k: 'Krāsa', v: car.color.charAt(0).toUpperCase() + car.color.slice(1) } : null,
    car.seats || car.doors ? { i: Users, k: 'Sēdvietas / durvis', v: `${car.seats ?? '—'} / ${car.doors ?? '—'}` } : null,
    ta ? { i: ClipboardCheck, k: 'Tehniskā apskate', v: `līdz ${mmYYYY(ta)}`, sub: taMonths != null && taMonths > 0 ? `vēl ${taMonths} mēn.` : undefined } : null,
    car.battery_kwh ? { i: BatteryCharging, k: 'Baterija', v: `${car.battery_kwh} kWh`, sub: car.range_km ? `līdz ${car.range_km} km` : undefined } : null,
    car.consumption ? { i: Leaf, k: 'Vid. patēriņš', v: `${car.consumption} l/100 km`, sub: car.euro_class || undefined } : car.euro_class ? { i: Leaf, k: 'Ekoloģija', v: car.euro_class } : null,
  ];
  const list = facts.filter(Boolean) as Fact[];
  if (!list.length) return null;
  return (
    <section aria-label="Galvenie dati">
      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
        {list.map(({ i: I, k, v, sub }) => (
          <div key={k} className="group flex items-start gap-2.5 rounded-2xl border border-line bg-card p-3 transition hover:border-ink-2/40 sm:gap-3 sm:p-3.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-signal-soft text-signal transition group-hover:scale-105 sm:h-10 sm:w-10 sm:rounded-xl"><I className="h-4 w-4 sm:h-5 sm:w-5" /></span>
            <div className="min-w-0">
              <dt className="text-xs text-mute">{k}</dt>
              <dd className="num break-words text-[0.9rem] font-bold leading-tight text-ink sm:text-base">{v}</dd>
              {sub && <dd className="num text-xs text-ink-2">{sub}</dd>}
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

// Standarta tirgotāja teksti, ko rādām atsevišķā blokā — no apraksta tos izlaižam, lai neatkārtotos.
const BOILER = /testa brauc|tirdzniecībā|pirmo iemaksu|pirmā iemaksa|līzinga iespēj|kredīt\w* vēstur|kredītvēstur|droši zvaniet|spied uz saiti|procentu likm|izdevīgi nosacījumi|pārliecināties par tā stāvokli/i;

function descriptionBlocks(text: string, title: string) {
  const lines = text.replace(/\r/g, '').split('\n').map((l) => l.trim());
  const blocks: ({ t: 'p'; v: string } | { t: 'ul'; v: string[] })[] = [];
  for (const l of lines) {
    if (!l) continue;
    if (BOILER.test(l)) continue;
    if (l.replace(/[.\s]/g, '').toLowerCase() === title.replace(/[.\s]/g, '').toLowerCase()) continue;
    const bullet = /^[-•–*]\s*/.test(l);
    const v = l.replace(/^[-•–*]\s*/, '');
    const last = blocks.at(-1);
    if (bullet) {
      if (last?.t === 'ul') last.v.push(v);
      else blocks.push({ t: 'ul', v: [v] });
    } else blocks.push({ t: 'p', v });
  }
  return blocks;
}

/** Apraksts + ekstras pa kategorijām + tirgotāja piedāvājums vienā profesionālā blokā. */
export function CarDescription({ car, company, monthly, catalog }: { car: Car; company: CompanySettings; monthly: number; catalog?: EquipCatDef[] }) {
  const name = carName(car);
  const blocks = descriptionBlocks(car.description || '', car.title || '');
  const groups = groupEquipment(car.equipment || [], catalog);
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  const sold = car.status === 'sold';
  // Ja apraksta nav, sagatavojam faktu kopsavilkumu no datiem
  if (!blocks.length) {
    const bits = [
      car.year ? `${car.year}. gads` : null,
      [car.engine_volume ? `${car.engine_volume.toFixed(1)} l` : null, car.fuel ? FUEL_LABEL[car.fuel].toLowerCase() : null].filter(Boolean).join(' ') || null,
      car.power_kw ? `${car.power_kw} kW (${Math.round(car.power_kw * 1.36)} ZS)` : null,
      car.transmission ? GEAR_LABEL[car.transmission].toLowerCase() : null,
      car.drive ? DRIVE_LABEL[car.drive].toLowerCase() : null,
      car.mileage != null ? `nobraukums ${number(car.mileage)} km` : null,
    ].filter(Boolean);
    blocks.push({ t: 'p', v: `${name}${bits.length ? `, ${bits.join(', ')}` : ''}.` });
  }

  return (
    <section aria-labelledby="apraksts" className="overflow-hidden rounded-[24px] border border-line bg-card">
      <div className="p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-signal">Par šo auto</p>
        <h2 id="apraksts" className="display-md mt-1 text-2xl text-ink sm:text-3xl">Apraksts un aprīkojums</h2>
        {blocks.length > 0 && (
          <div className="prose-car mt-4 max-w-3xl">
            {blocks.map((b, i) =>
              b.t === 'p' ? (
                <p key={i}>{b.v}</p>
              ) : (
                <ul key={i} className="mb-4 space-y-1.5">
                  {b.v.map((x) => <li key={x} className="flex gap-2 text-ink-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />{x}</li>)}
                </ul>
              ),
            )}
          </div>
        )}

        {total > 0 && (
          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-bold text-ink">Aprīkojums un ekstras</h3>
              <span className="num rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink-2">{total} ekstras</span>
            </div>
            <EquipmentGroups groups={groups} />
          </div>
        )}
      </div>

      {!sold && (
        <div className="border-t border-line bg-paper/70 p-6 sm:p-8">
          <h3 className="font-bold text-ink">Pērkot šo auto pie mums</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { i: KeyRound, t: 'Testa brauciens', d: 'Izmēģini auto un pārbaudi to servisā pēc savas izvēles.' },
              { i: MapPin, t: 'Apskate uz vietas', d: `${company.address} (Teikas rajons). Droši zvani un jautā.` },
              { i: Repeat2, t: 'Vecais auto kā iemaksa', d: 'Atstāj savu auto tirdzniecībā vai kā pirmo iemaksu šim auto.' },
              { i: Wallet, t: `Līzings no ${monthly} €/mēn.`, d: 'Arī ar 0% pirmo iemaksu, ar sabojātu kredītvēsturi un strādājot ārzemēs.' },
              { i: ShieldCheck, t: 'Pagarinātā garantija', d: 'Līdz 36 mēnešiem sadarbībā ar Mango Insurance.', href: `/garantija?auto=${car.slug}#kalkulators` },
              { i: FileText, t: 'Reģistrācija CSDD', d: 'Palīdzam ar reģistrāciju un visiem dokumentiem.' },
            ].map(({ i: I, t, d, href }: { i: typeof Gauge; t: string; d: string; href?: string }) => (
              <li key={t} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-card text-signal shadow-sm"><I className="h-[18px] w-[18px]" /></span>
                <span className="text-sm"><b className="block text-ink">{href ? <a href={href} className="hover:text-signal hover:underline">{t}</a> : t}</b><span className="text-ink-2">{d}</span></span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-ink-2">
            {['Līzinga iespējas visiem', 'Samazinātas procentu likmes', 'Izdevīgi nosacījumi', 'Aizdevums ar 0% pirmo iemaksu'].map((x) => (
              <span key={x} className="inline-flex items-center gap-1.5"><BadgePercent className="h-4 w-4 text-signal" /> {x}</span>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href="#pieteikums" className="btn btn-signal">Pārbaudīt līzinga iespējas <ArrowRight className="h-4 w-4" /></a>
            <a href={`tel:${company.phone.replace(/\s/g, '')}`} className="btn btn-ghost"><Phone className="h-4 w-4" /> {company.phone}</a>
            <a href={`https://wa.me/${company.whatsapp}?text=${encodeURIComponent(`Labdien! Interesē ${name} ${car.year ?? ''}`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost"><MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp</a>
          </div>
        </div>
      )}
    </section>
  );
}
