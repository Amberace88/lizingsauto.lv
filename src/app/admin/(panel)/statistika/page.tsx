'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Users, Eye, Inbox, Phone, MessageCircle, Radio, TrendingUp, TrendingDown, Calculator, Globe2, Smartphone, MousePointerClick, Clock, Filter } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { AdminTitle } from '@/components/admin/AdminShell';
import { LEAD_TYPE } from '@/components/admin/labels';
import { number } from '@/lib/format';

type S = {
  pageviews: number; sessions: number; prev_pageviews: number; prev_sessions: number; leads: number; prev_leads: number; calls: number; whatsapp: number; live: number;
  daily: { d: string; pv: number; s: number }[];
  pages: { path: string; n: number; s: number }[];
  sources: { src: string; s: number }[];
  campaigns: { c: string; src: string | null; s: number }[];
  devices: { k: string; s: number }[];
  countries: { k: string; s: number }[];
  events: { name: string; n: number; s: number }[];
  tools: { k: string; s: number }[];
  filters: { k: string; s: number }[];
  lead_types: { k: string; n: number }[];
  hours: { h: number; dow: number; n: number }[];
};

const RANGES = [[1, 'Šodien'], [7, '7 dienas'], [30, '30 dienas'], [90, '90 dienas'], [365, 'Gads']] as const;
const PAGE_NAMES: Record<string, string> = { '/': 'Sākumlapa', '/katalogs': 'Auto katalogs', '/lizings': 'Līzings', '/elektroauto': 'Elektroauto / EKII', '/garantija': 'Garantija', '/kalkulatori': 'Kalkulatori', '/pardot-auto': 'Pārdot auto', '/auto-novertejums': 'Auto novērtējums', '/kontakti': 'Kontakti', '/parbaudes': 'Bezmaksas pārbaudes', '/vardadienas': 'Vārda dienas', '/padomi': 'Padomi', '/lietoti-auto': 'Lietoti auto (sadaļas)', '/pasutit-auto': 'Pasūtīt auto', '/par-mums': 'Par mums', '/izlase': 'Izlase', '/salidzinat': 'Salīdzināt' };
const DEVICE: Record<string, string> = { mobile: 'Telefons', tablet: 'Planšete', desktop: 'Dators' };
const FILTER: Record<string, string> = { make: 'Marka', model: 'Modelis', fuel: 'Degviela', body: 'Virsbūve', gear: 'Ātrumkārba', drive: 'Piedziņa', minPrice: 'Cena no', maxPrice: 'Cena līdz', minYear: 'Gads no', maxYear: 'Gads līdz', maxKm: 'Nobraukums', maxMonthly: 'Mēneša maksājums', q: 'Meklēšana', sort: 'Kārtošana', down: 'Pirmā iemaksa' };
const EVENT: Record<string, string> = { phone_click: 'Zvana poga', whatsapp_click: 'WhatsApp poga', email_click: 'E-pasta saite', social_click: 'Sociālie tīkli', lead: 'Nosūtīts pieteikums', tool_use: 'Kalkulatori un rīki', catalog_filter: 'Kataloga filtri' };
const DOW = ['P', 'O', 'T', 'C', 'Pk', 'S', 'Sv'];

