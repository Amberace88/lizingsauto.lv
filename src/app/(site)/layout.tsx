import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { FloatingContact } from '@/components/site/FloatingContact';
import { CompareBar } from '@/components/site/CompareBar';
import { getSettings } from '@/lib/data';
import { BadgeStyleProvider } from '@/components/site/BadgeOrderContext';
import { AdminLiveProvider } from '@/components/site/AdminLive';
import { NameDayBar } from '@/components/site/NameDays';
import { SITE_URL } from '@/lib/format';

export const revalidate = 60;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { company, content, badgeStyle } = await getSettings();
  const org = {
    '@context': 'https://schema.org',
    '@type': 'AutoDealer',
    '@id': `${SITE_URL}/#dealer`,
    name: company.brand,
    legalName: company.name,
    url: SITE_URL,
    logo: `${SITE_URL}/logo-tavs-auto.png`,
    image: `${SITE_URL}/og.png`,
    telephone: company.phone,
    email: company.email,
    vatID: `LV${company.regNr}`,
    address: { '@type': 'PostalAddress', streetAddress: 'Krustabaznīcas iela 24', addressLocality: 'Rīga', postalCode: 'LV-1026', addressCountry: 'LV' },
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '18:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '10:00', closes: '15:00' },
    ],
    sameAs: [company.facebook, company.instagram],
    areaServed: 'LV',
  };
  return (
    <BadgeStyleProvider value={badgeStyle}>
    <AdminLiveProvider>
    <div className="site min-h-dvh">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
      {content.announcement ? (
        <div className="bg-petrol px-4 py-2 text-center text-sm font-medium text-white">{content.announcement}</div>
      ) : null}
      <NameDayBar />
      <Header phone={company.phone} />
      <main id="saturs">{children}</main>
      <Footer company={company} />
      <FloatingContact phone={company.phone} whatsapp={company.whatsapp} />
      <CompareBar />
    </div>
    </AdminLiveProvider>
    </BadgeStyleProvider>
  );
}
