import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

const attempts = new Map<string, number[]>();

export async function POST(req: Request) {
  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'x';
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60_000);
  if (list.length >= 10) return NextResponse.json({ error: 'Pārāk daudz mēģinājumu. Mēģini pēc 15 minūtēm.' }, { status: 429 });
  list.push(now);
  attempts.set(ip, list);

  const { code, password } = (await req.json().catch(() => ({}))) as { code?: string; password?: string };
  if (!code || !password) return NextResponse.json({ error: 'Ievadi admin ID un paroli.' }, { status: 400 });
  const supabase = await supabaseServer();
  const input = code.trim();
  let email = input.includes('@') ? input : null;
  if (!email) {
    const { data } = await supabase.rpc('admin_login_email', { code: input });
    email = (data as string | null) || null;
  }
  // Vienāda kļūda neatkarīgi no tā, vai ID eksistē
  const generic = NextResponse.json({ error: 'Nepareizs admin ID vai parole.' }, { status: 401 });
  if (!email) return generic;
  const { data: auth, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !auth.user) return generic;
  const { data: prof } = await supabase.from('admins').select('active').eq('user_id', auth.user.id).maybeSingle();
  if (!prof?.active) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: 'Šim kontam nav piekļuves admin panelim.' }, { status: 403 });
  }
  await supabase.from('admins').update({ last_login_at: new Date().toISOString() }).eq('user_id', auth.user.id);
  await supabase.from('activity_log').insert({ user_id: auth.user.id, action: 'login', entity: 'admin', entity_id: auth.user.id, meta: {} });
  attempts.delete(ip);
  return NextResponse.json({ ok: true });
}
