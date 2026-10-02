import Link from 'next/link';
import { ShieldCheck, Smartphone, Wallet, Info } from 'lucide-react';
import { PageHead } from './PageHead';
import { RadarHub } from './RadarHub';
import { InstallButton } from './InstallApp';
import { KIND, type Radar, type RadarKind } from '@/lib/radars';
import { KIND_PAGES, matchRadar, regionPages, roadPages, type RadarPage } from '@/lib/radar-pages';

const FAQ: [string, string][] = [
  ['No kurienes ņemti dati?', 'Stacionārie fotoradari un nodevas kontroles vietas — no CSDD oficiālās kartes, pārvietojamo radaru iespējamās vietas — no Valsts policijas publicētā saraksta, vidējā ātruma posmu ģeometrija — no OpenStreetMap. Datus regulāri atjaunojam.'],
  ['Kā darbojas vidējā ātruma kontrole?', 'Posma sākumā un beigās kameras fiksē automašīnu un aprēķina vidējo ātrumu starp abiem punktiem. Tāpēc svarīgi ievērot ātrumu visā posmā, nevis tikai pie kamerām.'],
  ['Vai pārvietojamais radars vienmēr ir norādītajā vietā?', 'Nē. Valsts policija publicē vietas, kur pārvietojamais fotoradars var atrasties, bet konkrētajā brīdī tas var būt jebkurā no tām vai nevienā. Kartē tās redzamas zilā krāsā.'],
  ['Vai lapa saglabā manu atrašanās vietu?', 'Nē. Atrašanās vieta tiek izmantota tikai tavā pārlūkā, lai parādītu tuvākos radarus, un netiek sūtīta uz serveri.'],
  ['Kā izmantot braukšanas režīmu?', 'Nospied „Braukšanas režīms”, atļauj atrašanās vietu un novieto telefonu turētājā. Lapa parādīs attālumu līdz nākamajam radaram braukšanas virzienā un brīdinās ar skaņu ~600 un 200 m pirms tā. Ērtāk — pievieno Tavs Auto telefona sākuma ekrānam.'],
];

function groupBy<T>(arr: T[], key: (t: T) => string) {
  const m = new Map<string, T[]>();
  for (const x of arr) m.set(key(x), [...(m.get(key(x)) || []), x]);
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'lv'));
}

