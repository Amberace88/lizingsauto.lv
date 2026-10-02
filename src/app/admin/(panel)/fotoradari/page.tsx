'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, ExternalLink, Eye, EyeOff, MapPin } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { AdminTitle } from '@/components/admin/AdminShell';
import { Card } from '@/components/admin/CarEditor';
import { useToast } from '@/components/admin/Toast';
import { revalidateSite } from '@/components/admin/revalidate';
import { PoiRefresh } from '@/components/admin/PoiRefresh';
import { VoiceStudio } from '@/components/admin/VoiceStudio';
import { KIND, geocodeQuery, type Radar, type RadarInput, type RadarKind } from '@/lib/radars';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function RadarsAdmin() {
  const sb = supabaseBrowser();
  const toast = useToast();
  const [rows, setRows] = useState<Radar[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [kind, setKind] = useState<RadarKind | ''>('');
  const [q, setQ] = useState('');
  const add = (s: string) => setLog((l) => [...l, s]);

  async function load() {
    const { data, error } = await sb.from('radars').select('*').order('kind').order('region').order('name').limit(2000);
    if (error) toast(error.message.includes('radars') ? 'Tabula “radars” vēl nav izveidota (migrācija 006).' : error.message, 'err');
    setRows((data as Radar[]) || []);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setBusy(true);
    setLog([]);
    try {
      add('Nolasu CSDD karti, Valsts policijas sarakstu un OpenStreetMap posmus…');
      const r = await fetch('/api/admin/radars');
      const src = (await r.json()) as { fixed: RadarInput[]; average: RadarInput[]; mobile: { region: string; name: string }[]; errors: string[]; error?: string };
      if (!r.ok) throw new Error(src.error || 'Avoti nav pieejami');
      src.errors.forEach((e) => add(`⚠ ${e}`));
      add(`CSDD: ${src.fixed.length} punkti · Vidējā ātruma posmi: ${src.average.length} · VP mobilās vietas: ${src.mobile.length}`);

      // Mobilās vietas — koordinātas pēc adreses (izmantojam jau zināmās, lai neģeokodētu atkārtoti)
      const known = new Map((rows || []).filter((x) => x.kind === 'mobile' && x.lat != null).map((x) => [x.name, x]));
      const mobile: RadarInput[] = [];
      let geo = 0;
      for (const [i, m] of src.mobile.entries()) {
        const k = known.get(m.name);
        let lat: number | null = k?.lat ?? null;
        let lng: number | null = k?.lng ?? null;
        if (lat == null) {
          const query = geocodeQuery(m.name);
          if (query) {
            try {
              const g = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=lv&accept-language=lv&q=${encodeURIComponent(query)}`);
              const j = (await g.json()) as { lat: string; lon: string }[];
              if (j[0]) {
                lat = +(+j[0].lat).toFixed(6);
                lng = +(+j[0].lon).toFixed(6);
                geo++;
              }
            } catch {}
            await sleep(1100); // Nominatim lietošanas noteikumi: ≤1 pieprasījums sekundē
          }
        }
        if (i % 15 === 0) add(`Adreses: ${i + 1}/${src.mobile.length}…`);
        const dir = m.name.match(/virzienā (uz [^.,)]+)/i)?.[1] || null;
        const road = m.name.match(/\(([APV]\d{1,4})\)/)?.[1] || null;
        const km = m.name.match(/(\d+(?:,\d+)?)\s*\.?\s*km/i)?.[1];
        mobile.push({ kind: 'mobile', name: m.name, region: m.region, road, lat, lng, geom: null, speed: null, direction: dir, note: km && road ? `${road}, ${km} km` : null, source: 'vp', approx: true });
      }
      add(`Atrastas koordinātas ${mobile.filter((m) => m.lat != null).length}/${mobile.length} (jaunas: ${geo}). Pārējās — autoceļu km punkti, rādām sarakstā.`);

      // Saglabājam pa veidiem; ja avots neatbildēja, esošos datus neaiztiekam
      const groups: [RadarKind[], RadarInput[]][] = [
        [['fixed', 'toll'], src.fixed],
        [['average'], src.average],
        [['mobile'], mobile],
      ];
      for (const [kinds, list] of groups) {
        if (!list.length) continue;
        const del = await sb.from('radars').delete().in('kind', kinds).neq('source', 'manual');
        if (del.error) throw new Error(del.error.message);
        for (let i = 0; i < list.length; i += 200) {
          const ins = await sb.from('radars').insert(list.slice(i, i + 200));
          if (ins.error) throw new Error(ins.error.message);
        }
        add(`✓ Saglabāts: ${kinds.map((k) => KIND[k].label).join(', ')} (${list.length})`);
      }
      await revalidateSite();
      add('✓ Lapa atjaunota.');
      toast('Fotoradaru dati atjaunoti');
      await load();
    } catch (e) {
      add(`✗ ${e instanceof Error ? e.message : 'Kļūda'}`);
      toast('Neizdevās atjaunot', 'err');
    }
    setBusy(false);
  }

  async function toggle(r: Radar) {
    const { error } = await sb.from('radars').update({ active: !r.active, source: r.source === 'manual' ? 'manual' : r.source }).eq('id', r.id);
    if (error) return toast(error.message, 'err');
    setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, active: !r.active } : x)) || null);
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows || []) if (r.active) c[r.kind] = (c[r.kind] || 0) + 1;
    return c;
  }, [rows]);
  const last = rows?.reduce((a, r) => (r.updated_at > a ? r.updated_at : a), '') || '';
  const list = (rows || []).filter((r) => (!kind || r.kind === kind) && (!q || `${r.name} ${r.road} ${r.region}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <AdminTitle
        title="Fotoradari"
        sub="Karte lapā tavsauto.eu/fotoradari. Dati no CSDD, Valsts policijas un OpenStreetMap."
        actions={
          <div className="flex gap-2">
            <Link href="/fotoradari" target="_blank" className="btn btn-ghost"><ExternalLink className="h-4 w-4" /> Skatīt lapu</Link>
            <button onClick={refresh} disabled={busy} className="btn btn-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Atjaunot no avotiem</button>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(KIND) as RadarKind[]).map((k) => (
          <button key={k} onClick={() => setKind(kind === k ? '' : k)} className={`rounded-2xl bg-white p-5 text-left ring-2 transition ${kind === k ? 'ring-ink' : 'ring-transparent'}`}>
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: KIND[k].color }} />
            <p className="num mt-2 text-3xl font-bold">{counts[k] || 0}</p>
            <p className="text-sm text-mute">{KIND[k].label}</p>
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-6"><PoiRefresh /><VoiceStudio /></div>
      {log.length > 0 && <pre className="mt-6 max-h-64 overflow-auto rounded-2xl bg-ink p-4 text-xs leading-relaxed text-white/80">{log.join('\n')}</pre>}
      <div className="mt-6">
        <Card title={`Saraksts (${list.length})`} hint={last ? `Pēdējā atjaunošana: ${new Date(last).toLocaleString('lv-LV')}. Ieteicams atjaunot reizi mēnesī.` : 'Dati vēl nav ielādēti — spied “Atjaunot no avotiem”.'} actions={<input className="field w-56" placeholder="Meklēt…" value={q} onChange={(e) => setQ(e.target.value)} />}>
          {rows === null ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-mute" />
          ) : (
            <ul className="divide-y divide-line text-sm">
              {list.slice(0, 400).map((r) => (
                <li key={r.id} className={`flex items-center gap-3 py-2.5 ${r.active ? '' : 'opacity-40'}`}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: KIND[r.kind].color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{r.name}</p>
                    <p className="text-xs text-mute">{[r.region, r.road, r.speed ? `${r.speed} km/h` : null, r.lat == null ? 'bez koordinātām' : r.approx ? 'aptuvenas koord.' : null].filter(Boolean).join(' · ')}</p>
                  </div>
                  {r.lat != null && <a href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noopener noreferrer" className="text-mute hover:text-ink" title="Atvērt kartē"><MapPin className="h-4 w-4" /></a>}
                  <button onClick={() => toggle(r)} className="text-mute hover:text-ink" title={r.active ? 'Paslēpt lapā' : 'Rādīt lapā'}>{r.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
