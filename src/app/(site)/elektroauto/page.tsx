import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ShieldCheck, Handshake, BatteryCharging, Plug, Leaf, Percent, Scale, CalendarCheck, ExternalLink } from 'lucide-react';
import { getPublicCars, getSettings } from '@/lib/data';
import { PageHead } from '@/components/site/PageHead';
import { EvCalculator, type EvOption } from '@/components/calc/EvCalculator';
import { CarCard } from '@/components/site/CarCard';
import { Faq } from '@/components/site/Faq';
import { carName, money } from '@/lib/format';
import { ekiiCalc } from '@/lib/ekii';

export const metadata: Metadata = {
  title: 'Elektroauto ar EKII valsts atbalstu — cenas kalkulators',
  description: 'Elektroauto ar EKII valsts atbalstu 2026: lietotam 3000 €, jaunam 4000 €, Goda ģimenēm līdz 9000 €, +2000 € par vecā auto nodošanu. Atbalsts sedz līdz 90% no cenas. Aprēķini gala cenu un līzingu.',
  alternates: { canonical: '/elektroauto' },
};

export default async function EvPage({ searchParams }: { searchParams: Promise<{ auto?: string }> }) {
  const [{ ekii, leasing }, cars, sp] = await Promise.all([getSettings(), getPublicCars(), searchParams]);
  const evs = cars.filter((c) => c.fuel === 'electric');
  const phevs = cars.filter((c) => c.fuel === 'plugin_hybrid' && c.co2 != null && c.co2 <= ekii.phevMaxCo2);
  const options: EvOption[] = [...evs, ...phevs].filter((c) => c.status === 'published').map((c) => ({ slug: c.slug, name: carName(c), price: c.price, vat: c.vat_included, year: c.year, mileage: c.mileage, seats: c.seats, phev: c.fuel === 'plugin_hybrid' }));
  // Piemērs, kur darbojas 90% ierobežojums: lēts lietots elektroauto + vecā auto nodošana
  const example = 5000;
  const ex = ekiiCalc(ekii, { price: example, vatIncluded: false, year: new Date().getFullYear() - 5, mileage: 120000, seats: 5, goda: false, children: 0, scrap: true, isNew: false });
  const exampleCap = ex.total;
  const AMOUNTS: [string, number, number][] = [
    ['Privātpersonai', ekii.newAmount, ekii.usedAmount],
    ['Goda ģimenei, auto ar 5+ sēdvietām', ekii.familyNew5, ekii.familyUsed5],
    ['Goda ģimenei, auto ar 7+ sēdvietām', ekii.familyNew7, ekii.familyUsed7],
  ];
  const faq: [string, string][] = [
    ['Kas ir EKII atbalsts?', `Emisijas kvotu izsolīšanas instrumenta (EKII) programma, ko administrē Vides investīciju fonds (MK noteikumi Nr. 238, 21.04.2026). Pieteikties var līdz 31.12.2029 vai kamēr pietiek 40 milj. € finansējuma. Lietotam elektroauto — ${money(ekii.usedAmount)}, jaunam — ${money(ekii.newAmount)}, Goda ģimenēm līdz ${money(ekii.familyNew7)}, par vecā iekšdedzes auto nodošanu vēl +${money(ekii.scrapBonus)}.`],
    ['Vai tiesa, ka atbalsts ir līdz 90%?', `Atbalsts ir fiksēta summa (tabulā augstāk), bet tas nedrīkst pārsniegt ${ekii.maxIntensityPct}% no auto pārdošanas cenas. Tātad “90%” nav atbalsta apmērs, bet augšējā robeža: lētākam auto valsts var segt līdz ${ekii.maxIntensityPct}% cenas. Piemēram, lietotam elektroauto par ${money(example)} ar vecā auto nodošanu atbalsts ir ${money(exampleCap)} (nevis ${money(ex.sum)}). Dārgākam auto atbalsts ir pilnā fiksētajā apmērā.`],
    ['Kas var saņemt atbalstu?', 'Fiziska persona — Latvijas pastāvīgais iedzīvotājs. Viena persona programmā var iegādāties vienu auto ar atbalstu. Uzņēmumiem šī programma nav paredzēta.'],
    ['Kādas saistības man būs pēc pirkuma?', 'Auto jāpatur savā īpašumā vai līzingā 5 gadus vai līdz nobraukti 60 000 km (kas iestājas pirmais), tam jābūt reģistrētam Latvijā, un to nedrīkst izmantot saimnieciskajā darbībā. Pārdodot agrāk, atbalsts jāatmaksā.'],
    ['Vai atbalstu var saņemt, pērkot auto līzingā?', 'Jā. Līgumu slēdz četras puses — tirgotājs, Vides investīciju fonds, pircējs un līzinga devējs. Atbalsts samazina finansējamo summu un līdz ar to mēneša maksājumu. Līzingu un dokumentus saskaņojam mēs.'],
    ['Kādām prasībām jāatbilst lietotam elektroauto?', `Pirmā reģistrācija ne senāk kā pirms ${ekii.usedMaxAgeYears} gadiem, nobraukums līdz ${ekii.usedMaxKm.toLocaleString('lv-LV')} km, Latvijā reģistrēts ne ilgāk par 12 mēnešiem, cena bez PVN līdz ${money(ekii.priceCap5)} (6+ sēdvietām ${money(ekii.priceCap6)}). Lietotiem plug-in hibrīdiem atbalsts nepienākas.`],
    ['Kā saņemt +2000 € par veco auto?', `Nododot savu iekšdedzes auto utilizācijā (ar utilizācijas izziņu) vai ziedojot to Ukrainas bruņotajiem spēkiem. Bonuss pienākas tikai kopā ar atbalstu jauna vai lietota elektroauto iegādei, un vecā auto nodošanai jānotiek ne agrāk kā 12 mēnešus pirms tam.`],
    ['Ko man vajag darīt?', 'Izvēlies auto un piesakies. Mēs pārbaudīsim atbilstību, sagatavosim nepieciešamos dokumentus un pastāstīsim, kā iesniegt pieteikumu programmā — tu nepaliec viens ar birokrātiju.'],
    ['Vai elektroauto jāmaksā ekspluatācijas nodoklis?', 'Nē, elektroauto ir atbrīvoti no transportlīdzekļa ekspluatācijas nodokļa.'],
  ];
  return (
    <>
      <PageHead crumb="Elektroauto" title={`Elektroauto ar valsts atbalstu līdz ${money(ekii.familyNew7)}`} lead={`EKII atbalsts 2026: lietotam elektroauto ${money(ekii.usedAmount)}, jaunam ${money(ekii.newAmount)}, Goda ģimenēm līdz ${money(ekii.familyNew7)} un +${money(ekii.scrapBonus)} par vecā auto nodošanu — kopā līdz ${ekii.maxIntensityPct}% no auto cenas. Mēs pārdodam auto, sakārtojam līzingu un visas atbalsta formalitātes.`} />
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

        <section id="nosacijumi" className="mt-16 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="display-md text-3xl text-ink">EKII atbalsta apmērs 2026</h2>
            <p className="text-sm text-mute">Pēc MK noteikumiem Nr. 238 (21.04.2026) · pieteikšanās līdz 31.12.2029</p>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="overflow-hidden rounded-2xl border border-line bg-card">
              <table className="w-full text-sm">
                <thead className="bg-paper text-left text-xs text-mute">
                  <tr><th className="px-4 py-3 font-semibold">Kam</th><th className="px-4 py-3 text-right font-semibold">Jauns auto*</th><th className="px-4 py-3 text-right font-semibold">Lietots elektroauto</th></tr>
                </thead>
                <tbody>
                  {AMOUNTS.map(([k, n, u]) => (
                    <tr key={k} className="border-t border-line"><td className="px-4 py-3 text-ink-2">{k}</td><td className="num px-4 py-3 text-right font-bold text-ink">{money(n)}</td><td className="num px-4 py-3 text-right font-bold text-ink">{money(u)}</td></tr>
                  ))}
                  <tr className="border-t border-line"><td className="px-4 py-3 text-ink-2">Goda ģimenei — par katru bērnu, sākot ar 4.</td><td colSpan={2} className="num px-4 py-3 text-right font-bold text-ink">+{money(ekii.extraChild)}</td></tr>
                  <tr className="border-t border-line bg-signal-soft/60"><td className="px-4 py-3 text-ink">Nododot veco iekšdedzes auto utilizācijā vai Ukrainas armijai</td><td colSpan={2} className="num px-4 py-3 text-right font-bold text-signal">+{money(ekii.scrapBonus)}</td></tr>
                </tbody>
              </table>
              <p className="border-t border-line px-4 py-3 text-xs text-mute">* Jauns — lietots mazāk par 6 mēnešiem vai nobraucis mazāk par 6000 km. Jaunam auto atbalsts pieejams arī plug-in hibrīdiem (līdz {ekii.phevMaxCo2} g CO₂/km, vismaz 50 km ar elektrību).</p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-night p-6 text-white">
                <Percent className="h-6 w-6 text-signal" />
                <p className="mt-3 text-lg font-bold">Līdz {ekii.maxIntensityPct}% no auto cenas</p>
                <p className="mt-1 text-sm text-white/70">Atbalsts ir fiksēta summa, bet kopā ne vairāk kā {ekii.maxIntensityPct}% no pārdošanas cenas. Lētākam auto valsts var segt gandrīz visu: lietotam elektroauto par {money(example)} ar vecā auto nodošanu atbalsts būtu {money(ex.sum)}, bet ar {ekii.maxIntensityPct}% limitu — {money(exampleCap)}. Tev jāmaksā tikai {money(example - exampleCap)}.</p>
              </div>
              <div className="rounded-2xl border border-line bg-card p-6">
                <Scale className="h-6 w-6 text-signal" />
                <p className="mt-3 font-bold text-ink">Cenas limits</p>
                <p className="mt-1 text-sm text-ink-2">Līdz {money(ekii.priceCap5)} bez PVN, auto ar 6+ sēdvietām — līdz {money(ekii.priceCap6)} bez PVN.</p>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { i: ShieldCheck, t: 'Kas var pieteikties', d: 'Fiziska persona — Latvijas pastāvīgais iedzīvotājs. Viens auto ar atbalstu uz personu. Var pirkt arī līzingā.' },
              { i: BatteryCharging, t: 'Lietotam elektroauto', d: `Ne vecāks par ${ekii.usedMaxAgeYears} gadiem, nobraukums līdz ${ekii.usedMaxKm.toLocaleString('lv-LV')} km, Latvijā reģistrēts ne ilgāk par 12 mēnešiem. Mūsu ievestie auto šo prasību parasti izpilda.` },
              { i: CalendarCheck, t: 'Saistības pēc pirkuma', d: 'Auto jāpatur 5 gadus vai līdz 60 000 km, reģistrētu Latvijā, un to nedrīkst izmantot uzņēmējdarbībā.' },
            ].map(({ i: I, t, d }) => (
              <div key={t} className="rounded-2xl border border-line bg-card p-6">
                <I className="h-6 w-6 text-signal" />
                <p className="mt-3 font-bold text-ink">{t}</p>
                <p className="mt-1 text-sm text-ink-2">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-mute">
            <span>Avoti:</span>
            <a href="https://likumi.lv/ta/id/368128" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-ink">MK noteikumi Nr. 238 <ExternalLink className="h-3 w-3" /></a>
            <a href="https://ekii.lv/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-ink">ekii.lv <ExternalLink className="h-3 w-3" /></a>
            <a href="https://lvif.gov.lv/valsts-atbalsts/iedzivotajiem/elektro-auto-iegade/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-ink">Vides investīciju fonds <ExternalLink className="h-3 w-3" /></a>
          </p>
        </section>

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
