import type { Metadata } from 'next';
import { PageHead } from '@/components/site/PageHead';
import { LeadForm } from '@/components/site/LeadForm';

export const metadata: Metadata = {
  title: 'Pasūtīt auto no Eiropas — atrodam, pārbaudām, atvedam',
  description: 'Nav vajadzīgā auto katalogā? Atradīsim to pie partneriem Vācijā, Nīderlandē, Itālijā, Francijā un Zviedrijā, palīdzēsim ar piegādi, reģistrāciju un līzingu.',
  alternates: { canonical: '/pasutit-auto' },
};

export default function OrderPage() {
  return (
    <>
      <PageHead crumb="Pasūtīt auto" title="Atradīsim tieši tavu auto Eiropā" lead="Sadarbojamies ar Eiropas izsoļu portāliem un partneriem Vācijā, Nīderlandē, Itālijā, Francijā un Zviedrijā. Palīdzam ar piegādi, reģistrāciju un līzingu." />
      <div className="mx-auto mt-10 max-w-3xl px-4 sm:px-6">
        <div className="rounded-2xl bg-white p-6 shadow-[var(--shadow-lift)] sm:p-8">
          <LeadForm
            type="car_order"
            submitLabel="Pasūtīt meklēšanu"
            fields={[
              { name: 'name', label: 'Vārds', required: true, half: true },
              { name: 'phone', label: 'Tālrunis', type: 'tel', required: true, half: true },
              { name: 'email', label: 'E-pasts', type: 'email', half: true },
              { name: 'budget', label: 'Budžets, €', type: 'number', half: true },
              { name: 'make_model', label: 'Vēlamā marka un modelis', required: true, half: true },
              { name: 'years', label: 'Gadi (no–līdz)', half: true },
              { name: 'fuel', label: 'Degviela', type: 'select', options: ['Nav svarīgi', 'Benzīns', 'Dīzelis', 'Hibrīds', 'Elektro'], half: true },
              { name: 'gear', label: 'Ātrumkārba', type: 'select', options: ['Nav svarīgi', 'Automāts', 'Manuāla'], half: true },
              { name: 'message', label: 'Svarīgākās prasības (aprīkojums, krāsa, nobraukums)', type: 'textarea' },
            ]}
          />
        </div>
      </div>
    </>
  );
}
