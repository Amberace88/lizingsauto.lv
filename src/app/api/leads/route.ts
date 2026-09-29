import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabasePublic } from '@/lib/supabase/public';

const schema = z.object({
  type: z.enum(['leasing', 'contact', 'sell_car', 'test_drive', 'reserve', 'car_order', 'trade_in', 'warranty']),
  car_id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(40).regex(/^[+0-9 ()-]+$/, 'Nederīgs tālrunis'),
  email: z.string().trim().max(160).email().optional().or(z.literal('')),
  message: z.string().trim().max(3000).optional().or(z.literal('')),
  website: z.string().max(0).optional().or(z.literal('')), // honeypot
  data: z.record(z.string(), z.unknown()).optional(),
});

// Vienkāršs ātruma ierobežojums vienai funkcijas instancei
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 8;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  if (limited(ip)) return NextResponse.json({ error: 'Pārāk daudz pieteikumu. Lūdzu, mēģini vēlāk vai zvani.' }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Nederīgs pieprasījums' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const msg: Record<string, string> = { name: 'Lūdzu, ieraksti vārdu.', phone: 'Lūdzu, ieraksti derīgu tālruņa numuru.', email: 'Lūdzu, pārbaudi e-pasta adresi.' };
    return NextResponse.json({ error: msg[String(field)] || 'Lūdzu, pārbaudi aizpildītos laukus.' }, { status: 400 });
  }
  const d = parsed.data;
  if (d.website) return NextResponse.json({ ok: true }); // robots

  // Tikai vienkāršas vērtības no papildu laukiem
  const data: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(d.data || {}).slice(0, 30)) {
    if (['string', 'number', 'boolean'].includes(typeof v)) data[k.slice(0, 40)] = typeof v === 'string' ? v.slice(0, 500) : (v as number | boolean);
  }
  data.ip_hash = await hashIp(ip);

  const { error } = await supabasePublic.from('leads').insert({
    type: d.type,
    car_id: d.car_id || null,
    name: d.name,
    phone: d.phone,
    email: d.email || null,
    message: d.message || null,
    data,
  });
  if (error) {
    console.error('lead insert', error.message);
    return NextResponse.json({ error: 'Neizdevās saglabāt. Lūdzu, zvani mums.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

async function hashIp(ip: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`la:${ip}`));
  return Array.from(new Uint8Array(buf)).slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}
