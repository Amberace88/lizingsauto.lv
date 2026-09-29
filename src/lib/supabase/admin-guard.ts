import { redirect } from 'next/navigation';
import { supabaseServer } from './server';
import type { AdminProfile } from '../types';

/** Pārbauda, ka pieprasījumu veic aktīvs admins. Atgriež klientu ar sesiju un profilu. */
export async function requireAdmin(opts: { developer?: boolean; api?: boolean } = {}) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const fail = () => {
    if (opts.api) return null;
    redirect('/admin/login');
  };
  if (!user) return fail();
  const { data: profile } = await supabase.from('admins').select('*').eq('user_id', user.id).eq('active', true).maybeSingle<AdminProfile>();
  if (!profile) return fail();
  if (opts.developer && profile.role !== 'developer') {
    if (opts.api) return null;
    redirect('/admin');
  }
  return { supabase, user, profile };
}
