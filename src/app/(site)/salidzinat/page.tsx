import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getPublicCars, getSettings } from '@/lib/data';
import { PageHead } from '@/components/site/PageHead';
import { CompareTable } from '@/components/site/CompareTable';

export const metadata: Metadata = { title: 'Salīdzināt auto', robots: { index: false } };

export default async function ComparePage() {
  const [cars, { leasing }] = await Promise.all([getPublicCars({ includeSold: true }), getSettings()]);
  return (
    <>
      <PageHead crumb="Salīdzināt" title="Salīdzini auto blakus" />
      <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6"><Suspense><CompareTable cars={cars} leasing={leasing} /></Suspense></div>
    </>
  );
}
