import type { Metadata } from 'next';
import { getSettings } from '@/lib/data';
import { SITE_HOST } from '@/lib/format';
import { PageHead } from '@/components/site/PageHead';

export const metadata: Metadata = { title: 'Lietošanas noteikumi', alternates: { canonical: '/lietosanas-noteikumi' } };

export default async function TermsPage() {
  const { company } = await getSettings();
  return (
    <>
      <PageHead crumb="Lietošanas noteikumi" title="Lietošanas noteikumi" />
      <article className="prose-car mx-auto mt-8 max-w-3xl px-4 sm:px-6">
        <p>Mājaslapu {SITE_HOST} uztur {company.name} (reģ. nr. {company.regNr}).</p>
        <p>Sludinājumos norādītā informācija par automašīnām ir informatīva un var saturēt neprecizitātes. Pirms pirkuma aicinām auto apskatīt klātienē, veikt testa braucienu un pārbaudīt tehnisko stāvokli servisā.</p>
        <p>Līzinga, nodokļu un EKII atbalsta kalkulatoru rezultāti ir orientējoši un nav uzskatāmi par piedāvājumu. Galīgos nosacījumus nosaka līzinga devējs, valsts iestādes un programmas administrētājs.</p>
        <p>Cenas norādītas eiro. Ja nav norādīts “ar PVN”, cena attiecas uz darījumu, kurā PVN netiek atsevišķi izdalīts. Auto rezervācija stājas spēkā pēc apstiprinājuma no mūsu puses.</p>
        <p>Mājaslapas saturu un fotogrāfijas bez rakstiskas atļaujas kopēt aizliegts.</p>
      </article>
    </>
  );
}
