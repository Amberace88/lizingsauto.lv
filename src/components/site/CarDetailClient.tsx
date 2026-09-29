'use client';
import { useEffect, useRef, useState } from 'react';
import { Heart, Share2, Scale, Check, Phone, MessageCircle } from 'lucide-react';
import type { LeasingSettings } from '@/lib/types';
import { LeasingCalculator } from './LeasingCalculator';
import { LeadForm, LEASING_FIELDS } from './LeadForm';
import { useCompare, useFavorites } from './favorites';
import { supabaseBrowser } from '@/lib/supabase/client';

export function CarActions({ id, title }: { id: string; title: string }) {
  const { has, toggle } = useFavorites();
  const cmp = useCompare();
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => toggle(id)} className="btn btn-ghost !px-3 !py-2 text-sm" aria-pressed={has(id)}>
        <Heart className={`h-4 w-4 ${has(id) ? 'fill-bad text-bad' : ''}`} /> {has(id) ? 'Izlasē' : 'Saglabāt'}
      </button>
      <button onClick={() => cmp.toggle(id)} className="btn btn-ghost !px-3 !py-2 text-sm" aria-pressed={cmp.has(id)}>
        <Scale className="h-4 w-4" /> {cmp.has(id) ? 'Salīdzinājumā' : 'Salīdzināt'}
      </button>
      <button onClick={share} className="btn btn-ghost !px-3 !py-2 text-sm">
        {copied ? <Check className="h-4 w-4 text-ok" /> : <Share2 className="h-4 w-4" />} {copied ? 'Saite nokopēta' : 'Dalīties'}
      </button>
    </div>
  );
}

export function ViewPing({ slug }: { slug: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const key = `la_v_${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {}
    supabaseBrowser().rpc('increment_car_view', { car_slug: slug }).then(() => {});
  }, [slug]);
  return null;
}

const TABS = [
  { id: 'leasing', label: 'Līzings' },
  { id: 'test_drive', label: 'Testa brauciens' },
  { id: 'reserve', label: 'Rezervēt' },
] as const;

export function CarContactPanel({ carId, carTitle, price, leasing, phone, whatsapp, sold }: { carId: string; carTitle: string; price: number; leasing: LeasingSettings; phone: string; whatsapp: string; sold: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('leasing');
  const [calc, setCalc] = useState<{ down: number; term: number; monthly: number } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-4">
      {!sold && (
        <LeasingCalculator
          price={price}
          leasing={leasing}
          onApply={(v) => {
            setCalc(v);
            setTab('leasing');
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      )}
      <div className="grid grid-cols-2 gap-2">
        <a href={`tel:${phone.replace(/\s/g, '')}`} className="btn btn-primary"><Phone className="h-4 w-4" /> Zvanīt</a>
        <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Labdien! Interesē: ${carTitle} ${typeof window !== 'undefined' ? location.href : ''}`)}`} target="_blank" rel="noopener noreferrer" className="btn bg-[#25D366] text-white hover:bg-[#1fb857]"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
      </div>
      {!sold && (
        <div ref={formRef} id="pieteikums" className="scroll-mt-24 rounded-2xl border border-line bg-card p-5">
          <div className="mb-4 flex rounded-xl bg-paper p-1" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${tab === t.id ? 'bg-card text-ink shadow-sm' : 'text-mute hover:text-ink'}`}>
                {t.label}
              </button>
            ))}
          </div>
          {calc && tab === 'leasing' && (
            <p className="num mb-4 rounded-lg bg-signal-soft px-3 py-2 text-sm text-ink">
              Izvēlēts: pirmā iemaksa {calc.down} €, {calc.term} mēn., ~{calc.monthly} €/mēn.
            </p>
          )}
          <LeadForm
            key={tab}
            type={tab}
            carId={carId}
            fields={tab === 'leasing' ? LEASING_FIELDS : undefined}
            extra={{ car: carTitle, ...(tab === 'leasing' && calc ? { down: calc.down, term: calc.term, monthly: calc.monthly } : {}) }}
            submitLabel={tab === 'leasing' ? 'Nosūtīt līzinga pieteikumu' : tab === 'reserve' ? 'Rezervēt auto' : 'Pieteikt testa braucienu'}
          />
        </div>
      )}
    </div>
  );
}
