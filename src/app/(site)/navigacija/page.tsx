import type { Metadata } from 'next';
import { getRadars } from '@/lib/data';
import { NavLanding } from '@/components/site/NavLanding';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Navigācija ar fotoradaru brīdinājumiem — bezmaksas',
  description: 'Bezmaksas navigācija Latvijā ar fotoradaru, vidējā ātruma posmu un mobilo radaru brīdinājumiem. Maršruts ar radariem, norādes latviski, 3D karte, degvielas un uzlādes stacijas. Darbojas pārlūkā.',
  alternates: { canonical: '/navigacija' },
};

const FAQ: [string, string][] = [
  ['Vai navigācija ir bez maksas?', 'Jā. Tavs Auto navigācija ir pilnīgi bezmaksas, bez reģistrācijas un bez lietotnes lejupielādes — tā darbojas tavā telefona pārlūkā.'],
  ['Kuri radari ir redzami maršrutā?', 'Visi stacionārie fotoradari (CSDD), vidējā ātruma kontroles posmi un Valsts policijas publicētās pārvietojamo fotoradaru iespējamās vietas, kas atrodas tieši uz izvēlētā maršruta.'],
  ['Vai navigācija strādā bez interneta?', 'Kartei un maršrutam vajadzīgs mobilais internets. Datu patēriņš ir neliels — līdzīgs citām navigācijas lietotnēm.'],
  ['Vai tiek saglabāta mana atrašanās vieta?', 'Nē. Atrašanās vieta tiek izmantota tavā ierīcē. Maršruta aprēķinam sākuma un galamērķa koordinātas tiek nosūtītas bezmaksas maršrutēšanas servisam, bet netiek saglabātas pie mums.'],
];

export default async function NavPage() {
  const radars = await getRadars();
  const ld = [
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Tavs Auto navigācija', applicationCategory: 'TravelApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, inLanguage: 'lv' },
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <NavLanding radars={radars} />
      <section className="mx-auto max-w-3xl px-4 pb-6 sm:px-6">
        <h2 className="display-md text-2xl text-ink">Biežāk uzdotie jautājumi</h2>
        <div className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="cursor-pointer list-none font-semibold text-ink">{q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
