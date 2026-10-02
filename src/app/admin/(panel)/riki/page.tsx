import { requireAdmin } from '@/lib/supabase/admin-guard';
import { AdminTitle } from '@/components/admin/AdminShell';
import { DevTools } from '@/components/admin/DevTools';

export const metadata = { title: 'Izstrādātāja rīki' };

export default async function ToolsPage() {
  const { supabase } = (await requireAdmin({ developer: true }))!;
  const [{ count: total }, { count: pending }] = await Promise.all([
    supabase.from('car_images').select('id', { count: 'exact', head: true }),
    supabase.from('car_images').select('id', { count: 'exact', head: true }).is('storage_path', null),
  ]);
  const env = {
    NEXT_PUBLIC_SITE_URL: !!process.env.NEXT_PUBLIC_SITE_URL,
    MOBILE_DE_USER: !!process.env.MOBILE_DE_USER,
    MOBILE_DE_PASSWORD: !!process.env.MOBILE_DE_PASSWORD,
    FEED_KEY: !!process.env.FEED_KEY,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    MAIL_FROM: !!process.env.MAIL_FROM,
    LEAD_NOTIFY_TO: !!process.env.LEAD_NOTIFY_TO,
  };
  return (
    <>
      <AdminTitle title="Izstrādātāja rīki" sub="Tehniskas darbības. Redzams tikai izstrādātājam." />
      <DevTools total={total || 0} pending={pending || 0} env={env} />
    </>
  );
}
