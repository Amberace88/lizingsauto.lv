'use client';
import { useMemo, useState } from 'react';
import { useTrackUse } from '@/lib/track';
import Link from 'next/link';
import { BatteryCharging, Check, X } from 'lucide-react';
import { Slider } from '@/components/site/LeasingCalculator';
import { Toggle } from './Calculators';
import { ekiiCalc, type EkiiSettings } from '@/lib/ekii';
import { monthlyPayment } from '@/lib/leasing';
import type { LeasingSettings } from '@/lib/types';
import { money, number } from '@/lib/format';

export type EvOption = { slug: string; name: string; price: number; vat: boolean; year: number | null; mileage: number | null; seats: number | null; phev?: boolean };

export function EvCalculator({ ekii, leasing, cars, initialSlug }: { ekii: EkiiSettings; leasing: LeasingSettings; cars: EvOption[]; initialSlug?: string }) {
  const first = cars.find((c) => c.slug === initialSlug) || null;
  const [slug, setSlug] = useState(first?.slug || '');
  const [price, setPrice] = useState(first?.price || 25000);
  const [vat, setVat] = useState(first?.vat ?? false);
  const [year, setYear] = useState(first?.year || new Date().getFullYear() - 3);
  const [mileage, setMileage] = useState(first?.mileage || 60000);
  const [seats, setSeats] = useState(first?.seats || 5);
  const [goda, setGoda] = useState(false);
  const [children, setChildren] = useState(3);
  const [scrap, setScrap] = useState(false);
  const [phev, setPhev] = useState(first?.phev ?? false);
  const [lvOver12m, setLvOver12m] = useState(false);
  useTrackUse('EKII kalkulators', [price, year, mileage, seats, goda, children, scrap, phev, slug]);
  const [downPct, setDownPct] = useState(leasing.downPct);
  const [term, setTerm] = useState(leasing.term);

  const pickCar = (s: string) => {
    setSlug(s);
    const c = cars.find((x) => x.slug === s);
    if (c) {
      setPrice(c.price);
      setVat(c.vat);
      if (c.year) setYear(c.year);
      if (c.mileage != null) setMileage(c.mileage);
      setSeats(c.seats || 5);
      setPhev(!!c.phev);
    }
  };

  const r = useMemo(() => ekiiCalc(ekii, { price, vatIncluded: vat, year, mileage, seats, goda, children, scrap, phev, lvOver12m }), [ekii, price, vat, year, mileage, seats, goda, children, scrap, phev, lvOver12m]);
  const pmtWithout = monthlyPayment({ price, downPct, rate: leasing.rate, term });
  // Atbalsts samazina finansējamo summu
  const pmtWith = monthlyPayment({ price: r.finalPrice, down: (price * downPct) / 100, rate: leasing.rate, term });
  const now = new Date().getFullYear();

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5">
        {cars.length > 0 && (
          <label className="block">
            <span className="label">Izvēlies auto no kataloga</span>
            <select className="field" value={slug} onChange={(e) => pickCar(e.target.value)}>
              <option value="">Cits / savs auto</option>
              {cars.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name} {c.year} — {money(c.price)}</option>
              ))}
            </select>
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          <Toggle on={!phev} onClick={() => { setPhev(false); setSlug(''); }}>Elektroauto</Toggle>
          <Toggle on={phev} onClick={() => { setPhev(true); setSlug(''); }}>Plug-in hibrīds (līdz {ekii.phevMaxCo2} g CO₂/km)</Toggle>
        </div>
        <Slider label="Auto cena" value={price} min={3000} max={80000} step={100} onChange={(v) => { setPrice(v); setSlug(''); }} format={money} />
        <div className="flex flex-wrap gap-2">
          <Toggle on={vat} onClick={() => setVat(true)}>Cena ar PVN</Toggle>
          <Toggle on={!vat} onClick={() => setVat(false)}>Cena bez PVN</Toggle>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Slider label="Izlaiduma gads" value={year} min={now - 12} max={now} step={1} onChange={setYear} format={String} />
          <Slider label="Nobraukums" value={mileage} min={0} max={250000} step={1000} onChange={setMileage} format={(v) => `${number(v)} km`} />
        </div>
        <div>
          <span className="label">Sēdvietu skaits</span>
          <div className="flex gap-2">{[2, 4, 5, 7].map((s) => <Toggle key={s} on={seats === s} onClick={() => setSeats(s)}>{s}</Toggle>)}</div>
        </div>
        <div className="space-y-3 rounded-2xl border border-line bg-card p-4">
          <label className="flex items-center gap-3 text-sm font-medium text-ink">
            <input type="checkbox" checked={scrap} onChange={(e) => setScrap(e.target.checked)} className="h-5 w-5 accent-[#d91d2b]" />
            Nododu savu iekšdedzes auto utilizācijai vai Ukrainas armijai (+{money(ekii.scrapBonus)})
          </label>
          <label className="flex items-center gap-3 text-sm font-medium text-ink">
            <input type="checkbox" checked={goda} onChange={(e) => setGoda(e.target.checked)} className="h-5 w-5 accent-[#d91d2b]" />
            Mums ir “Goda ģimenes” apliecība
          </label>
          {!r.isNew && (
            <label className="flex items-center gap-3 text-sm font-medium text-ink">
              <input type="checkbox" checked={lvOver12m} onChange={(e) => setLvOver12m(e.target.checked)} className="h-5 w-5 accent-[#d91d2b]" />
              Auto jau ilgāk par 12 mēnešiem reģistrēts Latvijā
            </label>
          )}
          {goda && <Slider label="Bērnu skaits ģimenē" value={children} min={3} max={12} step={1} onChange={setChildren} format={String} />}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Slider label={`Pirmā iemaksa (${downPct}%)`} value={downPct} min={0} max={50} step={5} onChange={setDownPct} format={(v) => money((price * v) / 100)} />
          <Slider label="Termiņš" value={term} min={leasing.minTerm} max={leasing.maxTerm} step={6} onChange={setTerm} format={(v) => `${v} mēn.`} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl bg-petrol-2 p-6 text-white">
          <div className="flex items-center gap-2 text-sm text-white/70"><BatteryCharging className="h-4 w-4 text-signal" /> Cena ar valsts atbalstu</div>
          <p className="num display mt-1 text-[3rem]">{money(r.finalPrice)}</p>
          <dl className="mt-4 space-y-1.5 text-sm">
            <Row k="Auto cena" v={money(price)} />
            <Row k={`EKII atbalsts (${r.isNew ? 'jauns' : 'lietots'} auto)`} v={`− ${money(r.base)}`} />
            {r.childBonus > 0 && <Row k="Par bērniem (no 4.)" v={`− ${money(r.childBonus)}`} />}
            {r.scrap > 0 && <Row k="Par vecā auto nodošanu" v={`− ${money(r.scrap)}`} />}
            {r.capped && <Row k={`Ierobežojums: ne vairāk kā ${r.pct}% no cenas`} v={`+ ${money(r.capCut)}`} />}
            {r.total > 0 && <div className="flex justify-between gap-4 border-t border-white/15 pt-1.5"><dt className="text-white/65">Atbalsts kopā · {Math.round((r.total / price) * 100)}% no cenas</dt><dd className="num font-bold text-signal">{money(r.total)}</dd></div>}
          </dl>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
            <div><p className="text-xs text-white/60">Līzings bez atbalsta</p><p className="num text-lg font-semibold text-white/70 line-through">{number(Math.round(pmtWithout))} €/mēn.</p></div>
            <div><p className="text-xs text-white/60">Līzings ar atbalstu</p><p className="num display-md text-2xl text-signal">{number(Math.round(pmtWith))} €/mēn.</p></div>
          </div>
        </div>
        <div className={`rounded-2xl p-4 text-sm ${r.eligible ? 'bg-petrol-soft text-petrol' : 'bg-signal-soft text-ink'}`}>
          {r.eligible ? (
            <p className="flex gap-2 font-semibold"><Check className="h-5 w-5 shrink-0" /> Šis auto atbilst EKII pamatprasībām.</p>
          ) : (
            <div>
              <p className="flex gap-2 font-semibold"><X className="h-5 w-5 shrink-0 text-bad" /> Atbalsts šim auto nav pieejams:</p>
              <ul className="ml-7 mt-1 list-disc">{r.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-card p-5 text-sm text-ink-2">
          <p className="font-semibold text-ink">Galvenās prasības (MK noteikumi Nr. 238)</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Atbalsts ir fiksēta summa, bet ne vairāk kā {ekii.maxIntensityPct}% no auto pārdošanas cenas</li>
            <li>Cena līdz {money(ekii.priceCap5)} bez PVN (6+ sēdvietām — {money(ekii.priceCap6)})</li>
            <li>Lietots elektroauto: pirmā reģistrācija ne senāk kā pirms {ekii.usedMaxAgeYears} gadiem, līdz {number(ekii.usedMaxKm)} km, Latvijā reģistrēts ne ilgāk par 12 mēn.</li>
            <li>Plug-in hibrīdiem — tikai jauniem (līdz {ekii.phevMaxCo2} g CO₂/km)</li>
            <li>Pēc pirkuma: 12 000 km gadā vai 60 000 km 5 gados, auto nedrīkst izmantot saimnieciskajā darbībā</li>
          </ul>
          <p className="mt-3 text-xs text-mute">Orientējošs aprēķins. Galīgo lēmumu pieņem Vides investīciju fonds.</p>
        </div>
        <Link href="/lizings#pieteikums" className="btn btn-signal w-full">Pieteikties elektroauto ar atbalstu</Link>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4"><dt className="text-white/65">{k}</dt><dd className="num font-semibold">{v}</dd></div>
  );
}
