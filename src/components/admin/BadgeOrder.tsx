'use client';
import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Heart, Palette, Plus, RotateCcw, X, Zap } from 'lucide-react';
import type { Car } from '@/lib/types';
import { BADGES, BADGE_ORDER_MARK, BADGE_POSITIONS, BADGE_SHAPES, DEFAULT_BADGE_ORDER, MANUAL_BADGES, autoBadges, carBadges, encodeBadges, type BadgePosition, type BadgeStyle } from '@/lib/format';
import { BadgeChips, BadgeOverlay } from '@/components/site/CarCard';
import { BadgeStyleProvider } from '@/components/site/BadgeOrderContext';

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

const TONE_HEX: Record<string, string> = { signal: '#d91d2b', ok: '#1f8a4c', ink: '#161616', bad: '#c0392b', petrol: '#ffffff' };
const PRESETS = ['#d91d2b', '#161616', '#ffffff', '#1f8a4c', '#1d4ed8', '#0ea5e9', '#f59e0b', '#7c3aed', '#db2777', '#6b7280'];
const SAMPLE_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb4c7"/><stop offset=".62" stop-color="#dfe6ec"/><stop offset=".62" stop-color="#8a8f96"/><stop offset="1" stop-color="#5d6167"/></linearGradient></defs><rect width="400" height="300" fill="url(#a)"/><path d="M70 205c8-30 30-52 70-58l50-30c20-12 45-14 80-10 30 4 48 20 62 44 26 4 40 18 44 44v12H62z" fill="#1f2937"/><circle cx="130" cy="220" r="26" fill="#111"/><circle cx="300" cy="220" r="26" fill="#111"/><circle cx="130" cy="220" r="11" fill="#9ca3af"/><circle cx="300" cy="220" r="11" fill="#9ca3af"/><path d="M205 125l20-6h45c16 2 28 12 36 28h-110z" fill="#9fb4c7" opacity=".7"/></svg>');

