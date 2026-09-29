import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Globe2, Wallet, Repeat2, Zap, Banknote, Megaphone, ArrowLeftRight, Handshake, BatteryCharging, ArrowRight, Car as CarIcon, Truck, CarFront, Bus } from 'lucide-react';
import { getPublicCars, getSettings } from '@/lib/data';
import { BudgetHero, type MiniCar } from '@/components/site/BudgetHero';
import { CarCard } from '@/components/site/CarCard';
import { carName, coverImage, money } from '@/lib/format';
import { Faq } from '@/components/site/Faq';
import { HOME_FAQ } from '@/lib/faq';
import { PLANS, PLAN_ORDER, limitLabel } from '@/lib/warranty';

export default async function HomePage() {
  const [cars, settings] = await Promise.all([getPublicCars(), getSettings()]);
  const { leasing, content, company, ekii, warranty } = settings;
  const available = cars.filter((c) => c.status === 'published');
  const mini: MiniCar[] = available.map((c) => ({ id: c.id, slug: c.slug, name: carName(c), year: c.year, price: c.price, img: coverImage(c) }));
  const featured = [...available.filter((c) => c.featured), ...available.filter((c) => !c.featured)].slice(0, 8);
  const evs = cars.filter((c) => c.fuel === 'electric' && c.status !== 'sold').slice(0, 3);
  const evCount = cars.filter((c) => c.fuel === 'electric' && c.status !== 'sold').length;
  const counts = (fn: (c: (typeof cars)[number]) => boolean) => available.filter(fn).length;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pb-24 lg:pt-14">
          <div className="min-w-0">
            <h1 className="display text-[2.6rem] text-ink sm:text-[3.6rem] lg:text-[4rem]">
              {content.heroTitle || 'Auto ar līzingu. Arī tad, ja banka atteica.'}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
              {content.heroText ||
                'Pārbaudīti lietoti auto no Eiropas. Līzings no 0% pirmās iemaksas, arī ar sabojātu kredītvēsturi un ārzemēs strādājošajiem.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/katalogs" className="btn btn-primary text-base">
                Skatīt {available.length} auto
              </Link>
              <Link href="/lizings#pieteikums" className="btn btn-ghost text-base">
                Pieteikties līzingam
              </Link>
            </div>
            <ul className="mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {[
                { i: Wallet, t: 'No 0% pirmās iemaksas' },
                { i: Globe2, t: 'Līzings ārzemēs strādājošajiem' },
                { i: ShieldCheck, t: 'Garantija līdz 36 mēnešiem' },
                { i: Repeat2, t: 'Vecais auto kā pirmā iemaksa' },
              ].map(({ i: Icon, t }) => (
                <li key={t} className="flex items-center gap-3 font-medium text-ink">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-petrol-soft text-petrol">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0"><BudgetHero cars={mini} leasing={leasing} /></div>
        </div>
      </section>

      {/* KATEGORIJAS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6" aria-label="Ātrā meklēšana">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          {[
            { href: '/katalogs?fuel=electric', label: 'Elektroauto', n: counts((c) => c.fuel === 'electric'), icon: Zap },
            { href: '/katalogs?body=suv', label: 'Apvidus', n: counts((c) => c.body_type === 'suv'), icon: CarFront },
            { href: '/katalogs?body=wagon', label: 'Universāļi', n: counts((c) => c.body_type === 'wagon'), icon: CarIcon },
            { href: '/katalogs?body=sedan', label: 'Sedani', n: counts((c) => c.body_type === 'sedan'), icon: CarIcon },
            { href: '/katalogs?body=van', label: 'Mikroautobusi', n: counts((c) => c.body_type === 'van'), icon: Bus },
            { href: '/katalogs?maxPrice=5000', label: 'Līdz 5000 €', n: counts((c) => c.price <= 5000), icon: Wallet },
            { href: '/katalogs?drive=awd', label: '4x4', n: counts((c) => c.drive === 'awd'), icon: Truck },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-petrol hover:text-petrol">
              <c.icon className="h-4 w-4" /> {c.label} <span className="num text-mute">{c.n}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* JAUNĀKIE */}
      <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="display-md text-3xl text-ink sm:text-4xl">Tikko ievesti un izvēlēti</h2>
          <Link href="/katalogs" className="hidden shrink-0 font-semibold text-petrol hover:underline sm:inline">
            Viss katalogs
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((c, i) => (
            <CarCard key={c.id} car={c} leasing={leasing} priority={i < 4} />
          ))}
        </div>
        <Link href="/katalogs" className="btn btn-ghost mt-6 w-full sm:hidden">
          Viss katalogs
        </Link>
      </section>

      {/* ELEKTROAUTO + EKII */}
      <section className="mt-24 bg-petrol-2 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-signal">
              <BatteryCharging className="h-4 w-4" /> {evCount} elektroauto katalogā
            </p>
            <p className="ml-2 inline-flex items-center rounded-full bg-signal px-3 py-1 text-sm font-semibold text-white">Atbalsts līdz {ekii.maxIntensityPct}% no cenas</p>
            <h2 className="display mt-5 text-[2.3rem] sm:text-[3rem]">Elektroauto ar valsts atbalstu līdz {money(ekii.familyNew7)}</h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/75">
              Palīdzam saņemt EKII atbalstu: pārbaudām, vai auto atbilst prasībām, sagatavojam dokumentus un saskaņojam līzingu, lai atbalsts samazinātu tavu maksājumu.
            </p>
            <ol className="mt-8 space-y-4">
              {[
                ['Izvēlies elektroauto', 'Parādām, kuri auto atbilst programmai un cik liels atbalsts pienākas.'],
                ['Mēs sakārtojam formalitātes', 'Pieteikums, rēķins, līzinga saskaņošana — visu nokārtojam kopā ar tevi.'],
                ['Brauc un maksā mazāk', `Lietotam auto ${money(ekii.usedAmount)}, jaunam ${money(ekii.newAmount)}, Goda ģimenēm līdz ${money(ekii.familyNew7)}, par vecā auto nodošanu vēl +${money(ekii.scrapBonus)} — kopā līdz ${ekii.maxIntensityPct}% no auto cenas.`],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="num grid h-9 w-9 shrink-0 place-items-center rounded-full bg-signal font-bold text-white">{i + 1}</span>
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm text-white/65">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/elektroauto" className="btn btn-signal">
                Aprēķināt cenu ar atbalstu
              </Link>
              <Link href="/katalogs?fuel=electric" className="btn border border-white/25 text-white hover:bg-white/10">
                Visi elektroauto
              </Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {evs.map((c, i) => {
              const img = coverImage(c);
              return (
                <Link key={c.id} href={`/auto/${c.slug}`} className={`group relative overflow-hidden rounded-2xl bg-white/5 ${i === 0 ? 'sm:col-span-2 aspect-[16/9]' : 'aspect-[4/3]'}`}>
                  {img && <Image src={img} alt={carName(c)} fill sizes="(max-width:1024px) 100vw, 40vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4">
                    <p className="display-md text-lg">{carName(c)}</p>
                    <p className="num text-sm text-white/80">{c.year} · {money(c.price)}</p>
                  </div>
                  {c.status === 'reserved' && <span className="absolute right-3 top-3 rounded-full bg-warn px-2.5 py-1 text-xs font-bold">Rezervēts</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* KĀ NOTIEK LĪZINGS */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <h2 className="display-md max-w-2xl text-3xl text-ink sm:text-4xl">No pieteikuma līdz atslēgām — parasti vienā dienā</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {[
            ['Izvēlies auto', 'Katalogā vai piezvani — atradīsim pēc tava budžeta.'],
            ['Aizpildi pieteikumu', 'Bezmaksas izskatīšana. Arī ar sabojātu kredītvēsturi.'],
            ['Saņem lēmumu', 'Sadarbojamies ar vairākiem līzinga devējiem — izvēlamies izdevīgāko.'],
            ['Paraksti un brauc', 'Testa brauciens, līguma parakstīšana, auto reģistrācija.'],
          ].map(([t, d], i) => (
            <li key={t} className="relative rounded-2xl border border-line bg-card p-6">
              <span className="num display text-5xl text-petrol/15">{i + 1}</span>
              <p className="mt-2 text-lg font-bold text-ink">{t}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* GARANTIJA */}
      {warranty.enabled && (
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 rounded-[24px] border border-line bg-card p-8 sm:p-12 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-signal-soft px-3 py-1 text-xs font-bold text-signal"><ShieldCheck className="h-4 w-4" /> Sadarbībā ar {warranty.provider}</span>
              <h2 className="display-md mt-4 text-3xl text-ink sm:text-4xl">Pagarinātā garantija — brauc bez bažām</h2>
              <p className="mt-4 max-w-md text-ink-2">
                Dzinējs, pārnesumkārba, turbo, elektronika — līdz 36 mēnešiem, ar neierobežotu gada nobraukumu un evakuatoru. Garantiju var iekļaut arī līzingā.
              </p>
              <Link href="/garantija" className="btn btn-signal mt-8">Izvēlēties plānu <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[...PLAN_ORDER].reverse().map((p) => (
                <Link key={p} href="/garantija#kalkulators" className="group rounded-2xl border border-line bg-paper p-5 transition hover:-translate-y-0.5 hover:border-signal">
                  <p className="display-md text-lg text-ink">{PLANS[p].name}</p>
                  <p className="mt-1 text-xs text-mute">līdz {PLANS[p].maxAge} g. · {Math.round(PLANS[p].maxKm / 1000)}k km</p>
                  <p className="mt-3 text-sm text-ink-2">Kopējais limits <b className="text-ink">{limitLabel(PLANS[p].total)}</b></p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PĀRDOT / MAINĪT */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="grid overflow-hidden rounded-[24px] bg-night text-white md:grid-cols-2">
          <div className="p-8 sm:p-12">
            <h2 className="display-md text-3xl sm:text-4xl">Tavs vecais auto var būt pirmā iemaksa</h2>
            <p className="mt-4 max-w-md text-white/70">
              Iegādājamies auto uzreiz vai pārdodam tavā vietā mūsu laukumā, ko ik dienu redz simtiem garāmgājēju. Bezmaksas novērtējums un diagnostika.
            </p>
            <Link href="/pardot-auto" className="btn btn-signal mt-8">
              Novērtēt manu auto <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-px bg-white/10">
            {([
              [Banknote, 'Nauda uzreiz', 'Izmaksājam darījuma dienā'],
              [Megaphone, 'Bez sludinājumiem', 'Nav jāsarunā ar pircējiem'],
              [ArrowLeftRight, 'Maiņa', 'Nomaini auto ar piemaksu'],
              [Handshake, 'Komisija', 'Pārdodam tavā vietā'],
            ] as const).map(([Icon, t, d]) => (
              <div key={t} className="bg-night p-6 sm:p-8">
                <Icon className="h-6 w-6 text-signal" />
                <p className="mt-3 font-bold">{t}</p>
                <p className="text-sm text-white/60">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUJ */}
      <section className="mx-auto mt-24 grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="display-md text-3xl text-ink sm:text-4xl">Biežāk uzdotie jautājumi</h2>
          <p className="mt-4 text-ink-2">Neatradi atbildi? Zvani <a className="num font-semibold text-petrol" href={`tel:${company.phone.replace(/\s/g, '')}`}>{company.phone}</a> vai raksti WhatsApp.</p>
        </div>
        <Faq items={HOME_FAQ} />
      </section>

      {/* KARTE */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <div className="grid overflow-hidden rounded-[24px] border border-line bg-card md:grid-cols-[1fr_1.5fr]">
          <div className="p-8">
            <h2 className="display-md text-2xl text-ink">Brauc apskatīt</h2>
            <p className="mt-3 text-ink-2">{company.address}</p>
            <p className="mt-1 text-sm text-mute">Teikā, sadarbības partneru auto laukumā ar vairāk nekā 100 auto.</p>
            <dl className="mt-6 space-y-1 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-mute">Darba dienās</dt><dd className="num font-semibold">{company.hours.weekdays}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-mute">Sestdienās</dt><dd className="num font-semibold">{company.hours.saturday}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-mute">Svētdienās</dt><dd className="font-semibold">{company.hours.sunday}</dd></div>
            </dl>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(company.address)}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-6">
              Maršruts
            </a>
          </div>
          <iframe
            title="Karte: Tavs Auto atrašanās vieta"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(company.address)}&z=15&output=embed`}
            className="h-80 w-full border-0 md:h-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </>
  );
}
