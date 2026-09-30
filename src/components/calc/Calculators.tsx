'use client';
import { useMemo, useState } from 'react';
import { useTrackUse } from '@/lib/track';
import { CC, CO2, KW, MASS, pickRate } from '@/lib/tax';
import { Slider } from '@/components/site/LeasingCalculator';
import { money, number } from '@/lib/format';
import { priceForPayment } from '@/lib/leasing';
import type { LeasingSettings } from '@/lib/types';
import Link from 'next/link';

/** Cik lielu auto var atļauties — pēc ienākumiem un saistībām (DSTI ≤ 40%). */
export function AffordabilityCalc({ leasing }: { leasing: LeasingSettings }) {
  const [income, setIncome] = useState(1300);
  const [obligations, setObligations] = useState(0);
  const [down, setDown] = useState(0);
  const [term, setTerm] = useState(leasing.term);
  useTrackUse('Cik varu atļauties', [income, obligations, down, term]);
  const r = useMemo(() => {
    const maxPay = Math.max(0, income * 0.4 - obligations);
    const safePay = Math.max(0, income * 0.25 - obligations);
    return {
      maxPay,
      safePay,
      maxPrice: priceForPayment({ payment: maxPay, down, rate: leasing.rate, term }),
      safePrice: priceForPayment({ payment: safePay, down, rate: leasing.rate, term }),
    };
  }, [income, obligations, down, term, leasing.rate]);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-5">
        <Slider label="Ienākumi mēnesī (neto)" value={income} min={500} max={6000} step={50} onChange={setIncome} format={money} />
        <Slider label="Citi kredītu maksājumi mēnesī" value={obligations} min={0} max={2000} step={25} onChange={setObligations} format={money} />
        <Slider label="Pirmā iemaksa" value={down} min={0} max={20000} step={250} onChange={setDown} format={money} />
        <Slider label="Termiņš" value={term} min={leasing.minTerm} max={leasing.maxTerm} step={6} onChange={setTerm} format={(v) => `${v} mēn.`} />
      </div>
      <div className="flex flex-col justify-between rounded-2xl bg-night p-6 text-white">
        <div>
          <p className="text-sm text-white/60">Ērts budžets (25% no ienākumiem)</p>
          <p className="num display text-4xl">līdz {money(Math.round(r.safePrice / 100) * 100)}</p>
          <p className="num text-sm text-white/70">~{number(Math.round(r.safePay))} €/mēn.</p>
          <p className="mt-5 text-sm text-white/60">Maksimāli (līdz 40% no ienākumiem)</p>
          <p className="num display-md text-2xl text-signal">līdz {money(Math.round(r.maxPrice / 100) * 100)}</p>
          <p className="num text-sm text-white/70">~{number(Math.round(r.maxPay))} €/mēn.</p>
        </div>
        <Link href={`/katalogs?maxPrice=${Math.round(r.safePrice)}`} className="btn btn-signal mt-6">Rādīt auto līdz {money(Math.round(r.safePrice / 100) * 100)}</Link>
      </div>
    </div>
  );
}

const pick = pickRate;

