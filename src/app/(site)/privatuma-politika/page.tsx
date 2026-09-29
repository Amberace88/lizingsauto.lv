import type { Metadata } from 'next';
import { getSettings } from '@/lib/data';
import { PageHead } from '@/components/site/PageHead';

export const metadata: Metadata = { title: 'Privātuma politika', alternates: { canonical: '/privatuma-politika' } };

export default async function PrivacyPage() {
  const { company } = await getSettings();
  return (
    <>
      <PageHead crumb="Privātuma politika" title="Privātuma politika" />
      <article className="prose-car mx-auto mt-8 max-w-3xl px-4 sm:px-6">
        <p><b>Pārzinis:</b> {company.name}, reģ. nr. {company.regNr}, juridiskā adrese {company.legalAddress}, e-pasts {company.email}, tālrunis {company.phone}.</p>
        <h2 className="display-md mt-8 text-xl text-ink">Kādus datus apstrādājam</h2>
        <p>Vārdu, uzvārdu, tālruni, e-pastu un informāciju, ko pats norādi pieteikuma formās (piemēram, ienākumu līmeni, darba vietu, informāciju par savu auto). Personas kodu vai dokumentu kopijas mājaslapā neievācam.</p>
        <h2 className="display-md mt-8 text-xl text-ink">Kādam nolūkam</h2>
        <p>Lai atbildētu uz tavu pieprasījumu, sagatavotu auto vai līzinga piedāvājumu, noorganizētu testa braucienu vai auto novērtējumu. Juridiskais pamats — tava piekrišana un pasākumi pēc tava pieprasījuma pirms līguma noslēgšanas (VDAR 6. panta 1. punkta a) un b) apakšpunkts).</p>
        <h2 className="display-md mt-8 text-xl text-ink">Kam datus nododam</h2>
        <p>Līzinga pieteikuma gadījumā — tikai ar tavu ziņu līzinga devējiem, lai saņemtu piedāvājumu. Tehniskajiem pakalpojumu sniedzējiem (mitināšana, datubāze), kas datus apstrādā mūsu uzdevumā Eiropas Savienībā. Datus nepārdodam.</p>
        <h2 className="display-md mt-8 text-xl text-ink">Cik ilgi glabājam</h2>
        <p>Pieteikumu datus glabājam līdz 24 mēnešiem pēc pēdējās saziņas, ja vien ilgāku glabāšanu neprasa normatīvie akti (piemēram, grāmatvedības dokumenti).</p>
        <h2 className="display-md mt-8 text-xl text-ink">Tavas tiesības</h2>
        <p>Tu vari pieprasīt piekļuvi saviem datiem, to labošanu vai dzēšanu, apstrādes ierobežošanu, iebilst pret apstrādi un atsaukt piekrišanu, rakstot uz {company.email}. Sūdzību vari iesniegt Datu valsts inspekcijā (www.dvi.gov.lv).</p>
        <h2 className="display-md mt-8 text-xl text-ink">Sīkdatnes</h2>
        <p>Mājaslapa izmanto tikai darbībai nepieciešamās tehniskās iespējas: izlase un salīdzināmie auto tiek saglabāti tikai tavā pārlūkā. Reklāmas vai izsekošanas sīkdatnes bez tavas piekrišanas neizmantojam.</p>
      </article>
    </>
  );
}
