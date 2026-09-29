import type { Metadata } from 'next';
import { PageHead } from '@/components/site/PageHead';
import { LeadForm } from '@/components/site/LeadForm';

export const metadata: Metadata = {
  title: 'Pārdot auto — uzpirkšana, maiņa vai pārdošana komisijā',
  description: 'Pārdod savu auto ātri: nopērkam uzreiz, pārdodam tavā vietā vai ieskaitām kā pirmo iemaksu jaunam auto. Bezmaksas novērtējums un diagnostika Rīgā.',
  alternates: { canonical: '/pardot-auto' },
};

export default function SellPage() {
  return (
    <>
      <PageHead crumb="Pārdot auto" title="Pārdod savu auto bez liekas galvassāpes" lead="Ne visiem ir laiks sludinājumiem un zvaniem. Izvēlies sev ērtāko veidu — pārējo izdarīsim mēs." />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="mt-10 space-y-4">
          {[
            ['Nopērkam uzreiz', 'Novērtējam auto, vienojamies par cenu un izmaksājam naudu darījuma dienā.'],
            ['Pārdodam tavā vietā', 'Izstādām auto mūsu laukumā, ko ik dienu pamana vidēji 300 cilvēki. Tev ziņosim, tiklīdz būs pircējs.'],
            ['Maiņa pret citu auto', 'Tavs auto kalpo kā pirmā iemaksa jebkuram auto no mūsu kataloga.'],
          ].map(([t, d], i) => (
            <div key={t} className="flex gap-4 rounded-2xl border border-line bg-card p-6">
              <span className="num display grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-signal text-xl text-white">{i + 1}</span>
              <div><p className="text-lg font-bold">{t}</p><p className="mt-1 text-ink-2">{d}</p></div>
            </div>
          ))}
          <p className="rounded-2xl bg-petrol-soft p-5 text-sm text-petrol">Bezmaksas novērtējums un datora diagnostika, kad atbrauksi pie mums.</p>
        </div>
        <div className="mt-10 rounded-2xl bg-card p-6 shadow-[var(--shadow-lift)] sm:p-8">
          <h2 className="display-md text-2xl">Uzzini sava auto vērtību</h2>
          <p className="mb-6 mt-1 text-sm text-ink-2">Pastāsti par auto — piezvanīsim ar provizorisku cenu.</p>
          <LeadForm
            type="sell_car"
            submitLabel="Saņemt novērtējumu"
            fields={[
              { name: 'name', label: 'Vārds', required: true, half: true },
              { name: 'phone', label: 'Tālrunis', type: 'tel', required: true, half: true },
              { name: 'make_model', label: 'Marka un modelis', required: true, half: true },
              { name: 'year', label: 'Gads', type: 'number', required: true, half: true },
              { name: 'mileage', label: 'Nobraukums, km', type: 'number', half: true },
              { name: 'reg_number', label: 'Valsts numurs', half: true },
              { name: 'price_wish', label: 'Vēlamā cena, €', type: 'number', half: true },
              { name: 'deal', label: 'Vēlamais darījums', type: 'select', options: ['Pārdot uzreiz', 'Pārdot komisijā', 'Mainīt pret citu auto'], half: true },
              { name: 'message', label: 'Stāvoklis, defekti, komplektācija', type: 'textarea' },
            ]}
          />
        </div>
      </div>
    </>
  );
}
