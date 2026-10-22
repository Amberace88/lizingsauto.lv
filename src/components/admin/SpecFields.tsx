'use client';
// Tehnisko datu lauki auto redaktorā: pareiza skaitļu (ar komatu) un datumu (DD.MM.GGGG) ievade + admina pielāgojams lauku saraksts.
import { useEffect, useRef, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { CalendarDays, Eye, EyeOff, GripVertical, Loader2, RotateCcw, Save, SlidersHorizontal, X } from 'lucide-react';
import type { Car } from '@/lib/types';
import { BODY_LABEL, DRIVE_LABEL, FUEL_LABEL, GEAR_LABEL } from '@/lib/format';
import { DEFAULT_HIDDEN, SPEC_BY_KEY, SPEC_FIELDS, fieldVisible, fmtNum, isoToLv, lvToIso, normalizeCarFields, parseNum, type CarFieldsSettings, type SpecDef, type SpecKey } from '@/lib/car-fields';
import { supabaseBrowser } from '@/lib/supabase/client';
import { revalidateSite } from './revalidate';
import { useToast } from './Toast';

const SELECTS: Partial<Record<SpecKey, Record<string, string>>> = { fuel: FUEL_LABEL, transmission: GEAR_LABEL, body_type: BODY_LABEL, drive: DRIVE_LABEL };

export function useCarFields() {
  const [s, setS] = useState<CarFieldsSettings>(() => normalizeCarFields(null));
  useEffect(() => {
    supabaseBrowser().from('settings').select('value').eq('key', 'car_fields').maybeSingle().then(({ data }: { data: { value: unknown } | null }) => setS(normalizeCarFields(data?.value)));
  }, []);
  return [s, setS] as const;
}

export async function saveCarFields(s: CarFieldsSettings) {
  const { error } = await supabaseBrowser().from('settings').upsert({ key: 'car_fields', value: s, is_public: true, technical: false, updated_at: new Date().toISOString() });
  if (!error) revalidateSite();
  return error?.message || null;
}

/** Skaitļa lauks: glabā ievadīto tekstu, kamēr raksta (2, → 2,0), un saglabā skaitli; pieņem komatu, atstarpes, cm³. */
export function NumInput({ def, value, onChange }: { def: SpecDef; value: number | null | undefined; onChange: (v: number | null) => void }) {
  const dec = def.kind === 'dec';
  const [txt, setTxt] = useState(() => fmtNum(value, dec ? def.decimals : 0));
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (!focus) setTxt(fmtNum(value, dec ? def.decimals : 0));
  }, [value, focus, dec, def.decimals]);
  const conv = (n: number) => (def.key === 'engine_volume' && n > 50 ? Math.round(n / 100) / 10 : n); // cm³ → l
  const parsed = parseNum(txt);
  const v = parsed == null || parsed === undefined ? parsed : conv(dec ? parsed : Math.round(parsed));
  const bad = v === undefined || (typeof v === 'number' && ((def.min != null && v < def.min) || (def.max != null && v > def.max)));
  const extra = def.key === 'power_kw' && typeof value === 'number' && value > 0 ? `≈ ${Math.round(value * 1.36)} ZS` : def.key === 'engine_volume' && typeof parsed === 'number' && parsed > 50 ? `= ${fmtNum(conv(parsed), 1)} l` : '';
  return (
    <>
      <div className="relative">
        <input
          className={`field num ${def.unit ? 'pr-16' : ''} ${bad ? '!border-signal' : ''}`}
          inputMode={dec ? 'decimal' : 'numeric'}
          value={txt}
          placeholder={def.placeholder}
          onFocus={() => setFocus(true)}
          onChange={(e) => {
            setTxt(e.target.value);
            const p = parseNum(e.target.value);
            if (p === null) onChange(null);
            else if (p !== undefined) onChange(conv(dec ? Math.round(p * 100) / 100 : Math.round(p)));
          }}
          onBlur={() => {
            setFocus(false);
            setTxt(fmtNum(typeof v === 'number' ? v : value, dec ? def.decimals : 0));
          }}
        />
        {def.unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-mute">{def.unit}</span>}
      </div>
      {bad ? (
        <span className="mt-1 block text-xs font-semibold text-signal">Pārbaudi vērtību{def.min != null && def.max != null ? ` (${fmtNum(def.min, dec ? 1 : 0)}–${fmtNum(def.max, dec ? 1 : 0)})` : ''}</span>
      ) : extra ? (
        <span className="mt-1 block text-xs text-mute">{extra}</span>
      ) : null}
    </>
  );
}

