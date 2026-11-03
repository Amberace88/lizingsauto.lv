'use client';
import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, GripVertical, Hand, Heart, Palette, Pencil, Plus, RotateCcw, Settings2, Trash2, X, Zap } from 'lucide-react';
import type { Car } from '@/lib/types';
import {
  BADGE_POSITIONS, BADGE_SHAPES, DEFAULT_BADGE_STYLE, OP_LABEL, RULE_FIELDS,
  autoMatches, carBadges, encodeCarBadges, parseCarBadges, ruleText,
  type BadgeCar, type BadgeDef, type BadgePosition, type BadgeStyle, type BadgeTone, type Rule, type RuleField,
} from '@/lib/badges';
import { BadgeChips, BadgeOverlay } from '@/components/site/CarCard';
import { BadgeStyleProvider } from '@/components/site/BadgeOrderContext';

const TONE_HEX: Record<BadgeTone, string> = { signal: '#d91d2b', ok: '#1f8a4c', ink: '#161616', bad: '#c0392b', petrol: '#ffffff' };
const PRESETS = ['#d91d2b', '#161616', '#ffffff', '#1f8a4c', '#1d4ed8', '#0ea5e9', '#f59e0b', '#7c3aed', '#db2777', '#6b7280'];

const rulesSummary = (d: BadgeDef) => (d.rules.length ? d.rules.map(ruleText).join(' un ') : 'Tikai ar roku');

/* ======================================================================
 * Konkrēta auto zīmes (auto redaktorā un ātrajā labošanā)
 * ==================================================================== */
