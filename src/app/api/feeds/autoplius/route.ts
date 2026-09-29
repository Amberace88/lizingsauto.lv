import { supabasePublic } from '@/lib/supabase/public';
import { PUBLIC_CAR_COLUMNS } from '@/lib/data';
import type { Car } from '@/lib/types';
import { AP_BODY, AP_DRIVE, AP_FUEL, AP_GEAR, apColor, carMakeDate, resolveMakeModel, xmlEscape } from '@/lib/autoplius';
import { SITE_URL } from '@/lib/format';

export const revalidate = 900;

/** Autoplius.lt XML importa plūsma (https://autoplius.lt/imports). */
export async function GET(req: Request) {
  const key = process.env.FEED_KEY;
  if (key && new URL(req.url).searchParams.get('key') !== key) return new Response('Forbidden', { status: 403 });
  const [{ data: ids }, { data: cfg }] = await Promise.all([supabasePublic.rpc('portal_feed_car_ids', { p: 'autoplius' }), supabasePublic.rpc('portal_feed_config')]);
  const idList = ((ids as string[]) || []).map((x) => (typeof x === 'string' ? x : (x as { portal_feed_car_ids: string }).portal_feed_car_ids));
  const conf = ((cfg as Record<string, Record<string, string>>) || {}).autoplius || {};
  let cars: Car[] = [];
  if (idList.length) {
    const { data } = await supabasePublic.from('cars').select(`${PUBLIC_CAR_COLUMNS}, car_images(url,sort,is_promo)`).in('id', idList);
    cars = (data as Car[]) || [];
  }
  const parts: string[] = [];
  for (const c of cars) {
    let mm: { makeId: string | null; modelId: string | null } = { makeId: null, modelId: null };
    try {
      mm = await resolveMakeModel(c.make, c.model);
    } catch {}
    if (!mm.makeId) continue;
    const photos = [...(c.car_images || [])].filter((i) => !i.is_promo).sort((a, b) => a.sort - b.sort).slice(0, 40).map((i) => `<photo>${xmlEscape(i.url)}</photo>`).join('');
    const desc = [c.title, '', c.description || '', '', (c.equipment || []).map((e) => `- ${e}`).join('\n'), '', `Automobilis Rygoje, Latvijoje. Lizingas visiems. ${SITE_URL}/auto/${c.slug}`].join('\n');
    parts.push(`<cars>
<external_id>${c.id}</external_id>
<make_id>${mm.makeId}</make_id>
${mm.modelId ? `<model_id>${mm.modelId}</model_id>` : ''}
<sell_price>${c.price}</sell_price>
<body_type_id>${AP_BODY[c.body_type || ''] ?? 8}</body_type_id>
<fuel_id>${AP_FUEL[c.fuel || ''] ?? 33}</fuel_id>
<gearbox_id>${AP_GEAR[c.transmission || ''] ?? 38}</gearbox_id>
<color_id>${apColor(c.color)}</color_id>
<number_of_doors_id>${c.doors && c.doors <= 3 ? 126 : 127}</number_of_doors_id>
<make_date>${carMakeDate(c)}</make_date>
<has_damaged_id>10924</has_damaged_id>
<steering_wheel_id>10922</steering_wheel_id>
${c.drive ? `<wheel_drive_id>${AP_DRIVE[c.drive]}</wheel_drive_id>` : ''}
${c.mileage != null ? `<kilometrage>${c.mileage}</kilometrage>` : ''}
${c.power_kw ? `<power>${c.power_kw}</power>` : ''}
${c.vin ? `<vin>${xmlEscape(c.vin)}</vin>` : ''}
<fk_place_countries_id>2</fk_place_countries_id>
<fk_place_cities_id>${conf.cityId || 161}</fk_place_cities_id>
<car_not_in_lithuania>1</car_not_in_lithuania>
${conf.contactId ? `<contact_id>${xmlEscape(String(conf.contactId))}</contact_id>` : ''}
<contacts_phone>${xmlEscape(conf.phone || '+37123776197')}</contacts_phone>
${c.vat_included ? '<price_vat_applicable>1</price_vat_applicable>' : ''}
<product_url>${SITE_URL}/auto/${c.slug}</product_url>
${c.status === 'reserved' ? '<reservation>1</reservation>' : ''}
<comments>${xmlEscape(desc)}</comments>
<photos>${photos}</photos>
</cars>`.replace(/\n{2,}/g, '\n'));
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<autoplius><announcements>\n${parts.join('\n')}\n</announcements></autoplius>`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=900' } });
}
