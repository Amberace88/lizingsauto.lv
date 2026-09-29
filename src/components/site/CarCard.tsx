'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Gauge, Fuel, Calendar, Cog } from 'lucide-react';
import type { Car, LeasingSettings } from '@/lib/types';
import { BADGES, carBadges, carName, carUrl, coverImage, FUEL_LABEL, GEAR_LABEL, money, number } from '@/lib/format';
import { fromPayment } from '@/lib/leasing';
import { useFavorites } from './favorites';

const TONE: Record<string, string> = {
  signal: 'bg-signal text-white',
  petrol: 'bg-card/95 text-ink',
  ok: 'bg-ok text-white',
  ink: 'bg-night/85 text-white',
  bad: 'bg-bad text-white',
};

export function BadgeChips({ badges, max = 3, size = 'sm' }: { badges: string[]; max?: number; size?: 'sm' | 'md' }) {
  const shown = badges.slice(0, max);
  const rest = badges.length - shown.length;
  const cls = size === 'md' ? 'px-3 py-1.5 text-[0.8rem]' : 'px-2.5 py-1 text-[0.72rem]';
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((b) => (
        <span key={b} className={`${TONE[BADGES[b].tone]} ${cls} rounded-full font-semibold shadow-sm backdrop-blur-sm`}>
          {BADGES[b].label}
        </span>
      ))}
      {rest > 0 && <span className={`${cls} rounded-full bg-card/90 font-semibold text-ink`}>+{rest}</span>}
    </div>
  );
}

export function StatusRibbon({ status }: { status: string }) {
  if (status !== 'reserved' && status !== 'sold') return null;
  return (
    <div className={`absolute inset-x-0 bottom-0 z-10 py-1.5 text-center text-sm font-bold tracking-wide text-white ${status === 'sold' ? 'bg-bad/90' : 'bg-warn/90'}`}>
      {status === 'sold' ? 'Pārdots' : 'Rezervēts'}
    </div>
  );
}

export function CarCard({ car, leasing, priority = false }: { car: Car; leasing: LeasingSettings; priority?: boolean }) {
  const img = coverImage(car);
  const badges = carBadges(car);
  const { has, toggle } = useFavorites();
  const fav = has(car.id);
  const monthly = fromPayment(car.price, leasing);
  const dim = car.status === 'sold';

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-card shadow-[0_1px_0_var(--color-line)] transition-shadow hover:shadow-[var(--shadow-lift)]">
      <Link href={carUrl(car)} className="relative block aspect-[4/3] overflow-hidden bg-line" aria-label={`${carName(car)}, ${car.year}`}>
        {img && (
          <Image
            src={img}
            alt={`${carName(car)} ${car.year ?? ''}`}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className={`object-cover transition-transform duration-500 group-hover:scale-[1.04] ${dim ? 'grayscale-[60%]' : ''}`}
          />
        )}
        <div className="absolute left-3 top-3 z-10 max-w-[80%]">
          <BadgeChips badges={badges} max={2} />
        </div>
        {car.status !== 'sold' && (
          <div className="price-tag num absolute bottom-3 left-3 z-10 rounded-lg px-2.5 py-1.5 text-sm font-bold shadow-md">
            no {number(monthly)} €/mēn.
          </div>
        )}
        <StatusRibbon status={car.status} />
      </Link>
      <button
        onClick={() => toggle(car.id)}
        className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-card/90 shadow transition hover:scale-105"
        aria-pressed={fav}
        aria-label={fav ? 'Noņemt no izlases' : 'Pievienot izlasei'}
      >
        <Heart className={`h-[18px] w-[18px] ${fav ? 'fill-bad text-bad' : 'text-ink'}`} />
      </button>
      <Link href={carUrl(car)} className="flex flex-1 flex-col p-4">
        <h3 className="display-md text-[1.15rem] text-ink">{carName(car)}</h3>
        <p className="mt-1 line-clamp-1 text-sm text-mute">{car.title}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[0.82rem] text-ink-2">
          <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-mute" /><dt className="sr-only">Gads</dt><dd className="num">{car.year ?? '—'}</dd></div>
          <div className="flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5 text-mute" /><dt className="sr-only">Nobraukums</dt><dd className="num">{car.mileage != null ? `${number(car.mileage)} km` : '—'}</dd></div>
          <div className="flex items-center gap-1.5"><Fuel className="h-3.5 w-3.5 text-mute" /><dt className="sr-only">Degviela</dt><dd>{car.fuel ? FUEL_LABEL[car.fuel] : '—'}{car.engine_volume ? ` ${car.engine_volume.toFixed(1)}` : ''}</dd></div>
          <div className="flex items-center gap-1.5"><Cog className="h-3.5 w-3.5 text-mute" /><dt className="sr-only">Ātrumkārba</dt><dd>{car.transmission ? GEAR_LABEL[car.transmission] : '—'}</dd></div>
        </dl>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div>
            <p className="num display-md text-[1.35rem] text-ink">{money(car.price)}</p>
            {car.old_price && car.old_price > car.price && <p className="num text-xs text-mute line-through">{money(car.old_price)}</p>}
          </div>
          {car.vat_included && <span className="rounded-md bg-petrol-soft px-2 py-0.5 text-[0.7rem] font-semibold text-petrol">ar PVN</span>}
        </div>
      </Link>
    </article>
  );
}
