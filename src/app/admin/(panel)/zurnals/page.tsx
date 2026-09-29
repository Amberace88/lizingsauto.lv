import { requireAdmin } from '@/lib/supabase/admin-guard';
import { AdminTitle } from '@/components/admin/AdminShell';
import { describe } from '@/components/admin/labels';

export const metadata = { title: 'Darbību žurnāls' };

export default async function LogPage() {
  const { supabase } = (await requireAdmin())!;
  const [{ data: log }, { data: admins }] = await Promise.all([
    supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(300),
    supabase.from('admins').select('user_id,full_name,admin_code'),
  ]);
  const who = (id: string | null) => {
    const a = (admins || []).find((x) => x.user_id === id);
    return a ? `${a.full_name || ''} (${a.admin_code})` : '—';
  };
  return (
    <>
      <AdminTitle title="Darbību žurnāls" sub="Kas un kad mainīja datus. Pēdējās 300 darbības." />
      <div className="overflow-x-auto rounded-2xl bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line text-left text-xs text-mute"><tr><th className="p-3 pl-4">Laiks</th><th className="p-3">Admins</th><th className="p-3">Darbība</th></tr></thead>
          <tbody className="divide-y divide-line">
            {(log || []).map((l) => (
              <tr key={l.id}>
                <td className="num p-3 pl-4 text-mute">{new Date(l.created_at).toLocaleString('lv-LV')}</td>
                <td className="p-3 font-medium">{who(l.user_id)}</td>
                <td className="p-3 text-ink-2">{describe(l.action, l.entity, l.meta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
