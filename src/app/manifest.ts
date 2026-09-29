import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tavs Auto — lietoti auto ar līzingu',
    short_name: 'Tavs Auto',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f6f5',
    theme_color: '#d91d2b',
    icons: [{ src: '/icon.png', sizes: '192x192', type: 'image/png' }],
  };
}
