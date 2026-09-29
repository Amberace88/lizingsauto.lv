import type { Metadata } from 'next';
import { Clock, Globe2, Percent, BadgeCheck, Repeat2, Building2 } from 'lucide-react';
import { getSettings } from '@/lib/data';
import { PageHead } from '@/components/site/PageHead';
import { LeasingCalculator } from '@/components/site/LeasingCalculator';
import { LeadForm, LEASING_FIELDS } from '@/components/site/LeadForm';
import { Faq } from '@/components/site/Faq';
import { HOME_FAQ } from '@/lib/faq';

export const metadata: Metadata = {
  title: 'Auto līzings — arī ar sabojātu kredītvēsturi un ārzemēs strādājošajiem',
  description: 'Auto līzings no 0% pirmās iemaksas. Bezmaksas pieteikuma izskatīšana, lēmums dažu stundu laikā. Līzings arī ar sabojātu kredītvēsturi, ārzemēs strādājošajiem un uzņēmumiem.',
  alternates: { canonical: '/lizings' },
};

export default async function LeasingPage() {
  const { leasing } = await getSettings();
  return (
    <>
      <PageHead crumb="Līzings" title="Līzings, kas pielāgojas tev" lead="Kad esi noskatījis auto, aizpildi pieteikumu. Sadarbojamies ar vairākiem līzinga devējiem, tāpēc atrodam risinājumu arī tad, ja citur atteica." />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { i: BadgeCheck, t: 'Bezmaksas izskatīšana', d: 'Pieteikums tevi ne pie kā nesaista.' },
            { i: Percent, t: `Likmes no ${Math.min(3, leasing.rate)}% gadā`, d: 'Izvēlamies izdevīgāko piedāvājumu no vairākiem partneriem.' },
            { i: Clock, t: 'Lēmums dažu stundu laikā', d: 'Pēc līguma parakstīšanas auto vari saņemt tajā pašā dienā.' },
            { i: Globe2, t: 'Ārzemēs strādājošajiem', d: 'Ienākumi no ārvalstīm tiek ņemti vērā.' },
            { i: Repeat2, t: 'Vecais auto kā iemaksa', d: 'Tavu auto novērtēsim un ieskaitīsim pirmajā iemaksā.' },
            { i: Building2, t: 'Uzņēmumiem', d: 'Finanšu un operatīvais līzings juridiskām personām, cenas ar PVN.' },
          ].map(({ i: I, t, d }) => (
            <li key={t} className="flex gap-4 rounded-2xl border border-line bg-white p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-petrol-soft text-petrol"><I className="h-5 w-5" /></span>
              <div><p className="font-bold text-ink">{t}</p><p className="text-sm text-ink-2">{d}</p></div>
            </li>
          ))}
        </ul>
        <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="display-md mb-4 text-2xl text-ink">Aprēķini maksājumu</h2>
            <LeasingCalculator price={12000} leasing={leasing} priceEditable />
          </div>
          <div id="pieteikums" className="scroll-mt-24 rounded-2xl bg-white p-6 shadow-[var(--shadow-lift)] sm:p-8">
            <h2 className="display-md text-2xl text-ink">Līzinga pieteikums</h2>
            <p className="mb-6 mt-1 text-sm text-ink-2">Aizpildīšana aizņem 2 minūtes. Sazināsimies 24 stundu laikā — parasti ātrāk.</p>
            <LeadForm type="leasing" fields={LEASING_FIELDS} submitLabel="Nosūtīt pieteikumu" />
          </div>
        </div>
        <section className="mt-20 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="display-md text-3xl text-ink">Jautājumi par līzingu</h2>
          <Faq items={HOME_FAQ.slice(0, 4)} />
        </section>
      </div>
    </>
  );
}
