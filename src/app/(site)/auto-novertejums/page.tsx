import type { Metadata } from 'next';
import { Banknote, Clock, ShieldCheck, Repeat2 } from 'lucide-react';
import { PageHead } from '@/components/site/PageHead';
import { ValuationWizard } from '@/components/site/ValuationWizard';

export const metadata: Metadata = {
  title: 'Cik vērts mans auto? Bezmaksas auto novērtējums',
  description: 'Uzzini, cik vērts tavs auto — bezmaksas novērtējums 24 stundu laikā. Pērkam auto uzreiz, pieņemam kā pirmo iemaksu vai pārdodam tavā vietā. Rīga.',
  alternates: { canonical: '/auto-novertejums' },
};

export default function ValuationPage() {
  return (
    <>
      <PageHead crumb="Auto novērtējums" title="Cik vērts tavs auto?" lead="Aizpildi 3 īsus soļus — speciālists novērtēs tavu auto un sazināsies 24 stundu laikā. Bez maksas un bez saistībām." />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-10 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <ValuationWizard />
        <div className="space-y-3">
          {[
            { i: Clock, t: 'Atbilde 24 stundu laikā', d: 'Darba dienās parasti tajā pašā dienā.' },
            { i: Banknote, t: 'Nauda darījuma dienā', d: 'Pērkam auto uzreiz — bez sludinājumiem un kaulēšanās.' },
            { i: Repeat2, t: 'Vai maiņa pret citu auto', d: 'Tava auto vērtību ieskaitām kā pirmo iemaksu līzingā.' },
            { i: ShieldCheck, t: 'Droši un caurspīdīgi', d: 'Visus dokumentus un pārrakstīšanu CSDD nokārtojam mēs.' },
          ].map(({ i: I, t, d }) => (
            <div key={t} className="flex gap-4 rounded-2xl border border-line bg-card p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-signal-soft text-signal"><I className="h-5 w-5" /></span>
              <div><p className="font-bold text-ink">{t}</p><p className="text-sm text-ink-2">{d}</p></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
