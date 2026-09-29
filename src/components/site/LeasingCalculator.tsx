'use client';
import { useMemo, useState } from 'react';
import type { LeasingSettings } from '@/lib/types';
import { leasingSummary } from '@/lib/leasing';
import { money, number } from '@/lib/format';

export function Slider({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string }) {
  const fill = `${((value - min) / (max - min || 1)) * 100}%`;
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-ink-2">{label}</span>
        <span className="num font-bold text-ink">{format(value)}</span>
      </span>
      <input type="range" className="range mt-2" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} style={{ ['--fill' as string]: fill }} />
    </label>
  );
}

export function LeasingCalculator({ price, leasing, onApply, compact = false, priceEditable = false }: { price: number; leasing: LeasingSettings; onApply?: (v: { down: number; term: number; monthly: number }) => void; compact?: boolean; priceEditable?: boolean }) {
  const [p, setP] = useState(price);
  const [downPct, setDownPct] = useState(leasing.downPct);
  const [term, setTerm] = useState(leasing.term);
  const s = useMemo(() => leasingSummary({ price: p, downPct, rate: leasing.rate, term, residualPct: leasing.residualPct, contractFee: leasing.contractFee, monthlyFee: leasing.monthlyFee }), [p, downPct, term, leasing]);

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink-2">Mēneša maksājums</p>
          <p className="num display text-[2.6rem] text-ink">
            {number(Math.round(s.pmt))}
            <span className="ml-1 text-base font-semibold text-mute">€/mēn.</span>
          </p>
        </div>
        <span className="price-tag num rounded-lg px-2.5 py-1 text-sm font-bold">{leasing.rate}% gadā</span>
      </div>
      <div className="mt-5 space-y-5">
        {priceEditable && <Slider label="Auto cena" value={p} min={1000} max={80000} step={500} onChange={setP} format={money} />}
        <Slider label={`Pirmā iemaksa (${downPct}%)`} value={downPct} min={leasing.minDownPct} max={leasing.maxDownPct} step={5} onChange={setDownPct} format={() => money(s.down)} />
        <Slider label="Termiņš" value={term} min={leasing.minTerm} max={leasing.maxTerm} step={6} onChange={setTerm} format={(v) => `${v} mēn.`} />
      </div>
      {!compact && (
        <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-mute">Finansējuma summa</dt><dd className="num font-semibold">{money(s.financed)}</dd></div>
          <div className="flex justify-between"><dt className="text-mute">Kopā samaksāsi</dt><dd className="num font-semibold">{money(s.totalPaid)}</dd></div>
          <div className="flex justify-between"><dt className="text-mute">Procentu izmaksas</dt><dd className="num font-semibold">{money(s.interest)}</dd></div>
        </dl>
      )}
      {onApply && (
        <button onClick={() => onApply({ down: Math.round(s.down), term, monthly: Math.round(s.pmt) })} className="btn btn-signal mt-5 w-full text-base">
          Pieteikties līzingam
        </button>
      )}
      <p className="mt-3 text-xs leading-relaxed text-mute">Orientējošs aprēķins. Precīzu likmi un nosacījumus nosaka līzinga devējs pēc pieteikuma izvērtēšanas.</p>
    </div>
  );
}
