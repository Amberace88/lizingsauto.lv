import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/archivo/standard.css';
import './globals.css';
import { SITE_URL } from '@/lib/format';
import { THEME_SCRIPT } from '@/components/site/theme-script';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Lietoti auto ar līzingu Rīgā — arī ar sabojātu kredītvēsturi | Tavs Auto',
    template: '%s | Tavs Auto — lizingsauto.lv',
  },
  description:
    'Pārbaudīti lietoti auto no Eiropas ar līzingu no 0% pirmās iemaksas. Līzings arī ar sabojātu kredītvēsturi un ārzemēs strādājošajiem. Garantija līdz 36 mēnešiem. Krustabaznīcas iela 24, Rīga.',
  applicationName: 'Tavs Auto',
  keywords: ['auto līzings', 'lietoti auto', 'līzings ar sabojātu kredītvēsturi', 'auto Rīgā', 'elektroauto EKII', 'auto pārdošana', 'auto uzpirkšana'],
  openGraph: { type: 'website', locale: 'lv_LV', siteName: 'Tavs Auto', url: SITE_URL, images: [{ url: '/og.png?v=2', width: 1200, height: 630, alt: 'Tavs Auto — auto ar līzingu Rīgā' }] },
  twitter: { card: 'summary_large_image', images: ['/og.png?v=2'] },
  alternates: { canonical: '/' },
  robots: /^https:\/\/(www\.)?lizingsauto\.lv$/.test(SITE_URL) ? { index: true, follow: true, 'max-image-preview': 'large' } : { index: false, follow: false },
  formatDetection: { telephone: true },
  other: { 'facebook-domain-verification': '0sgvm029tnl2iu11j66ceo05al635m' },
};

export const viewport: Viewport = {
  themeColor: '#d91d2b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lv" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
