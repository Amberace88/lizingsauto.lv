import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/supabase/admin-guard';

export async function POST(req: Request) {
  const ctx = await requireAdmin({ api: true });
  if (!ctx) return NextResponse.json({ error: 'Nav piekļuves' }, { status: 401 });
  const { slugs = [] } = (await req.json().catch(() => ({}))) as { slugs?: string[] };
  revalidatePath('/', 'layout');
  for (const s of slugs.slice(0, 50)) if (/^[a-z0-9-]+$/.test(s)) revalidatePath(`/auto/${s}`);
  return NextResponse.json({ ok: true });
}