export default function StatsPage() {
  const sb = supabaseBrowser();
  const [days, setDays] = useState(30);
  const [s, setS] = useState<S | null>(null);
  const [err, setErr] = useState('');
  const [cars, setCars] = useState<Record<string, string>>({});

  useEffect(() => {
    sb.from('cars').select('slug,make,model,year').then(({ data }: { data: { slug: string; make: string; model: string; year: number | null }[] | null }) => setCars(Object.fromEntries((data || []).map((c) => [c.slug, `${c.make} ${c.model} ${c.year ?? ''}`.trim()]))));
    sb.rpc('analytics_cleanup').then(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    setS(null);
    setErr('');
    sb.rpc('analytics_summary', { p_days: days }).then(({ data, error }: { data: S | null; error: { message: string } | null }) => {
      if (error) setErr(/does not exist|analytics_summary/i.test(error.message) ? 'setup' : error.message);
      else setS(data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const label = (p: string) => PAGE_NAMES[p] || (p.startsWith('/auto/') ? `🚗 ${cars[p.slice(6)] || p.slice(6)}` : p.startsWith('/lietoti-auto/') ? `Sadaļa: ${p.slice(14)}` : p.startsWith('/padomi/') ? `Raksts: ${p.slice(8)}` : p.startsWith('/vardadienas/') ? `Vārda diena: ${p.slice(13)}` : p);
  const carPages = useMemo(() => (s?.pages || []).filter((p) => p.path.startsWith('/auto/')), [s]);
  const conv = s && s.sessions ? (s.leads / s.sessions) * 100 : 0;

  return (
    <>
      <AdminTitle title="Statistika" sub="Apmeklējumi, avoti, populārākie auto, kalkulatori un pieteikumi. Anonīmi, bez sīkdatnēm." />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl bg-white p-1">
          {RANGES.map(([d, l]) => (
            <button key={d} onClick={() => setDays(d)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${days === d ? 'bg-ink text-white' : 'text-ink-2 hover:bg-paper'}`}>{l}</button>
          ))}
        </div>
        {s && <span className="ml-auto flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ok" /></span> Tagad lapā: {s.live}</span>}
      </div>

      {err === 'setup' ? (
        <div className="rounded-2xl bg-white p-8 text-ink-2">Statistikas datubāzes tabula vēl nav izveidota. Izstrādātājam jāpalaiž migrācija <code>005_analytics.sql</code>.</div>
      ) : err ? (
        <div className="rounded-2xl bg-white p-8 text-bad">{err}</div>
      ) : !s ? (
        <div className="grid place-items-center rounded-2xl bg-white p-20"><Loader2 className="h-6 w-6 animate-spin text-mute" /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi icon={Users} label="Apmeklētāji (sesijas)" v={s.sessions} prev={s.prev_sessions} />
            <Kpi icon={Eye} label="Lapu skatījumi" v={s.pageviews} prev={s.prev_pageviews} />
            <Kpi icon={Inbox} label="Pieteikumi" v={s.leads} prev={s.prev_leads} note={`Konversija ${conv.toFixed(1)}%`} />
            <Kpi icon={Phone} label="Zvana klikšķi" v={s.calls} />
            <Kpi icon={MessageCircle} label="WhatsApp klikšķi" v={s.whatsapp} />
          </div>

          <Panel title="Apmeklējumi pa dienām" icon={TrendingUp}><Daily data={s.daily} days={days} /></Panel>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Populārākās lapas" icon={Eye}><Bars rows={s.pages.slice(0, 12).map((p) => ({ k: label(p.path), v: p.s, href: p.path }))} unit="apm." /></Panel>
            <Panel title="Skatītākie auto" icon={Radio}>{carPages.length ? <Bars rows={carPages.slice(0, 12).map((p) => ({ k: label(p.path).replace('🚗 ', ''), v: p.s, href: p.path }))} unit="apm." /> : <Empty />}</Panel>
            <Panel title="No kurienes nāk apmeklētāji" icon={Globe2}><Bars rows={s.sources.map((x) => ({ k: x.src, v: x.s }))} unit="apm." /></Panel>
            <Panel title="Kalkulatori un rīki" icon={Calculator}>{s.tools.length ? <Bars rows={s.tools.map((x) => ({ k: x.k, v: x.s }))} unit="lietot." /> : <Empty text="Vēl neviens nav lietojis kalkulatorus šajā periodā." />}</Panel>
            <Panel title="Pieteikumi pēc veida" icon={Inbox}>{s.lead_types.length ? <Bars rows={s.lead_types.map((x) => ({ k: LEAD_TYPE[x.k] || x.k, v: x.n }))} unit="" /> : <Empty />}</Panel>
            <Panel title="Darbības lapā" icon={MousePointerClick}><Bars rows={s.events.map((x) => ({ k: EVENT[x.name] || x.name, v: x.s }))} unit="apm." /></Panel>
            <Panel title="Kataloga filtri" icon={Filter}>{s.filters.length ? <Bars rows={s.filters.map((x) => ({ k: FILTER[x.k] || x.k, v: x.s }))} unit="apm." /> : <Empty />}</Panel>
            <Panel title="Ierīces un valstis" icon={Smartphone}>
              <div className="grid gap-6 sm:grid-cols-2">
                <Bars rows={s.devices.map((x) => ({ k: DEVICE[x.k] || x.k, v: x.s }))} unit="" />
                <Bars rows={s.countries.map((x) => ({ k: x.k === '?' ? 'Nezināma' : x.k, v: x.s }))} unit="" />
              </div>
            </Panel>
          </div>

          <Panel title="Kad apmeklē lapu (nedēļas diena × stunda)" icon={Clock}><Heat data={s.hours} /></Panel>
          {s.campaigns.length > 0 && <Panel title="Reklāmas kampaņas (UTM)" icon={TrendingUp}><Bars rows={s.campaigns.map((x) => ({ k: `${x.c}${x.src ? ` · ${x.src}` : ''}`, v: x.s }))} unit="apm." /></Panel>}
          <p className="text-xs text-mute">Statistika ir anonīma: netiek glabātas IP adreses un netiek lietotas sīkdatnes. Dati tiek glabāti 13 mēnešus. Reklāmām pievieno saitēm UTM parametrus (piem., ?utm_source=facebook&utm_campaign=rudens), lai redzētu kampaņu rezultātus.</p>
        </div>
      )}
    </>
  );
}

function Kpi({ icon: I, label, v, prev, note }: { icon: typeof Users; label: string; v: number; prev?: number; note?: string }) {
  const d = prev != null && prev > 0 ? Math.round(((v - prev) / prev) * 100) : null;
  return (
    <div className="rounded-2xl bg-white p-5">
      <div className="flex items-center justify-between text-sm text-mute"><span>{label}</span><I className="h-4 w-4" /></div>
      <p className="num display-md mt-2 text-3xl text-ink">{number(v)}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {d != null && <span className={`flex items-center gap-0.5 font-bold ${d >= 0 ? 'text-ok' : 'text-bad'}`}>{d >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}{d > 0 ? '+' : ''}{d}%</span>}
        {note && <span className="text-mute">{note}</span>}
        {d != null && !note && <span className="text-mute">pret iepriekšējo periodu</span>}
      </div>
    </div>
  );
}
function Panel({ title, icon: I, children }: { title: string; icon: typeof Users; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5">
      <h2 className="mb-4 flex items-center gap-2 font-bold text-ink"><I className="h-4 w-4 text-signal" /> {title}</h2>
      {children}
    </section>
  );
}
function Empty({ text = 'Šajā periodā datu vēl nav.' }: { text?: string }) {
  return <p className="py-6 text-center text-sm text-mute">{text}</p>;
}
function Bars({ rows, unit }: { rows: { k: string; v: number; href?: string }[]; unit: string }) {
  if (!rows.length) return <Empty />;
  const max = Math.max(...rows.map((r) => r.v), 1);
  const total = rows.reduce((a, r) => a + r.v, 0);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.k} className="relative overflow-hidden rounded-lg">
          <div className="absolute inset-y-0 left-0 rounded-lg bg-signal-soft" style={{ width: `${(r.v / max) * 100}%` }} />
          <div className="relative flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
            {r.href ? <Link href={r.href} target="_blank" className="truncate font-medium text-ink hover:underline">{r.k}</Link> : <span className="truncate font-medium text-ink">{r.k}</span>}
            <span className="num shrink-0 text-ink-2"><b className="text-ink">{number(r.v)}</b> {unit} <span className="text-mute">· {Math.round((r.v / total) * 100)}%</span></span>
          </div>
        </li>
      ))}
    </ul>
  );
}
function Daily({ data, days }: { data: { d: string; pv: number; s: number }[]; days: number }) {
  // aizpilda tukšās dienas
  const map = new Map(data.map((x) => [x.d, x]));
  const n = Math.min(Math.max(days, 1), 365);
  const list = Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() - (n - 1 - i) * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Europe/Riga' });
    return map.get(d) || { d, pv: 0, s: 0 };
  });
  const max = Math.max(...list.map((x) => x.pv), 1);
  return (
    <div>
      <div className="flex h-48 items-end gap-[2px]">
        {list.map((x) => (
          <div key={x.d} className="group relative flex h-full flex-1 flex-col justify-end" title={`${x.d}: ${x.s} apmeklētāji, ${x.pv} skatījumi`}>
            <div className="w-full rounded-t bg-signal/25" style={{ height: `${(x.pv / max) * 100}%` }}>
              <div className="w-full rounded-t bg-signal" style={{ height: `${x.pv ? (x.s / x.pv) * 100 : 0}%`, marginTop: 'auto' }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-mute"><span>{list[0]?.d}</span><span className="flex gap-3"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-signal" /> apmeklētāji</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-signal/25" /> skatījumi</span></span><span>{list.at(-1)?.d}</span></div>
    </div>
  );
}
function Heat({ data }: { data: { h: number; dow: number; n: number }[] }) {
  const max = Math.max(...data.map((x) => x.n), 1);
  const get = (dow: number, h: number) => data.find((x) => x.dow === dow && x.h === h)?.n || 0;
  return (
    <div className="overflow-x-auto">
      <div className="inline-grid min-w-[640px] grid-cols-[28px_repeat(24,1fr)] gap-[3px] text-[10px] text-mute">
        <span />
        {Array.from({ length: 24 }, (_, h) => <span key={h} className="text-center">{h % 3 === 0 ? h : ''}</span>)}
        {DOW.map((d, i) => (
          <>
            <span key={d} className="flex items-center font-semibold">{d}</span>
            {Array.from({ length: 24 }, (_, h) => {
              const v = get(i + 1, h);
              return <span key={`${d}${h}`} title={`${d} ${h}:00 — ${v}`} className="aspect-square rounded-[3px]" style={{ background: v ? `rgba(217,29,43,${0.12 + 0.88 * (v / max)})` : 'var(--color-paper)' }} />;
            })}
          </>
        ))}
      </div>
    </div>
  );
}
