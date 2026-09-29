import { requireAdmin } from '@/lib/supabase/admin-guard';
export default async function DevOnly({ children }: { children: React.ReactNode }) {
  await requireAdmin({ developer: true });
  return <>{children}</>;
}
