'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Phone, Mail, MessageCircle, X, Download } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Lead } from '@/lib/types';
import { AdminTitle } from '@/components/admin/AdminShell';
import { LEAD_STATUS, LEAD_TYPE } from '@/components/admin/labels';
import { useToast } from '@/components/admin/Toast';

const TONE: Record<string, string> = { new: 'bg-signal text-white', in_progress: 'bg-petrol-soft text-petrol', done: 'bg-ok/10 text-ok', rejected: 'bg-mute/10 text-mute' };
const FIELD_LABEL: Record<string, string> = { client_type: 'Pieteicējs', income: 'Ienākumi', employment: 'Darba vieta', work_months: 'Darba stāžs (mēn.)', credit_history: 'Kredītvēsture', company: 'Uzņēmums', down: 'Pirmā iemaksa €', term: 'Termiņš', monthly: 'Maksājums €/mēn.', car: 'Auto', when: 'Vēlamais laiks', make_model: 'Marka/modelis', year: 'Gads', mileage: 'Nobraukums', reg_number: 'Valsts nr.', price_wish: 'Vēlamā cena', deal: 'Darījums', budget: 'Budžets', years: 'Gadi', fuel: 'Degviela', gear: 'Ātrumkārba', page: 'Lapa' };

export default function LeadsPage() {
  const sb = supabaseBrowser();
  const toast = useToast();
  const [rows, setRows] = useState<Lead[] | null>(null);
  const [status, setStatus] = useState<string>('open');
  const [type, setType] = useState('');
  const [open, setOpen] = useState<Lead | null>(null);

  async function load() {
    const { data, error } = await sb.from('leads').select('*, cars(title,slug)').order('created_at', { ascending: false }).limit(500);
    if (error) toast(error.message, 'err');
    setRows((data as Lead[]) || []);
  }
  useEffect(() => {
    load();
    const ch = sb.channel('leads').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, () => load()).subscribe();
    return () => {
      sb.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = useMemo(() => (rows || []).filter((r) => (status === 'open' ? ['new', 'in_progress'].includes(r.status) : status ? r.status === status : true)).filter((r) => !type || r.type === type), [rows, status, type]);

  async function update(l: Lead, p: Partial<Lead>) {
    const { error } = await sb.from('leads').update({ ...p, updated_at: new Date().toISOString() }).eq('id', l.id);
    if (error) return toast(error.message, 'err');
    setRows((rs) => rs!.map((x) => (x.id === l.id ? { ...x, ...p } : x)));
    setOpen((o) => (o && o.id === l.id ? { ...o, ...p } : o));
    toast('Saglabāts');
  }

  function exportCsv() {
    const head = ['Datums', 'Veids', 'Statuss', 'Vārds', 'Tālrunis', 'E-pasts', 'Auto', 'Ziņa'];
    const esc = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const csv = [head.join(';'), ...list.map((l) => [new Date(l.created_at).toLocaleString('lv-LV'), LEAD_TYPE[l.type], LEAD_STATUS[l.status], l.name, l.phone, l.email, l.cars?.title, l.message].map(esc).join(';'))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    a.download = `pieteikumi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <>
      <AdminTitle title="Pieteikumi" sub="Visi pieteikumi no lapas formām. Jauni parādās automātiski." actions={<button onClick={exportCsv} className="btn btn-ghost"><Download className="h-4 w-4" /> Eksportēt CSV</button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="field !w-auto !py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="open">Aktīvie</option>
          <option value="">Visi</option>
          {Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="field !w-auto !py-2" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Visi veidi</option>
          {Object.entries(LEAD_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {!rows ? (
        <div className="grid place-items-center rounded-2xl bg-white p-16"><Loader2 className="h-6 w-6 animate-spin text-mute" /></div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center text-mute">Nav pieteikumu šajā sarakstā.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white">
          <ul className="divide-y divide-line">
            {list.map((l) => (
              <li key={l.id}>
                <button onClick={() => { setOpen(l); if (l.status === 'new') update(l, { status: 'in_progress' }); }} className="flex w-full items-center gap-4 px-4 py-3.5 text-left hover:bg-paper/60">
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE[l.status]}`}>{LEAD_STATUS[l.status]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{l.name} <span className="font-normal text-mute">· {LEAD_TYPE[l.type]}</span></span>
                    <span className="block truncate text-sm text-mute">{l.cars?.title || l.message || l.phone}</span>
                  </span>
                  <span className="num hidden text-sm text-ink-2 sm:block">{l.phone}</span>
                  <time className="num shrink-0 text-xs text-mute">{new Date(l.created_at).toLocaleString('lv-LV', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={() => setOpen(null)}>
          <aside className="h-full w-full max-w-lg overflow-y-auto bg-white p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Pieteikums">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-mute">{LEAD_TYPE[open.type]} · {new Date(open.created_at).toLocaleString('lv-LV')}</p>
                <h2 className="display-md mt-1 text-2xl">{open.name}</h2>
              </div>
              <button onClick={() => setOpen(null)} className="rounded-lg p-2 hover:bg-paper" aria-label="Aizvērt"><X /></button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <a href={`tel:${open.phone}`} className="btn btn-primary !py-2"><Phone className="h-4 w-4" /> Zvanīt</a>
              <a href={`https://wa.me/${(open.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !py-2"><MessageCircle className="h-4 w-4" /> WA</a>
              {open.email ? <a href={`mailto:${open.email}`} className="btn btn-ghost !py-2"><Mail className="h-4 w-4" /> E-pasts</a> : <span />}
            </div>
            <dl className="mt-6 space-y-2 text-sm">
              <Item k="Tālrunis" v={open.phone} />
              <Item k="E-pasts" v={open.email} />
              {open.cars && <div className="flex justify-between gap-4 border-b border-line pb-2"><dt className="text-mute">Auto</dt><dd><Link href={`/auto/${open.cars.slug}`} target="_blank" className="font-semibold text-petrol hover:underline">{open.cars.title}</Link></dd></div>}
              {Object.entries(open.data || {}).filter(([k]) => !['ip_hash', 'car'].includes(k)).map(([k, v]) => <Item key={k} k={FIELD_LABEL[k] || k} v={String(v)} />)}
            </dl>
            {open.message && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-paper p-4 text-sm">{open.message}</p>}
            <label className="mt-6 block">
              <span className="label">Statuss</span>
              <select className="field" value={open.status} onChange={(e) => update(open, { status: e.target.value as Lead['status'] })}>
                {Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="mt-4 block">
              <span className="label">Iekšējā piezīme</span>
              <textarea className="field" rows={4} defaultValue={open.admin_note || ''} onBlur={(e) => e.target.value !== (open.admin_note || '') && update(open, { admin_note: e.target.value })} placeholder="Piem., piezvanīju, gaida bankas lēmumu" />
            </label>
          </aside>
        </div>
      )}
    </>
  );
}

function Item({ k, v }: { k: string; v?: string | null }) {
  if (!v) return null;
  return <div className="flex justify-between gap-4 border-b border-line pb-2"><dt className="text-mute">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>;
}
