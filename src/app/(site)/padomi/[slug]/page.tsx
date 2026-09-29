import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Clock, Lightbulb, Check } from 'lucide-react';
import { ARTICLES, articleBySlug } from '@/lib/articles';
import { SITE_URL } from '@/lib/format';

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = articleBySlug((await params).slug);
  if (!a) return { title: 'Raksts nav atrasts', robots: { index: false } };
  return { title: a.title, description: a.description, alternates: { canonical: `/padomi/${a.slug}` }, openGraph: { type: 'article', title: a.title, description: a.description, images: ['/og.png?v=2'] } };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = articleBySlug((await params).slug);
  if (!a) notFound();
  const others = ARTICLES.filter((x) => x.slug !== a.slug).slice(0, 3);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    datePublished: a.date,
    inLanguage: 'lv',
    author: { '@type': 'Organization', name: 'Tavs Auto' },
    publisher: { '@id': `${SITE_URL}/#dealer` },
    mainEntityOfPage: `${SITE_URL}/padomi/${a.slug}`,
  };
  return (
    <article className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <nav className="text-sm text-mute"><Link href="/" className="hover:text-ink">Sākums</Link> / <Link href="/padomi" className="hover:text-ink">Padomi</Link></nav>
      <span className="mt-6 inline-block rounded-full bg-signal-soft px-3 py-1 text-xs font-bold text-signal">{a.tag}</span>
      <h1 className="display mt-3 text-4xl text-ink sm:text-5xl">{a.title}</h1>
      <p className="mt-4 text-lg text-ink-2">{a.description}</p>
      <p className="mt-3 flex items-center gap-1.5 text-sm text-mute"><Clock className="h-4 w-4" /> {a.read} min · {new Date(a.date).toLocaleDateString('lv-LV')}</p>
      <div className="mt-8 space-y-5 text-[1.05rem] leading-relaxed text-ink-2">
        {a.blocks.map((b, i) => {
          switch (b.t) {
            case 'h2':
              return <h2 key={i} className="display-md pt-4 text-2xl text-ink">{b.v}</h2>;
            case 'p':
              return <p key={i}>{b.v}</p>;
            case 'ul':
              return <ul key={i} className="space-y-2">{b.v.map((x) => <li key={x} className="flex gap-3"><Check className="mt-1 h-5 w-5 shrink-0 text-ok" />{x}</li>)}</ul>;
            case 'ol':
              return <ol key={i} className="space-y-3">{b.v.map((x, j) => <li key={x} className="flex gap-3"><span className="num grid h-7 w-7 shrink-0 place-items-center rounded-full bg-night text-sm font-bold text-white">{j + 1}</span><span className="pt-0.5">{x}</span></li>)}</ol>;
            case 'tip':
              return <p key={i} className="flex gap-3 rounded-2xl bg-signal-soft p-5 text-ink"><Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-signal" />{b.v}</p>;
            case 'cta':
              return (
                <div key={i} className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-card p-5 sm:flex-row sm:items-center">
                  <p className="font-semibold text-ink">{b.v}</p>
                  <Link href={b.href} className="btn btn-signal shrink-0">{b.label} <ArrowRight className="h-4 w-4" /></Link>
                </div>
              );
          }
        })}
      </div>
      <section className="mt-16 border-t border-line pt-10">
        <h2 className="display-md text-2xl text-ink">Citi padomi</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {others.map((o) => (
            <Link key={o.slug} href={`/padomi/${o.slug}`} className="rounded-2xl border border-line bg-card p-4 transition hover:border-signal">
              <span className="text-xs font-bold text-signal">{o.tag}</span>
              <p className="mt-1 font-semibold leading-snug text-ink">{o.title}</p>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}
