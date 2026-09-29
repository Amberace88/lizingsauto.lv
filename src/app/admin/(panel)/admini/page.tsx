'use client';
import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { AdminProfile } from '@/lib/types';
import { AdminTitle } from '@/components/admin/AdminShell';
import { Card } from '@/components/admin/CarEditor';
import { useToast } from '@/components/admin/Toast';

type Allow = { email: string; admin_code: string; full_name: string | null; role: string };
const ROLE: Record<string, string> = { developer: 'Izstrādātājs (pilna kontrole)', admin: 'Administrators (saturs, auto, pieteikumi)', editor: 'Redaktors (tikai auto)' };

export default function AdminsPage() {
  const sb = supabaseBrowser();
  const toast = useToast();
  const [admins, setAdmins] = useState<(AdminProfile & { last_login_at: string | null })[] | null>(null);
  const [allow, setAllow] = useState<Allow[]>([]);
  const [form, setForm] = useState<Allow>({ email: '', admin_code: '', full_name: '', role: 'admin' });

  async function load() {
    const [{ data: a, error }, { data: l }] = await Promise.all([sb.from('admins').select('*').order('created_at'), sb.from('admin_allowlist').select('*').order('admin_code')]);
    if (error) toast('Šī sadaļa pieejama tikai izstrādātājam', 'err');
    setAdmins((a as never) || []);
    setAllow((l as Allow[]) || []);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add() {
    if (!/^\S+@\S+\.\S+$/.test(form.email) || !form.admin_code) return toast('Norādi e-pastu un admin ID', 'err');
    const { error } = await sb.from('admin_allowlist').insert({ ...form, email: form.email.toLowerCase().trim(), admin_code: form.admin_code.toUpperCase().trim() });
    if (error) return toast(error.message, 'err');
    toast('Pievienots. Tagad šis cilvēks var pieslēgties ar “Pirmā pieslēgšanās”.');
    setForm({ email: '', admin_code: '', full_name: '', role: 'admin' });
    load();
  }
  async function patch(id: string, p: Partial<AdminProfile>) {
    const { error } = await sb.from('admins').update(p).eq('user_id', id);
    if (error) return toast(error.message, 'err');
    toast('Saglabāts');
    load();
  }
  async function removeAllow(email: string) {
    const { error } = await sb.from('admin_allowlist').delete().eq('email', email);
    if (error) return toast(error.message, 'err');
    load();
  }

  if (!admins) return <div className="grid place-items-center p-20"><Loader2 className="h-6 w-6 animate-spin text-mute" /></div>;
  return (
    <>
      <AdminTitle title="Administratori" sub="Kam ir piekļuve admin panelim. Reģistrēties var tikai e-pasti no atļautā saraksta." />
      <div className="space-y-6">
        <Card title="Aktīvie konti">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-mute"><tr><th className="py-2">Admin ID</th><th>Vārds / e-pasts</th><th>Loma</th><th>Pēdējoreiz</th><th>Aktīvs</th></tr></thead>
              <tbody className="divide-y divide-line">
                {admins.map((a) => (
                  <tr key={a.user_id}>
                    <td className="py-3 font-mono font-bold">{a.admin_code}</td>
                    <td><p className="font-semibold">{a.full_name}</p><p className="text-xs text-mute">{a.email}</p></td>
                    <td>
                      <select className="field !w-auto !py-1.5 text-xs" value={a.role} onChange={(e) => patch(a.user_id, { role: e.target.value as AdminProfile['role'] })}>
                        {Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="num text-xs text-mute">{a.last_login_at ? new Date(a.last_login_at).toLocaleString('lv-LV') : '—'}</td>
                    <td><input type="checkbox" checked={a.active} onChange={(e) => patch(a.user_id, { active: e.target.checked })} className="h-4 w-4 accent-[#0f5a63]" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Atļautais saraksts" hint="Tikai šie e-pasti var izveidot kontu. Pēc pievienošanas cilvēks atver /admin/login → “Pirmā pieslēgšanās” un saņem saiti e-pastā.">
          <ul className="divide-y divide-line text-sm">
            {allow.map((l) => (
              <li key={l.email} className="flex items-center gap-3 py-2.5">
                <span className="w-24 font-mono font-bold">{l.admin_code}</span>
                <span className="flex-1">{l.full_name} <span className="text-mute">{l.email}</span></span>
                <span className="text-xs text-mute">{ROLE[l.role]?.split(' (')[0]}</span>
                <button onClick={() => removeAllow(l.email)} className="text-xs font-semibold text-bad hover:underline">Noņemt</button>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-5">
            <input className="field sm:col-span-2" placeholder="e-pasts" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="field uppercase" placeholder="LA-002" value={form.admin_code} onChange={(e) => setForm({ ...form, admin_code: e.target.value })} />
            <input className="field" placeholder="Vārds" value={form.full_name || ''} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{v.split(' (')[0]}</option>)}
            </select>
          </div>
          <button onClick={add} className="btn btn-primary mt-3"><Plus className="h-4 w-4" /> Pievienot</button>
        </Card>
      </div>
    </>
  );
}
