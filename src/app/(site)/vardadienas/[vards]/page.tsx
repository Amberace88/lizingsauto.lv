import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarHeart, ArrowLeft, ArrowRight } from 'lucide-react';
import { NameCountdown } from '@/components/site/NameDays';
import { NAMEDAYS, dayLabel, dayLabelLoc, slugName } from '@/lib/namedays';
import { EXT_NAMEDAYS, nameIndex } from '@/lib/namedays-index';

export const revalidate = 86400;
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ vards: string }> }): Promise<Metadata> {
  const { vards } = await params;
  const e = nameIndex().get(vards);
  if (!e) return { title: 'Vārds nav atrasts', robots: { index: false } };
  const when = e.days.map(dayLabelLoc).join(' un ');
  return {
    title: `${e.name} vārda diena — ${when}`,
    description: `Kad ir ${e.name} vārda diena? ${e.name} vārda dienu svin ${when}. Skaties, kas vēl svin tajā pašā dienā, un latviešu vārda dienu kalendāru.`,
    alternates: { canonical: `/vardadienas/${e.slug}` },
  };
}

export default async function NamePage({ params }: { params: Promise<{ vards: string }> }) {
  const { vards } = await params;
  const e = nameIndex().get(vards);
  if (!e) notFound();
  const keys = Object.keys(NAMEDAYS).sort();
  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
      <nav className="text-sm text-mute"><Link href="/" className="hover:text-ink">Sākums</Link> / <Link href="/vardadienas" className="hover:text-ink">Vārda dienas</Link> / {e.name}</nav>
      <div className="mt-6 overflow-hidden rounded-[28px] bg-night p-8 text-white sm:p-12">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-signal"><CalendarHeart className="h-4 w-4" /> Vārda diena</p>
        <h1 className="display mt-3 text-5xl sm:text-7xl">{e.name}</h1>
        <p className="mt-4 text-2xl text-white/85">svin vārda dienu <b className="text-white">{e.days.map(dayLabelLoc).join(' un ')}</b></p>
        <div className="mt-6"><NameCountdown day={e.days[0]} /></div>
      </div>

      {e.days.map((k) => {
        const same = [...(NAMEDAYS[k] || []), ...(EXT_NAMEDAYS[k] || [])].filter((n) => slugName(n) !== e.slug);
        const i = keys.indexOf(k);
        const prev = keys[(i - 1 + keys.length) % keys.length];
        const next = keys[(i + 1) % keys.length];
        return (
          <section key={k} className="mt-8 rounded-[24px] border border-line bg-card p-6 sm:p-8">
            <h2 className="display-md text-2xl text-ink">Kas vēl svin {dayLabelLoc(k)}?</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {same.length ? same.map((n) => <Link key={n} href={`/vardadienas/${slugName(n)}`} className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-ink-2 hover:border-signal hover:text-signal">{n}</Link>) : <p className="text-ink-2">Šajā dienā citu vārdu kalendārā nav.</p>}
            </div>
            <div className="mt-6 grid gap-3 border-t border-line pt-5 text-sm sm:grid-cols-2">
              <p><span className="flex items-center gap-1 text-mute"><ArrowLeft className="h-3.5 w-3.5" /> {dayLabel(prev)}</span>{(NAMEDAYS[prev] || []).map((n, j) => <span key={n}>{j > 0 && ', '}<Link href={`/vardadienas/${slugName(n)}`} className="font-semibold text-ink hover:text-signal">{n}</Link></span>)}</p>
              <p className="sm:text-right"><span className="flex items-center gap-1 text-mute sm:justify-end">{dayLabel(next)} <ArrowRight className="h-3.5 w-3.5" /></span>{(NAMEDAYS[next] || []).map((n, j) => <span key={n}>{j > 0 && ', '}<Link href={`/vardadienas/${slugName(n)}`} className="font-semibold text-ink hover:text-signal">{n}</Link></span>)}</p>
            </div>
          </section>
        );
      })}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/vardadienas" className="btn btn-ghost"><CalendarHeart className="h-4 w-4" /> Visas vārda dienas</Link>
        <Link href="/katalogs" className="btn btn-signal">Dāvana sev — auto ar līzingu <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}
