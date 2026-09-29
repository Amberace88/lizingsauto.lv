import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/archivo/standard.css';
import './globals.css';
import { SITE_URL } from '@/lib/format';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Lietoti auto ar līzingu Rīgā — arī ar sabojātu kredītvēsturi | LīzingsAuto',
    template: '%s | LīzingsAuto',
  },
  description:
    'Pārbaudīti lietoti auto no Eiropas ar līzingu no 0% pirmās iemaksas. Līzings arī ar sabojātu kredītvēsturi un ārzemēs strādājošajiem. Garantija līdz 36 mēnešiem. Krustabaznīcas iela 24, Rīga.',
  applicationName: 'LīzingsAuto',
  keywords: ['auto līzings', 'lietoti auto', 'līzings ar sabojātu kredītvēsturi', 'auto Rīgā', 'elektroauto EKII', 'auto pārdošana', 'auto uzpirkšana'],
  openGraph: { type: 'website', locale: 'lv_LV', siteName: 'LīzingsAuto', url: SITE_URL },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/' },
  robots: /^https:\/\/(www\.)?lizingsauto\.lv$/.test(SITE_URL) ? { index: true, follow: true, 'max-image-preview': 'large' } : { index: false, follow: false },
  formatDetection: { telephone: true },
  other: { 'facebook-domain-verification': '0sgvm029tnl2iu11j66ceo05al635m' },
};

export const viewport: Viewport = {
  themeColor: '#0f5a63',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lv">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
