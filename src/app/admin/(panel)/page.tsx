import Link from 'next/link';
import { Car, Inbox, Eye, Clock, Plus, CalendarClock, Gauge } from 'lucide-react';
import { requireAdmin } from '@/lib/supabase/admin-guard';
import { AdminTitle } from '@/components/admin/AdminShell';
import { money, number, STATUS_LABEL } from '@/lib/format';
import { LEAD_TYPE, describe, leadKind } from '@/components/admin/labels';

export default async function Dashboard() {
  const { supabase, profile } = (await requireAdmin())!;
  const [{ data: cars }, { data: leads }, { data: log }] = await Promise.all([
    supabase.from('cars').select('id,slug,title,make,model,status,price,views,updated_at,ta_until,reg_number,csdd_checked_at'),
    supabase.from('leads').select('id,type,name,phone,status,created_at,data,cars(title,slug)').order('created_at', { ascending: false }).limit(8),
    supabase.from('activity_log').select('action,entity,meta,created_at,user_id').order('created_at', { ascending: false }).limit(8),
  ]);
  const all = cars || [];
  const by = (s: string) => all.filter((c) => c.status === s).length;
  const stock = all.filter((c) => c.status === 'published').reduce((a, c) => a + c.price, 0);
  const top = [...all].filter((c) => c.status !== 'sold').sort((a, b) => b.views - a.views).slice(0, 6);
  const today = new Date();
  const soon = new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10);
  const ta = all
    .filter((c) => c.status !== 'sold' && c.status !== 'archived' && c.ta_until && c.ta_until <= soon)
    .sort((a, b) => String(a.ta_until).localeCompare(String(b.ta_until)));
  const noCsdd = all.filter((c) => (c.status === 'published' || c.status === 'reserved') && !c.csdd_checked_at);
  const newLeads = (leads || []).filter((l) => l.status === 'new').length;

  return (
    <>
      <AdminTitle
        title={`Sveiks, ${profile.full_name?.split(' ')[0] || 'admin'}!`}
        sub="Īss pārskats par lapu un pieteikumiem."
        actions={<Link href="/admin/auto/jauns" className="btn btn-primary"><Plus className="h-4 w-4" /> Pievienot auto</Link>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Car} label="Pārdošanā" value={number(by('published'))} note={`${by('reserved')} rezervēti, ${by('draft')} melnraksti`} href="/admin/auto" />
        <Stat icon={Inbox} label="Jauni pieteikumi" value={number(newLeads)} note="Atbildi pēc iespējas ātrāk" href="/admin/pieteikumi" accent={newLeads > 0} />
        <Stat icon={Eye} label="Skatījumi kopā" value={number(all.reduce((a, c) => a + c.views, 0))} note="Visu sludinājumu skatījumi" />
        <Stat icon={Clock} label="Noliktavas vērtība" value={money(stock)} note={`${by('sold')} auto pārdoti`} />
      </div>
      {(ta.length > 0 || noCsdd.length > 0) && (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          {ta.length > 0 && (
            <Panel title="Tehniskā apskate beidzas (45 dienās)" href="/admin/auto">
              <ul className="divide-y divide-line">
                {ta.slice(0, 8).map((c) => {
                  const days = Math.ceil((+new Date(c.ta_until!) - +today) / 864e5);
                  return (
                    <li key={c.id} className="flex items-center gap-3 py-3 text-sm">
                      <CalendarClock className={`h-4 w-4 shrink-0 ${days < 0 ? 'text-bad' : days <= 14 ? 'text-warn' : 'text-mute'}`} />
                      <Link href={`/admin/auto/${c.id}`} className="min-w-0 flex-1 truncate font-semibold text-ink hover:text-petrol">{c.make} {c.model} {c.reg_number ? <span className="font-normal text-mute">· {c.reg_number}</span> : null}</Link>
                      <span className={`num shrink-0 text-xs font-semibold ${days < 0 ? 'text-bad' : days <= 14 ? 'text-warn' : 'text-mute'}`}>{days < 0 ? `beigusies pirms ${-days} d.` : `pēc ${days} d.`} · {new Date(c.ta_until!).toLocaleDateString('lv-LV')}</span>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}
          {noCsdd.length > 0 && (
            <Panel title={`Bez CSDD nobraukuma pārbaudes (${noCsdd.length})`} href="/admin/auto">
              <p className="pb-2 text-xs text-mute">Pievieno nobraukuma vēsturi — pircēji redz grafiku un zīmi “CSDD nobraukums”, tas ceļ uzticību.</p>
              <ul className="divide-y divide-line">
                {noCsdd.slice(0, 6).map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <Gauge className="h-4 w-4 shrink-0 text-mute" />
                    <Link href={`/admin/auto/${c.id}`} className="min-w-0 flex-1 truncate font-semibold text-ink hover:text-petrol">{c.make} {c.model}</Link>
                    <span className="text-xs font-semibold text-petrol">Pārbaudīt →</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Jaunākie pieteikumi" href="/admin/pieteikumi">
          {(leads || []).length === 0 ? <Empty text="Pieteikumu vēl nav." /> : (
            <ul className="divide-y divide-line">
              {(leads || []).map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-3 text-sm">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${l.status === 'new' ? 'bg-signal' : 'bg-line'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{l.name} <span className="font-normal text-mute">· {LEAD_TYPE[leadKind(l)] || l.type}</span></p>
                    <p className="truncate text-mute">{(l.cars as { title?: string } | null)?.title || l.phone}</p>
                  </div>
                  <time className="num shrink-0 text-xs text-mute">{new Date(l.created_at).toLocaleString('lv-LV', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Skatītākie sludinājumi" href="/admin/auto">
          <ul className="divide-y divide-line">
            {top.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3 text-sm">
                <Link href={`/admin/auto/${c.id}`} className="min-w-0 flex-1 truncate font-semibold text-ink hover:text-petrol">{c.make} {c.model}</Link>
                <span className="text-xs text-mute">{STATUS_LABEL[c.status]}</span>
                <span className="num w-16 text-right font-semibold">{number(c.views)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="mt-6">
        <Panel title="Pēdējās darbības" href="/admin/zurnals">
          <ul className="divide-y divide-line text-sm">
            {(log || []).map((l, i) => (
              <li key={i} className="flex justify-between gap-3 py-2.5">
                <span className="text-ink-2">{describe(l.action, l.entity, l.meta as Record<string, unknown>)}</span>
                <time className="num shrink-0 text-xs text-mute">{new Date(l.created_at).toLocaleString('lv-LV')}</time>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function Stat({ icon: I, label, value, note, href, accent }: { icon: React.ElementType; label: string; value: string; note: string; href?: string; accent?: boolean }) {
  const body = (
    <div className={`h-full rounded-2xl p-5 ${accent ? 'bg-signal-soft ring-2 ring-signal' : 'bg-white'}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-ink-2"><I className="h-4 w-4" /> {label}</div>
      <p className="num display-md mt-2 text-3xl text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-2/80">{note}</p>
    </div>
  );
  return href ? <Link href={href} className="block transition hover:-translate-y-0.5">{body}</Link> : body;
}

function Panel({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-bold text-ink">{title}</h2>
        {href && <Link href={href} className="text-sm font-semibold text-petrol hover:underline">Visi</Link>}
      </div>
      {children}
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-mute">{text}</p>;
}
