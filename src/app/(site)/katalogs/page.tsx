import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { getPublicCars, getSettings } from '@/lib/data';
import { Catalog } from '@/components/site/Catalog';
import { carName, carUrl, money } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Lietoti auto pārdošanā ar līzingu — auto katalogs',
  description: 'Visi pārdošanā esošie lietotie auto Rīgā ar līzinga iespējām: elektroauto, apvidus auto, universāļi, mikroautobusi. Filtrē pēc cenas, mēneša maksājuma, gada un nobraukuma.',
  alternates: { canonical: '/katalogs' },
};

export default async function CatalogPage() {
  const [cars, { leasing }] = await Promise.all([getPublicCars({ includeSold: true }), getSettings()]);
  const list = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: cars.filter((c) => c.status !== 'sold').map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `https://lizingsauto.lv${carUrl(c)}`, name: carName(c) })),
  };
  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(list) }} />
      <nav className="text-sm text-mute" aria-label="Navigācijas ceļš"><Link href="/" className="hover:text-ink">Sākums</Link> / Auto katalogs</nav>
      <h1 className="display mt-3 text-4xl text-ink sm:text-5xl">Auto katalogs</h1>
      <p className="mt-3 max-w-2xl text-ink-2">Katram auto redzams orientējošs mēneša maksājums. Filtrē pēc sava budžeta — pārējo nokārtosim mēs.</p>
      <div className="mt-8">
        <Suspense fallback={<StaticList cars={cars} />}>
          <Catalog cars={cars} leasing={leasing} />
        </Suspense>
      </div>
    </div>
  );
}

/** Rezerves saraksts meklētājiem / bez JS */
function StaticList({ cars }: { cars: Awaited<ReturnType<typeof getPublicCars>> }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {cars.filter((c) => c.status !== 'sold').map((c) => (
        <li key={c.id}><Link href={carUrl(c)} className="text-petrol hover:underline">{carName(c)} {c.year} — {money(c.price)}</Link></li>
      ))}
    </ul>
  );
}
