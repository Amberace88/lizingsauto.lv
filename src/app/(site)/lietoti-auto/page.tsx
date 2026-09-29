import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getPublicCars } from '@/lib/data';
import { allLandings, matchCar } from '@/lib/landings';
import { PageHead } from '@/components/site/PageHead';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Lietoti auto pēc budžeta, virsbūves un markas',
  description: 'Atrodi lietotu auto ar līzingu pēc sava budžeta, virsbūves, degvielas vai markas. Pārbaudīti auto Rīgā, līzings arī ar sabojātu kredītvēsturi.',
  alternates: { canonical: '/lietoti-auto' },
};

const GROUPS = { budget: 'Pēc budžeta', body: 'Pēc virsbūves', fuel: 'Pēc degvielas', feature: 'Pēc īpašībām', make: 'Pēc markas' } as const;

export default async function LandingIndex() {
  const cars = (await getPublicCars()).filter((c) => c.status === 'published');
  const all = allLandings(cars);
  return (
    <>
      <PageHead crumb="Lietoti auto" title="Lietoti auto — atrodi savu ātrāk" lead="Izvēlies pēc budžeta, virsbūves, degvielas vai markas. Katrā sadaļā redzams auto skaits un mēneša maksājums līzingā." />
      <div className="mx-auto max-w-7xl space-y-10 px-4 pt-10 sm:px-6">
        {(Object.keys(GROUPS) as (keyof typeof GROUPS)[]).map((g) => (
          <section key={g}>
            <h2 className="display-md text-2xl text-ink">{GROUPS[g]}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {all.filter((l) => l.group === g).map((l) => {
                const n = cars.filter((c) => matchCar(c, l.criteria)).length;
                return (
                  <Link key={l.slug} href={`/lietoti-auto/${l.slug}`} className="group flex items-center justify-between rounded-2xl border border-line bg-card p-4 transition hover:-translate-y-0.5 hover:border-signal">
                    <span className="font-semibold text-ink">{l.h1}</span>
                    <span className="flex items-center gap-2"><span className="num rounded-full bg-paper px-2.5 py-0.5 text-xs font-bold text-ink-2">{n}</span><ArrowRight className="h-4 w-4 text-mute transition group-hover:translate-x-0.5 group-hover:text-signal" /></span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
