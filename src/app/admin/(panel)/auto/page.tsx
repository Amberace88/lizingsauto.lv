'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Star, Pencil, ExternalLink, Copy, Trash2, Loader2 } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Car } from '@/lib/types';
import { STATUS_LABEL, money, number } from '@/lib/format';
import { AdminTitle } from '@/components/admin/AdminShell';
import { revalidateSite } from '@/components/admin/revalidate';
import { useToast } from '@/components/admin/Toast';

type Row = Car & { portal_listings?: { portal: string; status: string }[] };
const TABS = ['all', 'published', 'reserved', 'draft', 'sold', 'archived'] as const;
const STATUS_TONE: Record<string, string> = { published: 'bg-ok/10 text-ok', reserved: 'bg-warn/10 text-warn', sold: 'bg-bad/10 text-bad', draft: 'bg-mute/10 text-mute', archived: 'bg-mute/10 text-mute' };

export default function CarsAdmin() {
  const sb = supabaseBrowser();
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'updated' | 'price' | 'views' | 'name'>('updated');
  const [confirm, setConfirm] = useState<Row | null>(null);

  async function load() {
    const { data, error } = await sb.from('cars').select('*, car_images(id,url,sort), portal_listings(portal,status)').order('updated_at', { ascending: false });
    if (error) toast(error.message, 'err');
    setRows((data as Row[]) || []);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = useMemo(() => {
    const s = q.toLowerCase();
    return (rows || [])
      .filter((r) => (tab === 'all' ? r.status !== 'archived' : r.status === tab))
      .filter((r) => !s || `${r.make} ${r.model} ${r.title} ${r.vin ?? ''} ${r.reg_number ?? ''}`.toLowerCase().includes(s))
      .sort((a, b) => sort === 'price' ? b.price - a.price : sort === 'views' ? b.views - a.views : sort === 'name' ? `${a.make}${a.model}`.localeCompare(`${b.make}${b.model}`) : +new Date(b.updated_at) - +new Date(a.updated_at));
  }, [rows, tab, q, sort]);

  async function patch(r: Row, p: Partial<Car>) {
    setRows((rs) => rs!.map((x) => (x.id === r.id ? { ...x, ...p } : x)));
    const { error } = await sb.from('cars').update(p).eq('id', r.id);
    if (error) {
      toast(error.message, 'err');
      load();
    } else {
      toast('Saglabāts');
      revalidateSite([r.slug]);
    }
  }

  async function duplicate(r: Row) {
    const { id, car_images, portal_listings, created_at, updated_at, views, published_at, sold_at, ...rest } = r;
    void id; void portal_listings; void created_at; void updated_at; void views; void published_at; void sold_at;
    const slug = `${r.slug}-kopija-${Date.now().toString(36).slice(-4)}`;
    const { data, error } = await sb.from('cars').insert({ ...rest, slug, legacy_slug: null, status: 'draft', title: `${r.title} (kopija)`, featured: false }).select('id').single();
    if (error) return toast(error.message, 'err');
    if (car_images?.length) await sb.from('car_images').insert(car_images.map((i) => ({ car_id: data.id, url: i.url, sort: i.sort })));
    toast('Izveidota kopija (melnraksts)');
    load();
  }

  async function remove(r: Row) {
    setConfirm(null);
    const { error } = await sb.from('cars').update({ status: 'archived' }).eq('id', r.id);
    if (error) return toast(error.message, 'err');
    toast('Pārvietots uz arhīvu');
    revalidateSite([r.slug]);
    load();
  }

  const count = (t: string) => (rows || []).filter((r) => (t === 'all' ? r.status !== 'archived' : r.status === t)).length;

  return (
    <>
      <AdminTitle title="Automašīnas" sub="Pievieno, labo un publicē sludinājumus." actions={<Link href="/admin/auto/jauns" className="btn btn-primary"><Plus className="h-4 w-4" /> Pievienot auto</Link>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-white p-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === t ? 'bg-ink text-white' : 'text-ink-2 hover:bg-paper'}`}>
              {t === 'all' ? 'Visi' : STATUS_LABEL[t]} <span className="num opacity-60">{count(t)}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
          <input className="field !w-64 !py-2 !pl-9" placeholder="Meklēt: marka, VIN, numurs" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="field !w-auto !py-2" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="updated">Pēdējie labotie</option>
          <option value="price">Pēc cenas</option>
          <option value="views">Pēc skatījumiem</option>
          <option value="name">Pēc nosaukuma</option>
        </select>
      </div>

      {!rows ? (
        <div className="grid place-items-center rounded-2xl bg-white p-16"><Loader2 className="h-6 w-6 animate-spin text-mute" /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-line text-left text-xs font-semibold text-mute">
              <tr>
                <th className="p-3 pl-4">Auto</th>
                <th className="p-3">Cena</th>
                <th className="p-3">Statuss</th>
                <th className="p-3" title="Izcelts sākumlapā">Izcelts</th>
                <th className="p-3">Portāli</th>
                <th className="p-3 text-right">Skatīj.</th>
                <th className="p-3 pr-4 text-right">Darbības</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((r) => {
                const img = [...(r.car_images || [])].sort((a, b) => a.sort - b.sort)[0]?.url;
                return (
                  <tr key={r.id} className="hover:bg-paper/60">
                    <td className="p-3 pl-4">
                      <Link href={`/admin/auto/${r.id}`} className="flex items-center gap-3">
                        <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-line">{img && <Image src={img} alt="" fill sizes="64px" className="object-cover" />}</span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink">{r.make} {r.model} <span className="num font-normal text-mute">{r.year}</span></span>
                          <span className="block max-w-[320px] truncate text-xs text-mute">{r.title}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="num p-3 font-semibold">{money(r.price)}{r.old_price ? <span className="block text-xs font-normal text-mute line-through">{money(r.old_price)}</span> : null}</td>
                    <td className="p-3">
                      <select value={r.status} onChange={(e) => patch(r, { status: e.target.value as Car['status'] })} className={`rounded-lg border-0 px-2 py-1 text-xs font-bold ${STATUS_TONE[r.status]}`} aria-label="Statuss">
                        {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <button onClick={() => patch(r, { featured: !r.featured })} aria-pressed={r.featured} aria-label="Izcelt sākumlapā">
                        <Star className={`h-5 w-5 ${r.featured ? 'fill-signal text-signal' : 'text-line'}`} />
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {(r.portal_listings || []).map((p) => (
                          <span key={p.portal} className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${p.status === 'published' ? 'bg-ok/10 text-ok' : p.status === 'error' ? 'bg-bad/10 text-bad' : 'bg-paper text-mute'}`}>{p.portal.replace('_', '.').toUpperCase()}</span>
                        ))}
                      </div>
                    </td>
                    <td className="num p-3 text-right">{number(r.views)}</td>
                    <td className="p-3 pr-4">
                      <div className="flex justify-end gap-1">
                        <Link href={`/admin/auto/${r.id}`} className="rounded-lg p-2 hover:bg-paper" title="Labot"><Pencil className="h-4 w-4" /></Link>
                        <a href={`/auto/${r.slug}`} target="_blank" className="rounded-lg p-2 hover:bg-paper" title="Skatīt lapā"><ExternalLink className="h-4 w-4" /></a>
                        <button onClick={() => duplicate(r)} className="rounded-lg p-2 hover:bg-paper" title="Kopēt"><Copy className="h-4 w-4" /></button>
                        <button onClick={() => setConfirm(r)} className="rounded-lg p-2 text-bad hover:bg-bad/10" title="Uz arhīvu"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-mute">Nekas nav atrasts.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <p className="font-bold">Pārvietot uz arhīvu?</p>
            <p className="mt-1 text-sm text-ink-2">{confirm.make} {confirm.model} vairs nebūs redzams lapā. Arhīvā to var atjaunot jebkurā brīdī.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirm(null)} className="btn btn-ghost">Atcelt</button>
              <button onClick={() => remove(confirm)} className="btn bg-bad text-white">Uz arhīvu</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