/** Zīmju dizains visai lapai: novietojums, forma, krāsas, secība — ar tiešo priekšskatījumu. */
export function BadgeDesigner({ value, onChange, previewImg }: { value: BadgeStyle; onChange: (v: BadgeStyle) => void; previewImg?: string | null }) {
  const drag = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const order = value.order;
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const arr = [...order];
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    onChange({ ...value, order: arr });
  };
  const setColor = (b: string, c: string | null) => {
    const colors = { ...value.colors };
    if (c) colors[b] = c.toLowerCase();
    else delete colors[b];
    onChange({ ...value, colors });
  };
  const sample = order.filter((b) => ['top_offer', 'ekii', 'price_drop', 'low_price', 'fresh_ta', 'warranty', 'electric', 'csdd'].includes(b)).slice(0, 6);

  return (
    <BadgeStyleProvider value={value}>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-5">
          <div>
            <span className="label">Priekšskatījums</span>
            <div className="relative mx-auto aspect-[4/3] max-w-md overflow-hidden rounded-xl bg-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewImg || SAMPLE_IMG} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <BadgeOverlay badges={sample} />
              <span className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-card/90 shadow"><Heart className="h-5 w-5 text-ink" /></span>
              <span className="price-tag num absolute bottom-3 left-3 rounded-lg px-2.5 py-1.5 text-sm font-bold shadow-md">no 199 €/mēn.</span>
            </div>
            <p className="mt-1.5 text-center text-xs text-mute">Tā izskatīsies katalogā un auto lapā</p>
          </div>
          <div>
            <span className="label">Novietojums uz bildes</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BADGE_POSITIONS.map((p) => (
                <button key={p.id} type="button" onClick={() => onChange({ ...value, position: p.id })} aria-pressed={value.position === p.id} className={`rounded-xl border p-2 text-left text-xs font-semibold transition ${value.position === p.id ? 'border-signal bg-signal-soft text-ink ring-1 ring-signal' : 'border-line bg-card text-ink-2 hover:border-ink-2'}`}>
                  <PosIcon pos={p.id} />
                  <span className="mt-1.5 block">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Forma</span>
            <div className="flex flex-wrap gap-2">
              {BADGE_SHAPES.map((sh) => (
                <button key={sh.id} type="button" onClick={() => onChange({ ...value, shape: sh.id })} aria-pressed={value.shape === sh.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${value.shape === sh.id ? 'border-signal bg-signal-soft ring-1 ring-signal' : 'border-line bg-card hover:border-ink-2'}`}>
                  <span className={`inline-block h-4 w-8 bg-signal ${sh.id === 'pill' ? 'rounded-full' : sh.id === 'rounded' ? 'rounded-md' : 'rounded-[2px]'}`} /> {sh.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="label !mb-0">Secība un krāsas (svarīgākā augšā)</span>
            {Object.keys(value.colors).length > 0 && (
              <button type="button" onClick={() => onChange({ ...value, colors: {} })} className="flex items-center gap-1 text-xs font-semibold text-mute hover:text-ink"><RotateCcw className="h-3.5 w-3.5" /> Noklusētās krāsas</button>
            )}
          </div>
          <ol className="space-y-1.5">
            {order.map((b, k) => {
              const current = value.colors[b] || TONE_HEX[BADGES[b].tone];
              return (
                <li
                  key={b}
                  draggable
                  onDragStart={() => (drag.current = k)}
                  onDragOver={(e) => { e.preventDefault(); setOver(k); }}
                  onDragLeave={() => setOver(null)}
                  onDrop={() => { if (drag.current != null) move(drag.current, k); drag.current = null; setOver(null); }}
                  onDragEnd={() => { drag.current = null; setOver(null); }}
                  className={`rounded-lg border bg-card px-2 py-1.5 text-sm ${over === k ? 'border-signal ring-1 ring-signal' : 'border-line'}`}
                >
                  <div className="flex cursor-grab items-center gap-2 active:cursor-grabbing">
                    <GripVertical className="h-4 w-4 shrink-0 text-mute" />
                    <span className="num w-5 text-xs font-bold text-mute">{k + 1}</span>
                    <span className="min-w-0 flex-1"><BadgeChips badges={[b]} /></span>
                    {BADGES[b].auto && <span className="hidden items-center gap-0.5 text-[10px] font-semibold uppercase text-mute sm:flex" title={BADGES[b].hint}><Zap className="h-3 w-3" /> auto</span>}
                    <button type="button" onClick={() => setOpen(open === b ? null : b)} className="flex items-center gap-1 rounded-md border border-line px-1.5 py-1 text-xs font-semibold text-ink-2 hover:border-ink-2" aria-label={`Krāsa: ${BADGES[b].label}`} aria-expanded={open === b}>
                      <Palette className="h-3.5 w-3.5" /><span className="h-3.5 w-3.5 rounded-full border border-line" style={{ backgroundColor: current }} />
                    </button>
                    <button type="button" onClick={() => move(k, k - 1)} disabled={k === 0} className="rounded p-1 text-mute hover:bg-paper hover:text-ink disabled:opacity-30" aria-label="Augstāk"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => move(k, k + 1)} disabled={k === order.length - 1} className="rounded p-1 text-mute hover:bg-paper hover:text-ink disabled:opacity-30" aria-label="Zemāk"><ArrowDown className="h-4 w-4" /></button>
                  </div>
                  {open === b && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line pt-2">
                      {PRESETS.map((c) => (
                        <button key={c} type="button" onClick={() => setColor(b, c)} className={`h-7 w-7 rounded-full border-2 transition hover:scale-110 ${current === c ? 'border-signal' : 'border-line'}`} style={{ backgroundColor: c }} aria-label={`Krāsa ${c}`} />
                      ))}
                      <label className="relative grid h-7 w-7 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed border-line" title="Cita krāsa">
                        <Plus className="h-3.5 w-3.5 text-mute" />
                        <input type="color" value={current} onChange={(e) => setColor(b, e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
                      </label>
                      {value.colors[b] && <button type="button" onClick={() => setColor(b, null)} className="ml-1 text-xs font-semibold text-mute hover:text-ink">Noklusētā</button>}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </BadgeStyleProvider>
  );
}

function PosIcon({ pos }: { pos: BadgePosition }) {
  const chip = 'absolute rounded-[2px] bg-signal';
  return (
    <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-md bg-line">
      {pos === 'top' && [0, 1, 2].map((i) => <span key={i} className={chip} style={{ top: 5, left: 5 + i * 17, width: 14, height: 5 }} />)}
      {pos === 'bottom' && [0, 1, 2].map((i) => <span key={i} className={chip} style={{ bottom: 12, left: 5 + i * 17, width: 14, height: 5 }} />)}
      {pos === 'left' && [0, 1, 2].map((i) => <span key={i} className={chip} style={{ left: 5, top: 5 + i * 8, width: 16, height: 5 }} />)}
      {pos === 'right' && [0, 1, 2].map((i) => <span key={i} className={chip} style={{ right: 5, top: 14 + i * 8, width: 16, height: 5 }} />)}
    </span>
  );
}
