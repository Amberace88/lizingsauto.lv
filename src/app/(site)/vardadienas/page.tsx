import type { Metadata } from 'next';
import Link from 'next/link';
import { CarFront, ArrowRight } from 'lucide-react';
import { PageHead } from '@/components/site/PageHead';
import { NameDayHero, NameSearch } from '@/components/site/NameDays';
import { NAMEDAYS, MONTHS, slugName } from '@/lib/namedays';
import { nameIndex } from '@/lib/namedays-index';
import { SITE_URL } from '@/lib/format';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Vārda dienas šodien — latviešu vārda dienu kalendārs',
  description: 'Kam šodien ir vārda diena? Latviešu vārda dienu kalendārs: šodienas, rītdienas un visa gada vārda dienas, meklēšana pēc vārda.',
  alternates: { canonical: '/vardadienas' },
};

export default function NameDaysPage() {
  const index = [...nameIndex().values()].sort((a, b) => Number(b.main) - Number(a.main) || a.name.localeCompare(b.name, 'lv')).map((e) => [e.name, e.slug, e.days] as [string, string, string[]]);
  const byMonth = MONTHS.map((label, i) => ({ label, days: Object.entries(NAMEDAYS).filter(([k]) => Number(k.slice(0, 2)) === i + 1) }));
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Latviešu vārda dienu kalendārs',
    url: `${SITE_URL}/vardadienas`,
    inLanguage: 'lv',
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PageHead crumb="Vārda dienas" title="Vārda dienas šodien" lead="Neaizmirsti apsveikt draugus, kolēģus un tuviniekus. Šodienas un tuvāko dienu vārda dienas, meklēšana pēc vārda un pilns gada kalendārs." />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-10"><NameDayHero /></div>

        <section className="mt-12 max-w-2xl">
          <h2 className="display-md mb-4 text-2xl text-ink">Kad ir vārda diena?</h2>
          <NameSearch index={index} />
        </section>

        <section className="mt-16">
          <h2 className="display-md text-3xl text-ink">Vārda dienu kalendārs</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {byMonth.map((m) => (
              <details key={m.label} className="group rounded-2xl border border-line bg-card p-5 open:shadow-[var(--shadow-lift)]">
                <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-bold capitalize text-ink">
                  {m.label}
                  <span className="text-sm font-semibold text-mute group-open:hidden">Rādīt</span>
                </summary>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {m.days.map(([k, names]) => (
                    <li key={k} className="flex gap-3">
                      <span className="num w-7 shrink-0 font-bold text-signal">{Number(k.slice(3))}.</span>
                      <span className="text-ink-2">
                        {names.length ? names.map((n, i) => <span key={n}>{i > 0 && ', '}<Link href={`/vardadienas/${slugName(n)}`} className="hover:text-signal hover:underline">{n}</Link></span>) : <span className="text-mute">—</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-16 flex flex-col items-start justify-between gap-6 rounded-[24px] bg-night p-8 text-white sm:flex-row sm:items-center sm:p-10">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-signal"><CarFront className="h-6 w-6" /></span>
            <div>
              <h2 className="display-md text-2xl">Labākā dāvana sev — jauns auto</h2>
              <p className="mt-1 max-w-xl text-white/70">Līzings no 0% pirmās iemaksas, arī ar sabojātu kredītvēsturi. Izvēlies auto un piesakies dažās minūtēs.</p>
            </div>
          </div>
          <Link href="/katalogs" className="btn btn-signal shrink-0">Skatīt auto <ArrowRight className="h-4 w-4" /></Link>
        </section>
      </div>
    </>
  );
}
