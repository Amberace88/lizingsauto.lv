import type { MetadataRoute } from 'next';
import { getPublicCars } from '@/lib/data';
import { SITE_URL, carUrl } from '@/lib/format';
import { nameIndex } from '@/lib/namedays-index';
import { allLandings } from '@/lib/landings';
import { ARTICLES } from '@/lib/articles';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cars = await getPublicCars({ includeSold: true });
  const now = new Date();
  const pages = ['', '/katalogs', '/lizings', '/elektroauto', '/kalkulatori', '/garantija', '/parbaudes', '/vardadienas', '/lietoti-auto', '/padomi', '/auto-novertejums', '/pardot-auto', '/pasutit-auto', '/par-mums', '/kontakti', '/privatuma-politika', '/lietosanas-noteikumi'];
  return [
    ...pages.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: p === '' || p === '/katalogs' ? ('daily' as const) : ('monthly' as const), priority: p === '' ? 1 : p === '/katalogs' ? 0.9 : 0.6 })),
    ...cars.map((c) => ({
      url: `${SITE_URL}${carUrl(c)}`,
      lastModified: new Date(c.updated_at),
      changeFrequency: 'weekly' as const,
      priority: c.status === 'sold' ? 0.3 : 0.8,
      images: (c.car_images || []).sort((a, b) => a.sort - b.sort).slice(0, 5).map((i) => i.url),
    })),
    ...allLandings(cars.filter((c) => c.status === 'published')).map((l) => ({ url: `${SITE_URL}/lietoti-auto/${l.slug}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.7 })),
    ...ARTICLES.map((a) => ({ url: `${SITE_URL}/padomi/${a.slug}`, lastModified: new Date(a.date), changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...[...nameIndex().values()].map((e) => ({ url: `${SITE_URL}/vardadienas/${e.slug}`, changeFrequency: 'yearly' as const, priority: e.main ? 0.4 : 0.2 })),
  ];
}
