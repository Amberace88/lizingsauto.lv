'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Check, Minus, ShieldCheck, ChevronDown } from 'lucide-react';
import { COVERAGE, PLANS, PLAN_LETTER, eligiblePlans, limitLabel, parseExamples, planPrice, type PlanId, type WarrantySettings } from '@/lib/warranty';
import { monthlyPayment } from '@/lib/leasing';
import type { LeasingSettings } from '@/lib/types';
import { money, number } from '@/lib/format';
import { Slider } from '@/components/site/LeasingCalculator';

export type WCar = { slug: string; name: string; year: number | null; mileage: number | null; price: number };

/** Garantijas izvēles kalkulators: pieejamie plāni, cena, maksājums līzingā, izdevīgums. */
export function WarrantyCalculator({ w, leasing, cars, initialSlug }: { w: WarrantySettings; leasing: LeasingSettings; cars: WCar[]; initialSlug?: string }) {
  const first = cars.find((c) => c.slug === initialSlug);
  const now = new Date().getFullYear();
  const [slug, setSlug] = useState(first?.slug || '');
  const [year, setYear] = useState(first?.year || now - 6);
  const [km, setKm] = useState(first?.mileage ?? 150000);
  const [carPrice, setCarPrice] = useState(first?.price || 10000);
  const [months, setMonths] = useState<12 | 24 | 36>(24);
  const elig = useMemo(() => eligiblePlans(year, km), [year, km]);
  const available = elig.filter((e) => e.ok).map((e) => e.plan);
  const [plan, setPlan] = useState<PlanId>(available.includes('comfort') ? 'comfort' : available[0] || 'plus');
  const active: PlanId = available.includes(plan) ? plan : available[0] || 'plus';
  const price = planPrice(w, active, months);
  const examples = parseExamples(w.examples);
  const repairs = examples.reduce((a, e) => a + e.cost, 0);
  const extraMonthly = price ? monthlyPayment({ price: price, downPct: 0, rate: leasing.rate, term: leasing.term }) : null;

  const pick = (s: string) => {
    setSlug(s);
    const c = cars.find((x) => x.slug === s);
    if (c) {
      if (c.year) setYear(c.year);
      if (c.mileage != null) setKm(c.mileage);
      setCarPrice(c.price);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
      <div className="space-y-5">
        {cars.length > 0 && (
          <label className="block">
            <span className="label">Auto no kataloga</span>
            <select className="field" value={slug} onChange={(e) => pick(e.target.value)}>
              <option value="">Cits auto</option>
              {cars.map((c) => <option key={c.slug} value={c.slug}>{c.name} {c.year} — {number(c.mileage)} km</option>)}
            </select>
          </label>
        )}
        <Slider label="Izlaiduma gads" value={year} min={now - 20} max={now} step={1} onChange={(v) => { setYear(v); setSlug(''); }} format={String} />
        <Slider label="Nobraukums" value={km} min={0} max={400000} step={5000} onChange={(v) => { setKm(v); setSlug(''); }} format={(v) => `${number(v)} km`} />
        <Slider label="Auto cena" value={carPrice} min={2000} max={80000} step={500} onChange={(v) => { setCarPrice(v); setSlug(''); }} format={money} />
        <div>
          <span className="label">Garantijas termiņš</span>
          <div className="flex gap-2">
            {([12, 24, 36] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMonths(m)} aria-pressed={months === m} className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${months === m ? 'border-ink bg-ink text-card' : 'border-line bg-card text-ink-2 hover:border-ink-2'}`}>
                {m} mēn.
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {elig.map(({ plan: p, ok, reason }) => (
            <button
              key={p}
              type="button"
              disabled={!ok}
              onClick={() => setPlan(p)}
              title={reason}
              className={`relative rounded-xl border p-3 text-left transition ${!ok ? 'cursor-not-allowed border-line opacity-45' : active === p ? 'border-signal bg-signal-soft ring-2 ring-signal' : 'border-line bg-card hover:border-ink-2'}`}
            >
              <p className="display-md text-sm text-ink">{PLANS[p].name}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-mute">{ok ? `līdz ${PLANS[p].maxAge} g. / ${number(PLANS[p].maxKm / 1000)}k km` : reason}</p>
              {ok && planPrice(w, p, months) && <p className="num mt-1 text-sm font-bold text-ink">{money(planPrice(w, p, months))}</p>}
            </button>
          ))}
        </div>

        {available.length === 0 ? (
          <p className="rounded-2xl bg-signal-soft p-5 text-sm text-ink">Šim auto pagarinātā garantija nav pieejama (maks. 15 gadi un 300 000 km). Jautā mums — piedāvāsim citu risinājumu.</p>
        ) : (
          <div className="rounded-2xl bg-night p-6 text-white">
            <div className="flex items-center gap-2 text-sm text-white/70"><ShieldCheck className="h-4 w-4 text-signal" /> {PLANS[active].name} · {months} mēneši</div>
            <p className="mt-1 text-white/80">{PLANS[active].tagline}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Box k="Limits vienam gadījumam" v={limitLabel(PLANS[active].perClaim)} />
              <Box k="Kopējais limits" v={limitLabel(PLANS[active].total)} />
              <Box k="Gada nobraukums" v="Neierobežots" />
              <Box k="Evakuators" v={`līdz ${w.towing} € gadījumā`} />
            </dl>
            <div className="mt-5 border-t border-white/15 pt-4">
              {price ? (
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs text-white/60">Garantijas cena</p>
                    <p className="num display text-4xl">{money(price)}</p>
                  </div>
                  {extraMonthly && (
                    <div className="text-right">
                      <p className="text-xs text-white/60">Iekļaujot līzingā</p>
                      <p className="num display-md text-2xl text-signal">+{number(Math.round(extraMonthly))} €/mēn.</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-white/80">Cenu aprēķināsim individuāli pēc auto — parasti tā ir tikai neliela daļa no viena remonta izmaksām.</p>
              )}
            </div>
          </div>
        )}

        {repairs > 0 && (
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="font-bold text-ink">Cik var izmaksāt remonti bez garantijas</p>
            <p className="text-xs text-mute">Piemērs: lietota Škoda Octavia 2.0 TDI, remonti 36 mēnešu laikā (Mango Insurance dati)</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {examples.map((e) => (
                <li key={e.label} className="flex justify-between gap-3"><span className="text-ink-2">{e.label}</span><span className="num font-semibold">{money(e.cost)}</span></li>
              ))}
              <li className="flex justify-between gap-3 border-t border-line pt-2 font-bold"><span>Kopā</span><span className="num">{money(repairs)}</span></li>
            </ul>
            {price && repairs > price && <p className="mt-3 rounded-xl bg-signal-soft px-3 py-2 text-sm text-ink">Garantija izmaksā <b className="num">{Math.round((repairs / price) * 10) / 10}x</b> mazāk nekā šie remonti. {PLANS[active].name} kopējais limits: {limitLabel(PLANS[active].total)}.</p>}
          </div>
        )}
        <Link href={`#pieteikums`} className="btn btn-signal w-full">Pieteikt garantiju {PLANS[active].name}</Link>
      </div>
    </div>
  );
}

function Box({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.07)' }}>
      <dt className="text-xs text-white/60">{k}</dt>
      <dd className="mt-0.5 font-semibold">{v}</dd>
    </div>
  );
}

/** Pārklājuma tabula pa sastāvdaļu grupām un plāniem. */
export function CoverageMatrix() {
  const [open, setOpen] = useState<number | null>(0);
  const plans: PlanId[] = ['deluxe', 'advantage', 'comfort', 'plus'];
  return (
    <div className="rounded-2xl border border-line bg-card">
      <div className="sticky top-16 z-10 rounded-t-2xl grid grid-cols-[1fr_repeat(4,56px)] items-end gap-1 border-b border-line bg-card px-4 py-3 text-[11px] font-bold text-mute sm:grid-cols-[1fr_repeat(4,90px)] sm:text-xs">
        <span>Sastāvdaļa</span>
        {plans.map((p) => <span key={p} className="text-center">{PLANS[p].name}</span>)}
      </div>
      {COVERAGE.map((g, gi) => (
        <div key={g.group} className="border-b border-line last:border-0">
          <button onClick={() => setOpen(open === gi ? null : gi)} className="grid w-full grid-cols-[1fr_repeat(4,56px)] items-center gap-1 px-4 py-3 text-left sm:grid-cols-[1fr_repeat(4,90px)]" aria-expanded={open === gi}>
            <span className="flex items-center gap-2 font-semibold text-ink">
              <ChevronDown className={`h-4 w-4 shrink-0 text-mute transition-transform ${open === gi ? 'rotate-180' : ''}`} /> {g.group}
            </span>
            {plans.map((p) => {
              const any = g.rows.some(([, m]) => m.includes(PLAN_LETTER[p]));
              return <span key={p} className="grid place-items-center">{any ? <Check className="h-5 w-5 text-signal" /> : <Minus className="h-4 w-4 text-line" />}</span>;
            })}
          </button>
          {open === gi && (
            <div className="bg-paper/60 pb-2">
              {g.note && <p className="px-4 pb-1 pl-10 text-xs text-mute">{g.note}</p>}
              {g.rows.map(([label, m]) => (
                <div key={label} className="grid grid-cols-[1fr_repeat(4,56px)] items-center gap-1 px-4 py-1.5 text-sm sm:grid-cols-[1fr_repeat(4,90px)]">
                  <span className="pl-6 text-ink-2">{label}</span>
                  {plans.map((p) => <span key={p} className="grid place-items-center">{m.includes(PLAN_LETTER[p]) ? <Check className="h-4 w-4 text-ok" /> : <Minus className="h-4 w-4 text-line" />}</span>)}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

