import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings, getPublicCars } from '@/lib/data';
import { PageHead } from '@/components/site/PageHead';

export const metadata: Metadata = {
  title: 'Par mums — auto tirdzniecība un līzings Rīgā',
  description: 'LīzingsAuto (SIA AC Industry) — auto tirdzniecība un līzings Rīgā, Teikā. Sadarbība ar Eiropas izsoļu portāliem un partneriem Vācijā, Nīderlandē, Itālijā, Francijā un Zviedrijā.',
  alternates: { canonical: '/par-mums' },
};

export default async function AboutPage() {
  const [{ company }, cars] = await Promise.all([getSettings(), getPublicCars({ includeSold: true })]);
  const makes = new Set(cars.map((c) => c.make)).size;
  return (
    <>
      <PageHead crumb="Par mums" title="Auto tirdzniecība, kurā runājam skaidri" lead="Esam profesionāļi savā jomā un nozarē strādājam jau daudzus gadus. Mūsu mērķis — lai auto iegāde būtu vienkārša, droša un pieejama arī tiem, kam bankas saka nē." />
      <div className="mx-auto mt-12 grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <div className="space-y-5 text-lg leading-relaxed text-ink-2">
          <p>Sadarbojamies ar vairākiem Eiropas izsoļu portāliem, kā arī ar partneriem Vācijā, Nīderlandē, Itālijā, Francijā un Zviedrijā. Sadarbības partneru auto laukumā {company.address.split(',')[0]} vienmēr ir vairāk nekā 100 automašīnu.</p>
          <p>Pie auto apskates konsultējam par tā detalizētu stāvokli un sniedzam visu pieejamo vēsturi. Auto vari izbraukt testa braucienā un pārbaudīt servisā pēc savas izvēles — jo dubults neplīst.</p>
          <p>Ja katalogā nav vajadzīgā auto, atradīsim to Eiropā un palīdzēsim ar piegādi un reģistrāciju.</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/katalogs" className="btn btn-primary">Skatīt katalogu</Link>
            <Link href="/kontakti" className="btn btn-ghost">Sazināties</Link>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 self-start">
          {[
            [String(cars.filter((c) => c.status !== 'sold').length), 'auto pieejami tagad'],
            [String(makes), 'dažādas markas'],
            ['36 mēn.', 'pagarinātā garantija'],
            ['0 %', 'minimālā pirmā iemaksa'],
          ].map(([v, l]) => (
            <div key={l} className="flex flex-col-reverse rounded-2xl border border-line bg-white p-6">
              <dt className="text-sm text-mute">{l}</dt>
              <dd className="num display text-4xl text-petrol">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="mx-auto mt-14 max-w-7xl px-4 sm:px-6">
        <div className="rounded-2xl bg-white p-6 text-sm text-ink-2">
          <p className="font-semibold text-ink">Rekvizīti</p>
          <p className="mt-2">{company.name}, reģ. nr. {company.regNr}</p>
          <p>Juridiskā adrese: {company.legalAddress}</p>
          <p>Faktiskā adrese: {company.address}</p>
        </div>
      </div>
    </>
  );
}
