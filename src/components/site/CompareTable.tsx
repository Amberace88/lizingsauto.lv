'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import type { Car, LeasingSettings } from '@/lib/types';
import { BODY_LABEL, DRIVE_LABEL, FUEL_LABEL, GEAR_LABEL, carName, carUrl, coverImage, km, money } from '@/lib/format';
import { fromPayment } from '@/lib/leasing';
import { useCompare } from './favorites';

export function CompareTable({ cars, leasing }: { cars: Car[]; leasing: LeasingSettings }) {
  const sp = useSearchParams();
  const cmp = useCompare();
  const ids = (sp.get('ids')?.split(',') || cmp.ids).filter(Boolean);
  const list = ids.map((id) => cars.find((c) => c.id === id)).filter(Boolean) as Car[];
  if (list.length === 0)
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center">
        <p className="font-semibold">Nav izvēlēts neviens auto.</p>
        <p className="mt-1 text-sm text-ink-2">Auto lapā spied “Salīdzināt” (līdz 3 auto).</p>
        <Link href="/katalogs" className="btn btn-primary mt-5">Uz katalogu</Link>
      </div>
    );
  const rows: [string, (c: Car) => string][] = [
    ['Cena', (c) => money(c.price)],
    ['Līzingā no', (c) => `${fromPayment(c.price, leasing)} €/mēn.`],
    ['Gads', (c) => String(c.year ?? '—')],
    ['Nobraukums', (c) => km(c.mileage)],
    ['Degviela', (c) => (c.fuel ? FUEL_LABEL[c.fuel] : '—')],
    ['Dzinējs', (c) => (c.engine_volume ? `${c.engine_volume.toFixed(1)} l` : '—')],
    ['Jauda', (c) => (c.power_kw ? `${c.power_kw} kW` : '—')],
    ['Ātrumkārba', (c) => (c.transmission ? GEAR_LABEL[c.transmission] : '—')],
    ['Piedziņa', (c) => (c.drive ? DRIVE_LABEL[c.drive] : '—')],
    ['Virsbūve', (c) => (c.body_type ? BODY_LABEL[c.body_type] : '—')],
    ['Patēriņš', (c) => (c.consumption ? `${c.consumption} l/100 km` : '—')],
    ['Aprīkojuma vienības', (c) => String(c.equipment.length)],
  ];
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr>
            <th className="w-40 p-4" />
            {list.map((c) => (
              <th key={c.id} className="p-4 text-left align-top">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-line">
                  {coverImage(c) && <Image src={coverImage(c)!} alt={carName(c)} fill sizes="300px" className="object-cover" />}
                  <button onClick={() => cmp.toggle(c.id)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-card/90" aria-label="Noņemt"><X className="h-4 w-4" /></button>
                </div>
                <Link href={carUrl(c)} className="display-md mt-3 block text-lg text-ink hover:text-petrol">{carName(c)}</Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, f]) => (
            <tr key={k} className="border-t border-line">
              <th className="p-4 text-left font-medium text-mute">{k}</th>
              {list.map((c) => <td key={c.id} className="num p-4 font-semibold text-ink">{f(c)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
