import { cache } from 'react';
import { supabasePublic } from './supabase/public';
import type { Car, CompanySettings, LeasingSettings } from './types';
import { DEFAULT_LEASING } from './leasing';
import { DEFAULT_EKII, type EkiiSettings } from './ekii';
import { DEFAULT_WARRANTY, type WarrantySettings } from './warranty';
import { normalizeBadgeStyle } from './format';

export const DEFAULT_COMPANY: CompanySettings = {
  name: 'SIA AC Industry',
  brand: 'Tavs Auto',
  regNr: '40203125692',
  legalAddress: 'Kvēles iela 23-64, Rīga, LV-1024',
  address: 'Krustabaznīcas iela 24, Rīga, LV-1026',
  phone: '+371 23776197',
  email: 'lizingsauto@gmail.com',
  whatsapp: '37123776197',
  facebook: 'https://www.facebook.com/lizingsauto.lv/',
  instagram: 'https://www.instagram.com/lizingsauto.lv',
  hours: { weekdays: '9:00–18:00', saturday: '10:00–15:00', sunday: 'Pēc vienošanās' },
};

// Publiski drīkst lasīt tikai šīs kolonnas (arī DB līmenī — skat. 002 migrāciju)
export const PUBLIC_CAR_COLUMNS =
  'id,slug,legacy_slug,status,title,make,model,year,first_registration,fuel,engine_volume,power_kw,battery_kwh,range_km,body_type,transmission,drive,mileage,color,doors,seats,vin,ta_until,euro_class,co2,consumption,price,old_price,vat_included,vat_deductible,description,equipment,badges,featured,sort,views,video_url,odometer_history,csdd_checked_at,created_at,updated_at,published_at,sold_at';
const CAR_FIELDS = `${PUBLIC_CAR_COLUMNS}, car_images(id,url,sort,car_id,is_promo)`;

export const getSettings = cache(async () => {
  const { data } = await supabasePublic.from('settings').select('key,value').in('key', ['leasing', 'company', 'content', 'ekii', 'warranty', 'badges']);
  const map = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  return {
    leasing: { ...DEFAULT_LEASING, ...(map.leasing || {}) } as LeasingSettings,
    company: { ...DEFAULT_COMPANY, ...(map.company || {}) } as CompanySettings,
    content: (map.content || {}) as Record<string, string>,
    ekii: { ...DEFAULT_EKII, ...(map.ekii || {}) } as EkiiSettings,
    badgeStyle: normalizeBadgeStyle(map.badges),
    warranty: { ...DEFAULT_WARRANTY, ...(map.warranty || {}), prices: { ...DEFAULT_WARRANTY.prices, ...((map.warranty || {}).prices || {}) } } as WarrantySettings,
  };
});

/** Visi publiski redzamie auto (pārdošanā + rezervēti; pārdotie pēc izvēles). */
export const getPublicCars = cache(async (opts: { includeSold?: boolean } = {}) => {
  const statuses = opts.includeSold ? ['published', 'reserved', 'sold'] : ['published', 'reserved'];
  const { data, error } = await supabasePublic
    .from('cars')
    .select(CAR_FIELDS)
    .in('status', statuses)
    .order('status', { ascending: true })
    .order('sort', { ascending: true })
    .order('published_at', { ascending: false, nullsFirst: false });
  if (error) console.error('getPublicCars', error.message);
  const cars = (data || []) as Car[];
  // Pārdošanā vispirms, tad rezervētie, tad pārdotie
  const rank: Record<string, number> = { published: 0, reserved: 1, sold: 2 };
  return cars.sort((a, b) => rank[a.status] - rank[b.status] || a.sort - b.sort);
});

export const getCarBySlug = cache(async (slug: string) => {
  const { data } = await supabasePublic.from('cars').select(CAR_FIELDS).eq('slug', slug).in('status', ['published', 'reserved', 'sold']).maybeSingle();
  if (data) return data as Car;
  const { data: legacy } = await supabasePublic.from('cars').select(CAR_FIELDS).eq('legacy_slug', slug).in('status', ['published', 'reserved', 'sold']).maybeSingle();
  return (legacy as Car) || null;
});

export function similarCars(all: Car[], car: Car, n = 4) {
  return all
    .filter((c) => c.id !== car.id && c.status !== 'sold')
    .map((c) => {
      let score = 0;
      if (c.body_type === car.body_type) score += 3;
      if (c.make === car.make) score += 2;
      if (c.fuel === car.fuel) score += 2;
      score -= Math.abs(c.price - car.price) / Math.max(car.price, 1) * 4;
      return { c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.c);
}