export function BadgeOrder({ car, onChange, style = DEFAULT_BADGE_STYLE }: { car: Partial<Car>; onChange: (badges: string[]) => void; style?: BadgeStyle; defaultOrder?: string[] }) {
  const bc = car as BadgeCar;
  const st = parseCarBadges(car.badges || []);
  const shown = carBadges(bc, style);
  const enabled = style.order.map((id) => style.defs[id]).filter((d): d is BadgeDef => !!d && d.enabled);
  const addable = enabled.filter((d) => !shown.includes(d.id));
  const drag = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const commit = (order: string[], forced = st.forced, hidden = st.hidden) => onChange(encodeCarBadges(order, forced, hidden));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= shown.length || from === to) return;
    const arr = [...shown];
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    commit(arr);
  };
  const remove = (id: string) => {
    const forced = new Set(st.forced);
    forced.delete(id);
    const hidden = new Set(st.hidden);
    if (autoMatches(bc, style.defs[id], style.ekii)) hidden.add(id);
    commit(shown.filter((x) => x !== id), forced, hidden);
  };
  const add = (id: string) => {
    const hidden = new Set(st.hidden);
    hidden.delete(id);
    const forced = new Set(st.forced);
    if (!autoMatches(bc, style.defs[id], style.ekii)) forced.add(id);
    commit([...shown, id], forced, hidden);
  };
  const reset = () => commit([...st.forced], st.forced, new Set());

  return (
    <BadgeStyleProvider value={style}>
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="label !mb-0">Uz bildes (svarīgākā augšā)</span>
            {(st.custom || st.hidden.size > 0) && (
              <button type="button" onClick={reset} className="flex items-center gap-1 text-xs font-semibold text-mute hover:text-ink" title="Atjaunot automātiskās zīmes un kopējo secību">
                <RotateCcw className="h-3.5 w-3.5" /> Automātiski
              </button>
            )}
          </div>
          {shown.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-sm text-mute">Zīmju nav — pievieno zemāk.</p>
          ) : (
            <ol className="space-y-1.5">
              {shown.map((b, k) => {
                const d = style.defs[b];
                const isForced = st.forced.has(b);
                return (
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
                    {isForced ? (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold uppercase text-mute" title="Pielikts ar roku"><Hand className="h-3 w-3" /> roku</span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold uppercase text-ok" title={`Automātiski: ${rulesSummary(d)}`}><Zap className="h-3 w-3" /> auto</span>
                    )}
                    <button type="button" onClick={() => move(k, k - 1)} disabled={k === 0} className="rounded p-1 text-mute hover:bg-paper hover:text-ink disabled:opacity-30" aria-label="Augstāk"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => move(k, k + 1)} disabled={k === shown.length - 1} className="rounded p-1 text-mute hover:bg-paper hover:text-ink disabled:opacity-30" aria-label="Zemāk"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" onClick={() => remove(b)} className="rounded p-1 text-mute hover:bg-paper hover:text-bad" aria-label="Noņemt šim auto" title="Noņemt šim auto"><X className="h-4 w-4" /></button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {addable.length > 0 && (
          <div>
            <span className="label">Pievienot zīmi</span>
            <div className="flex flex-wrap gap-1.5">
              {addable.map((d) => {
                const wasHidden = st.hidden.has(d.id) && autoMatches(bc, d, style.ekii);
                return (
                  <button key={d.id} type="button" onClick={() => add(d.id)} title={d.rules.length ? `Automātiski, ja: ${rulesSummary(d)}` : 'Pievieno ar roku'} className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:border-ink-2 hover:text-ink ${wasHidden ? 'border-dashed border-line text-mute' : 'border-line bg-card text-ink-2'}`}>
                    {wasHidden ? <Eye className="h-3 w-3" /> : <Plus className="h-3 w-3" />} {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <p className="text-xs text-mute">
          <Zap className="inline h-3 w-3 text-ok" /> zīmes pieliekas pašas pēc auto datiem (piem., elektroauto, 7 vietas, 4x4, svaiga TA) un pazūd, kad nosacījums vairs neizpildās. Jebkuru zīmi var pielikt arī ar roku vai noņemt šim auto. Nosaukumus, krāsas un noteikumus maina Iestatījumos → Zīmes uz auto bildēm.
        </p>
      </div>
    </BadgeStyleProvider>
  );
}

/* ======================================================================
 * Zīmju pārvaldība visai lapai (Iestatījumi)
 * ==================================================================== */
const SAMPLE_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb4c7"/><stop offset=".62" stop-color="#dfe6ec"/><stop offset=".62" stop-color="#8a8f96"/><stop offset="1" stop-color="#5d6167"/></linearGradient></defs><rect width="400" height="300" fill="url(#a)"/><path d="M70 205c8-30 30-52 70-58l50-30c20-12 45-14 80-10 30 4 48 20 62 44 26 4 40 18 44 44v12H62z" fill="#1f2937"/><circle cx="130" cy="220" r="26" fill="#111"/><circle cx="300" cy="220" r="26" fill="#111"/><circle cx="130" cy="220" r="11" fill="#9ca3af"/><circle cx="300" cy="220" r="11" fill="#9ca3af"/></svg>');

export function BadgeDesigner({ value, onChange, previewImg, cars = [] }: { value: BadgeStyle; onChange: (v: BadgeStyle) => void; previewImg?: string | null; cars?: BadgeCar[] }) {
  const drag = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [open, setOpen] = useState<{ id: string; tab: 'color' | 'rules' | 'name' } | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const order = value.order.filter((id) => value.defs[id]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of cars) for (const b of carBadges(c, value)) m[b] = (m[b] || 0) + 1;
    return m;
  }, [cars, value]);

  const setDef = (id: string, patch: Partial<BadgeDef>) => onChange({ ...value, defs: { ...value.defs, [id]: { ...value.defs[id], ...patch } } });
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
  const addCustom = () => {
    const label = newLabel.trim().slice(0, 40);
    if (!label) return;
    const id = `c_${Math.random().toString(36).slice(2, 9)}`;
    onChange({ ...value, order: [id, ...order], defs: { ...value.defs, [id]: { id, label, tone: 'ink', enabled: true, rules: [], custom: true } } });
    setNewLabel('');
    setOpen({ id, tab: 'rules' });
  };
  const removeCustom = (id: string) => {
    const defs = { ...value.defs };
    delete defs[id];
    const colors = { ...value.colors };
    delete colors[id];
    onChange({ ...value, defs, colors, order: order.filter((x) => x !== id) });
  };
  const sample = order.filter((b) => value.defs[b].enabled).slice(0, 6);

  return (
    <BadgeStyleProvider value={value}>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
        <div className="space-y-5 lg:sticky lg:top-4 lg:self-start">
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
          <div>
            <span className="label">Maksimāli zīmes uz bildes katalogā</span>
            <div className="flex flex-wrap gap-1.5">
              {[2, 3, 4, 5, 6, 8].map((n) => (
                <button key={n} type="button" onClick={() => onChange({ ...value, max: n })} aria-pressed={value.max === n} className={`num h-9 w-11 rounded-lg border text-sm font-bold ${value.max === n ? 'border-signal bg-signal-soft ring-1 ring-signal' : 'border-line bg-card hover:border-ink-2'}`}>{n}</button>
              ))}
            </div>
            <p className="mt-1 text-xs text-mute">Svarīgākās pēc secības; pārējās rādās kā „+2”. Auto lapas galerijā — līdz 6.</p>
          </div>
          <div className="rounded-xl bg-paper p-3 text-xs leading-relaxed text-ink-2">
            <p className="font-bold text-ink">Kā tas strādā</p>
            <p className="mt-1"><Zap className="inline h-3 w-3 text-ok" /> <b>Automātiskās</b> zīmes lapa pieliek pati pēc auto datiem, piem., 7 vietas, kad ievadītas ≥ 7 sēdvietas. Kad nosacījums vairs neizpildās, zīme pazūd.</p>
            <p className="mt-1"><Hand className="inline h-3 w-3" /> <b>Ar roku</b> zīmes atzīmē auto kartītē. Jebkuru zīmi var arī pielikt vai noņemt konkrētam auto.</p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="label !mb-0">Zīmes, secība un noteikumi (svarīgākā augšā)</span>
            {Object.keys(value.colors).length > 0 && (
              <button type="button" onClick={() => onChange({ ...value, colors: {} })} className="flex items-center gap-1 text-xs font-semibold text-mute hover:text-ink"><RotateCcw className="h-3.5 w-3.5" /> Noklusētās krāsas</button>
            )}
          </div>
          <ol className="space-y-1.5">
            {order.map((b, k) => {
              const d = value.defs[b];
              const current = value.colors[b] || TONE_HEX[d.tone];
              const isOpen = open?.id === b;
              return (
                <li
                  key={b}
                  draggable={!isOpen}
                  onDragStart={() => (drag.current = k)}
                  onDragOver={(e) => { e.preventDefault(); setOver(k); }}
                  onDragLeave={() => setOver(null)}
                  onDrop={() => { if (drag.current != null) move(drag.current, k); drag.current = null; setOver(null); }}
                  onDragEnd={() => { drag.current = null; setOver(null); }}
                  className={`rounded-lg border bg-card px-2 py-1.5 text-sm transition ${over === k ? 'border-signal ring-1 ring-signal' : 'border-line'} ${d.enabled ? '' : 'opacity-55'}`}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className={`h-4 w-4 shrink-0 text-mute ${isOpen ? '' : 'cursor-grab'}`} />
                    <span className="num w-5 text-xs font-bold text-mute">{k + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <BadgeChips badges={[b]} />
                        {cars.length > 0 && d.enabled && <span className="num text-[11px] text-mute" title="Cik publicētajiem auto šī zīme šobrīd rādās">{counts[b] || 0} auto</span>}
                      </span>
                      <span className={`mt-0.5 flex items-center gap-1 truncate text-[11px] ${d.rules.length ? 'text-ok' : 'text-mute'}`}>
                        {d.rules.length ? <Zap className="h-3 w-3 shrink-0" /> : <Hand className="h-3 w-3 shrink-0" />}
                        <span className="truncate">{d.rules.length ? `Auto: ${rulesSummary(d)}` : 'Ar roku auto kartītē'}</span>
                      </span>
                    </span>
                    <IconBtn on={isOpen && open?.tab === 'name'} onClick={() => setOpen(isOpen && open?.tab === 'name' ? null : { id: b, tab: 'name' })} label="Mainīt nosaukumu"><Pencil className="h-3.5 w-3.5" /></IconBtn>
                    <button type="button" onClick={() => setOpen(isOpen && open?.tab === 'color' ? null : { id: b, tab: 'color' })} className={`flex items-center gap-1 rounded-md border px-1.5 py-1 text-xs ${isOpen && open?.tab === 'color' ? 'border-ink' : 'border-line hover:border-ink-2'}`} aria-label={`Krāsa: ${d.label}`}>
                      <Palette className="h-3.5 w-3.5 text-ink-2" /><span className="h-3.5 w-3.5 rounded-full border border-line" style={{ backgroundColor: current }} />
                    </button>
                    <IconBtn on={isOpen && open?.tab === 'rules'} onClick={() => setOpen(isOpen && open?.tab === 'rules' ? null : { id: b, tab: 'rules' })} label="Kad rādīt (noteikumi)"><Settings2 className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn onClick={() => setDef(b, { enabled: !d.enabled })} label={d.enabled ? 'Izslēgt zīmi visā lapā' : 'Ieslēgt zīmi'}>{d.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</IconBtn>
                    <span className="hidden flex-col sm:flex">
                      <button type="button" onClick={() => move(k, k - 1)} disabled={k === 0} className="rounded px-1 text-mute hover:text-ink disabled:opacity-30" aria-label="Augstāk"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => move(k, k + 1)} disabled={k === order.length - 1} className="rounded px-1 text-mute hover:text-ink disabled:opacity-30" aria-label="Zemāk"><ArrowDown className="h-3.5 w-3.5" /></button>
                    </span>
                  </div>

                  {isOpen && open?.tab === 'name' && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2">
                      <input autoFocus className="field !w-auto flex-1 !py-1.5" maxLength={40} defaultValue={d.label} onKeyDown={(e) => { if (e.key === 'Enter') { setDef(b, { label: e.currentTarget.value.trim() || d.label }); setOpen(null); } }} onBlur={(e) => setDef(b, { label: e.target.value.trim() || d.label })} />
                      <button type="button" onClick={() => setOpen(null)} className="btn btn-primary !px-3 !py-1.5 text-sm"><Check className="h-4 w-4" /> Gatavs</button>
                      {d.custom && <button type="button" onClick={() => removeCustom(b)} className="btn btn-ghost !px-3 !py-1.5 text-sm text-bad"><Trash2 className="h-4 w-4" /> Dzēst zīmi</button>}
                    </div>
                  )}
                  {isOpen && open?.tab === 'color' && (
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
                  {isOpen && open?.tab === 'rules' && <RuleEditor def={d} onChange={(rules) => setDef(b, { rules })} cars={cars} style={value} />}
                </li>
              );
            })}
          </ol>
          <div className="mt-3 flex gap-2 rounded-lg border border-dashed border-line p-2">
            <input className="field flex-1 !py-2" maxLength={40} placeholder="Jauna zīme, piem., „Ziemas riepas komplektā”" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())} />
            <button type="button" onClick={addCustom} disabled={!newLabel.trim()} className="btn btn-primary !py-2"><Plus className="h-4 w-4" /> Pievienot</button>
          </div>
        </div>
      </div>
    </BadgeStyleProvider>
  );
}

function RuleEditor({ def, onChange, cars, style }: { def: BadgeDef; onChange: (r: Rule[]) => void; cars: BadgeCar[]; style: BadgeStyle }) {
  const auto = def.rules.length > 0;
  const matching = cars.filter((c) => autoMatches(c, def, style.ekii)).length;
  const set = (i: number, r: Rule) => onChange(def.rules.map((x, k) => (k === i ? r : x)));
  const fresh = (field: RuleField): Rule => {
    const f = RULE_FIELDS[field];
    const op = f.ops[0];
    const DEF: Partial<Record<RuleField, number>> = { seats: 7, mileage: 100000, km_per_year: 15000, age_years: 3, year: new Date().getFullYear() - 3, price: 5000, ta_months: 10, days_listed: 14 };
    return { field, op, value: op === 'in' ? [] : op === 'contains' ? '' : op === 'true' ? undefined : DEF[field] ?? 0 };
  };
  return (
    <div className="mt-2 space-y-3 border-t border-line pt-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <button type="button" onClick={() => onChange([])} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-semibold ${!auto ? 'border-ink bg-ink text-white' : 'border-line text-ink-2 hover:border-ink-2'}`}><Hand className="h-4 w-4" /> Tikai ar roku</button>
        <button type="button" onClick={() => !auto && onChange([fresh('seats')])} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-semibold ${auto ? 'border-ok bg-ok text-white' : 'border-line text-ink-2 hover:border-ink-2'}`}><Zap className="h-4 w-4" /> Automātiski pēc datiem</button>
      </div>
      {auto && (
        <>
          <p className="text-xs text-mute">Zīme rādās, ja izpildās <b>visi</b> nosacījumi:</p>
          <ul className="space-y-2">
            {def.rules.map((r, i) => {
              const f = RULE_FIELDS[r.field];
              return (
                <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-paper p-2">
                  <select className="field !w-auto !py-1.5 text-sm" value={r.field} onChange={(e) => set(i, fresh(e.target.value as RuleField))}>
                    {Object.entries(RULE_FIELDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  {f.ops.length > 1 && (
                    <select className="field !w-auto !py-1.5 text-sm" value={r.op} onChange={(e) => set(i, { ...r, op: e.target.value as Rule['op'] })}>
                      {f.ops.map((o) => <option key={o} value={o}>{OP_LABEL[o]}</option>)}
                    </select>
                  )}
                  {(r.op === 'gte' || r.op === 'lte') && (
                    <span className="flex items-center gap-1">
                      <input className="field num !w-28 !py-1.5 text-sm" inputMode="decimal" value={String(r.value ?? '')} onChange={(e) => set(i, { ...r, value: Number(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0 })} />
                      {f.unit && <span className="text-xs text-mute">{f.unit}</span>}
                    </span>
                  )}
                  {r.op === 'contains' && <input className="field min-w-[220px] flex-1 !py-1.5 text-sm" placeholder="vārds, cits vārds" value={String(r.value ?? '')} onChange={(e) => set(i, { ...r, value: e.target.value })} />}
                  {r.op === 'in' && (
                    <span className="flex flex-wrap gap-1">
                      {Object.entries(f.options || {}).map(([k, l]) => {
                        const on = (r.value as string[] | undefined)?.includes(k);
                        return (
                          <button key={k} type="button" onClick={() => set(i, { ...r, value: on ? (r.value as string[]).filter((x) => x !== k) : [...((r.value as string[]) || []), k] })} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${on ? 'border-ink bg-ink text-white' : 'border-line bg-card text-ink-2'}`}>{l}</button>
                        );
                      })}
                    </span>
                  )}
                  <button type="button" onClick={() => onChange(def.rules.filter((_, k) => k !== i))} className="ml-auto rounded p-1 text-mute hover:bg-card hover:text-bad" aria-label="Dzēst nosacījumu"><X className="h-4 w-4" /></button>
                  {f.hint && <span className="w-full text-[11px] text-mute">{f.hint}</span>}
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => onChange([...def.rules, fresh('mileage')])} className="flex items-center gap-1 text-sm font-semibold text-petrol hover:underline"><Plus className="h-4 w-4" /> Pievienot nosacījumu</button>
            {cars.length > 0 && <span className="num text-xs text-mute">Šobrīd atbilst <b className="text-ink">{matching}</b> no {cars.length} auto</span>}
          </div>
        </>
      )}
    </div>
  );
}

function IconBtn({ onClick, label, on, children }: { onClick: () => void; label: string; on?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={`rounded-md border p-1.5 ${on ? 'border-ink bg-ink text-white' : 'border-line text-ink-2 hover:border-ink-2 hover:text-ink'}`}>
      {children}
    </button>
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
