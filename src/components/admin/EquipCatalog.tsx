'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2, X, Check } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { EQUIP_ICONS, normalizeEquipCatalog, slugCat, type EquipCatDef } from '@/lib/equipment';
import { EQUIP_ICON } from '@/components/site/Equipment';
import { revalidateSite } from './revalidate';

/** Ielādē un saglabā aprīkojuma katalogu (iestatījumi → “equipment”, publiski lasāms). */
export function useEquipCatalog() {
  const sb = supabaseBrowser();
  const [catalog, setCatalog] = useState<EquipCatDef[] | null>(null);
  useEffect(() => {
    sb.from('settings').select('value').eq('key', 'equipment').maybeSingle().then(({ data }: { data: { value: unknown } | null }) => setCatalog(normalizeEquipCatalog(data?.value)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const save = useCallback(
    async (next: EquipCatDef[]) => {
      setCatalog(next);
      const { error } = await sb.from('settings').upsert({ key: 'equipment', value: { categories: next }, is_public: true, technical: false, updated_at: new Date().toISOString() });
      if (!error) revalidateSite();
      return error?.message || null;
    },
    [sb],
  );
  return { catalog, setCatalog, save };
}

/** Pilns kataloga redaktors iestatījumos: kategorijas (secība, nosaukums, ikona, atslēgvārdi) un to ekstras. */
export function EquipCatalogEditor({ value, onChange }: { value: EquipCatDef[]; onChange: (v: EquipCatDef[]) => void }) {
  const [newCat, setNewCat] = useState('');
  const [adding, setAdding] = useState<Record<string, string>>({});
  const drag = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const upd = (i: number, p: Partial<EquipCatDef>) => onChange(value.map((c, k) => (k === i ? { ...c, ...p } : c)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const arr = [...value];
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    onChange(arr);
  };
  const addItems = (i: number) => {
    const raw = (adding[value[i].id] || '').split(/[;\n]/).map((x) => x.trim()).filter(Boolean);
    if (!raw.length) return;
    upd(i, { items: [...new Set([...value[i].items, ...raw])] });
    setAdding({ ...adding, [value[i].id]: '' });
  };
  const addCat = () => {
    const label = newCat.trim();
    if (!label) return;
    let id = slugCat(label);
    while (value.some((c) => c.id === id)) id += '-2';
    const other = value.findIndex((c) => c.id === 'other');
    const next = [...value];
    next.splice(other >= 0 ? other : next.length, 0, { id, label, icon: 'star', items: [], keywords: '' });
    onChange(next);
    setNewCat('');
  };

  return (
    <div className="space-y-3">
      {value.map((c, i) => {
        const Icon = EQUIP_ICON[c.icon];
        return (
          <div
            key={c.id}
            onDragOver={(e) => { e.preventDefault(); setOver(i); }}
            onDragLeave={() => setOver(null)}
            onDrop={() => { if (drag.current != null) move(drag.current, i); drag.current = null; setOver(null); }}
            className={`rounded-xl border p-3 ${over === i ? 'border-signal ring-1 ring-signal' : 'border-line'}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span draggable onDragStart={() => (drag.current = i)} onDragEnd={() => { drag.current = null; setOver(null); }} className="cursor-grab text-mute active:cursor-grabbing"><GripVertical className="h-4 w-4" /></span>
              <details className="relative">
                <summary className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-lg bg-signal-soft text-signal" title="Ikona"><Icon className="h-4 w-4" /></summary>
                <div className="absolute left-0 top-10 z-20 grid w-56 grid-cols-6 gap-1 rounded-xl border border-line bg-white p-2 shadow-lg">
                  {EQUIP_ICONS.map((ic) => {
                    const I = EQUIP_ICON[ic];
                    return <button key={ic} type="button" onClick={(e) => { upd(i, { icon: ic }); (e.currentTarget.closest('details') as HTMLDetailsElement).open = false; }} className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-paper ${c.icon === ic ? 'bg-signal-soft text-signal' : 'text-ink-2'}`}><I className="h-4 w-4" /></button>;
                  })}
                </div>
              </details>
              <input className="field !w-auto min-w-0 flex-1 !py-2 font-semibold" value={c.label} onChange={(e) => upd(i, { label: e.target.value })} aria-label="Kategorijas nosaukums" />
              <span className="num text-xs text-mute">{c.items.length}</span>
              <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="rounded p-1 text-mute hover:bg-paper hover:text-ink disabled:opacity-30" aria-label="Augstāk"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" onClick={() => move(i, i + 1)} disabled={i === value.length - 1} className="rounded p-1 text-mute hover:bg-paper hover:text-ink disabled:opacity-30" aria-label="Zemāk"><ArrowDown className="h-4 w-4" /></button>
              {c.id !== 'other' && (
                <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="rounded p-1 text-mute hover:bg-bad/10 hover:text-bad" title="Dzēst kategoriju (ekstras pārcelsies uz “Citas”)"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.items.map((it) => (
                <span key={it} className="inline-flex items-center gap-1 rounded-full bg-paper py-1 pl-3 pr-1.5 text-xs font-medium text-ink-2">
                  {it}
                  <button type="button" onClick={() => upd(i, { items: c.items.filter((x) => x !== it) })} className="rounded-full p-0.5 hover:bg-line" aria-label={`Noņemt ${it}`}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input className="field !py-1.5 text-sm" placeholder="Jauna ekstra (vairākas — atdalot ar ;)" value={adding[c.id] || ''} onChange={(e) => setAdding({ ...adding, [c.id]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItems(i); } }} />
              <button type="button" onClick={() => addItems(i)} className="btn btn-ghost !px-3 !py-1.5 text-sm"><Plus className="h-4 w-4" /> Pievienot</button>
            </div>
            <label className="mt-2 block">
              <span className="text-xs text-mute">Atslēgvārdi automātiskai atpazīšanai (neobligāti, ar komatiem) — piem.: <i>jumta kaste, velo</i></span>
              <input className="field !py-1.5 text-sm" value={c.keywords || ''} onChange={(e) => upd(i, { keywords: e.target.value })} />
            </label>
          </div>
        );
      })}
      <div className="flex gap-2 rounded-xl border border-dashed border-line p-3">
        <input className="field !py-2" placeholder="Jaunas kategorijas nosaukums, piem., “Kempinga aprīkojums”" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCat(); } }} />
        <button type="button" onClick={addCat} className="btn btn-primary !py-2"><Plus className="h-4 w-4" /> Kategorija</button>
      </div>
    </div>
  );
}

/** Auto redaktorā: ātrā izvēle pa kategorijām + savas ekstras un kategorijas, kas uzreiz saglabājas katalogā. */
export function EquipPicker({ selected, onToggle, onAdd }: { selected: string[]; onToggle: (item: string) => void; onAdd: (item: string) => void }) {
  const { catalog, save } = useEquipCatalog();
  const [adding, setAdding] = useState<Record<string, string>>({});
  const [newCat, setNewCat] = useState('');
  const [note, setNote] = useState<string | null>(null);
  if (!catalog) return null;
  const has = (x: string) => selected.some((s) => s.toLowerCase() === x.toLowerCase());

  const addToCat = async (id: string) => {
    const items = (adding[id] || '').split(/[;\n]/).map((x) => x.trim()).filter(Boolean);
    if (!items.length) return;
    const next = catalog.map((c) => (c.id === id ? { ...c, items: [...new Set([...c.items, ...items])] } : c));
    items.forEach((it) => !has(it) && onAdd(it));
    setAdding({ ...adding, [id]: '' });
    const err = await save(next);
    setNote(err || `Pievienots katalogam — turpmāk pieejams visiem auto`);
    setTimeout(() => setNote(null), 2500);
  };
  const addCat = async () => {
    const label = newCat.trim();
    if (!label) return;
    let id = slugCat(label);
    while (catalog.some((c) => c.id === id)) id += '-2';
    const other = catalog.findIndex((c) => c.id === 'other');
    const next = [...catalog];
    next.splice(other >= 0 ? other : next.length, 0, { id, label, icon: 'star', items: [], keywords: '' });
    setNewCat('');
    const err = await save(next);
    setNote(err || `Kategorija “${label}” izveidota`);
    setTimeout(() => setNote(null), 2500);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-mute">Ātrā izvēle — atzīmē, kas auto ir (lapā rādīsies sagrupēts pa kategorijām)</p>
        {note && <p className="flex items-center gap-1 text-xs font-semibold text-ok"><Check className="h-3.5 w-3.5" /> {note}</p>}
      </div>
      {catalog.map((g, gi) => {
        const on = g.items.filter(has).length;
        const Icon = EQUIP_ICON[g.icon];
        return (
          <details key={g.id} className="group rounded-xl border border-line" open={gi === 0}>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-semibold text-ink">
              <Icon className="h-4 w-4 text-signal" /> {g.label}
              <span className="ml-auto flex items-center gap-2 text-xs text-mute">{on > 0 && <span className="rounded-full bg-signal-soft px-2 py-0.5 font-bold text-signal">{on}</span>}<ArrowDown className="h-3.5 w-3.5 transition group-open:rotate-180" /></span>
            </summary>
            <div className="px-3 pb-3">
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((p) => {
                  const act = has(p);
                  return (
                    <button key={p} type="button" aria-pressed={act} onClick={() => onToggle(p)} className={`rounded-full border px-3 py-1 text-xs font-medium transition ${act ? 'border-signal bg-signal text-white' : 'border-line text-ink-2 hover:border-ink-2 hover:text-ink'}`}>
                      {act ? '✓ ' : '+ '}{p}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <input className="field !py-1.5 text-sm" placeholder={`Sava ekstra kategorijā “${g.label}”`} value={adding[g.id] || ''} onChange={(e) => setAdding({ ...adding, [g.id]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addToCat(g.id); } }} />
                <button type="button" onClick={() => addToCat(g.id)} className="btn btn-ghost !px-3 !py-1.5 text-sm"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
          </details>
        );
      })}
      <div className="flex gap-2">
        <input className="field !py-1.5 text-sm" placeholder="Jauna kategorija…" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCat(); } }} />
        <button type="button" onClick={addCat} className="btn btn-ghost !px-3 !py-1.5 text-sm"><Plus className="h-4 w-4" /> Kategorija</button>
      </div>
      <p className="text-xs text-mute">Kategoriju nosaukumus, secību un ikonas maina sadaļā Iestatījumi → Aprīkojuma katalogs.</p>
    </div>
  );
}
