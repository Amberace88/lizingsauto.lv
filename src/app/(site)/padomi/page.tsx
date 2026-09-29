import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { PageHead } from '@/components/site/PageHead';
import { ARTICLES } from '@/lib/articles';

export const metadata: Metadata = {
  title: 'Padomi auto pircējiem — līzings, EKII, lietota auto pārbaude',
  description: 'Praktiski padomi: kā pārbaudīt lietotu auto, kā saņemt EKII atbalstu elektroauto iegādei, līzings ar sabojātu kredītvēsturi un strādājot ārzemēs.',
  alternates: { canonical: '/padomi' },
};

export default function Articles() {
  const [first, ...rest] = ARTICLES;
  return (
    <>
      <PageHead crumb="Padomi" title="Padomi auto pircējiem" lead="Īsi un praktiski — lai auto iegāde būtu droša, izdevīga un bez liekas birokrātijas." />
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <Link href={`/padomi/${first.slug}`} className="group grid overflow-hidden rounded-[28px] bg-night text-white md:grid-cols-[1.3fr_1fr]">
          <div className="p-8 sm:p-12">
            <span className="rounded-full bg-signal px-3 py-1 text-xs font-bold">{first.tag}</span>
            <h2 className="display mt-4 text-3xl sm:text-4xl">{first.title}</h2>
            <p className="mt-3 max-w-xl text-white/70">{first.description}</p>
            <span className="mt-6 inline-flex items-center gap-2 font-semibold text-signal">Lasīt <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
          </div>
          <div className="relative hidden md:block"><div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,rgba(217,29,43,.5),transparent_60%)]" /></div>
        </Link>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((a) => (
            <Link key={a.slug} href={`/padomi/${a.slug}`} className="group flex flex-col rounded-[24px] border border-line bg-card p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
              <span className="self-start rounded-full bg-signal-soft px-3 py-1 text-xs font-bold text-signal">{a.tag}</span>
              <h2 className="display-md mt-4 text-xl text-ink">{a.title}</h2>
              <p className="mt-2 flex-1 text-sm text-ink-2">{a.description}</p>
              <span className="mt-4 flex items-center gap-1.5 text-xs text-mute"><Clock className="h-3.5 w-3.5" /> {a.read} min lasīšana</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
