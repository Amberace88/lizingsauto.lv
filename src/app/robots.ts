import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/format';

export default function robots(): MetadataRoute.Robots {
  // Testa vidē (netlify.app) meklētājiem neindeksēt, lai nekonkurētu ar īsto domēnu
  const production = /^https:\/\/(www\.)?lizingsauto\.lv$/.test(SITE_URL);
  if (!production) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/izlase', '/salidzinat'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