export function TaxCalc() {
  const [after2008, setAfter] = useState(true);
  const [electric, setElectric] = useState(false);
  const [co2, setCo2] = useState(140);
  const [cc, setCc] = useState(1990);
  const [kw, setKw] = useState(110);
  const [mass, setMass] = useState(1900);
  useTrackUse('Nodokļa kalkulators', [after2008, electric, co2, cc, kw, mass]);
  const res = useMemo(() => {
    if (electric) return { total: 0, parts: [['Elektroauto', 0]] as [string, number][] };
    if (!after2008) return { total: pick(MASS, mass), parts: [['Pēc pilnās masas', pick(MASS, mass)]] as [string, number][] };
    const p: [string, number][] = [['Par CO₂ izmešiem', pick(CO2, co2)], ['Par motora tilpumu', pick(CC, cc)], ['Par motora jaudu', pick(KW, kw)]];
    return { total: p.reduce((a, [, v]) => a + v, 0), parts: p };
  }, [after2008, electric, co2, cc, kw, mass]);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Toggle on={!electric && after2008} onClick={() => { setElectric(false); setAfter(true); }}>Reģistrēts no 2009</Toggle>
          <Toggle on={!electric && !after2008} onClick={() => { setElectric(false); setAfter(false); }}>Līdz 2008</Toggle>
          <Toggle on={electric} onClick={() => setElectric(true)}>Elektroauto</Toggle>
        </div>
        {!electric && after2008 && (
          <>
            <Slider label="CO₂ izmeši" value={co2} min={0} max={400} step={1} onChange={setCo2} format={(v) => `${v} g/km`} />
            <Slider label="Motora tilpums" value={cc} min={900} max={6500} step={10} onChange={setCc} format={(v) => `${number(v)} cm³`} />
            <Slider label="Motora jauda" value={kw} min={40} max={450} step={1} onChange={setKw} format={(v) => `${v} kW`} />
          </>
        )}
        {!electric && !after2008 && <Slider label="Pilnā masa" value={mass} min={1000} max={4000} step={10} onChange={setMass} format={(v) => `${number(v)} kg`} />}
        {electric && <p className="rounded-xl bg-petrol-soft p-4 text-sm text-petrol">Elektroauto ir atbrīvoti no transportlīdzekļa ekspluatācijas nodokļa.</p>}
      </div>
      <div className="rounded-2xl bg-night p-6 text-white">
        <p className="text-sm text-white/60">Ekspluatācijas nodoklis gadā</p>
        <p className="num display text-5xl">{money(res.total)}</p>
        <dl className="mt-5 space-y-1.5 text-sm">
          {res.parts.map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-white/10 pb-1.5"><dt className="text-white/65">{k}</dt><dd className="num font-semibold">{money(v)}</dd></div>
          ))}
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-white/50">
          Orientējošs aprēķins pēc 2026. gada likmēm (Transportlīdzekļa ekspluatācijas nodokļa likuma 4. pants, NEDC CO₂). Precīzu summu pārbaudi CSDD e-pakalpojumos.
        </p>
      </div>
    </div>
  );
}

/** Degvielas / elektrības izmaksas mēnesī */
export function RunningCostCalc() {
  const [kmYear, setKm] = useState(20000);
  const [cons, setCons] = useState(6.5);
  const [fuelPrice, setFuelPrice] = useState(1.65);
  const [kwh, setKwh] = useState(17);
  const [elPrice, setElPrice] = useState(0.22);
  useTrackUse('Degviela pret elektrību', [kmYear, cons, fuelPrice, kwh, elPrice]);
  const ice = (kmYear / 100) * cons * fuelPrice;
  const ev = (kmYear / 100) * kwh * elPrice;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-5">
        <Slider label="Nobraukums gadā" value={kmYear} min={5000} max={60000} step={1000} onChange={setKm} format={(v) => `${number(v)} km`} />
        <Slider label="Degvielas patēriņš" value={cons} min={3} max={15} step={0.1} onChange={setCons} format={(v) => `${v.toFixed(1)} l/100 km`} />
        <Slider label="Degvielas cena" value={fuelPrice} min={1} max={2.5} step={0.01} onChange={setFuelPrice} format={(v) => `${v.toFixed(2)} €/l`} />
        <Slider label="Elektroauto patēriņš" value={kwh} min={12} max={30} step={0.5} onChange={setKwh} format={(v) => `${v} kWh/100 km`} />
        <Slider label="Elektrības cena (mājās)" value={elPrice} min={0.08} max={0.6} step={0.01} onChange={setElPrice} format={(v) => `${v.toFixed(2)} €/kWh`} />
      </div>
      <div className="grid gap-3">
        <div className="rounded-2xl border border-line bg-card p-5">
          <p className="text-sm text-mute">Iekšdedzes auto</p>
          <p className="num display-md text-3xl text-ink">{money(ice / 12)}<span className="text-base text-mute"> /mēn.</span></p>
          <p className="num text-sm text-mute">{money(ice)} gadā</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-5">
          <p className="text-sm text-mute">Elektroauto</p>
          <p className="num display-md text-3xl text-petrol">{money(ev / 12)}<span className="text-base text-mute"> /mēn.</span></p>
          <p className="num text-sm text-mute">{money(ev)} gadā</p>
        </div>
        <div className="rounded-2xl bg-signal p-5 text-white">
          <p className="text-sm font-medium">Ietaupījums ar elektroauto</p>
          <p className="num display-md text-3xl">{money(Math.max(0, ice - ev))} gadā</p>
        </div>
      </div>
    </div>
  );
}

export function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${on ? 'border-petrol bg-petrol text-white' : 'border-line bg-card text-ink-2 hover:border-ink-2'}`}>
      {children}
    </button>
  );
}
