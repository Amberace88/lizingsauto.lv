import type { Metadata } from 'next';
import { getRadars } from '@/lib/data';
import { RadarPageView } from '@/components/site/RadarPageView';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Fotoradari Latvijā — karte, vidējā ātruma posmi, mobilie radari',
  description: 'Visi stacionārie fotoradari, vidējā ātruma kontroles posmi un pārvietojamo radaru iespējamās vietas Latvijā vienā kartē. Radari tev apkārt un brīdinājumi braucot — bez maksas.',
  alternates: { canonical: '/fotoradari' },
};

export default async function RadarsPage() {
  const radars = await getRadars();
  return <RadarPageView radars={radars} />;
}
