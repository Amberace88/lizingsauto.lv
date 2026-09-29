import type { Metadata } from 'next';
import { ShieldCheck, Wrench, Truck, Car, Infinity as InfinityIcon, Globe2 } from 'lucide-react';
import { getPublicCars, getSettings } from '@/lib/data';
import { PageHead } from '@/components/site/PageHead';
import { WarrantyCalculator, CoverageMatrix, type WCar } from '@/components/calc/Warranty';
import { LeadForm } from '@/components/site/LeadForm';
import { Faq } from '@/components/site/Faq';
import { PLANS, PLAN_ORDER, limitLabel } from '@/lib/warranty';
import { carName, number } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Pagarinātā garantija līdz 36 mēnešiem — Mango Insurance Car Warranty',
  description: 'Pagarinātā auto garantija 12, 24 vai 36 mēnešiem sadarbībā ar Mango Insurance: dzinējs, pārnesumkārba, diferenciālis, turbo, elektronika. Neierobežots gada nobraukums, evakuators. Aprēķini savu plānu.',
  alternates: { canonical: '/garantija' },
};

export default async function WarrantyPage({ searchParams }: { searchParams: Promise<{ auto?: string }> }) {
  const [{ warranty: w, leasing }, cars, sp] = await Promise.all([getSettings(), getPublicCars(), searchParams]);
  const list: WCar[] = cars.filter((c) => c.status === 'published').map((c) => ({ slug: c.slug, name: carName(c), year: c.year, mileage: c.mileage, price: c.price }));
  const faq: [string, string][] = [
    ['Kas ir pagarinātā garantija?', `Tā ir ${w.provider} apdrošināšana (Car Warranty), kas sedz negaidītus mehāniskus, elektroniskus un elektriskus bojājumus. Remonta izmaksas atlīdzina apdrošinātājs līdz plāna limitiem.`],
    ['Kurus auto var apdrošināt?', 'Jaunus un lietotus auto līdz 3500 kg. Plāns atkarīgs no auto vecuma un nobraukuma: PLUS — līdz 15 gadiem un 300 000 km, COMFORT — līdz 10 gadiem un 250 000 km, ADVANTAGE un DELUXE — līdz 6 gadiem.'],
    ['Vai garantiju var iekļaut līzingā?', 'Jā. Garantijas cenu var pievienot līzinga summai — tad tā sadalās pa mēneša maksājumiem.'],
    ['Kur garantija ir spēkā?', 'Latvijā un Eiropas teritorijā nodarītiem zaudējumiem. Gada nobraukums nav ierobežots.'],
    ['Kas notiek, ja auto saplīst?', `Sazinies ar mums vai apdrošinātāju — pieteikumu administrē ātri. Ja auto nevar braukt, evakuācija tiek kompensēta līdz ${w.towing} € vienā gadījumā; pēc izvēles arī maiņas auto līdz ${w.rentalPerDay} € dienā (līdz ${w.rentalDays} dienām).`],
    ['Vai ir kaut kas, ko garantija nesedz?', 'Garantija nesedz dabisko nolietojumu un regulāro apkopi (bremžu kluči, riepas u.tml.) un sastāvdaļas, kas nav iekļautas izvēlētajā plānā. Precīzi nosacījumi ir apdrošināšanas līgumā.'],
  ];
  return (
    <>
      <PageHead crumb="Garantija" title="Pagarinātā garantija līdz 36 mēnešiem" lead={`Sadarbībā ar ${w.provider}. Pērc lietotu auto bez bažām par negaidītiem remontiem — dzinējs, pārnesumkārba un pārējais svarīgākais ir apdrošināts.`} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { i: ShieldCheck, t: '12, 24 vai 36 mēneši', d: 'Izvēlies periodu, kas der tev' },
            { i: InfinityIcon, t: 'Neierobežots gada nobraukums', d: 'Brauc cik vajag — limita nav' },
            { i: Wrench, t: 'Neierobežots gadījumu skaits', d: 'Līdz kopējam atlīdzības limitam' },
            { i: Truck, t: `Evakuators līdz ${w.towing} €`, d: 'Ja apdrošināta bojājuma dēļ nevar braukt' },
            { i: Car, t: 'Maiņas auto pēc izvēles', d: `Līdz ${w.rentalPerDay} € dienā, maks. ${w.rentalDays} dienas` },
            { i: Globe2, t: 'Latvijā un Eiropā', d: 'Arī ceļojumā ārzemēs' },
          ].map(({ i: I, t, d }) => (
            <li key={t} className="flex gap-4 rounded-2xl border border-line bg-card p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-signal-soft text-signal"><I className="h-5 w-5" /></span>
              <div><p className="font-bold text-ink">{t}</p><p className="text-sm text-ink-2">{d}</p></div>
            </li>
          ))}
        </ul>

        <section className="mt-16">
          <h2 className="display-md text-3xl text-ink">Četri plāni — pēc auto vecuma</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PLAN_ORDER.map((p) => (
              <article key={p} className={`flex flex-col rounded-2xl border p-6 ${p === 'comfort' ? 'border-signal bg-card ring-2 ring-signal' : 'border-line bg-card'}`}>
                {p === 'comfort' && <span className="mb-3 self-start rounded-full bg-signal px-2.5 py-0.5 text-xs font-bold text-white">Populārākais</span>}
                <h3 className="display text-2xl text-ink">{PLANS[p].name}</h3>
                <p className="mt-2 min-h-[3rem] text-sm text-ink-2">{PLANS[p].tagline}</p>
                <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                  <Row k="Auto vecums" v={`līdz ${PLANS[p].maxAge} gadiem`} />
                  <Row k="Nobraukums" v={`līdz ${number(PLANS[p].maxKm)} km`} />
                  <Row k="Limits 1 gadījumam" v={limitLabel(PLANS[p].perClaim)} />
                  <Row k="Kopējais limits" v={limitLabel(PLANS[p].total)} />
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section id="kalkulators" className="mt-16 scroll-mt-24 rounded-[24px] bg-card p-5 shadow-[var(--shadow-lift)] sm:p-8">
          <h2 className="display-md text-3xl text-ink">Kāda garantija der tavam auto?</h2>
          <p className="mb-8 mt-2 max-w-2xl text-ink-2">Izvēlies auto vai ievadi gadu un nobraukumu — redzēsi pieejamos plānus, segumu un cik tas izmaksā līzingā.</p>
          <WarrantyCalculator w={w} leasing={leasing} cars={list} initialSlug={sp.auto} />
        </section>

        <section className="mt-16">
          <h2 className="display-md text-3xl text-ink">Kas tieši ir apdrošināts</h2>
          <p className="mb-6 mt-2 max-w-2xl text-ink-2">Atver grupu, lai redzētu sastāvdaļas. DELUXE sedz arī visu, kas nav skaidri izslēgts.</p>
          <CoverageMatrix />
        </section>

        <section className="mt-16 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="display-md text-3xl text-ink">Jautājumi par garantiju</h2>
            <div className="mt-6"><Faq items={faq} /></div>
          </div>
          <div id="pieteikums" className="scroll-mt-24 self-start rounded-2xl bg-card p-6 shadow-[var(--shadow-lift)] sm:p-8">
            <h2 className="display-md text-2xl">Pieteikt garantiju</h2>
            <p className="mb-6 mt-1 text-sm text-ink-2">Sagatavosim piedāvājumu tavam auto — gan pērkot pie mums, gan jau esošam auto.</p>
            <LeadForm
              type="warranty"
              submitLabel="Saņemt garantijas piedāvājumu"
              fields={[
                { name: 'name', label: 'Vārds', required: true, half: true },
                { name: 'phone', label: 'Tālrunis', type: 'tel', required: true, half: true },
                { name: 'make_model', label: 'Auto marka un modelis', required: true, half: true },
                { name: 'year', label: 'Gads', type: 'number', half: true },
                { name: 'mileage', label: 'Nobraukums, km', type: 'number', half: true },
                { name: 'plan', label: 'Plāns', type: 'select', options: ['Nezinu — ieteiciet', 'PLUS', 'COMFORT', 'ADVANTAGE', 'DELUXE'], half: true },
                { name: 'term', label: 'Termiņš', type: 'select', options: ['12 mēneši', '24 mēneši', '36 mēneši'], half: true },
                { name: 'in_leasing', label: 'Iekļaut līzingā?', type: 'select', options: ['Jā', 'Nē', 'Vēl nezinu'], half: true },
                { name: 'message', label: 'Komentārs', type: 'textarea' },
              ]}
            />
          </div>
        </section>
        <p className="mt-10 text-xs text-mute">Informācija sagatavota pēc {w.provider} Car Warranty materiāliem un ir informatīva. Detalizēti nosacījumi ir pievienoti apdrošināšanas līgumam.</p>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-mute">{k}</dt><dd className="text-right font-semibold text-ink">{v}</dd></div>;
}
