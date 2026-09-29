'use client';
import { useEffect, useState } from 'react';
import { BellRing, Check, MessageCircle, Phone, Mail } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Car } from '@/lib/types';
import { matchCar, type Criteria } from '@/lib/landings';
import { SITE_URL, carUrl } from '@/lib/format';
import { Card } from './CarEditor';

type AlertLead = { id: string; name: string | null; phone: string | null; email: string | null; status: string; created_at: string; data: Record<string, unknown> };

export function alertCriteria(d: Record<string, unknown>): Criteria {
  const k: Criteria = {};
  const num = (x: unknown) => (x == null || x === '' ? undefined : Number(x));
  if (d.c_make) k.make = String(d.c_make);
  if (d.c_model) k.model = String(d.c_model);
  if (d.c_fuel) k.fuel = String(d.c_fuel);
  if (d.c_body) k.body = String(d.c_body);
  if (d.c_gear) k.gear = String(d.c_gear);
  if (d.c_drive) k.drive = String(d.c_drive);
  k.minPrice = num(d.c_minPrice);
  k.maxPrice = num(d.c_maxPrice);
  k.minYear = num(d.c_minYear);
  k.maxKm = num(d.c_maxKm);
  k.minSeats = num(d.c_minSeats);
  return k;
}

/** Auto redaktorā: klienti ar saglabātu meklējumu, kuriem šis auto der. */
export function AlertMatches({ car }: { car: Partial<Car> }) {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<AlertLead[]>([]);
  useEffect(() => {
    sb.from('leads').select('id,name,phone,email,status,created_at,data').eq('type', 'contact').eq('data->>kind', 'alert').in('status', ['new', 'in_progress']).order('created_at', { ascending: false }).limit(300).then(({ data }: { data: AlertLead[] | null }) => setRows(data || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!car.make || !car.price) return null;
  const matches = rows.filter((r) => matchCar(car as Car, alertCriteria(r.data)));
  if (!matches.length) return null;
  const url = `${SITE_URL}${carUrl({ slug: car.slug || '' })}`;
  const text = (n: string | null) => `Labdien${n ? `, ${n}` : ''}! Jūs lūdzāt paziņot par piemērotu auto — tikko ienāca ${car.make} ${car.model} ${car.year ?? ''}: ${url}. Tavs Auto, +371 23776197`;
  const done = async (id: string) => {
    await sb.from('leads').update({ status: 'done' }).eq('id', id);
    setRows((r) => r.filter((x) => x.id !== id));
  };
  return (
    <Card title={`Gaida šādu auto: ${matches.length}`} hint="Klienti, kuru saglabātajam meklējumam šis auto atbilst. Paziņo viņiem pirmajiem.">
      <ul className="divide-y divide-line">
        {matches.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
            <BellRing className="h-4 w-4 text-signal" />
            <span className="min-w-0 flex-1"><b className="text-ink">{m.name}</b> <span className="text-mute">· {String(m.data.summary || '')}</span></span>
            {m.phone && <a href={`https://wa.me/${m.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text(m.name))}`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-[#25D366] hover:bg-paper" title="WhatsApp"><MessageCircle className="h-4 w-4" /></a>}
            {m.phone && <a href={`tel:${m.phone}`} className="rounded-lg p-2 hover:bg-paper" title="Zvanīt"><Phone className="h-4 w-4" /></a>}
            {m.email && <a href={`mailto:${m.email}?subject=${encodeURIComponent('Jums piemērots auto — Tavs Auto')}&body=${encodeURIComponent(text(m.name))}`} className="rounded-lg p-2 hover:bg-paper" title="E-pasts"><Mail className="h-4 w-4" /></a>}
            <button type="button" onClick={() => done(m.id)} className="rounded-lg p-2 text-ok hover:bg-paper" title="Paziņots — atzīmēt kā pabeigtu"><Check className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
