import type { NextConfig } from 'next';

const SUPABASE = 'https://kxnzcwnvtvxrgxkfhbtu.supabase.co';

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://lizingsauto.lv ${SUPABASE}`,
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE} wss://kxnzcwnvtvxrgxkfhbtu.supabase.co`,
  'frame-src https://maps.google.com https://www.google.com',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      { source: '/admin/(.*)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }, { key: 'Cache-Control', value: 'no-store' }] },
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
