import type { Metadata } from 'next';
import { MonitorDown, Smartphone, Zap, ShieldCheck, WifiOff, Calculator, Heart } from 'lucide-react';
import { PageHead } from '@/components/site/PageHead';
import { InstallButton, InstallSteps } from '@/components/site/InstallApp';

export const metadata: Metadata = {
  title: 'Tavs Auto lietotne datoram un telefonam',
  description: 'Instalē Tavs Auto kā programmu datorā (Windows, Mac) vai telefonā (iPhone, Android) — bez App Store, bez lejupielādēm, vienā klikšķī.',
  alternates: { canonical: '/lietotne' },
};

const PERKS = [
  { i: Zap, t: 'Atveras uzreiz', d: 'Savā logā, bez pārlūka joslām un cilnēm.' },
  { i: MonitorDown, t: 'Ikona darbvirsmā', d: 'Uzdevumjoslā, Start izvēlnē, Dock vai sākuma ekrānā.' },
  { i: Calculator, t: 'Kalkulatori pie rokas', d: 'Līzings, budžets, EKII un nodoklis — vienā klikšķī.' },
  { i: Heart, t: 'Tava izlase', d: 'Saglabātie auto un salīdzinājums paliek ierīcē.' },
  { i: WifiOff, t: 'Strādā arī vāja interneta apstākļos', d: 'Lietotne ielādējas ātrāk, un bez interneta vari mums piezvanīt.' },
  { i: ShieldCheck, t: 'Droši un bez maksas', d: 'Nav App Store, nav reģistrācijas, < 1 MB, vienmēr jaunākā versija.' },
];

export default function AppPage() {
  return (
    <>
      <PageHead crumb="Lietotne" title="Tavs Auto — lietotne tavā datorā un telefonā" lead="Viens klikšķis, un katalogs, kalkulatori un pieteikumi atveras kā īsta programma — bez App Store un bez lejupielādēm." />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <section className="mt-10 grid items-center gap-10 overflow-hidden rounded-[28px] bg-night p-6 text-white sm:p-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-signal">Instalē 5 sekundēs</p>
            <h2 className="display-md mt-2 text-3xl sm:text-4xl">Tavs Auto vienmēr pie rokas</h2>
            <p className="mt-3 max-w-lg text-white/65">Strādā uz Windows, macOS, iPhone un Android. Ja pārlūks atbalsta vienas pogas instalēšanu, poga to izdarīs uzreiz — citādi parādīsim 2–3 vienkāršus soļus.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <InstallButton variant="hero" />
              <span className="inline-flex items-center gap-2 text-sm text-white/50"><Smartphone className="h-4 w-4" /> un <MonitorDown className="h-4 w-4" /> vienā lietotnē</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-10 rounded-full bg-signal/25 blur-3xl" />
            <div className="relative rounded-2xl border border-white/10 bg-[#17181b] shadow-2xl">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#febc2e]" /><span className="h-3 w-3 rounded-full bg-[#28c840]" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-192.png" alt="" width={18} height={18} className="ml-3 h-[18px] w-[18px] rounded" />
                <span className="text-xs text-white/60">Tavs Auto</span>
              </div>
              <div className="grid grid-cols-3 gap-2 p-4">
                {['Katalogs', 'Līzings', 'Pārdot'].map((x) => <span key={x} className="rounded-lg bg-white/5 px-2 py-6 text-center text-xs font-semibold text-white/70">{x}</span>)}
                <span className="col-span-3 flex items-center gap-2 rounded-lg bg-signal/15 px-3 py-3 text-xs text-white/80"><Zap className="h-4 w-4 text-signal" /> Līzings no 0% pirmās iemaksas — aprēķini 10 sekundēs</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PERKS.map(({ i: I, t, d }) => (
            <div key={t} className="rounded-2xl border border-line bg-card p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-signal-soft text-signal"><I className="h-5 w-5" /></span>
              <p className="mt-3 font-bold text-ink">{t}</p>
              <p className="mt-1 text-sm text-ink-2">{d}</p>
            </div>
          ))}
        </section>

        <section className="mt-14 grid gap-4 lg:grid-cols-2">
          {([
            ['Windows / Chrome / Edge', 'other', false],
            ['Mac / Safari', 'mac-safari', false],
            ['iPhone / iPad', 'ios', true],
            ['Android', 'chromium', true],
          ] as const).map(([t, p, m]) => (
            <div key={t} className="rounded-2xl border border-line bg-card p-5">
              <p className="mb-4 flex items-center gap-2 font-bold text-ink">{m ? <Smartphone className="h-4 w-4 text-signal" /> : <MonitorDown className="h-4 w-4 text-signal" />} {t}</p>
              <InstallSteps platform={p} mobile={m} />
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
