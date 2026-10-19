'use client';
/* eslint-disable @next/next/no-img-element -- mazi sīktēli no Supabase krātuves */
import Link from 'next/link';
import { FIELD_LABEL } from '@/lib/lead-labels';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Phone, Mail, MessageCircle, X, Download, ExternalLink, Car as CarIcon, Wallet, Briefcase, Repeat2 } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Lead } from '@/lib/types';
import { AdminTitle } from '@/components/admin/AdminShell';
import { LEAD_STATUS, LEAD_TYPE, leadKind } from '@/components/admin/labels';
import { useToast } from '@/components/admin/Toast';

const TONE: Record<string, string> = { new: 'bg-signal text-white', in_progress: 'bg-petrol-soft text-petrol', done: 'bg-ok/10 text-ok', rejected: 'bg-mute/10 text-mute' };

export default function LeadsPage() {
  const sb = supabaseBrowser();
  const toast = useToast();
  const [rows, setRows] = useState<Lead[] | null>(null);
  const [status, setStatus] = useState<string>('open');
  const [type, setType] = useState('');
  const [open, setOpen] = useState<Lead | null>(null);
  const [reviewUrl, setReviewUrl] = useState('');
  useEffect(() => {
    sb.from('settings').select('value').eq('key', 'reviews').maybeSingle().then(({ data }: { data: { value: { googleUrl?: string } } | null }) => setReviewUrl(data?.value?.googleUrl || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const { data, error } = await sb.from('leads').select('*, cars(title,slug,make,model,year,mileage,price,car_images(url,sort,is_promo))').order('created_at', { ascending: false }).limit(500);
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

  const list = useMemo(() => (rows || []).filter((r) => (status === 'open' ? ['new', 'in_progress'].includes(r.status) : status ? r.status === status : true)).filter((r) => !type || leadKind(r) === type), [rows, status, type]);

  async function update(l: Lead, p: Partial<Lead>) {
    const { error } = await sb.from('leads').update({ ...p, updated_at: new Date().toISOString() }).eq('id', l.id);
    if (error) return toast(error.message, 'err');
    setRows((rs) => rs!.map((x) => (x.id === l.id ? { ...x, ...p } : x)));
    setOpen((o) => (o && o.id === l.id ? { ...o, ...p } : o));
    window.dispatchEvent(new Event('leads:changed')); // atjauno skaitu izvēlnē
    if (!(p.status === 'in_progress' && l.status === 'new' && Object.keys(p).length === 1)) toast('Saglabāts');
  }

  function exportCsv() {
    const head = ['Datums', 'Veids', 'Statuss', 'Vārds', 'Tālrunis', 'E-pasts', 'Auto', 'Ziņa'];
    const esc = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const csv = [head.join(';'), ...list.map((l) => [new Date(l.created_at).toLocaleString('lv-LV'), LEAD_TYPE[leadKind(l)], LEAD_STATUS[l.status], l.name, l.phone, l.email, l.cars?.title, l.message].map(esc).join(';'))].join('\n');
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
                    <span className="block truncate font-semibold text-ink">{l.name} <span className="font-normal text-mute">· {LEAD_TYPE[leadKind(l)]}</span></span>
                    <span className="block truncate text-sm text-mute">
                      {l.cars ? `${l.cars.make ?? ''} ${l.cars.model ?? ''} ${l.cars.title}`.trim() : String(l.data?.car || '') || l.message || l.phone}
                      {l.data?.credit_amount ? <b className="num ml-2 font-semibold text-ink">· {eur(Number(l.data.credit_amount))}</b> : null}
                    </span>
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
                <p className="text-sm text-mute">{LEAD_TYPE[leadKind(open)]} · {new Date(open.created_at).toLocaleString('lv-LV')}</p>
                <h2 className="display-md mt-1 text-2xl">{open.name}</h2>
              </div>
              <button onClick={() => setOpen(null)} className="rounded-lg p-2 hover:bg-paper" aria-label="Aizvērt"><X /></button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <a href={`tel:${open.phone}`} className="btn btn-primary !py-2"><Phone className="h-4 w-4" /> Zvanīt</a>
              <a href={`https://wa.me/${(open.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !py-2"><MessageCircle className="h-4 w-4" /> WA</a>
              {open.email ? <a href={`mailto:${open.email}`} className="btn btn-ghost !py-2"><Mail className="h-4 w-4" /> E-pasts</a> : <span />}
            </div>
            {reviewUrl && open.phone && (
              <a href={`https://wa.me/${open.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Labdien${open.name ? `, ${open.name}` : ''}! Paldies, ka izvēlējāties Tavs Auto. Būsim ļoti pateicīgi, ja atstāsiet īsu atsauksmi: ${reviewUrl}`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-2 w-full !py-2">⭐ Lūgt Google atsauksmi (WhatsApp)</a>
            )}
            <CarBox lead={open} />
            {leadKind(open) === 'leasing' && <LeasingSummary d={open.data || {}} />}
            <dl className="mt-6 space-y-2 text-sm">
              <Item k="Tālrunis" v={open.phone} />
              <Item k="E-pasts" v={open.email} />
              {Object.entries(open.data || {}).filter(([k]) => !SHOWN.has(k)).map(([k, v]) => <Item key={k} k={FIELD_LABEL[k] || k} v={String(v)} />)}
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

const eur = (n: number) => `${Math.round(n).toLocaleString('lv-LV')} €`;
const SHOWN = new Set(['ip_hash', 'car', 'car_source', 'car_link', 'car_price', 'down', 'credit_amount', 'term', 'monthly', 'apr', 'income_net', 'income', 'obligations', 'employment', 'employer', 'work_months', 'dependents', 'credit_history', 'client_type', 'company', 'trade_in', 'contact_pref']);
const safeUrl = (u: unknown) => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null);

function CarBox({ lead }: { lead: Lead }) {
  const c = lead.cars;
  const d = lead.data || {};
  const link = safeUrl(d.car_link);
  if (c) {
    const img = [...(c.car_images || [])].filter((i) => !i.is_promo).sort((a, b) => a.sort - b.sort)[0]?.url;
    return (
      <Link href={`/auto/${c.slug}`} target="_blank" className="mt-6 flex gap-3 rounded-xl border border-line p-2.5 hover:border-ink/30">
        <span className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-line">{img && <img src={img} alt="" className="h-full w-full object-cover" />}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold uppercase tracking-wide text-mute">Auto no kataloga</span>
          <span className="block truncate font-bold text-ink">{c.make} {c.model} {c.title}</span>
          <span className="num block text-sm text-ink-2">{[c.year, c.mileage != null ? `${c.mileage.toLocaleString('lv-LV')} km` : null, c.price ? eur(c.price) : null].filter(Boolean).join(' · ')}</span>
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-mute" />
      </Link>
    );
  }
  if (!d.car && !link) return null;
  return (
    <div className="mt-6 flex items-center gap-3 rounded-xl border border-line p-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-paper"><CarIcon className="h-5 w-5 text-signal" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-mute">{String(d.car_source || 'Auto')}</span>
        <span className="block truncate font-bold text-ink">{String(d.car || 'Cits auto')}</span>
        {link && <span className="block truncate text-xs text-mute">{new URL(link).hostname.replace(/^www\./, '')}</span>}
      </span>
      {link && <a href={link} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-ghost !px-3 !py-2 text-sm"><ExternalLink className="h-4 w-4" /> Atvērt</a>}
    </div>
  );
}

function LeasingSummary({ d }: { d: Record<string, unknown> }) {
  const n = (k: string) => (d[k] != null && d[k] !== '' && isFinite(Number(d[k])) ? Number(d[k]) : null);
  const price = n('car_price');
  const down = n('down');
  const credit = n('credit_amount');
  const monthly = n('monthly');
  const income = n('income_net');
  const obl = n('obligations') ?? 0;
  const load = income && monthly ? Math.round(((monthly + obl) / income) * 100) : null;
  const tone = load == null ? '' : load <= 40 ? 'bg-ok/10 text-ok' : load <= 55 ? 'bg-amber-100 text-amber-800' : 'bg-signal-soft text-signal';
  const hist = String(d.credit_history || '');
  const tiles: [string, string | null][] = [
    ['Auto cena', price ? eur(price) : null],
    ['Pirmā iemaksa', down != null ? `${eur(down)}${price ? ` (${Math.round((down / price) * 100)}%)` : ''}` : null],
    ['Līzinga summa', credit ? eur(credit) : null],
    ['Termiņš', d.term ? `${d.term} mēn.` : null],
    ['Maksājums ~', monthly ? `${eur(monthly)}/mēn.` : null],
    ['GPL', d.apr ? `${d.apr}%` : null],
  ];
  return (
    <div className="mt-4 space-y-3">
      <section className="rounded-xl bg-paper p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-mute"><Wallet className="h-3.5 w-3.5" /> Finansējums</p>
        <dl className="grid grid-cols-3 gap-x-3 gap-y-2">
          {tiles.filter(([, v]) => v).map(([k, v]) => (
            <div key={k}><dt className="text-[11px] text-mute">{k}</dt><dd className="num text-sm font-bold text-ink">{v}</dd></div>
          ))}
        </dl>
        {d.trade_in ? <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-2"><Repeat2 className="h-4 w-4 text-mute" /> Iemaksā: <b className="text-ink">{String(d.trade_in)}</b></p> : null}
      </section>
      <section className="rounded-xl bg-paper p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-mute"><Briefcase className="h-3.5 w-3.5" /> Ienākumi un saistības</p>
        {load != null && (
          <p className={`mb-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold ${tone}`}>
            Kredītslodze <span className="num">{load}%</span> no ienākumiem{load > 40 ? ' — virs ieteicamajiem 40%' : ''}
          </p>
        )}
        <dl className="space-y-1.5 text-sm">
          <Item k="Pieteicējs" v={d.client_type as string} />
          <Item k="Uzņēmums" v={d.company as string} />
          <Item k="Ienākumi neto" v={income ? `${eur(income)}/mēn.` : (d.income as string)} />
          <Item k="Citi kredīti" v={d.obligations != null && d.obligations !== '' ? `${eur(obl)}/mēn.` : null} />
          <Item k="Nodarbinātība" v={d.employment as string} />
          <Item k="Darba devējs" v={d.employer as string} />
          <Item k="Stāžs" v={d.work_months != null && d.work_months !== '' ? `${d.work_months} mēn.` : null} />
          <Item k="Apgādājamie" v={d.dependents as string} />
          {hist && <div className="flex justify-between gap-4 border-b border-line pb-2"><dt className="text-mute">Kredītvēsture</dt><dd className={`text-right font-semibold ${/kavēj|parād/i.test(hist) ? 'text-signal' : /bez|laba/i.test(hist) ? 'text-ok' : ''}`}>{hist}</dd></div>}
          <Item k="Sazināties" v={d.contact_pref as string} />
        </dl>
      </section>
    </div>
  );
}
