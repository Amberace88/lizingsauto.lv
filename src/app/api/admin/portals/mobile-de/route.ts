import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireAdmin } from '@/lib/supabase/admin-guard';
import type { Car } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 26;

const API = 'https://services.mobile.de';
const MT = 'application/vnd.de.mobile.api+json';
const CATEGORY: Record<string, string> = { sedan: 'Limousine', wagon: 'EstateCar', suv: 'OffRoad', hatchback: 'SmallCar', coupe: 'SportsCar', convertible: 'Cabrio', minivan: 'Van', van: 'Van', pickup: 'OffRoad' };
const FUEL: Record<string, string> = { petrol: 'PETROL', diesel: 'DIESEL', electric: 'ELECTRICITY', hybrid: 'HYBRID', plugin_hybrid: 'HYBRID', lpg: 'LPG', cng: 'CNG' };
const GEAR: Record<string, string> = { automatic: 'AUTOMATIC_GEAR', manual: 'MANUAL_GEAR' };
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

async function refKey(path: string, want: string) {
  const r = await fetch(`${API}/refdata/${path}`, { headers: { accept: MT, 'accept-language': 'en' }, next: { revalidate: 86400 } });
  if (!r.ok) return null;
  const j = (await r.json()) as { values?: { name: string; description: string }[] };
  const w = norm(want);
  const vals = j.values || [];
  return (
    vals.find((v) => norm(v.description) === w || norm(v.name) === w)?.name ||
    vals.filter((v) => w.startsWith(norm(v.description))).sort((a, b) => b.description.length - a.description.length)[0]?.name ||
    null
  );
}

export async function POST(req: Request) {
  const ctx = await requireAdmin({ api: true });
  if (!ctx) return NextResponse.json({ error: 'Nav piekļuves' }, { status: 401 });
  const { supabase } = ctx;
  const user = process.env.MOBILE_DE_USER;
  const pass = process.env.MOBILE_DE_PASSWORD;
  const { carId, action } = (await req.json().catch(() => ({}))) as { carId?: string; action?: 'publish' | 'delete' };
  if (!carId) return NextResponse.json({ error: 'Nav norādīts auto' }, { status: 400 });

  const fail = async (msg: string, status = 400) => {
    await supabase.from('portal_listings').upsert({ car_id: carId, portal: 'mobile_de', enabled: true, status: 'error', last_error: msg, last_sync_at: new Date().toISOString() }, { onConflict: 'car_id,portal' });
    return NextResponse.json({ error: msg }, { status });
  };
  if (!user || !pass) return fail('Mobile.de nav pieslēgts: nepieciešams tirgotāja konts un Seller API piekļuve (izstrādātājs pievieno servera iestatījumos).');

  const { data: cfg } = await supabase.from('settings').select('value').eq('key', 'portals').maybeSingle();
  const sellerId = (cfg?.value as { mobile_de?: { sellerId?: string } })?.mobile_de?.sellerId;
  if (!sellerId) return fail('Nav norādīts mobile.de pārdevēja ID (Iestatījumi → Portālu integrācijas).');
  const auth = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  const { data: listing } = await supabase.from('portal_listings').select('*').eq('car_id', carId).eq('portal', 'mobile_de').maybeSingle();

  if (action === 'delete') {
    if (listing?.external_id) {
      const r = await fetch(`${API}/seller-api/sellers/${sellerId}/ads/${listing.external_id}`, { method: 'DELETE', headers: { authorization: auth } });
      if (!r.ok && r.status !== 404) return fail(`Dzēšana neizdevās (${r.status})`);
    }
    await supabase.from('portal_listings').update({ status: 'removed', external_id: null, external_url: null, last_error: null, last_sync_at: new Date().toISOString() }).eq('car_id', carId).eq('portal', 'mobile_de');
    return NextResponse.json({ ok: true });
  }

  const { data: car } = await supabase.from('cars').select('*, car_images(url,sort)').eq('id', carId).single<Car>();
  if (!car) return fail('Auto nav atrasts', 404);

  const make = await refKey('classes/Car/makes', car.make);
  if (!make) return fail(`Marka “${car.make}” nav atrasta mobile.de klasifikatorā`);
  const model = (await refKey(`classes/Car/makes/${make}/models`, car.model)) || 'OTHER';

  // Bildes: mobile.de pieņem JPEG kā bināru failu
  const images: { ref: string; hash?: string }[] = [];
  for (const im of [...(car.car_images || [])].sort((a, b) => a.sort - b.sort).slice(0, 20)) {
    try {
      const src = Buffer.from(await (await fetch(im.url)).arrayBuffer());
      const jpg = await sharp(src).jpeg({ quality: 85 }).toBuffer();
      const up = await fetch(`${API}/seller-api/images`, { method: 'POST', headers: { authorization: auth, 'content-type': 'image/jpeg', accept: MT }, body: new Uint8Array(jpg) });
      if (up.ok) images.push(await up.json());
    } catch {}
  }

  const ad = {
    mobileSellerId: sellerId,
    vehicleClass: 'Car',
    category: CATEGORY[car.body_type || ''] || 'OtherCar',
    make,
    model,
    modelDescription: `${car.make} ${car.model}`.slice(0, 48),
    condition: 'USED',
    firstRegistration: car.first_registration ? car.first_registration.slice(0, 7).replace('-', '') : car.year ? `${car.year}01` : undefined,
    mileage: car.mileage ?? undefined,
    power: car.power_kw ?? undefined,
    fuel: car.fuel ? FUEL[car.fuel] : undefined,
    gearbox: car.transmission ? GEAR[car.transmission] : undefined,
    damageUnrepaired: false,
    description: [car.title, car.description, (car.equipment || []).join(', ')].filter(Boolean).join('\n\n').slice(0, 3000),
    images,
    price: { consumerPriceGross: car.price.toFixed(2), currency: 'EUR', type: 'FIXED', ...(car.vat_included ? { vatRate: '21.00' } : {}) },
    internalNumber: car.id.slice(0, 20),
  };

  const existing = listing?.external_id;
  const url = existing ? `${API}/seller-api/sellers/${sellerId}/ads/${existing}` : `${API}/seller-api/sellers/${sellerId}/ads`;
  const r = await fetch(url, { method: existing ? 'PUT' : 'POST', headers: { authorization: auth, 'content-type': MT, accept: MT }, body: JSON.stringify(ad) });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    return fail(`mobile.de atbilde ${r.status}: ${t.slice(0, 300)}`);
  }
  const adId = existing || r.headers.get('location')?.split('/').pop() || null;
  await supabase.from('portal_listings').upsert(
    { car_id: carId, portal: 'mobile_de', enabled: true, status: 'published', external_id: adId, external_url: adId ? `https://suchen.mobile.de/fahrzeuge/details.html?id=${adId}` : null, last_error: null, last_payload: { make, model, images: images.length }, last_sync_at: new Date().toISOString() },
    { onConflict: 'car_id,portal' },
  );
  return NextResponse.json({ ok: true, adId });
}
