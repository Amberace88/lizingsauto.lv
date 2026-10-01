import type { MetadataRoute } from 'next';
import { IS_LIVE_DOMAIN, SITE_URL } from '@/lib/format';

export default function robots(): MetadataRoute.Robots {
  // Testa vidē (netlify.app) meklētājiem neindeksēt, lai nekonkurētu ar īsto domēnu
  const production = IS_LIVE_DOMAIN;
  if (!production) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/izlase', '/salidzinat'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
