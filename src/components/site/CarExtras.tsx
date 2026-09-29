import Link from 'next/link';
import { ShieldCheck, Gauge, AlertTriangle, Receipt, ArrowRight } from 'lucide-react';
import type { Car } from '@/lib/types';
import { money, number, odometerOk } from '@/lib/format';
import { PLANS, eligiblePlans, planPrice, limitLabel, type WarrantySettings } from '@/lib/warranty';
import { carTax } from '@/lib/tax';

/** Pagarinātās garantijas bloks auto lapā — pieejamie plāni šim auto. */
export function WarrantyBox({ car, w }: { car: Car; w: WarrantySettings }) {
  if (!w.enabled || car.status === 'sold') return null;
  const ok = eligiblePlans(car.year, car.mileage).filter((e) => e.ok).map((e) => e.plan);
  if (!ok.length) return null;
  const best = ok[ok.length - 1];
  const prices = ok.map((p) => planPrice(w, p, 12)).filter((v): v is number => v != null);
  const from = prices.length ? Math.min(...prices) : null;
  return (
    <Link href={`/garantija?auto=${car.slug}#kalkulators`} className="group mb-4 flex gap-3 rounded-2xl border border-line bg-card p-4 transition hover:border-signal">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-signal-soft"><ShieldCheck className="h-5 w-5 text-signal" /></span>
      <span className="text-sm">
        <span className="block font-bold text-ink">Pagarinātā garantija līdz 36 mēn.{from ? ` — no ${money(from)}` : ''}</span>
        <span className="block text-ink-2">
          Šim auto pieejams: {ok.map((p) => PLANS[p].name).join(', ')}. Ar {PLANS[best].name} kopējais remontu limits {limitLabel(PLANS[best].total)}.
        </span>
        <span className="mt-1 inline-flex items-center gap-1 font-semibold text-signal">Aprēķināt <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
      </span>
    </Link>
  );
}

/** CSDD nobraukuma vēsture ar grafiku. */
export function OdometerHistory({ car }: { car: Car }) {
  const h = [...(car.odometer_history || [])].filter((p) => p.date && p.km >= 0).sort((a, b) => a.date.localeCompare(b.date));
  if (h.length < 2) return null;
  const good = odometerOk(h);
  const W = 640, H = 180, P = 28;
  const t0 = +new Date(h[0].date), t1 = +new Date(h.at(-1)!.date);
  const maxKm = Math.max(...h.map((p) => p.km)) * 1.08 || 1;
  const x = (d: string) => P + ((+new Date(d) - t0) / Math.max(1, t1 - t0)) * (W - 2 * P);
  const y = (k: number) => H - P - (k / maxKm) * (H - 2 * P);
  const line = h.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.km).toFixed(1)}`).join(' ');
  const area = `${line} L${x(h.at(-1)!.date).toFixed(1)},${H - P} L${x(h[0].date).toFixed(1)},${H - P} Z`;
  const years = (t1 - t0) / (365.25 * 864e5);
  const perYear = years > 0.5 ? Math.round((h.at(-1)!.km - h[0].km) / years) : null;
  return (
    <section aria-labelledby="odo" className="rounded-2xl border border-line bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="odo" className="display-md flex items-center gap-2 text-xl text-ink"><Gauge className="h-5 w-5 text-signal" /> Nobraukuma vēsture (CSDD)</h2>
        {good ? (
          <span className="rounded-full bg-ok/15 px-3 py-1 text-xs font-bold text-ok">Nobraukums secīgs — bez atgriešanas pazīmēm</span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-warn/15 px-3 py-1 text-xs font-bold text-warn"><AlertTriangle className="h-3.5 w-3.5" /> Ierakstos ir neatbilstība — jautā mums</span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="Nobraukuma grafiks pa gadiem">
        <defs>
          <linearGradient id="odoFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--color-signal)" stopOpacity=".25" /><stop offset="1" stopColor="var(--color-signal)" stopOpacity="0" /></linearGradient>
        </defs>
        <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="var(--color-line)" />
        <path d={area} fill="url(#odoFill)" />
        <path d={line} fill="none" stroke="var(--color-signal)" strokeWidth="2.5" strokeLinejoin="round" />
        {h.map((p) => (
          <g key={p.date + p.km}>
            <circle cx={x(p.date)} cy={y(p.km)} r="4" fill="var(--color-card)" stroke="var(--color-signal)" strokeWidth="2" />
            <text x={x(p.date)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-mute)">{p.date.slice(0, 4)}</text>
          </g>
        ))}
      </svg>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[320px] text-sm">
          <thead><tr className="text-left text-xs text-mute"><th className="py-1.5 font-semibold">Datums</th><th className="py-1.5 text-right font-semibold">Odometrs</th></tr></thead>
          <tbody>
            {[...h].reverse().map((p) => (
              <tr key={p.date + p.km} className="border-t border-line"><td className="num py-1.5">{new Date(p.date).toLocaleDateString('lv-LV')}</td><td className="num py-1.5 text-right font-semibold">{number(p.km)} km</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-mute">
        Dati no CSDD tehniskās apskates ierakstiem{car.csdd_checked_at ? `, pārbaudīti ${new Date(car.csdd_checked_at).toLocaleDateString('lv-LV')}` : ''}.{perYear ? ` Vidēji ${number(perYear)} km gadā.` : ''}
      </p>
    </section>
  );
}

/** Aptuvenais gada ekspluatācijas nodoklis. */
export function TaxBox({ car }: { car: Car }) {
  const t = carTax(car);
  if (!t || car.fuel === 'electric') return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4 text-sm">
      <Receipt className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
      <div>
        <p className="font-bold text-ink">Ekspluatācijas nodoklis ~{money(t.total)} gadā</p>
        <p className="text-ink-2">{t.total === 0 ? 'Elektroauto nodoklis ir minimāls.' : t.parts.map(([k, v]) => `${k.replace('Par ', '').toLowerCase()} ${v} €`).join(' · ')}. <Link href="/kalkulatori#nodoklis" className="font-semibold text-signal underline">Kalkulators</Link></p>
      </div>
    </div>
  );
}
