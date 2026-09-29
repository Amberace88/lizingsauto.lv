'use client';
import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Plus, RotateCcw, X, Zap } from 'lucide-react';
import type { Car } from '@/lib/types';
import { BADGES, BADGE_ORDER_MARK, DEFAULT_BADGE_ORDER, MANUAL_BADGES, autoBadges, carBadges, encodeBadges } from '@/lib/format';
import { BadgeChips } from '@/components/site/CarCard';

type Props = { car: Partial<Car>; onChange: (badges: string[]) => void; defaultOrder?: string[] };

const asBadgeCar = (car: Partial<Car>) => ({
  badges: car.badges || [],
  fuel: car.fuel || null,
  old_price: car.old_price || null,
  price: car.price || 0,
  vat_included: !!car.vat_included,
  drive: car.drive || null,
  odometer_history: car.odometer_history || null,
});

/** Zīmju izvēle un kārtošana pēc svarīguma (vilkt vai bultiņas). */
export function BadgeOrder({ car, onChange, defaultOrder = DEFAULT_BADGE_ORDER }: Props) {
  const bc = asBadgeCar(car);
  const order = carBadges(bc, defaultOrder);
  const hidden = (car.badges || []).filter((b) => b.startsWith('!')).map((b) => b.slice(1));
  const applicableAuto = autoBadges({ ...bc, badges: [] });
  const hiddenActive = applicableAuto.filter((b) => hidden.includes(b));
  const addable = MANUAL_BADGES.filter((b) => !order.includes(b));
  const custom = (car.badges || []).includes(BADGE_ORDER_MARK);
  const drag = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const commit = (nextOrder: string[], nextHidden = hidden) => onChange(encodeBadges(nextOrder, nextHidden));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const arr = [...order];
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    commit(arr);
  };
  const remove = (b: string) => (BADGES[b].auto ? commit(order.filter((x) => x !== b), [...new Set([...hidden, b])]) : commit(order.filter((x) => x !== b)));
  const add = (b: string) => commit([...order, b]);
  const unhide = (b: string) => commit([...order, b], hidden.filter((x) => x !== b));
  const reset = () => onChange((car.badges || []).filter((b) => BADGES[b] && !BADGES[b].auto));

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="label !mb-0">Secība uz bildes (svarīgākā augšā)</span>
          {custom && (
            <button type="button" onClick={reset} className="flex items-center gap-1 text-xs font-semibold text-mute hover:text-ink" title="Kārtot automātiski pēc noklusētā svarīguma">
              <RotateCcw className="h-3.5 w-3.5" /> Automātiski
            </button>
          )}
        </div>
        {order.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-sm text-mute">Zīmju nav — pievieno zemāk.</p>
        ) : (
          <ol className="space-y-1.5">
            {order.map((b, k) => (
              <li
                key={b}
                draggable
                onDragStart={() => (drag.current = k)}
                onDragOver={(e) => { e.preventDefault(); setOver(k); }}
                onDragLeave={() => setOver(null)}
                onDrop={() => { if (drag.current != null) move(drag.current, k); drag.current = null; setOver(null); }}
                onDragEnd={() => { drag.current = null; setOver(null); }}
                className={`flex cursor-grab items-center gap-2 rounded-lg border bg-card px-2 py-1.5 text-sm active:cursor-grabbing ${over === k ? 'border-signal ring-1 ring-signal' : 'border-line'}`}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-mute" />
                <span className="num w-4 text-xs font-bold text-mute">{k + 1}</span>
                <span className="min-w-0 flex-1"><BadgeChips badges={[b]} /></span>
                {BADGES[b].auto && <span className="flex items-center gap-0.5 text-[10px] font-semibold uppercase text-mute" title={BADGES[b].hint}><Zap className="h-3 w-3" /> auto</span>}
                <button type="button" onClick={() => move(k, k - 1)} disabled={k === 0} className="rounded p-1 text-mute hover:bg-paper hover:text-ink disabled:opacity-30" aria-label="Augstāk"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" onClick={() => move(k, k + 1)} disabled={k === order.length - 1} className="rounded p-1 text-mute hover:bg-paper hover:text-ink disabled:opacity-30" aria-label="Zemāk"><ArrowDown className="h-4 w-4" /></button>
                <button type="button" onClick={() => remove(b)} className="rounded p-1 text-mute hover:bg-paper hover:text-bad" aria-label={BADGES[b].auto ? 'Paslēpt' : 'Noņemt'} title={BADGES[b].auto ? 'Paslēpt šim auto' : 'Noņemt'}>
                  {BADGES[b].auto ? <EyeOff className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {(addable.length > 0 || hiddenActive.length > 0) && (
        <div>
          <span className="label">Pievienot zīmi</span>
          <div className="flex flex-wrap gap-1.5">
            {addable.map((b) => (
              <button key={b} type="button" onClick={() => add(b)} className="flex items-center gap-1 rounded-full border border-line bg-card px-2.5 py-1 text-xs font-semibold text-ink-2 transition hover:border-ink-2 hover:text-ink">
                <Plus className="h-3 w-3" /> {BADGES[b].label}
              </button>
            ))}
            {hiddenActive.map((b) => (
              <button key={b} type="button" onClick={() => unhide(b)} className="flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-1 text-xs font-semibold text-mute transition hover:border-ink-2 hover:text-ink" title="Paslēpta automātiskā zīme">
                <Eye className="h-3 w-3" /> {BADGES[b].label}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-mute">
        Uz bildes rādās visas zīmes šajā secībā. Automātiskās (<Zap className="inline h-3 w-3" />) pieliekas pašas pēc auto datiem — tās var pārvietot vai paslēpt. Ja secību nekārto, zīmes sakārtojas pēc lapas kopējā svarīguma (Iestatījumi → Zīmju svarīgums).
      </p>
    </div>
  );
}

/** Lapas kopējā zīmju svarīguma secība (iestatījumos). */
export function BadgeDefaultOrder({ order, onChange }: { order: string[]; onChange: (o: string[]) => void }) {
  const drag = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const arr = [...order];
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    onChange(arr);
  };
  return (
    <ol className="grid gap-1.5 sm:grid-cols-2">
      {order.map((b, k) => (
        <li
          key={b}
          draggable
          onDragStart={() => (drag.current = k)}
          onDragOver={(e) => { e.preventDefault(); setOver(k); }}
          onDragLeave={() => setOver(null)}
          onDrop={() => { if (drag.current != null) move(drag.current, k); drag.current = null; setOver(null); }}
          onDragEnd={() => { drag.current = null; setOver(null); }}
          className={`flex cursor-grab items-center gap-2 rounded-lg border bg-card px-2 py-1.5 text-sm active:cursor-grabbing ${over === k ? 'border-signal ring-1 ring-signal' : 'border-line'}`}
        >
          <GripVertical className="h-4 w-4 shrink-0 text-mute" />
          <span className="num w-5 text-xs font-bold text-mute">{k + 1}</span>
          <span className="min-w-0 flex-1"><BadgeChips badges={[b]} /></span>
          {BADGES[b].auto && <span className="flex items-center gap-0.5 text-[10px] font-semibold uppercase text-mute" title={BADGES[b].hint}><Zap className="h-3 w-3" /> auto</span>}
          <button type="button" onClick={() => move(k, k - 1)} disabled={k === 0} className="rounded p-1 text-mute hover:bg-paper hover:text-ink disabled:opacity-30" aria-label="Augstāk"><ArrowUp className="h-4 w-4" /></button>
          <button type="button" onClick={() => move(k, k + 1)} disabled={k === order.length - 1} className="rounded p-1 text-mute hover:bg-paper hover:text-ink disabled:opacity-30" aria-label="Zemāk"><ArrowDown className="h-4 w-4" /></button>
        </li>
      ))}
    </ol>
  );
}
