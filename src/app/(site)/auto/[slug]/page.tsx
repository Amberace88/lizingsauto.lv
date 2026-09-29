import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { BatteryCharging, CheckCircle2 } from 'lucide-react';
import { getCarBySlug, getPublicCars, getSettings, similarCars } from '@/lib/data';
import { BODY_LABEL, DRIVE_LABEL, FUEL_LABEL, GEAR_LABEL, SITE_URL, STATUS_LABEL, carBadges, carName, carUrl, km, money, sortedImages } from '@/lib/format';
import { fromPayment } from '@/lib/leasing';
import { ekiiForCar } from '@/lib/ekii';
import { Gallery } from '@/components/site/Gallery';
import { CarActions, CarContactPanel, ViewPing } from '@/components/site/CarDetailClient';
import { CarCard } from '@/components/site/CarCard';
import { Equipment } from '@/components/site/Equipment';
import { OdometerHistory, TaxBox, WarrantyBox } from '@/components/site/CarExtras';

export const revalidate = 60;

export async function generateStaticParams() {
  const cars = await getPublicCars({ includeSold: true });
  return cars.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const car = await getCarBySlug(slug);
  if (!car) return { title: 'Auto nav atrasts', robots: { index: false } };
  const { leasing } = await getSettings();
  const name = `${carName(car)} ${car.year ?? ''}`.trim();
  const desc = `${name}, ${car.fuel ? FUEL_LABEL[car.fuel] : ''}${car.engine_volume ? ` ${car.engine_volume}` : ''}, ${car.transmission ? GEAR_LABEL[car.transmission].toLowerCase() : ''}, ${km(car.mileage)}. Cena ${money(car.price)}, līzingā no ${fromPayment(car.price, leasing)} €/mēn. ${car.status === 'sold' ? 'Pārdots.' : 'Iespējams līzings arī ar sabojātu kredītvēsturi.'}`;
  const img = sortedImages(car)[0]?.url;
  return {
    title: `${name} — ${money(car.price)}${car.status === 'sold' ? ' (pārdots)' : ''}`,
    description: desc,
    alternates: { canonical: carUrl(car) },
    openGraph: { title: `${name} — ${money(car.price)}`, description: desc, url: carUrl(car), images: img ? [{ url: img, width: 1200, height: 900, alt: name }] : [] },
  };
}