/** Datums DD.MM.GGGG (kā pieņemts Latvijā) + kalendāra poga. */
export function DateInput({ value, onChange }: { value: string | null | undefined; onChange: (v: string | null) => void }) {
  const [txt, setTxt] = useState(() => isoToLv(value));
  const pick = useRef<HTMLInputElement>(null);
  // Sinhronizē tikai, ja vērtība mainās no ārpuses (kalendārs, CSDD); nederīgu ievadi atstāj redzamu ar kļūdu
  useEffect(() => {
    setTxt((t) => (lvToIso(t) === (value || null) ? t : isoToLv(value)));
  }, [value]);
  const bad = lvToIso(txt) === undefined;
  function type(raw: string) {
    const t = maskDate(raw);
    setTxt(t);
    const iso = lvToIso(t);
    if (iso !== undefined) onChange(iso);
  }
  return (
    <>
      <div className="relative">
        <input className={`field num pr-11 ${bad ? '!border-signal' : ''}`} inputMode="numeric" placeholder="DD.MM.GGGG" value={txt} maxLength={10} onBlur={() => { const iso = lvToIso(txt); if (iso) setTxt(isoToLv(iso)); }} onChange={(e) => type(e.target.value)} />
        <button type="button" onClick={() => pick.current?.showPicker?.()} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-mute hover:bg-paper hover:text-ink" aria-label="Izvēlēties kalendārā">
          <CalendarDays className="h-4 w-4" />
        </button>
        <input ref={pick} type="date" tabIndex={-1} aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0" value={value || ''} onChange={(e) => onChange(e.target.value || null)} />
      </div>
      {bad && <span className="mt-1 block text-xs font-semibold text-signal">Formāts: diena.mēnesis.gads, piem., 05.03.2019</span>}
    </>
  );
}

type SetFn = <K extends keyof Car>(k: K, v: Car[K] | null) => void;

