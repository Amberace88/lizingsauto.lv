'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { LeasingSettings } from '@/lib/types';
import { monthlyPayment } from '@/lib/leasing';
import { number } from '@/lib/format';

export type MiniCar = { id: string; slug: string; name: string; year: number | null; price: number; img: string | null };

const MIN = 60;
const MAX = 900;

/** Paraboliskā "spidometra" skala, kas aizpildās līdz ar izvēlēto mēneša budžetu. */
function Gauge({ value }: { value: number }) {
  const pct = (value - MIN) / (MAX - MIN);
  const R = 120;
  const len = Math.PI * R;
  const angle = Math.PI * (1 - pct);
  const nx = 150 + Math.cos(angle) * (R - 22);
  const ny = 150 - Math.sin(angle) * (R - 22);
  return (
    <svg viewBox="0 0 300 165" className="w-full max-w-[340px]" aria-hidden>
      <path d="M30 150 A120 120 0 0 1 270 150" fill="none" stroke="#dde2e6" strokeWidth="18" strokeLinecap="round" />
      <motion.path
        d="M30 150 A120 120 0 0 1 270 150"
        fill="none"
        stroke="#f5b301"
        strokeWidth="18"
        strokeLinecap="round"
        strokeDasharray={len}
        initial={{ strokeDashoffset: len }}
        animate={{ strokeDashoffset: len * (1 - pct) }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const a = Math.PI * (1 - t);
        return <line key={t} x1={150 + Math.cos(a) * 98} y1={150 - Math.sin(a) * 98} x2={150 + Math.cos(a) * 88} y2={150 - Math.sin(a) * 88} stroke="#6b7884" strokeWidth="2" />;
      })}
      <motion.line x1="150" y1="150" animate={{ x2: nx, y2: ny }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} stroke="#15202b" strokeWidth="5" strokeLinecap="round" />
      <circle cx="150" cy="150" r="9" fill="#15202b" />
    </svg>
  );
}

export function BudgetHero({ cars, leasing }: { cars: MiniCar[]; leasing: LeasingSettings }) {
  const [budget, setBudget] = useState(250);
  const [downPct, setDownPct] = useState(leasing.downPct);

  const matches = useMemo(
    () =>
      cars
        .map((c) => ({ ...c, pmt: Math.round(monthlyPayment({ price: c.price, downPct, rate: leasing.rate, term: leasing.term, residualPct: leasing.residualPct, monthlyFee: leasing.monthlyFee })) }))
        .filter((c) => c.pmt <= budget)
        .sort((a, b) => b.pmt - a.pmt),
    [cars, budget, downPct, leasing],
  );
  const fill = `${((budget - MIN) / (MAX - MIN)) * 100}%`;

  return (
    <div className="rounded-[20px] bg-white p-5 shadow-[var(--shadow-lift)] sm:p-7">
      <div className="flex flex-col items-center">
        <label htmlFor="budget" className="text-sm font-semibold text-ink-2">
          Cik vari atļauties mēnesī?
        </label>
        <Gauge value={budget} />
        <p className="-mt-6 text-center">
          <span className="num display text-[3.2rem] text-ink">{budget}</span>
          <span className="ml-1 text-lg font-semibold text-mute">€/mēn.</span>
        </p>
      </div>
      <input
        id="budget"
        type="range"
        min={MIN}
        max={MAX}
        step={10}
        value={budget}
        onChange={(e) => setBudget(+e.target.value)}
        className="range mt-4"
        style={{ ['--fill' as string]: fill }}
        aria-valuetext={`${budget} eiro mēnesī`}
      />
      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <span className="text-ink-2">Pirmā iemaksa</span>
        <div className="flex rounded-full bg-paper p-1" role="radiogroup" aria-label="Pirmā iemaksa">
          {[0, 10, 20, 30].map((p) => (
            <button
              key={p}
              role="radio"
              aria-checked={downPct === p}
              onClick={() => setDownPct(p)}
              className={`num rounded-full px-3 py-1 font-semibold transition ${downPct === p ? 'bg-petrol text-white' : 'text-ink-2 hover:text-ink'}`}
            >
              {p}%
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 h-[76px] overflow-hidden">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          <AnimatePresence initial={false} mode="popLayout">
            {matches.slice(0, 12).map((c) => (
              <motion.div key={c.id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}>
                <Link href={`/auto/${c.slug}`} className="relative block h-[72px] w-[96px] shrink-0 overflow-hidden rounded-lg bg-line" title={`${c.name} — ${c.pmt} €/mēn.`}>
                  {c.img && <Image src={c.img} alt={c.name} fill sizes="96px" className="object-cover" />}
                  <span className="num absolute bottom-1 left-1 rounded bg-signal px-1 text-[10px] font-bold text-ink">{c.pmt}€</span>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
          {matches.length === 0 && <p className="self-center text-sm text-mute">Palielini budžetu vai pirmo iemaksu — vai zvani, atradīsim variantu.</p>}
        </div>
      </div>

      <Link href={`/katalogs?maxMonthly=${budget}&down=${downPct}`} className="btn btn-signal mt-4 w-full text-base">
        Skatīt <span className="num">{matches.length}</span> {matches.length === 1 ? 'auto' : 'auto'} līdz {number(budget)} €/mēn.
      </Link>
      <p className="mt-2 text-center text-xs text-mute">
        Aprēķins: {leasing.rate}% gadā, {leasing.term} mēn. Galīgos nosacījumus apstiprina līzinga devējs.
      </p>
    </div>
  );
}
