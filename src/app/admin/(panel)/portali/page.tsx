import Link from 'next/link';
import { requireAdmin } from '@/lib/supabase/admin-guard';
import { AdminTitle } from '@/components/admin/AdminShell';
import { PORTALS } from '@/components/admin/labels';
import { CopyField } from '@/components/admin/CopyField';

export const metadata = { title: 'Portāli' };

export default async function PortalsPage() {
  const { supabase, profile } = (await requireAdmin())!;
  const { data } = await supabase.from('portal_listings').select('portal,status,enabled,external_url,last_error,last_sync_at,cars(id,make,model,year,status)').order('created_at', { ascending: false });
  const mobileConfigured = !!(process.env.MOBILE_DE_USER && process.env.MOBILE_DE_PASSWORD);
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://tavsauto.eu';
  const feedKey = process.env.FEED_KEY;
  const byPortal = (p: string) => (data || []).filter((d) => d.portal === p && d.enabled);
  return (
    <>
      <AdminTitle title="Portāli" sub="Kur auto ir publicēti un kā darbojas integrācijas. Konkrēta auto publicēšana — auto labošanas lapā." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Box name="SS.lv" state="Sagatavots eksports" tone="ok" count={byPortal('ss_lv').length}>
          SS.lv nepiedāvā publisku API sludinājumu ievietošanai. Admin panelis sagatavo pilnu sludinājumu (LV un RU teksts, lauki, bilžu ZIP) — ievietošana aizņem ~1 minūti. Publicētā sludinājuma saite tiek saglabāta pie auto.
        </Box>
        <Box name="Autoplius.lt" state="XML plūsma gatava" tone="ok" count={byPortal('autoplius').length}>
          <p>Plūsma automātiski ietver auto, kuriem ieķeksēts “Iekļaut plūsmā”. Nepieciešams Autoplius partnera konts ar XML importu — iedod viņiem šo adresi:</p>
          {profile.role === 'developer' || feedKey ? <CopyField value={`${site}/api/feeds/autoplius${feedKey ? `?key=${feedKey}` : ''}`} /> : null}
        </Box>
        <Box name="Mobile.de" state={mobileConfigured ? 'Pieslēgts' : 'Nav pieslēgts'} tone={mobileConfigured ? 'ok' : 'warn'} count={byPortal('mobile_de').length}>
          Tieša publicēšana caur mobile.de Seller API. Nepieciešams mobile.de tirgotāja konts un Seller API piekļuve (pieprasa service@team.mobile.de). {mobileConfigured ? '' : 'Pēc piekļuves saņemšanas izstrādātājs pievienos to servera iestatījumos.'}
        </Box>
        <Box name="Auto24 / Autogidas" state="Sagatavots eksports" tone="ok" count={byPortal('auto24').length}>
          Publisku importa dokumentāciju portāli nepiedāvā — saskaņo ar portālu (info@auto24.ee). Līdz tam izmanto sagatavoto tekstu un bildes.
        </Box>
      </div>
      <section className="mt-6 overflow-x-auto rounded-2xl bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line text-left text-xs text-mute"><tr><th className="p-3 pl-4">Auto</th><th className="p-3">Portāls</th><th className="p-3">Statuss</th><th className="p-3">Saite / kļūda</th></tr></thead>
          <tbody className="divide-y divide-line">
            {(data || []).filter((d) => d.enabled).map((d, i) => {
              const c = d.cars as unknown as { id: string; make: string; model: string; year: number } | null;
              return (
                <tr key={i}>
                  <td className="p-3 pl-4"><Link href={`/admin/auto/${c?.id}`} className="font-semibold hover:text-petrol">{c?.make} {c?.model} {c?.year}</Link></td>
                  <td className="p-3">{PORTALS[d.portal]?.name}</td>
                  <td className="p-3">{d.status}</td>
                  <td className="max-w-xs truncate p-3">{d.external_url ? <a href={d.external_url} target="_blank" className="text-petrol hover:underline">{d.external_url}</a> : <span className="text-bad">{d.last_error}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Box({ name, state, tone, count, children }: { name: string; state: string; tone: 'ok' | 'warn'; count: number; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">{name}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone === 'ok' ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn'}`}>{state}</span>
      </div>
      <p className="num mt-1 text-xs text-mute">{count} auto</p>
      <div className="mt-3 space-y-2 text-sm text-ink-2">{children}</div>
    </section>
  );
}