/** Tehnisko datu režģis pēc admina izvēlētās secības un redzamības. */
export function SpecGrid({ car, set, settings, onCustomize }: { car: Partial<Car>; set: SetFn; settings: CarFieldsSettings; onCustomize: () => void }) {
  const keys = settings.order.filter((k) => fieldVisible(settings, k, car.fuel));
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        {keys.map((k) => {
          const d = SPEC_BY_KEY[k];
          const val = (car as Record<string, unknown>)[k];
          return (
            <label key={k} className="block">
              <span className="label">{d.label}{d.kind === 'date' ? '' : ''}</span>
              {d.kind === 'select' ? (
                <select className="field" value={(val as string) || ''} onChange={(e) => set(k as keyof Car, (e.target.value || null) as never)}>
                  {k === 'drive' && <option value="">—</option>}
                  {Object.entries(SELECTS[k]!).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : d.kind === 'int' || d.kind === 'dec' ? (
                <NumInput def={d} value={val as number | null} onChange={(v) => set(k as keyof Car, v as never)} />
              ) : d.kind === 'date' ? (
                <DateInput value={val as string | null} onChange={(v) => set(k as keyof Car, v as never)} />
              ) : (
                <input
                  className={`field ${d.kind === 'vin' || d.kind === 'reg' ? 'uppercase' : ''}`}
                  maxLength={d.kind === 'vin' ? 17 : 60}
                  placeholder={d.placeholder}
                  value={(val as string) || ''}
                  onChange={(e) => set(k as keyof Car, (d.kind === 'vin' || d.kind === 'reg' ? e.target.value.toUpperCase().replace(/\s/g, d.kind === 'vin' ? '' : ' ') : e.target.value) as never)}
                />
              )}
              {d.kind === 'vin' && val && String(val).length !== 17 ? <span className="mt-1 block text-xs font-semibold text-signal">VIN ir 17 simboli ({String(val).length}/17)</span> : d.hint && d.kind !== 'int' && d.kind !== 'dec' ? <span className="mt-1 block text-xs text-mute">{d.hint}</span> : null}
              {k === 'co2' && car.fuel === 'plugin_hybrid' && <span className="mt-1 block text-xs text-mute">Vajadzīgs EKII atbalsta aprēķinam</span>}
            </label>
          );
        })}
      </div>
      <button type="button" onClick={onCustomize} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-petrol hover:underline">
        <SlidersHorizontal className="h-4 w-4" /> Pielāgot laukus ({keys.length} no {SPEC_FIELDS.filter((f) => !f.ev).length + (car.fuel === 'electric' || car.fuel === 'plugin_hybrid' ? 2 : 0)})
      </button>
    </>
  );
}

/** Lauku saraksta pielāgošana: ieslēgt/izslēgt, vilkt secību. Ietekmē adminu un auto lapu. */
export function FieldsCustomizer({ value, onSaved, onClose }: { value: CarFieldsSettings; onSaved: (s: CarFieldsSettings) => void; onClose?: () => void }) {
  const toast = useToast();
  const [s, setS] = useState(value);
  const [busy, setBusy] = useState(false);
  useEffect(() => setS(value), [value]);
  const toggle = (k: SpecKey) => setS((o) => ({ ...o, hidden: o.hidden.includes(k) ? o.hidden.filter((x) => x !== k) : [...o.hidden, k] }));
  async function save() {
    setBusy(true);
    const err = await saveCarFields(s);
    setBusy(false);
    if (err) return toast(err, 'err');
    toast('Lauku saraksts saglabāts');
    onSaved(s);
    onClose?.();
  }
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-ink">Tehnisko datu lauki</p>
          <p className="text-xs text-mute">Ieslēdz vai izslēdz laukus un velc, lai mainītu secību. Izslēgtie lauki nerādās ne adminā, ne auto lapā.</p>
        </div>
        {onClose && <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-white" aria-label="Aizvērt"><X className="h-4 w-4" /></button>}
      </div>
      <Reorder.Group axis="y" values={s.order} onReorder={(order) => setS((o) => ({ ...o, order }))} className="space-y-1.5">
        {s.order.map((k) => <Row key={k} k={k} on={!s.hidden.includes(k)} toggle={() => toggle(k)} />)}
      </Reorder.Group>
      <label className="mt-4 flex items-start gap-2.5 rounded-lg bg-white p-3 text-sm">
        <input type="checkbox" checked={s.bumpOnEdit} onChange={(e) => setS((o) => ({ ...o, bumpOnEdit: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-[#d91d2b]" />
        <span><b className="text-ink">Mainīts auto automātiski kļūst pirmais katalogā</b><span className="block text-xs text-mute">Pēc cenas, apraksta, ekstru, bilžu u.c. izmaiņām. Secību pēc tam var mainīt sarakstā “Automašīnas”.</span></span>
      </label>
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <button type="button" onClick={() => setS(normalizeCarFields({ hidden: DEFAULT_HIDDEN, bumpOnEdit: s.bumpOnEdit }))} className="btn btn-ghost !py-2 text-sm"><RotateCcw className="h-4 w-4" /> Noklusējums</button>
        <button type="button" onClick={save} disabled={busy} className="btn btn-primary !py-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Saglabāt</button>
      </div>
    </div>
  );
}

function Row({ k, on, toggle }: { k: SpecKey; on: boolean; toggle: () => void }) {
  const ctl = useDragControls();
  const d = SPEC_BY_KEY[k];
  return (
    <Reorder.Item value={k} dragListener={false} dragControls={ctl} className={`flex items-center gap-2 rounded-lg border bg-white px-2 py-1.5 ${on ? 'border-line' : 'border-dashed border-line opacity-60'}`}>
      <span onPointerDown={(e) => ctl.start(e)} className="cursor-grab touch-none rounded p-1 text-mute hover:bg-paper active:cursor-grabbing" aria-label="Vilkt"><GripVertical className="h-4 w-4" /></span>
      <span className="flex-1 text-sm font-medium text-ink">{d.label}{d.unit ? <span className="text-mute">, {d.unit}</span> : null}{d.ev ? <span className="ml-1.5 text-xs text-mute">(tikai EV/PHEV)</span> : null}</span>
      <button type="button" onClick={toggle} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${on ? 'bg-ok/10 text-ok' : 'bg-paper text-mute'}`}>
        {on ? <><Eye className="h-3.5 w-3.5" /> Rāda</> : <><EyeOff className="h-3.5 w-3.5" /> Slēpts</>}
      </button>
    </Reorder.Item>
  );
}

/** Raksta datumu kā DD.MM.GGGG: punktus ieliek pats (12042018 → 12.04.2018), atļauj arī 5.3.2019. */
export function maskDate(raw: string) {
  let res = '';
  let seg = 0;
  let len = 0;
  for (const ch of raw.replace(/[/\-\s,]/g, '.')) {
    if (ch === '.') {
      if (len > 0 && seg < 2) { res += '.'; seg++; len = 0; }
      continue;
    }
    if (!/\d/.test(ch)) continue;
    if (seg < 2 && len === 2) { res += '.'; seg++; len = 0; }
    if (seg === 2 && len === 4) break;
    res += ch;
    len++;
  }
  return res;
}
