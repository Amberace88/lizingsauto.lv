import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

const attempts = new Map<string, number[]>();

/** Pirmā pieslēgšanās / aizmirsta parole: nosūta pieslēgšanās saiti uz admina e-pastu. */
export async function POST(req: Request) {
  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'x';
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < 60 * 60_000);
  if (list.length >= 5) return NextResponse.json({ error: 'Pārāk daudz pieprasījumu. Mēģini vēlāk.' }, { status: 429 });
  list.push(now);
  attempts.set(ip, list);

  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const ok = NextResponse.json({ ok: true, message: 'Ja šāds admin ID eksistē, uz tā e-pastu nosūtīta pieslēgšanās saite.' });
  if (!code) return ok;
  const supabase = await supabaseServer();
  const input = code.trim();
  let email = input.includes('@') ? input : null;
  if (!email) {
    const { data } = await supabase.rpc('admin_login_email', { code: input });
    email = (data as string | null) || null;
  }
  if (!email) return ok;
  const origin = new URL(req.url).origin;
  await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: `${origin}/admin/auth/callback?next=/admin/profils` } });
  return ok;
}
