'use client';
import Link from 'next/link';
import type { Car, LeasingSettings } from '@/lib/types';
import { useFavorites } from './favorites';
import { CarCard } from './CarCard';

export function FavoritesList({ cars, leasing }: { cars: Car[]; leasing: LeasingSettings }) {
  const { ids } = useFavorites();
  const list = cars.filter((c) => ids.includes(c.id));
  if (list.length === 0)
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center">
        <p className="font-semibold">Izlase ir tukša.</p>
        <p className="mt-1 text-sm text-ink-2">Spied sirsniņu uz auto kartiņas, lai to saglabātu šeit.</p>
        <Link href="/katalogs" className="btn btn-primary mt-5">Uz katalogu</Link>
      </div>
    );
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{list.map((c) => <CarCard key={c.id} car={c} leasing={leasing} />)}</div>;
}
