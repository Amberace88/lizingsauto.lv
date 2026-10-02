import type { NextConfig } from 'next';

const SUPABASE = 'https://kxnzcwnvtvxrgxkfhbtu.supabase.co';

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://tile.openstreetmap.org https://lizingsauto.lv ${SUPABASE} https://www.google-analytics.com https://www.googletagmanager.com https://www.facebook.com`,
  "font-src 'self' data:",
  `connect-src 'self' https://nominatim.openstreetmap.org ${SUPABASE} wss://kxnzcwnvtvxrgxkfhbtu.supabase.co https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net`,
  'frame-src https://maps.google.com https://www.google.com',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // netlify.toml build vides mainīgie funkcijām izpildes laikā nav pieejami — iebūvējam tos būvēšanas laikā
  env: { MAIL_FROM: process.env.MAIL_FROM || '' },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lizingsauto.lv', pathname: '/wp-content/uploads/**' },
      { protocol: 'https', hostname: 'kxnzcwnvtvxrgxkfhbtu.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      { source: '/admin/(.*)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }, { key: 'Cache-Control', value: 'no-store' }] },
      // netlify.app adrese paliek pieejama, bet meklētājiem tikai galvenais domēns
      { source: '/(.*)', has: [{ type: 'host', value: 'lizingsauto.netlify.app' }], headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'Service-Worker-Allowed', value: '/' }] },
      { source: '/icons/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] },
      { source: '/api/(.*)', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
    ];
  },
  async redirects() {
    // Vecās WordPress lapas adreses → jaunās (SEO saglabāšanai)
    return [
      { source: '/cars/:slug', destination: '/auto/:slug', permanent: true },
      { source: '/cars/:slug/', destination: '/auto/:slug', permanent: true },
      { source: '/catalog', destination: '/katalogs', permanent: true },
      { source: '/catalog/:path*', destination: '/katalogs', permanent: true },
      { source: '/auto-lizings', destination: '/lizings', permanent: true },
      { source: '/ka-pardot-savu-auto', destination: '/pardot-auto', permanent: true },
      { source: '/ka-nopirkt-auto', destination: '/lizings', permanent: true },
      { source: '/contact', destination: '/kontakti', permanent: true },
      { source: '/noderiga-informacija', destination: '/kalkulatori', permanent: true },
      { source: '/wp-admin', destination: '/admin', permanent: false },
      { source: '/wp-login.php', destination: '/admin/login', permanent: false },
    ];
  },
  trailingSlash: false,
};

export default nextConfig;
