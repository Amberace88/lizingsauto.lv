import type { MetadataRoute } from 'next';

// Instalējamās lietotnes identitāte (datoram un telefonam). `id` nemainīt — citādi pārlūks to uzskatīs par citu lietotni.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Tavs Auto — lietoti auto ar līzingu',
    short_name: 'Tavs Auto',
    description: 'Pārbaudīti lietoti auto ar līzingu Rīgā — arī ar sabojātu kredītvēsturi. Katalogs, kalkulatori un pieteikumi vienā lietotnē.',
    start_url: '/?source=app',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: '#0c0d0e',
    theme_color: '#111214',
    lang: 'lv',
    dir: 'ltr',
    categories: ['shopping', 'business', 'finance'],
    launch_handler: { client_mode: 'navigate-existing' },
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Auto katalogs', short_name: 'Katalogs', url: '/katalogs', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Navigācija ar radariem', short_name: 'Navigācija', url: '/navigacija', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Kalkulatori', short_name: 'Kalkulatori', url: '/kalkulatori', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Pārdot savu auto', short_name: 'Pārdot', url: '/pardot-auto', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Admin panelis', short_name: 'Admin', url: '/admin', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  } as MetadataRoute.Manifest;
}
