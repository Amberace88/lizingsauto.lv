import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Gauge, Receipt, ClipboardCheck, ShieldCheck, Wrench, FileSearch } from 'lucide-react';
import { PageHead } from '@/components/site/PageHead';
import { OctaCheck, VinDecoder } from '@/components/site/FreeChecks';
import { Faq } from '@/components/site/Faq';

export const metadata: Metadata = {
  title: 'Bezmaksas OCTA, TA, nobraukuma pārbaude un VIN atšifrētājs',
  description: 'Pārbaudi bez maksas, vai auto ir spēkā esoša OCTA (LTAB), tehniskās apskates datus un nobraukumu (CSDD) un aprēķini ekspluatācijas nodokli. Padomi pirms lietota auto pirkšanas.',
  alternates: { canonical: '/parbaudes' },
};

const FAQ: [string, string][] = [
  ['Vai OCTA pārbaude tiešām ir bez maksas?', 'Jā. Latvijas Transportlīdzekļu apdrošinātāju birojs (LTAB) nodrošina bezmaksas pārbaudi pēc valsts numura vai VIN. Mēs tikai palīdzam to ātrāk atvērt — dati netiek saglabāti.'],
  ['Kāpēc jāievada drošības kods?', 'LTAB aizsargā pārbaudi pret automatizētiem pieprasījumiem, tāpēc katru reizi jāievada kods no attēla. Tas aizņem dažas sekundes.'],
  ['Kā uzzināt auto nobraukuma vēsturi?', 'CSDD glabā odometra rādījumus no katras tehniskās apskates. Bez maksas tos var apskatīt e-CSDD pēc autorizācijas. Mūsu auto lapās nobraukuma vēsturi jau esam pievienojuši — meklē zīmi “CSDD nobraukums”.'],
  ['Ko darīt, ja nobraukums vēsturē samazinās?', 'Tā var būt odometra atgriešanas pazīme. Pirms pirkuma pieprasi paskaidrojumu un servisa vēsturi vai izvēlies citu auto.'],
];

export default function ChecksPage() {
  return (
    <>
      <PageHead crumb="Bezmaksas pārbaudes" title="Bezmaksas auto pārbaudes" lead="OCTA, tehniskā apskate, nobraukums un nodoklis — pārbaudi jebkuru auto pirms pirkuma. Oficiālie avoti, bez reģistrēšanās mūsu lapā." />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <OctaCheck />
          <div className="grid gap-4">
            <CheckCard icon={Gauge} title="Nobraukums un TA (CSDD)" text="Odometra rādījumi no visām tehniskajām apskatēm un TA derīgums. Bez maksas e-CSDD portālā pēc autorizācijas." href="https://e.csdd.lv/" cta="Atvērt e-CSDD" external />
            <CheckCard icon={Receipt} title="Ekspluatācijas nodoklis" text="Cik gadā jāmaksā transportlīdzekļa ekspluatācijas nodoklis pēc CO₂, dzinēja tilpuma un jaudas." href="/kalkulatori#nodoklis" cta="Aprēķināt" />
          </div>
        </div>

        <div className="mt-6"><VinDecoder /></div>

        <section className="mt-20">
          <h2 className="display-md text-3xl text-ink">Pirms pērc lietotu auto — 6 soļi</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {([
              [ShieldCheck, 'OCTA un apdrošināšana', 'Pārbaudi, vai polise ir spēkā — bez tās braukt nedrīkst.'],
              [Gauge, 'Nobraukuma vēsture', 'Salīdzini sludinājuma nobraukumu ar CSDD ierakstiem.'],
              [ClipboardCheck, 'Tehniskā apskate', 'Svaiga TA nozīmē mazāk pārsteigumu tuvākajā gadā.'],
              [FileSearch, 'Dokumenti un VIN', 'VIN uz auto jāsakrīt ar reģistrācijas apliecību.'],
              [Wrench, 'Neatkarīgs serviss', 'Pie mums vari auto pārbaudīt jebkurā servisā pēc savas izvēles.'],
              [Receipt, 'Kopējās izmaksas', 'Nodoklis, OCTA, degviela — ieskaiti tās ikmēneša budžetā.'],
            ] as const).map(([Icon, t, d], i) => (
              <li key={t} className="rounded-2xl border border-line bg-card p-6">
                <div className="flex items-center gap-3"><span className="num display text-3xl text-signal/30">{i + 1}</span><Icon className="h-5 w-5 text-signal" /></div>
                <p className="mt-2 font-bold text-ink">{t}</p>
                <p className="mt-1 text-sm text-ink-2">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16 flex flex-col items-start justify-between gap-6 rounded-[24px] border border-line bg-card p-8 sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="display-md text-2xl text-ink sm:text-3xl">Mūsu auto jau ir pārbaudīti</h2>
            <p className="mt-2 max-w-xl text-ink-2">CSDD nobraukuma vēsture, TA dati un pagarinātā garantija — viss vienā vietā katra auto lapā.</p>
          </div>
          <Link href="/katalogs" className="btn btn-signal shrink-0">Skatīt katalogu <ArrowRight className="h-4 w-4" /></Link>
        </section>

        <section className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="display-md text-3xl text-ink">Biežāk uzdotie jautājumi</h2>
          <Faq items={FAQ} />
        </section>
      </div>
    </>
  );
}

function CheckCard({ icon: Icon, title, text, href, cta, external }: { icon: typeof Gauge; title: string; text: string; href: string; cta: string; external?: boolean }) {
  const cls = 'group flex flex-col rounded-2xl border border-line bg-card p-6 transition hover:border-signal';
  const inner = (
    <>
      <Icon className="h-6 w-6 text-signal" />
      <p className="mt-3 text-lg font-bold text-ink">{title}</p>
      <p className="mt-1 flex-1 text-sm text-ink-2">{text}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-signal">{cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
    </>
  );
  return external ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a> : <Link href={href} className={cls}>{inner}</Link>;
}
