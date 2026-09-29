import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ShieldCheck, Handshake, BatteryCharging, Plug, Leaf, Percent, Scale, CalendarCheck, ExternalLink, Users, Recycle, CheckCircle2 } from 'lucide-react';
import { getPublicCars, getSettings } from '@/lib/data';
import { PageHead } from '@/components/site/PageHead';
import { EvCalculator, type EvOption } from '@/components/calc/EvCalculator';
import { CarCard } from '@/components/site/CarCard';
import { Faq } from '@/components/site/Faq';
import { carName, money } from '@/lib/format';
import { ekiiCalc } from '@/lib/ekii';

export const metadata: Metadata = {
  title: 'Elektroauto ar EKII valsts atbalstu līdz 90% — cenas kalkulators',
  description: 'Elektroauto ar EKII valsts atbalstu līdz 90% no cenas: lietotam no 3000 €, jaunam no 4000 €, daudzbērnu ģimenēm vairāk + 1000 € par katru bērnu no ceturtā, +2000 € par vecā auto nodošanu. Aprēķini gala cenu un līzingu.',
  alternates: { canonical: '/elektroauto' },
};

export default async function EvPage({ searchParams }: { searchParams: Promise<{ auto?: string }> }) {
  const [{ ekii, leasing }, cars, sp] = await Promise.all([getSettings(), getPublicCars(), searchParams]);
  const evs = cars.filter((c) => c.fuel === 'electric');
  const phevs = cars.filter((c) => c.fuel === 'plugin_hybrid' && c.co2 != null && c.co2 <= ekii.phevMaxCo2);
  const options: EvOption[] = [...evs, ...phevs].filter((c) => c.status === 'published').map((c) => ({ slug: c.slug, name: carName(c), price: c.price, vat: c.vat_included, year: c.year, mileage: c.mileage, seats: c.seats, phev: c.fuel === 'plugin_hybrid' }));
  // Reāls scenārijs, kur atbalsts sasniedz 90%: Goda ģimene ar 10 bērniem, jauns 7 vietīgs elektroauto + vecā auto nodošana
  const famKids = 10;
  const famPrice = Math.round((ekii.familyNew7 + (famKids - 3) * ekii.extraChild + ekii.scrapBonus) / (ekii.maxIntensityPct / 100) / 100) * 100;
  const fam = ekiiCalc(ekii, { price: famPrice, vatIncluded: false, year: new Date().getFullYear(), mileage: 0, seats: 7, goda: true, children: famKids, scrap: true, isNew: true });
  const famPct = Math.round((fam.total / famPrice) * 100);
  const AMOUNTS: [string, string, number, number, number][] = [
    ['Privātpersonai', 'katram Latvijas iedzīvotājam', ekii.newAmount, ekii.usedAmount, ekii.newAmount],
    ['Goda ģimenei', 'auto ar 5+ sēdvietām', ekii.familyNew5, ekii.familyUsed5, ekii.familyNew5],
    ['Goda ģimenei', 'auto ar 7+ sēdvietām', ekii.familyNew7, ekii.familyUsed7, ekii.familyNew7],
  ];
  const faq: [string, string][] = [
    ['Kas ir EKII atbalsts?', `Emisijas kvotu izsolīšanas instrumenta (EKII) programma, ko administrē Vides investīciju fonds (MK noteikumi Nr. 238, 21.04.2026). Pieteikties var līdz 31.12.2029 vai kamēr pietiek 40 milj. € finansējuma. Atbalsts ir fiksēta summa — no ${money(ekii.usedAmount)} lietotam līdz ${money(ekii.familyNew7)} daudzbērnu ģimenei, plus ${money(ekii.extraChild)} par katru bērnu, sākot ar ceturto, un ${money(ekii.scrapBonus)} par vecā auto nodošanu. Kopā — līdz ${ekii.maxIntensityPct}% no auto cenas.`],
    ['Vai tiešām var saņemt 90% atbalstu?', `Jā. Summas saskaitās: pamatatbalsts + ${money(ekii.extraChild)} par katru bērnu no ceturtā + ${money(ekii.scrapBonus)} par vecā auto nodošanu. Robeža ir ${ekii.maxIntensityPct}% no auto cenas. Piemēram, Goda ģimene ar ${famKids} bērniem, pērkot jaunu 7 vietīgu elektroauto par ${money(famPrice)}, saņem ${money(fam.total)} — ${famPct}% no cenas, un pati maksā tikai ${money(fam.finalPrice)}. Tieši tā nesen pie mums auto iegādājās daudzbērnu ģimene.`],
    ['Kas var saņemt atbalstu?', 'Fiziska persona — Latvijas pastāvīgais iedzīvotājs. Viena persona programmā var iegādāties vienu auto ar atbalstu. Uzņēmumiem šī programma nav paredzēta.'],
    ['Kādas saistības man būs pēc pirkuma?', 'Auto jāpatur savā īpašumā vai līzingā 5 gadus vai līdz nobraukti 60 000 km (vidēji 12 000 km gadā), tam jābūt reģistrētam Latvijā, un to nedrīkst izmantot saimnieciskajā darbībā (piem., taksometram). Pārdodot agrāk, atbalsts jāatmaksā.'],
    ['Vai atbalstu var saņemt, pērkot auto līzingā?', 'Jā. Līgumu slēdz četras puses — tirgotājs, Vides investīciju fonds, pircējs un līzinga devējs. Atbalsts samazina finansējamo summu un līdz ar to mēneša maksājumu. Līzingu un dokumentus saskaņojam mēs.'],
    ['Kādām prasībām jāatbilst lietotam elektroauto?', `Pirmā reģistrācija ne senāk kā pirms ${ekii.usedMaxAgeYears} gadiem, nobraukums līdz ${ekii.usedMaxKm.toLocaleString('lv-LV')} km, Latvijā reģistrēts ne ilgāk par 12 mēnešiem, cena bez PVN līdz ${money(ekii.priceCap5)} (6+ sēdvietām ${money(ekii.priceCap6)}). Lietotiem plug-in hibrīdiem atbalsts nepienākas.`],
    ['Kā saņemt +2000 € par veco auto?', `Nododot savu iekšdedzes auto autopārstrādes uzņēmumam (ar likvidācijas sertifikātu un norakstīšanu CSDD) vai ziedojot to Ukrainas bruņotajiem spēkiem. Vecajam auto jābūt tavā īpašumā vismaz pēdējos 3 mēnešus, reģistrētam Latvijā vismaz pēdējo gadu un izmantotam ceļu satiksmē (vismaz 5000 km gadā). Bonuss pienākas tikai kopā ar atbalstu jauna vai lietota elektroauto iegādei.`],
    ['Ko man vajag darīt?', 'Izvēlies auto un piesakies. Mēs pārbaudīsim atbilstību, sagatavosim nepieciešamos dokumentus un pastāstīsim, kā iesniegt pieteikumu programmā — tu nepaliec viens ar birokrātiju.'],
    ['Vai elektroauto jāmaksā ekspluatācijas nodoklis?', 'Nē, elektroauto ir atbrīvoti no transportlīdzekļa ekspluatācijas nodokļa.'],
  ];
  return (
    <>
      <PageHead crumb="Elektroauto" title={`Elektroauto ar valsts atbalstu līdz ${ekii.maxIntensityPct}% no cenas`} lead="EKII programma 2026: atbalsts atkarīgs no auto un ģimenes — daudzbērnu ģimenēm valsts var apmaksāt pat 90% no auto cenas. Mēs pārbaudām atbilstību, sagatavojam dokumentus un saskaņojam līzingu, lai tev atliek tikai braukt." />
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
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-signal">EKII 2026 · atbalsts privātpersonām</p>
              <h2 className="display-md mt-1 text-3xl text-ink sm:text-4xl">Cik lielu atbalstu vari saņemt</h2>
            </div>
            <p className="text-sm text-mute">MK noteikumi Nr. 238 (21.04.2026) · pieteikšanās līdz 31.12.2029</p>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <div className="overflow-hidden rounded-2xl border border-line bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-paper text-xs text-mute">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Pamatatbalsts</th>
                      <th className="px-3 py-3 text-right font-semibold"><span className="flex items-center justify-end gap-1"><BatteryCharging className="h-3.5 w-3.5" /> Jauns* EV</span></th>
                      <th className="px-3 py-3 text-right font-semibold"><span className="flex items-center justify-end gap-1"><BatteryCharging className="h-3.5 w-3.5" /> Lietots EV</span></th>
                      <th className="px-4 py-3 text-right font-semibold"><span className="flex items-center justify-end gap-1"><Plug className="h-3.5 w-3.5" /> Jauns* PHEV</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {AMOUNTS.map(([k, sub, n, u, ph]) => (
                      <tr key={k + sub} className="border-t border-line">
                        <td className="px-4 py-3"><span className="font-semibold text-ink">{k}</span><span className="block text-xs text-mute">{sub}</span></td>
                        <td className="num px-3 py-3 text-right text-base font-bold text-ink">{money(n)}</td>
                        <td className="num px-3 py-3 text-right text-base font-bold text-ink">{money(u)}</td>
                        <td className="num px-4 py-3 text-right text-base font-bold text-ink">{money(ph)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-px border-t border-line bg-line sm:grid-cols-2">
                <div className="flex items-center gap-3 bg-card px-4 py-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-signal-soft"><Users className="h-5 w-5 text-signal" /></span>
                  <p className="text-sm text-ink-2"><b className="num text-base text-ink">+{money(ekii.extraChild)}</b> par katru nākamo bērnu, sākot ar ceturto</p>
                </div>
                <div className="flex items-center gap-3 bg-card px-4 py-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-signal-soft"><Recycle className="h-5 w-5 text-signal" /></span>
                  <p className="text-sm text-ink-2"><b className="num text-base text-ink">+{money(ekii.scrapBonus)}</b> nododot veco iekšdedzes auto utilizācijai vai Ukrainas armijai</p>
                </div>
              </div>
              <p className="border-t border-line px-4 py-3 text-xs text-mute">* Jauns — lietots mazāk par 6 mēnešiem vai nobraucis mazāk par 6000 km. PHEV — plug-in hibrīds līdz {ekii.phevMaxCo2} g CO₂/km un vismaz 50 km ar elektrību. Goda ģimene — ar “Latvijas Goda ģimenes” apliecību.</p>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-night p-6 text-white sm:p-7">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-signal/25 blur-3xl" />
              <p className="flex items-center gap-2 text-sm font-semibold text-white/70"><Percent className="h-4 w-4 text-signal" /> Kā veidojas līdz {ekii.maxIntensityPct}% atbalsts</p>
              <p className="mt-2 text-lg font-bold">Goda ģimene ar {famKids} bērniem, jauns 7 vietīgs elektroauto</p>
              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-white/65">Pamatatbalsts (7+ vietas)</dt><dd className="num font-semibold">{money(fam.base)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-white/65">{famKids - 3} bērni, sākot ar 4. × {money(ekii.extraChild)}</dt><dd className="num font-semibold">+{money(fam.childBonus)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-white/65">Vecā auto nodošana</dt><dd className="num font-semibold">+{money(fam.scrap)}</dd></div>
                <div className="flex justify-between gap-4 border-t border-white/15 pt-2"><dt className="text-white/65">Auto cena</dt><dd className="num font-semibold">{money(famPrice)}</dd></div>
              </dl>
              <div className="mt-4 flex items-end justify-between gap-4 rounded-xl bg-white/5 p-4">
                <div>
                  <p className="text-xs text-white/60">Valsts atbalsts</p>
                  <p className="num display text-3xl text-signal">{money(fam.total)}</p>
                </div>
                <div className="text-right">
                  <p className="num display text-4xl">{famPct}%</p>
                  <p className="text-xs text-white/60">ģimene maksā {money(fam.finalPrice)}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-white/70">Tieši tā nesen pie mums elektroauto iegādājās daudzbērnu ģimene. Atbalsts nedrīkst pārsniegt {ekii.maxIntensityPct}% no auto cenas.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { i: Scale, t: 'Auto cena', l: [`Līdz ${money(ekii.priceCap5)} bez PVN`, `Līdz ${money(ekii.priceCap6)} bez PVN, ja auto ir 6+ sēdvietas`] },
              { i: BatteryCharging, t: 'Lietotam elektroauto', l: [`Ne vecāks par ${ekii.usedMaxAgeYears} gadiem`, `Nobraukums līdz ${ekii.usedMaxKm.toLocaleString('lv-LV')} km`, 'Latvijā reģistrēts ne ilgāk par 12 mēnešiem', 'Lietotiem PHEV atbalsts nepienākas'] },
              { i: CalendarCheck, t: 'Pēc pirkuma', l: ['12 000 km gadā vai 60 000 km 5 gados', 'Auto paliek reģistrēts Latvijā', 'Nedrīkst izmantot saimnieciskajai darbībai (piem., taksometram)'] },
              { i: Recycle, t: 'Vecā auto nodošana', l: ['Likvidācijas sertifikāts, norakstīts CSDD', 'Tavā īpašumā vismaz pēdējos 3 mēnešus', 'Latvijā reģistrēts vismaz pēdējo gadu', 'Izmantots ceļu satiksmē, vismaz 5000 km gadā'] },
            ].map(({ i: I, t, l }) => (
              <div key={t} className="rounded-2xl border border-line bg-card p-5">
                <I className="h-6 w-6 text-signal" />
                <p className="mt-3 font-bold text-ink">{t}</p>
                <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
                  {l.map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> {x}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink-2"><ShieldCheck className="mr-1.5 inline h-4 w-4 text-signal" />Atbalstu var saņemt Latvijas pastāvīgais iedzīvotājs (privātpersona), vienu auto uz personu — arī pērkot līzingā.</p>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-mute">
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
