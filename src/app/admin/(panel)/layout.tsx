import { requireAdmin } from '@/lib/supabase/admin-guard';
import { AdminShell } from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdmin();
  const { count } = await ctx!.supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new');
  return <AdminShell profile={ctx!.profile} newLeads={count || 0}>{children}</AdminShell>;
}
