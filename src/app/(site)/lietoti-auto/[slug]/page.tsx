import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { getPublicCars, getSettings } from '@/lib/data';
import { allLandings, catalogHref, matchCar } from '@/lib/landings';
import { SITE_URL, carName, carUrl, money } from '@/lib/format';
import { fromPayment } from '@/lib/leasing';
import { CarCard } from '@/components/site/CarCard';
import { Faq } from '@/components/site/Faq';
import { SearchAlert } from '@/components/site/SearchAlert';

export const revalidate = 300;

async function load(slug: string) {
  const cars = await getPublicCars();
  const landing = allLandings(cars).find((l) => l.slug === slug);
  return { cars, landing };
}

export async function generateStaticParams() {
  const cars = await getPublicCars();
  return allLandings(cars).map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { cars, landing } = await load(slug);
  if (!landing) return { title: 'Lapa nav atrasta', robots: { index: false } };
  const n = cars.filter((c) => c.status === 'published' && matchCar(c, landing.criteria)).length;
  return {
    title: landing.title,
    description: `${landing.lead} Šobrīd pārdošanā: ${n} auto.`,
    alternates: { canonical: `/lietoti-auto/${slug}` },
  };
}

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { cars, landing } = await load(slug);
  if (!landing) notFound();
  const { leasing } = await getSettings();
  const list = cars.filter((c) => c.status !== 'sold' && matchCar(c, landing.criteria));
  const avail = list.filter((c) => c.status === 'published');
  const minPrice = avail.length ? Math.min(...avail.map((c) => c.price)) : null;
  const minMonthly = minPrice ? fromPayment(minPrice, leasing) : null;
  const related = allLandings(cars).filter((l) => l.slug !== slug && (l.group === landing.group || l.group === 'budget')).slice(0, 10);
  const faq: [string, string][] = [
    ['Vai šos auto var iegādāties līzingā?', `Jā. Visiem auto piedāvājam līzingu — arī ar 0% pirmo iemaksu, ar sabojātu kredītvēsturi un strādājot ārzemēs.${minMonthly ? ` Mēneša maksājums šajā sadaļā sākas no ${minMonthly} €.` : ''}`],
    ['Vai var atstāt savu veco auto kā pirmo iemaksu?', 'Jā. Novērtējam tavu auto bez maksas un tā vērtību ieskaitām kā pirmo iemaksu vai atpērkam uzreiz.'],
    ['Vai auto var pārbaudīt pirms pirkuma?', 'Protams. Piedāvājam testa braucienu un iespēju pārbaudīt auto servisā pēc tavas izvēles. Katra auto lapā ir arī CSDD nobraukuma vēsture, ja tā pievienota.'],
    ['Ko darīt, ja vajadzīgā auto nav?', 'Saglabā meklējumu — paziņosim, tiklīdz ienāks piemērots auto. Varam arī pasūtīt konkrētu auto no Eiropas.'],
  ];
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: landing.h1,
    numberOfItems: avail.length,
    itemListElement: avail.slice(0, 20).map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}${carUrl(c)}`, name: `${carName(c)} ${c.year ?? ''}`.trim() })),
  };
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <nav className="text-sm text-mute"><Link href="/" className="hover:text-ink">Sākums</Link> / <Link href="/lietoti-auto" className="hover:text-ink">Lietoti auto</Link> / {landing.h1}</nav>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <h1 className="display text-4xl text-ink sm:text-[3.2rem]">{landing.h1}</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-2">{landing.lead}</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-2xl border border-line bg-card px-5 py-3"><p className="text-xs text-mute">Pārdošanā</p><p className="num display-md text-2xl text-ink">{avail.length}</p></div>
          {minPrice && <div className="rounded-2xl border border-line bg-card px-5 py-3"><p className="text-xs text-mute">Cena no</p><p className="num display-md text-2xl text-ink">{money(minPrice)}</p></div>}
          {minMonthly && <div className="rounded-2xl bg-signal px-5 py-3 text-white"><p className="text-xs text-white/80">Līzingā no</p><p className="num display-md text-2xl">{minMonthly} €/mēn.</p></div>}
        </div>
      </div>

      {list.length > 0 ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((c, i) => <CarCard key={c.id} car={c} leasing={leasing} priority={i < 4} />)}
        </div>
      ) : (
        <p className="mt-10 rounded-2xl bg-card p-8 text-center text-ink-2">Šobrīd šajā sadaļā auto nav — saglabā meklējumu zemāk, un paziņosim pirmajam.</p>
      )}
      <div className="mt-6"><Link href={catalogHref(landing.criteria)} className="btn btn-ghost"><SlidersHorizontal className="h-4 w-4" /> Precizēt filtrus katalogā</Link></div>

      <div className="mt-12"><SearchAlert criteria={landing.criteria} /></div>

      <section className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <h2 className="display-md text-3xl text-ink">Biežāk uzdotie jautājumi</h2>
        <Faq items={faq} />
      </section>

      <section className="mt-16">
        <h2 className="display-md text-2xl text-ink">Skaties arī</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {related.map((l) => <Link key={l.slug} href={`/lietoti-auto/${l.slug}`} className="inline-flex items-center gap-1 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-ink-2 hover:border-signal hover:text-signal">{l.h1} <ArrowRight className="h-3.5 w-3.5" /></Link>)}
        </div>
      </section>
    </div>
  );
}
