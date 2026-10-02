'use client';

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Layers } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Card } from '@/components/admin/CarEditor';
import { useToast } from '@/components/admin/Toast';
import { POI_CATS, POI_ORDER, compactPois, overpassQuery, type PoiCat } from '@/lib/poi';

const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
type Row = { cat: PoiCat; count: number; updated_at: string };

/** Navigācijas kartes slāņu atjaunošana no OpenStreetMap (pārlūkā, lai neierobežo servera laika limits). */
export function PoiRefresh() {
  const sb = supabaseBrowser();
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<PoiCat | 'all' | ''>('');
  const [msg, setMsg] = useState('');

  async function load() {
    const { data, error } = await sb.from('poi_sets').select('cat,count,updated_at');
    if (error) setMsg(error.message.includes('poi_sets') ? 'Tabula “poi_sets” vēl nav izveidota (migrācija 007).' : error.message);
    setRows((data as Row[]) || []);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function one(c: PoiCat) {
    const body = 'data=' + encodeURIComponent(overpassQuery(c));
    let lastErr = '';
    for (const url of MIRRORS) {
      try {
        const r = await fetch(url, { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' } });
        if (!r.ok) {
          lastErr = `Overpass ${r.status}`;
          continue;
        }
        const j = await r.json();
        const list = compactPois(c, j.elements || []);
        if (!list.length) {
          lastErr = 'tukšs rezultāts';
          continue;
        }
        const { error } = await sb.from('poi_sets').upsert({ cat: c, data: list, count: list.length, updated_at: new Date().toISOString() });
        if (error) throw new Error(error.message);
        return list.length;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : 'kļūda';
      }
    }
    throw new Error(lastErr);
  }

  async function run(cats: PoiCat[]) {
    setBusy(cats.length > 1 ? 'all' : cats[0]);
    let ok = 0;
    for (const c of cats) {
      setBusy(cats.length > 1 ? 'all' : c);
      setMsg(`Ielādēju: ${POI_CATS[c].label}…`);
      try {
        const n = await one(c);
        ok++;
        setMsg(`✓ ${POI_CATS[c].label}: ${n}`);
      } catch (e) {
        setMsg(`✗ ${POI_CATS[c].label}: ${e instanceof Error ? e.message : ''}`);
      }
      await load();
      await new Promise((r) => setTimeout(r, 1500)); // saudzējam bezmaksas Overpass serveri
    }
    setBusy('');
    setMsg(ok === cats.length ? '✓ Visi slāņi atjaunoti. Lapā redzami ~6 h laikā (CDN kešs).' : `Atjaunoti ${ok}/${cats.length}. Mēģini neizdevušos vēlreiz pēc brīža.`);
    toast(ok ? 'Kartes slāņi atjaunoti' : 'Neizdevās atjaunot', ok ? undefined : 'err');
  }

  const by = new Map(rows.map((r) => [r.cat, r]));
  return (
    <Card
      title="Navigācijas kartes slāņi"
      hint="Degviela un gāze, EV uzlāde, stāvvietas, veikali, aptiekas, medicīna, iestādes, autoservisi — no OpenStreetMap. Ieteicams atjaunot reizi mēnesī."
      actions={<button onClick={() => run(POI_ORDER)} disabled={!!busy} className="btn btn-primary">{busy === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Atjaunot visus</button>}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {POI_ORDER.map((c) => {
          const r = by.get(c);
          return (
            <button key={c} onClick={() => run([c])} disabled={!!busy} className="flex items-center gap-3 rounded-xl border border-line p-3 text-left transition hover:border-ink-2/40 disabled:opacity-60" title="Atjaunot šo slāni">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white" style={{ background: POI_CATS[c].color }}>{busy === c ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{POI_CATS[c].label} <span className="num text-mute">{r?.count ?? '—'}</span></span>
                <span className="block truncate text-xs text-mute">{r ? new Date(r.updated_at).toLocaleDateString('lv-LV') : 'nav ielādēts'}</span>
              </span>
            </button>
          );
        })}
      </div>
      {msg && <p className="mt-3 text-sm text-ink-2">{msg}</p>}
    </Card>
  );
}