export function RadarPageView({ radars, page }: { radars: Radar[]; page?: RadarPage }) {
  const scoped = page ? radars.filter((r) => matchRadar(r, page.filter)) : radars;
  const counts = (['fixed', 'average', 'mobile', 'toll'] as RadarKind[]).map((k) => [k, scoped.filter((r) => r.kind === k).length] as const).filter(([, n]) => n > 0);
  const updated = radars.reduce((a, r) => (r.updated_at > a ? r.updated_at : a), '');
  const roads = roadPages(radars);
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <PageHead
        crumb={page ? `Fotoradari / ${page.h1.replace(/^Fotoradari /, '')}` : 'Fotoradari'}
        title={page?.h1 || 'Fotoradari Latvijā — karte un brīdinājumi'}
        lead={page?.lead || 'Visi stacionārie fotoradari, vidējā ātruma posmi un pārvietojamo radaru iespējamās vietas vienā kartē. Atrodi radarus sev apkārt un ieslēdz brīdinājumus braucot — bez maksas.'}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {counts.map(([k, n]) => (
            <span key={k} className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND[k].color }} /> <b className="num">{n}</b> <span className="text-ink-2">{KIND[k].label.toLowerCase()}</span>
            </span>
          ))}
          {updated && <span className="text-xs text-mute" suppressHydrationWarning>Dati atjaunoti {new Date(updated).toLocaleDateString('lv-LV')}</span>}
        </div>

        <div className="mt-6">
          {radars.length ? (
            <RadarHub radars={radars} preset={page?.filter} />
          ) : (
            <p className="rounded-2xl bg-card p-8 text-center text-ink-2">Radaru dati tiek atjaunoti. Lūdzu, ielūko vēlāk.</p>
          )}
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-[20px] bg-night p-6 text-white md:col-span-2">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-signal"><Smartphone className="h-4 w-4" /> Radaru brīdinātājs telefonā</p>
            <h2 className="display-md mt-2 text-2xl">Pievieno sākuma ekrānam — atveras kā lietotne</h2>
            <p className="mt-2 max-w-xl text-sm text-white/65">Viens pieskāriens, un braukšanas režīms ar skaņas brīdinājumiem ir gatavs. Bez App Store, bez reģistrācijas.</p>
            <div className="mt-4"><InstallButton /></div>
          </div>
          <Link href="/lizings" className="group rounded-[20px] border border-line bg-card p-6 transition hover:border-ink-2/40">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-signal-soft text-signal"><Wallet className="h-5 w-5" /></span>
            <p className="mt-3 font-bold text-ink">Plāno citu auto?</p>
            <p className="mt-1 text-sm text-ink-2">Līzings no 0% pirmās iemaksas, arī ar sabojātu kredītvēsturi. Pārbaudīti auto Rīgā.</p>
            <p className="mt-3 text-sm font-semibold text-signal group-hover:underline">Aprēķināt maksājumu →</p>
          </Link>
        </section>

        <section className="mt-12">
          <h2 className="display-md text-2xl text-ink">{page ? 'Saraksts' : 'Visi radari sarakstā'}</h2>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            {(['fixed', 'average', 'mobile', 'toll'] as RadarKind[]).map((k) => {
              const items = scoped.filter((r) => r.kind === k);
              if (!items.length) return null;
              return (
                <details key={k} open={!!page || k === 'average'} className="group rounded-2xl border border-line bg-card p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <span className="flex items-center gap-2 font-bold text-ink"><span className="h-3 w-3 rounded-full" style={{ background: KIND[k].color }} /> {KIND[k].label} <span className="num text-sm font-medium text-mute">{items.length}</span></span>
                    <span className="text-xs text-mute group-open:hidden">Rādīt</span>
                  </summary>
                  {groupBy(items, (r) => r.region || 'Latvija').map(([region, list]) => (
                    <div key={region} className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-mute">{region}</p>
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {list.map((r) => (
                          <li key={r.id} className="leading-snug text-ink-2">
                            {r.name}
                            {r.speed ? <span className="ml-1 rounded bg-paper px-1.5 py-0.5 text-xs font-semibold text-ink">{r.speed} km/h</span> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </details>
              );
            })}
          </div>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-3">
          <div>
            <h2 className="font-bold text-ink">Pēc veida</h2>
            <div className="mt-3 grid gap-2">{KIND_PAGES.map((p) => <Link key={p.slug} href={`/fotoradari/${p.slug}`} className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink hover:border-ink-2/40">{p.h1}</Link>)}</div>
          </div>
          <div>
            <h2 className="font-bold text-ink">Pēc reģiona</h2>
            <div className="mt-3 flex flex-wrap gap-2">{regionPages().map((p) => <Link key={p.slug} href={`/fotoradari/${p.slug}`} className="rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-ink hover:border-ink-2/40">{p.h1}</Link>)}</div>
          </div>
          {roads.length > 0 && (
            <div>
              <h2 className="font-bold text-ink">Pēc autoceļa</h2>
              <div className="mt-3 flex flex-wrap gap-2">{roads.map((p) => <Link key={p.slug} href={`/fotoradari/${p.slug}`} className="num rounded-full border border-line bg-card px-3.5 py-2 text-sm font-bold text-ink hover:border-ink-2/40">{p.filter.road}</Link>)}</div>
            </div>
          )}
        </section>

        <section className="mt-12 max-w-3xl">
          <h2 className="display-md text-2xl text-ink">Biežāk uzdotie jautājumi</h2>
          <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-card">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink">{q}<span className="text-mute transition group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 flex gap-2 text-xs leading-relaxed text-mute">
            <Info className="mt-0.5 h-4 w-4 shrink-0" /> Informācija ir uzziņai. Ievēro ceļa zīmes un ātruma ierobežojumus vienmēr — arī tur, kur radara nav. Avoti: CSDD, Valsts policija, © OpenStreetMap līdzautori.
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-2"><ShieldCheck className="h-4 w-4 text-signal" /> Pārbaudi arī sava auto <Link href="/parbaudes" className="font-semibold text-signal hover:underline">OCTA un tehnisko apskati bez maksas</Link>.</p>
        </section>
      </div>
    </>
  );
}
