'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, Loader2, Save, X, Check, ChevronsUp } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Car } from '@/lib/types';
import { STATUS_LABEL } from '@/lib/format';
import { BadgeOrder } from '@/components/admin/BadgeOrder';
import { revalidateSite } from '@/components/admin/revalidate';

type Draft = Pick<Car, 'status' | 'title' | 'price' | 'old_price' | 'mileage' | 'year' | 'ta_until' | 'description' | 'equipment' | 'badges' | 'featured' | 'slug' | 'make' | 'model' | 'fuel' | 'vat_included' | 'drive' | 'odometer_history'>;

const FIELDS = 'id,slug,status,title,make,model,price,old_price,mileage,year,ta_until,description,equipment,badges,featured,fuel,vat_included,drive,odometer_history';

/** Ātrā rediģēšana tieši publiskajā lapā (tikai adminiem; saglabāšanu aizsargā RLS). */
export function AdminQuickEdit({ id, onClose }: { id: string; onClose: () => void }) {
  const sb = supabaseBrowser();
  const router = useRouter();
  const [car, setCar] = useState<Draft | null>(null);
  const [eq, setEq] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => {
    sb.from('cars').select(FIELDS).eq('id', id).single().then(({ data, error }: { data: Draft | null; error: { message: string } | null }) => {
      if (error || !data) return setMsg({ ok: false, t: error?.message || 'Auto nav atrasts' });
      setCar(data);
      setEq((data.equipment || []).join('\n'));
    });
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setCar((c) => (c ? { ...c, [k]: v } : c));
  const num = (v: string) => (v === '' ? null : Number(v.replace(/\s/g, '').replace(',', '.')));

  async function save() {
    if (!car) return;
    if (!car.price || car.price <= 0) return setMsg({ ok: false, t: 'Norādi cenu' });
    setSaving(true);
    setMsg(null);
    const equipment = [...new Set(eq.split('\n').map((s) => s.trim()).filter(Boolean))];
    const patch = {
      status: car.status,
      title: car.title,
      price: car.price,
      old_price: car.old_price,
      mileage: car.mileage,
      year: car.year,
      ta_until: car.ta_until || null,
      description: car.description,
      equipment,
      badges: car.badges,
      featured: car.featured,
      ...(car.status === 'sold' ? { sold_at: new Date().toISOString() } : {}),
    };
    const { error } = await sb.from('cars').update(patch).eq('id', id);
    setSaving(false);
    if (error) return setMsg({ ok: false, t: error.message });
    setMsg({ ok: true, t: 'Saglabāts — lapa atjaunojas' });
    revalidateSite([car.slug]);
    setTimeout(() => router.refresh(), 700);
  }

  async function toTop() {
    if (!car) return;
    const { data: first } = await sb.from('cars').select('sort').order('sort', { ascending: true }).limit(1).maybeSingle();
    const { error } = await sb.from('cars').update({ sort: ((first as { sort: number } | null)?.sort ?? 1) - 1 }).eq('id', id);
    if (error) return setMsg({ ok: false, t: error.message });
    setMsg({ ok: true, t: 'Auto tagad ir pirmais sarakstā' });
    revalidateSite([car.slug]);
    setTimeout(() => router.refresh(), 700);
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[60] bg-night/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside
        role="dialog"
        aria-label="Rediģēt auto"
        className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-xl flex-col bg-card shadow-2xl"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-signal">Ātrā rediģēšana</p>
            <p className="truncate font-bold text-ink">{car ? `${car.make} ${car.model}` : 'Ielādē…'}</p>
          </div>
          <a href={`/admin/auto/${id}`} className="btn btn-ghost !px-3 !py-2 text-sm" title="Bildes, tehniskie dati, CSDD, portāli"><ExternalLink className="h-4 w-4" /> Pilnais redaktors</a>
          <button onClick={onClose} className="rounded-full p-2 text-mute hover:bg-paper hover:text-ink" aria-label="Aizvērt"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {!car ? (
            <div className="grid place-items-center py-20">{msg ? <p className="text-bad">{msg.t}</p> : <Loader2 className="h-6 w-6 animate-spin text-mute" />}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 sm:col-span-1">
                  <span className="label">Statuss</span>
                  <select className="field" value={car.status} onChange={(e) => set('status', e.target.value as Car['status'])}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label className="col-span-2 flex items-end gap-2 pb-3 text-sm font-medium text-ink sm:col-span-1">
                  <input type="checkbox" checked={!!car.featured} onChange={(e) => set('featured', e.target.checked)} className="h-5 w-5 accent-[#d91d2b]" /> Izcelt sākumlapā
                </label>
                <label><span className="label">Cena, €</span><input className="field num" inputMode="numeric" value={car.price ?? ''} onChange={(e) => set('price', num(e.target.value) as number)} /></label>
                <label><span className="label">Vecā cena, €</span><input className="field num" inputMode="numeric" value={car.old_price ?? ''} onChange={(e) => set('old_price', num(e.target.value))} placeholder="nosvītrotā" /></label>
                <label><span className="label">Nobraukums, km</span><input className="field num" inputMode="numeric" value={car.mileage ?? ''} onChange={(e) => set('mileage', num(e.target.value))} /></label>
                <label><span className="label">Izlaiduma gads</span><input className="field num" inputMode="numeric" value={car.year ?? ''} onChange={(e) => set('year', num(e.target.value))} /></label>
                <label className="col-span-2 sm:col-span-1"><span className="label">Tehniskā apskate līdz</span><input type="date" className="field" value={car.ta_until || ''} onChange={(e) => set('ta_until', e.target.value || null)} /></label>
              </div>
              <label className="block"><span className="label">Virsraksts</span><input className="field" value={car.title || ''} onChange={(e) => set('title', e.target.value)} maxLength={160} /></label>
              <label className="block">
                <span className="label">Apraksts</span>
                <textarea className="field min-h-[160px]" value={car.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Tukša rinda = jauna rindkopa, rinda ar “-” = saraksts." />
              </label>
              <label className="block">
                <span className="label">Aprīkojums un ekstras (katra savā rindā)</span>
                <textarea className="field min-h-[160px] text-sm" value={eq} onChange={(e) => setEq(e.target.value)} />
                <span className="mt-1 block text-xs text-mute">Lapā tās automātiski sagrupējas pa kategorijām.</span>
              </label>
              <div>
                <span className="label">Zīmes uz bildes</span>
                <BadgeOrder car={car as Partial<Car>} onChange={(b) => set('badges', b)} />
              </div>
            </>
          )}
        </div>

        <footer className="flex items-center gap-3 border-t border-line px-5 py-4">
          {msg && <p className={`flex flex-1 items-center gap-1.5 text-sm ${msg.ok ? 'text-ok' : 'text-bad'}`}>{msg.ok && <Check className="h-4 w-4" />}{msg.t}</p>}
          <div className="ml-auto flex gap-2">
            <button onClick={toTop} disabled={!car} className="btn btn-ghost" title="Parādīt šo auto pirmo katalogā un sākumlapā"><ChevronsUp className="h-4 w-4" /> Pirmais</button>
            <button onClick={save} disabled={!car || saving} className="btn btn-signal">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Saglabāt</button>
          </div>
        </footer>
      </motion.aside>
    </AnimatePresence>
  );
}
