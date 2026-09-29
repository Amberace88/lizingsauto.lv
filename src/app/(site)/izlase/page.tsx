import type { Metadata } from 'next';
import { getPublicCars, getSettings } from '@/lib/data';
import { PageHead } from '@/components/site/PageHead';
import { FavoritesList } from '@/components/site/FavoritesList';

export const metadata: Metadata = { title: 'Mana izlase', robots: { index: false } };

export default async function FavPage() {
  const [cars, { leasing }] = await Promise.all([getPublicCars({ includeSold: true }), getSettings()]);
  return (
    <>
      <PageHead crumb="Izlase" title="Mana izlase" lead="Saglabātie auto glabājas tavā pārlūkā." />
      <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6"><FavoritesList cars={cars} leasing={leasing} /></div>
    </>
  );
}
