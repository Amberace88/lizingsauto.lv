'use client';
import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardPaste, ExternalLink, Gauge, Plus, ShieldQuestion, Trash2 } from 'lucide-react';
import type { Car } from '@/lib/types';
import { number, odometerOk } from '@/lib/format';
import { Card } from './CarEditor';
import { CopyField } from './CopyField';

type Row = { date: string; km: number };

/** Nolasa datumus (dd.mm.gggg) un nobraukumu no e-CSDD tabulas, kas iekopēta kā teksts. */
export function parseOdometer(text: string): Row[] {
  const re = /(\d{1,2})\.(\d{1,2})\.(\d{4})|(\d{1,3}(?:[  ]\d{3})+|\d{3,7})(?!\s*(?:kW|kWh|g\/km|cm|l\b))/g;
  const out: Row[] = [];
  let pending: string | null = null;
  for (const m of text.matchAll(re)) {
    if (m[3]) {
      pending = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    } else if (pending && m[4]) {
      const km = Number(m[4].replace(/\D/g, ''));
      if (km >= 0 && km < 2_000_000) {
        out.push({ date: pending, km });
        pending = null;
      }
    }
  }
  const uniq = new Map(out.map((r) => [`${r.date}|${r.km}`, r]));
  return [...uniq.values()].sort((a, b) => a.date.localeCompare(b.date));
}

const LINKS = [
  { href: 'https://e.csdd.lv/', label: 'e-CSDD', hint: 'Tehniskās apskates dati un nobraukums (pēc valsts numura, bezmaksas)' },
  { href: 'https://services.ltab.lv/lv/CheckOcta', label: 'LTAB OCTA pārbaude', hint: 'Vai auto ir spēkā esoša OCTA polise' },
  { href: 'https://www.csdd.lv/par-latvija-registretiem-transportlidzekliem/bezmaksas-informacija-izmantojot-e-csdd', label: 'CSDD bezmaksas info', hint: 'Kādus datus var saņemt bez maksas' },
];

export function CsddPanel({ car, onChange }: { car: Partial<Car>; onChange: <K extends keyof Car>(k: K, v: Car[K] | null) => void }) {
  const saved = (car.odometer_history || []) as Row[];
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[]>(saved);
  const [editing, setEditing] = useState(saved.length === 0);
  const sorted = useMemo(() => [...rows].filter((r) => r.date && r.km >= 0).sort((a, b) => a.date.localeCompare(b.date)), [rows]);
  const ok = sorted.length < 2 || odometerOk(sorted);
  const last = sorted.at(-1);
  const bad = sorted.map((r, i) => (i > 0 && r.km < sorted[i - 1].km ? r.date : null)).filter(Boolean);

  const apply = (next: Row[]) => {
    setRows(next);
    const clean = [...next].filter((r) => r.date && r.km >= 0).sort((a, b) => a.date.localeCompare(b.date));
    onChange('odometer_history', clean.length ? clean : null);
    onChange('csdd_checked_at', clean.length ? new Date().toISOString() : null);
  };

  return (
    <Card
      title="CSDD pārbaude un nobraukuma vēsture"
      hint="Pārbaudi auto CSDD un LTAB datos. Iekopē nobraukuma vēsturi — lapā pircējiem rādīsies grafiks un zīme “CSDD nobraukums”."
      actions={saved.length > 0 && !editing ? <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-sm" onClick={() => setEditing(true)}>Labot</button> : undefined}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="label">Valsts numurs</span>
          {car.reg_number ? <CopyField value={car.reg_number} /> : <p className="text-sm text-mute">Ievadi “Tehniskajos datos”</p>}
        </div>
        <div>
          <span className="label">VIN</span>
          {car.vin ? <CopyField value={car.vin} /> : <p className="text-sm text-mute">Ievadi “Tehniskajos datos”</p>}
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="group rounded-xl border border-line p-3 text-sm transition hover:border-ink-2">
            <span className="flex items-center gap-1.5 font-semibold text-ink">{l.label} <ExternalLink className="h-3.5 w-3.5 text-mute" /></span>
            <span className="mt-0.5 block text-xs text-mute">{l.hint}</span>
          </a>
        ))}
      </div>

      {editing && (
        <div className="mt-5 space-y-2">
          <label className="block">
            <span className="label flex items-center gap-1.5"><ClipboardPaste className="h-4 w-4" /> Iekopē e-CSDD tehniskās apskates tabulu (datumi un nobraukums)</span>
            <textarea className="field font-mono text-xs" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={'12.03.2021  Derīga  142 350\n15.03.2023  Derīga  178 904\n...'} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary !py-2 text-sm" disabled={!text.trim()} onClick={() => { const p = parseOdometer(text); apply(p); setText(''); }}>
              Nolasīt datus
            </button>
            <button type="button" className="btn btn-ghost !py-2 text-sm" onClick={() => apply([...rows, { date: new Date().toISOString().slice(0, 10), km: car.mileage || 0 }])}>
              <Plus className="h-4 w-4" /> Pievienot rindu
            </button>
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="mt-5">
          <div className={`mb-3 flex items-start gap-2 rounded-xl p-3 text-sm ${ok ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'}`}>
            {ok ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
            <span>
              {ok ? 'Nobraukums pieaug secīgi — atgriešanas pazīmju nav.' : `Nobraukums samazinājies (${bad.map((d) => new Date(d!).toLocaleDateString('lv-LV')).join(', ')}). Pārbaudi — zīme “CSDD nobraukums” netiks rādīta.`}
              {last && car.mileage != null && car.mileage < last.km && <b className="block">Uzmanību: sludinājumā norādīts {number(car.mileage)} km, bet CSDD pēdējais ieraksts {number(last.km)} km.</b>}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-mute"><th className="py-1">Datums</th><th className="py-1 text-right">Nobraukums, km</th><th className="w-10" /></tr></thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.date + r.km} className="border-t border-line">
                  <td className="py-1.5">{editing ? <input type="date" className="field !py-1" value={r.date} onChange={(e) => apply(rows.map((x) => (x === r ? { ...x, date: e.target.value } : x)))} /> : new Date(r.date).toLocaleDateString('lv-LV')}</td>
                  <td className="num py-1.5 text-right">{editing ? <input className="field num !py-1 text-right" inputMode="numeric" value={r.km} onChange={(e) => apply(rows.map((x) => (x === r ? { ...x, km: Number(e.target.value.replace(/\D/g, '')) || 0 } : x)))} /> : number(r.km)}</td>
                  <td className="text-right">{editing && <button type="button" onClick={() => apply(rows.filter((x) => x !== r))} className="rounded p-1.5 text-mute hover:text-bad" aria-label="Dzēst rindu"><Trash2 className="h-4 w-4" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex flex-wrap gap-2">
            {last && car.mileage !== last.km && (
              <button type="button" className="btn btn-ghost !py-2 text-sm" onClick={() => onChange('mileage', last.km)}>
                <Gauge className="h-4 w-4" /> Iestatīt nobraukumu {number(last.km)} km
              </button>
            )}
            {editing && saved.length > 0 && <button type="button" className="btn btn-ghost !py-2 text-sm" onClick={() => setEditing(false)}>Gatavs</button>}
            <button type="button" className="btn btn-ghost !py-2 text-sm text-bad" onClick={() => { apply([]); setEditing(true); }}>Notīrīt vēsturi</button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-mute"><ShieldQuestion className="h-3.5 w-3.5" /> Izmaiņas tiek saglabātas ar pogu “Saglabāt”. Valsts numurs pircējiem netiek rādīts.</p>
        </div>
      )}
    </Card>
  );
}
