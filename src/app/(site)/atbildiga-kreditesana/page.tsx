import type { Metadata } from 'next';
import Link from 'next/link';
import { Scale, Calculator, FileText, Undo2, ShieldCheck, Wallet, ArrowRight } from 'lucide-react';
import { getSettings } from '@/lib/data';
import { PageHead } from '@/components/site/PageHead';
import { CreditWarning, exampleFor } from '@/components/site/Credit';
import { CREDIT_DEFAULTS, pct } from '@/lib/credit';

export const metadata: Metadata = {
  title: 'Atbildīga kreditēšana — reprezentatīvais piemērs, GPL un tavas tiesības',
  description: 'Kā aprēķināts līzinga reprezentatīvais piemērs un GPL, kā līzinga devējs izvērtē kredītspēju un kādas ir patērētāja tiesības. Brīdinām! Aizņemšanās maksā naudu.',
  alternates: { canonical: '/atbildiga-kreditesana' },
};

const eur = (n: number) => `${Math.round(n).toLocaleString('lv-LV')} €`;

export default async function ResponsibleCreditPage() {
  const { leasing, company } = await getSettings();
  const base = leasing.exampleAmount ?? CREDIT_DEFAULTS.exampleAmount;
  const prices = Array.from(new Set([Math.round(base / 2 / 500) * 500, base, Math.round((base * 2) / 500) * 500])).filter((x) => x > 0);
  const rows = prices.map((p) => exampleFor(leasing, p));
  const main = exampleFor(leasing);
  const lender = leasing.lender || CREDIT_DEFAULTS.lender;

  return (
    <>
      <PageHead
        crumb="Atbildīga kreditēšana"
        title="Atbildīga kreditēšana"
        lead="Līzings ļauj sadalīt auto maksājumu vairākos mēnešos. Šeit redzams, kā aprēķinām piemērus un GPL, kā tiek pieņemts lēmums un kādas ir tavas tiesības. Izvērtē kredīta nosacījumus pirms pirkuma."
      />
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <CreditWarning size="lg" className="mt-10" />

        <section className="mt-12">
          <h2 className="display-md text-2xl text-ink">Reprezentatīvais piemērs</h2>
          <p className="mt-2 text-ink-2">
            Aprēķins ar lapā izmantotajiem nosacījumiem: aizņēmuma likme {pct(leasing.rate)} gadā, termiņš {leasing.term} mēn., pirmā iemaksa {pct(leasing.downPct)}
            {leasing.contractFee ? `, līguma noformēšanas maksa ${eur(leasing.contractFee)}` : ''}
            {leasing.monthlyFee ? `, ikmēneša komisija ${eur(leasing.monthlyFee)}` : ''}.
          </p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-white text-black">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wider text-black/55">
                  {['Auto cena', 'Pirmā iemaksa', 'Kredīta summa', 'Termiņš', 'Likme', 'Mēneša maksājums', 'Kopā atmaksājams', 'GPL'].map((h) => (
                    <th key={h} className="px-4 py-3 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="num">
                {rows.map((e) => (
                  <tr key={e.price} className={`border-b border-black/5 last:border-0 ${e.price === main.price ? 'bg-black/[0.03] font-semibold' : ''}`}>
                    <td className="px-4 py-3">{eur(e.price)}</td>
                    <td className="px-4 py-3">{eur(e.down)}</td>
                    <td className="px-4 py-3">{eur(e.credit)}</td>
                    <td className="px-4 py-3">{e.term} mēn.</td>
                    <td className="px-4 py-3">{pct(e.rate)}</td>
                    <td className="px-4 py-3">{eur(e.monthly)}</td>
                    <td className="px-4 py-3">{eur(e.total)}</td>
                    <td className="px-4 py-3 font-bold">{pct(e.apr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-ink-2">
            Kredītu izsniedz {lender}. {leasing.extras ?? CREDIT_DEFAULTS.extras} Galīgos nosacījumus, likmi un GPL nosaka kredīta devējs pēc kredītspējas izvērtēšanas — tie var atšķirties no piemēra.
          </p>
        </section>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2">
          {[
            { i: Calculator, t: 'Kas ir GPL', d: 'Gada procentu likme parāda visas kredīta izmaksas — procentus un komisijas — procentos gadā. Tā ļauj salīdzināt dažādus piedāvājumus. Salīdzini pēc GPL un kopējās atmaksājamās summas, ne tikai pēc mēneša maksājuma.' },
            { i: Scale, t: 'Kā tiek pieņemts lēmums', d: 'Lēmumu pieņem līzinga devējs pēc kredītspējas izvērtēšanas: tiek vērtēti ienākumi, esošās saistības un kredītvēsture. Mēs palīdzam sagatavot pieteikumu, bet lēmumu nepieņemam un to negarantējam.' },
            { i: Wallet, t: 'Cik vari atļauties', d: 'Ieteicams, lai visi kredītu maksājumi kopā nepārsniegtu aptuveni trešdaļu no neto ienākumiem un paliktu rezerve neparedzētiem izdevumiem. Ņem vērā arī apdrošināšanas, degvielas un apkopes izmaksas.' },
            { i: FileText, t: 'Informācija pirms līguma', d: 'Pirms līguma noslēgšanas tev jāsaņem standarta informācija par patēriņa kredītu (SECCI veidlapa) ar visiem nosacījumiem. Izlasi to un uzdod jautājumus, ja kaut kas nav skaidrs.' },
            { i: Undo2, t: '14 dienu atteikuma tiesības', d: 'No patērētāja kreditēšanas līguma vari atkāpties 14 dienu laikā bez paskaidrojuma, atmaksājot saņemto summu un procentus par izmantošanas laiku. Kredītu vari arī atmaksāt pirms termiņa.' },
            { i: ShieldCheck, t: 'Ja rodas grūtības', d: 'Ja paredzi, ka nespēsi laikus maksāt, sazinies ar kredīta devēju pēc iespējas ātrāk. Kavējumi rada papildu izmaksas un var ietekmēt kredītvēsturi.' },
          ].map(({ i: I, t, d }) => (
            <li key={t} className="flex gap-4 rounded-2xl border border-line bg-card p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-petrol-soft text-petrol"><I className="h-5 w-5" /></span>
              <div><p className="font-bold text-ink">{t}</p><p className="mt-1 text-sm leading-relaxed text-ink-2">{d}</p></div>
            </li>
          ))}
        </ul>

        <section className="mt-12 rounded-2xl border border-line bg-card p-6">
          <h2 className="display-md text-xl text-ink">Noderīgas saites</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a className="font-semibold text-petrol underline" href="https://www.ptac.gov.lv/" target="_blank" rel="noopener noreferrer">Patērētāju tiesību aizsardzības centrs (PTAC)</a></li>
            <li><a className="font-semibold text-petrol underline" href="https://app.ptac.gov.lv/dsti/" target="_blank" rel="noopener noreferrer">PTAC kalkulators — vai kredīts atbilst taviem ienākumiem</a></li>
            <li><a className="font-semibold text-petrol underline" href="https://www.ptac.gov.lv/lv/ka-rikoties-ja-kredita-liguma-slegsanas-bridi-dsti-kreditizmaksu-attieciba-pret-ienakumiem-ir-parsniegts" target="_blank" rel="noopener noreferrer">Ko darīt, ja kredītmaksājumi pārsniedz ienākumu limitu (DSTI)</a></li>
          </ul>
          <p className="mt-4 text-sm text-ink-2">
            Kredītu reklāmas izplatītājs: {company.name}, reģ. nr. {company.regNr}, {company.legalAddress || company.address}. Jautājumi: <a className="underline" href={`tel:${company.phone.replace(/\s/g, '')}`}>{company.phone}</a>, <a className="underline" href={`mailto:${company.email}`}>{company.email}</a>.
          </p>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/kalkulatori#budzets" className="btn btn-primary">Budžeta kalkulators <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/lizings" className="btn btn-ghost">Līzinga kalkulators</Link>
        </div>
      </div>
    </>
  );
}
