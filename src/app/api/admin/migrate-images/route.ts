import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireAdmin } from '@/lib/supabase/admin-guard';

export const runtime = 'nodejs';
export const maxDuration = 26;

/** Pārceļ līdz 8 bildēm vienā pieprasījumā no vecās lapas uz Supabase Storage. */
export async function POST() {
  const ctx = await requireAdmin({ developer: true, api: true });
  if (!ctx) return NextResponse.json({ error: 'Tikai izstrādātājam' }, { status: 403 });
  const { supabase } = ctx;
  const { data: batch } = await supabase.from('car_images').select('id,car_id,source_url,url').is('storage_path', null).order('sort').limit(8);
  const errors: string[] = [];
  let done = 0;
  await Promise.all(
    (batch || []).map(async (im) => {
      const src = im.source_url || im.url;
      try {
        const res = await fetch(src, { headers: { 'user-agent': 'LizingsAutoMigrator/1.0' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const input = Buffer.from(await res.arrayBuffer());
        const out = await sharp(input, { failOn: 'none' }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
        const path = `${im.car_id}/${im.id}.webp`;
        const { error: upErr } = await supabase.storage.from('cars').upload(path, out, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' });
        if (upErr) throw upErr;
        const url = supabase.storage.from('cars').getPublicUrl(path).data.publicUrl;
        const { error: dbErr } = await supabase.from('car_images').update({ url, storage_path: path }).eq('id', im.id);
        if (dbErr) throw dbErr;
        done++;
      } catch (e) {
        errors.push(`${src.split('/').slice(-1)[0]}: ${e instanceof Error ? e.message : String(e)}`);
        // Atzīmē kā apstrādātu ar kļūdu, lai cikls neiestrēgst — oriģinālā adrese paliek
        if (/HTTP 404/.test(String(e))) await supabase.from('car_images').update({ storage_path: 'missing' }).eq('id', im.id);
      }
    }),
  );
  const { count } = await supabase.from('car_images').select('id', { count: 'exact', head: true }).is('storage_path', null);
  return NextResponse.json({ done, remaining: count || 0, errors });
}
