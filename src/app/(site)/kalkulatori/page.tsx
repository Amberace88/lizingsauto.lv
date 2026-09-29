import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings } from '@/lib/data';
import { PageHead } from '@/components/site/PageHead';
import { LeasingCalculator } from '@/components/site/LeasingCalculator';
import { AffordabilityCalc, RunningCostCalc, TaxCalc } from '@/components/calc/Calculators';

export const metadata: Metadata = {
  title: 'Auto kalkulatori — līzings, budžets, nodoklis, degvielas izmaksas',
  description: 'Aprēķini auto līzinga mēneša maksājumu, cik dārgu auto vari atļauties, transportlīdzekļa ekspluatācijas nodokli 2026 un degvielas vai elektrības izmaksas.',
  alternates: { canonical: '/kalkulatori' },
};

const NAV = [
  ['lizings', 'Līzinga maksājums'],
  ['budzets', 'Cik varu atļauties'],
  ['elektroauto', 'Elektroauto ar EKII'],
  ['nodoklis', 'Ekspluatācijas nodoklis'],
  ['izmaksas', 'Degviela pret elektrību'],
];

export default async function CalcPage() {
  const { leasing } = await getSettings();
  return (
    <>
      <PageHead crumb="Kalkulatori" title="Aprēķini, pirms brauc skatīties" lead="Mēneša maksājums, budžets, nodokļi un ikdienas izmaksas — lai lēmums būtu mierīgs un skaidrs." />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <nav className="no-scrollbar sticky top-16 z-20 -mx-4 mt-8 flex gap-2 overflow-x-auto bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0" aria-label="Kalkulatori">
          {NAV.map(([id, t]) => (
            id === 'elektroauto'
              ? <Link key={id} href="/elektroauto" className="shrink-0 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-petrol">{t}</Link>
              : <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-petrol">{t}</a>
          ))}
        </nav>
        <Section id="lizings" title="Līzinga maksājums" lead="Ievadi auto cenu, pirmo iemaksu un termiņu.">
          <div className="max-w-xl"><LeasingCalculator price={15000} leasing={leasing} priceEditable /></div>
        </Section>
        <Section id="budzets" title="Cik dārgu auto varu atļauties?" lead="Pēc ienākumiem un esošajām saistībām. Līzinga devēji parasti pieļauj līdz 40% no ienākumiem visiem kredītu maksājumiem kopā.">
          <AffordabilityCalc leasing={leasing} />
        </Section>
        <Section id="nodoklis" title="Transportlīdzekļa ekspluatācijas nodoklis" lead="Ikgadējais nodoklis vieglajam auto pēc 2026. gada likmēm.">
          <TaxCalc />
        </Section>
        <Section id="izmaksas" title="Degviela pret elektrību" lead="Salīdzini, cik mēnesī izmaksā braukšana ar iekšdedzes auto un elektroauto.">
          <RunningCostCalc />
        </Section>
      </div>
    </>
  );
}

function Section({ id, title, lead, children }: { id: string; title: string; lead: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32 border-b border-line py-14 last:border-0">
      <h2 className="display-md text-3xl text-ink">{title}</h2>
      <p className="mb-8 mt-2 max-w-2xl text-ink-2">{lead}</p>
      {children}
    </section>
  );
}