export default async function CarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const car = await getCarBySlug(slug);
  if (!car) notFound();
  if (car.slug !== slug) permanentRedirect(carUrl(car));
  const [{ leasing, company, ekii, warranty }, all] = await Promise.all([getSettings(), getPublicCars()]);
  const images = sortedImages(car).map((i) => i.url);
  const badges = carBadges(car);
  const name = carName(car);
  const monthly = fromPayment(car.price, leasing);
  const ev = ekiiForCar(ekii, car);
  const similar = similarCars(all, car);

  const specs: [string, string | null][] = [
    ['Marka', car.make],
    ['Modelis', car.model],
    ['Izlaiduma gads', car.year ? String(car.year) : null],
    ['Nobraukums', car.mileage != null ? km(car.mileage) : null],
    ['Degviela', car.fuel ? FUEL_LABEL[car.fuel] : null],
    ['Dzinēja tilpums', car.engine_volume ? `${car.engine_volume.toFixed(1)} l` : null],
    ['Jauda', car.power_kw ? `${car.power_kw} kW (${Math.round(car.power_kw * 1.36)} ZS)` : null],
    ['Baterija', car.battery_kwh ? `${car.battery_kwh} kWh` : null],
    ['Nobraukums ar uzlādi', car.range_km ? `līdz ${car.range_km} km` : null],
    ['Ātrumkārba', car.transmission ? GEAR_LABEL[car.transmission] : null],
    ['Piedziņa', car.drive ? DRIVE_LABEL[car.drive] : null],
    ['Virsbūve', car.body_type ? BODY_LABEL[car.body_type] || car.body_type : null],
    ['Krāsa', car.color],
    ['Durvis / sēdvietas', car.doors || car.seats ? `${car.doors ?? '—'} / ${car.seats ?? '—'}` : null],
    ['Vid. patēriņš', car.consumption ? `${car.consumption} l/100 km` : null],
    ['CO₂', car.co2 ? `${car.co2} g/km` : null],
    ['Tehniskā apskate līdz', car.ta_until ? new Date(car.ta_until).toLocaleDateString('lv-LV') : null],
    ['VIN', car.vin],
  ];

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: `${name} ${car.year ?? ''}`.trim(),
    description: car.description || car.title,
    brand: { '@type': 'Brand', name: car.make },
    model: car.model,
    vehicleModelDate: car.year ? String(car.year) : undefined,
    mileageFromOdometer: car.mileage != null ? { '@type': 'QuantitativeValue', value: car.mileage, unitCode: 'KMT' } : undefined,
    fuelType: car.fuel ? FUEL_LABEL[car.fuel] : undefined,
    vehicleTransmission: car.transmission ? GEAR_LABEL[car.transmission] : undefined,
    bodyType: car.body_type ? BODY_LABEL[car.body_type] : undefined,
    vehicleIdentificationNumber: car.vin || undefined,
    itemCondition: 'https://schema.org/UsedCondition',
    image: images.slice(0, 8),
    url: `${SITE_URL}${carUrl(car)}`,
    offers: {
      '@type': 'Offer',
      price: car.price,
      priceCurrency: 'EUR',
      availability: car.status === 'sold' ? 'https://schema.org/SoldOut' : car.status === 'reserved' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
      seller: { '@id': `${SITE_URL}/#dealer` },
      url: `${SITE_URL}${carUrl(car)}`,
    },
  };
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Sākums', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Auto katalogs', item: `${SITE_URL}/katalogs` },
      { '@type': 'ListItem', position: 3, name, item: `${SITE_URL}${carUrl(car)}` },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <ViewPing slug={car.slug} />
      <nav className="text-sm text-mute" aria-label="Navigācijas ceļš">
        <Link href="/" className="hover:text-ink">Sākums</Link> / <Link href="/katalogs" className="hover:text-ink">Auto katalogs</Link> / <Link href={`/katalogs?make=${encodeURIComponent(car.make)}`} className="hover:text-ink">{car.make}</Link>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.55fr_1fr]">
        <div className="min-w-0">
          <Gallery images={images} alt={`${name} ${car.year ?? ''}`} badges={badges} status={car.status} />
        </div>
        <div className="lg:row-span-2">
          <div>
            <div className="mb-5">
              {car.status !== 'published' && (
                <span className={`mb-2 inline-block rounded-full px-3 py-1 text-xs font-bold text-white ${car.status === 'sold' ? 'bg-bad' : 'bg-warn'}`}>{STATUS_LABEL[car.status]}</span>
              )}
              <h1 className="display text-[2.1rem] text-ink sm:text-[2.6rem]">{name}</h1>
              <p className="mt-2 text-ink-2">{car.title}</p>
              <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
                <p className="num display-md text-[2rem] text-ink">{money(car.price)}</p>
                {car.old_price && car.old_price > car.price && <p className="num pb-1 text-lg text-mute line-through">{money(car.old_price)}</p>}
                {car.vat_included && <span className="mb-1.5 rounded-md bg-petrol-soft px-2 py-0.5 text-xs font-semibold text-petrol">Cena ar PVN</span>}
              </div>
              {car.status !== 'sold' && <p className="num mt-1 text-sm text-ink-2">Līzingā no <b className="text-ink">{monthly} €/mēn.</b></p>}
              <div className="mt-4"><CarActions id={car.id} title={`${name} ${car.year ?? ''}`} /></div>
            </div>
            {ev && car.status !== 'sold' && (
              <div className="mb-4 flex gap-3 rounded-2xl bg-petrol-2 p-4 text-white">
                <BatteryCharging className="h-6 w-6 shrink-0 text-signal" />
                <div className="text-sm">
                  <p className="font-bold">Pieejams EKII atbalsts — {money(ev.base)}</p>
                  <p className="text-white/75">Cena ar atbalstu no <b className="text-white">{money(ev.finalPrice)}</b>. Nododot veco auto, vēl +{money(ekii.scrapBonus)}. <Link href={`/elektroauto?auto=${car.slug}`} className="font-semibold text-signal underline">Aprēķināt precīzi</Link></p>
                </div>
              </div>
            )}
            <WarrantyBox car={car} w={warranty} />
            <CarContactPanel carId={car.id} carTitle={`${name} ${car.year ?? ''}`} price={car.price} leasing={leasing} phone={company.phone} whatsapp={company.whatsapp} sold={car.status === 'sold'} />
          </div>
        </div>

        <div className="min-w-0 space-y-10">
          <section aria-labelledby="specs">
            <h2 id="specs" className="display-md text-2xl text-ink">Tehniskie dati</h2>
            <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
              {specs.filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line py-2.5 text-[0.95rem]">
                  <dt className="text-mute">{k}</dt>
                  <dd className="num text-right font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5"><TaxBox car={car} /></div>
          </section>

          <OdometerHistory car={car} />

          {car.equipment.length > 0 && (
            <section aria-labelledby="equipment">
              <h2 id="equipment" className="display-md text-2xl text-ink">Aprīkojums</h2>
              <Equipment items={car.equipment} />
            </section>
          )}

          {car.description && (
            <section aria-labelledby="desc">
              <h2 id="desc" className="display-md text-2xl text-ink">Apraksts</h2>
              <div className="prose-car mt-4 max-w-2xl">
                {car.description.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-line bg-card p-6">
            <h2 className="display-md text-xl text-ink">Pērkot pie mums</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {['Testa brauciens un pārbaude servisā pēc tavas izvēles', 'Līzings no 0% pirmās iemaksas', 'Līzings arī ar sabojātu kredītvēsturi', 'Vecais auto var būt pirmā iemaksa', 'Pagarinātā garantija līdz 36 mēnešiem (Mango Insurance)', 'Palīdzam ar reģistrāciju CSDD'].map((t) => (
                <li key={t} className="flex gap-2 text-sm text-ink-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-ok" /> {t}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="display-md text-2xl text-ink sm:text-3xl">Līdzīgi auto</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((c) => <CarCard key={c.id} car={c} leasing={leasing} />)}
          </div>
        </section>
      )}
    </div>
  );
}
