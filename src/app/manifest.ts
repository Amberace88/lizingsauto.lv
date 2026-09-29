import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LīzingsAuto — lietoti auto ar līzingu',
    short_name: 'LīzingsAuto',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f6f5',
    theme_color: '#0f5a63',
    icons: [{ src: '/logo-mark.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
