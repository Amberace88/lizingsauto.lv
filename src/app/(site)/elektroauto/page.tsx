import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ShieldCheck, Handshake, BatteryCharging, Plug, Leaf } from 'lucide-react';
import { getPublicCars, getSettings } from '@/lib/data';
import { PageHead } from '@/components/site/PageHead';
import { EvCalculator, type EvOption } from '@/components/calc/EvCalculator';
import { CarCard } from '@/components/site/CarCard';
import { Faq } from '@/components/site/Faq';
import { carName, money } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Elektroauto ar EKII valsts atbalstu — cenas kalkulators',
  description: 'Lietoti un jauni elektroauto ar EKII valsts atbalstu līdz 9000 €. Aprēķini galīgo cenu un līzinga maksājumu ar atbalstu. Palīdzam ar visām formalitātēm.',
  alternates: { canonical: '/elektroauto' },
};

export default async function EvPage({ searchParams }: { searchParams: Promise<{ auto?: string }> }) {
  const [{ ekii, leasing }, cars, sp] = await Promise.all([getSettings(), getPublicCars(), searchParams]);
  const evs = cars.filter((c) => c.fuel === 'electric');
  const options: EvOption[] = evs.filter((c) => c.status === 'published').map((c) => ({ slug: c.slug, name: carName(c), price: c.price, vat: c.vat_included, year: c.year, mileage: c.mileage, seats: c.seats }));
  const faq: [string, string][] = [
    ['Kas ir EKII atbalsts?', `Valsts atbalsta programma (Emisijas kvotu izsolīšanas instruments) elektroauto iegādei. Privātpersonām lietotam elektroauto — ${money(ekii.usedAmount)}, jaunam — ${money(ekii.newAmount)}, Goda ģimenēm vairāk. Par vecā iekšdedzes auto nodošanu vēl +${money(ekii.scrapBonus)}.`],
    ['Vai atbalstu var saņemt, pērkot auto līzingā?', 'Jā. Atbalstu var apvienot ar līzingu — tas samazina finansējamo summu un līdz ar to mēneša maksājumu. Līzingu un dokumentus saskaņojam mēs.'],
    ['Kādām prasībām jāatbilst lietotam elektroauto?', `Pirmā reģistrācija ne senāk kā pirms ${ekii.usedMaxAgeYears} gadiem, nobraukums līdz ${ekii.usedMaxKm.toLocaleString('lv-LV')} km, cena bez PVN līdz ${money(ekii.priceCap5)} (6+ vietām ${money(ekii.priceCap6)}).`],
    ['Ko man vajag darīt?', 'Izvēlies auto un piesakies. Mēs pārbaudīsim atbilstību, sagatavosim nepieciešamos dokumentus un pastāstīsim, kā iesniegt pieteikumu programmā — tu nepaliec viens ar birokrātiju.'],
    ['Vai elektroauto jāmaksā ekspluatācijas nodoklis?', 'Nē, elektroauto ir atbrīvoti no transportlīdzekļa ekspluatācijas nodokļa.'],
  ];
  return (
    <>
      <PageHead crumb="Elektroauto" title={`Elektroauto ar valsts atbalstu līdz ${money(ekii.familyNew7)}`} lead="Pēdējā laikā elektroauto ir mūsu pieprasītākais virziens. Mēs ne tikai pārdodam auto — sakārtojam līzingu un EKII atbalsta formalitātes, lai tev atliek tikai braukt." />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { i: ShieldCheck, t: 'Pārbaudām atbilstību', d: 'Uzreiz redzi, vai auto atbilst programmai un cik liels atbalsts pienākas.' },
            { i: FileText, t: 'Sagatavojam dokumentus', d: 'Rēķins, līgums un pieteikuma dokumenti — sagatavoti pareizi no pirmās reizes.' },
            { i: Handshake, t: 'Saskaņojam ar līzingu', d: 'Atbalsts samazina finansējamo summu, tātad arī mēneša maksājumu.' },
          ].map(({ i: I, t, d }) => (
            <div key={t} className="rounded-2xl border border-line bg-card p-6">
              <I className="h-7 w-7 text-petrol" />
              <p className="mt-3 text-lg font-bold">{t}</p>
              <p className="mt-1 text-sm text-ink-2">{d}</p>
            </div>
          ))}
        </div>

        <section id="kalkulators" className="mt-14 scroll-mt-24 rounded-[24px] bg-card p-5 shadow-[var(--shadow-lift)] sm:p-8">
          <h2 className="display-md flex items-center gap-2 text-3xl text-ink"><BatteryCharging className="h-8 w-8 text-petrol" /> Elektroauto gala cenas kalkulators</h2>
          <p className="mb-8 mt-2 max-w-2xl text-ink-2">Izvēlies auto vai ievadi savus datus — redzēsi cenu ar atbalstu un līzinga maksājumu.</p>
          <EvCalculator ekii={ekii} leasing={leasing} cars={options} initialSlug={sp.auto} />
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            { i: Leaf, t: '0 € ekspluatācijas nodoklis', d: 'Elektroauto nav jāmaksā ikgadējais transportlīdzekļa ekspluatācijas nodoklis.' },
            { i: Plug, t: 'Lētāka ikdiena', d: 'Uzlādējot mājās, 100 km izmaksā vairākas reizes mazāk nekā ar benzīnu vai dīzeli.' },
            { i: ShieldCheck, t: 'Baterijas garantija', d: 'Augstsprieguma baterijām parasti ir ražotāja garantija 8 gadi vai 160 000 km.' },
          ].map(({ i: I, t, d }) => (
            <div key={t} className="rounded-2xl bg-petrol-soft p-6">
              <I className="h-6 w-6 text-petrol" />
              <p className="mt-3 font-bold">{t}</p>
              <p className="mt-1 text-sm text-ink-2">{d}</p>
            </div>
          ))}
        </section>

        <section className="mt-16">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="display-md text-3xl text-ink">Elektroauto katalogā</h2>
            <Link href="/katalogs?fuel=electric" className="font-semibold text-petrol hover:underline">Visi elektroauto</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {evs.slice(0, 8).map((c) => <CarCard key={c.id} car={c} leasing={leasing} />)}
          </div>
        </section>

        <section className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="display-md text-3xl text-ink">Jautājumi par EKII</h2>
          <Faq items={faq} />
        </section>
      </div>
    </>
  );
}
