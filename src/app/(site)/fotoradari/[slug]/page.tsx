import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRadars } from '@/lib/data';
import { allRadarPages } from '@/lib/radar-pages';
import { RadarPageView } from '@/components/site/RadarPageView';

export const revalidate = 3600;

export async function generateStaticParams() {
  return allRadarPages(await getRadars()).map((p) => ({ slug: p.slug }));
}

async function find(slug: string) {
  const radars = await getRadars();
  return { radars, page: allRadarPages(radars).find((p) => p.slug === slug) };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { page } = await find((await params).slug);
  if (!page) return {};
  return { title: page.title, description: page.lead, alternates: { canonical: `/fotoradari/${page.slug}` } };
}

export default async function RadarSubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { radars, page } = await find((await params).slug);
  if (!page) notFound();
  return <RadarPageView radars={radars} page={page} />;
}
