'use client';
import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Car, LeasingSettings } from '@/lib/types';
import { BODY_LABEL, FUEL_LABEL, GEAR_LABEL, carName } from '@/lib/format';
import { monthlyPayment } from '@/lib/leasing';
import { CarCard } from './CarCard';

type F = Record<string, string>;
const SORTS: Record<string, string> = {
  new: 'Jaunākie sludinājumi',
  price_asc: 'Lētākie',
  price_desc: 'Dārgākie',
  year_desc: 'Jaunākie pēc gada',
  km_asc: 'Mazākais nobraukums',
};

export function Catalog({ cars, leasing }: { cars: Car[]; leasing: LeasingSettings }) {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [f, setF] = useState<F>(() => Object.fromEntries(sp.entries()));
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== '' && v != null)).toString();
    router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
  }, [f, path, router]);

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const clear = () => setF({});

  const makes = useMemo(() => [...new Set(cars.map((c) => c.make))].sort(), [cars]);
  const models = useMemo(() => [...new Set(cars.filter((c) => !f.make || c.make === f.make).map((c) => c.model))].sort(), [cars, f.make]);
  const years = useMemo(() => [...new Set(cars.map((c) => c.year).filter(Boolean) as number[])].sort((a, b) => b - a), [cars]);
  const down = +(f.down || leasing.downPct);

  const list = useMemo(() => {
    const q = (f.q || '').toLowerCase().trim();
    const out = cars.filter((c) => {
      if (f.status !== 'all' && c.status === 'sold') return false;
      if (f.make && c.make !== f.make) return false;
      if (f.model && c.model !== f.model) return false;
      if (f.fuel && !(f.fuel === 'hybrid' ? c.fuel === 'hybrid' || c.fuel === 'plugin_hybrid' : c.fuel === f.fuel)) return false;
      if (f.body && c.body_type !== f.body) return false;
      if (f.gear && c.transmission !== f.gear) return false;
      if (f.drive && c.drive !== f.drive) return false;
      if (f.minPrice && c.price < +f.minPrice) return false;
      if (f.maxPrice && c.price > +f.maxPrice) return false;
      if (f.minYear && (c.year ?? 0) < +f.minYear) return false;
      if (f.maxYear && (c.year ?? 9999) > +f.maxYear) return false;
      if (f.maxKm && (c.mileage ?? 0) > +f.maxKm) return false;
      if (f.maxMonthly && monthlyPayment({ price: c.price, downPct: down, rate: leasing.rate, term: leasing.term, residualPct: leasing.residualPct }) > +f.maxMonthly) return false;
      if (q && !`${carName(c)} ${c.title} ${c.equipment.join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const s = f.sort || 'new';
    const rank: Record<string, number> = { published: 0, reserved: 1, sold: 2 };
    return out.sort((a, b) => {
      const r = rank[a.status] - rank[b.status];
      if (r) return r;
      if (s === 'price_asc') return a.price - b.price;
      if (s === 'price_desc') return b.price - a.price;
      if (s === 'year_desc') return (b.year ?? 0) - (a.year ?? 0);
      if (s === 'km_asc') return (a.mileage ?? 0) - (b.mileage ?? 0);
      return a.sort - b.sort;
    });
  }, [cars, f, down, leasing]);

  const active = Object.entries(f).filter(([k, v]) => v && !['sort', 'down'].includes(k)).length;

  const panel = (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
        <input className="field !pl-9" placeholder="Meklēt: X5, Passat, kamera…" value={f.q || ''} onChange={(e) => set('q', e.target.value)} aria-label="Meklēt" />
      </div>
      <Sel label="Marka" value={f.make} onChange={(v) => setF((p) => ({ ...p, make: v, model: '' }))} options={makes.map((m) => [m, m])} />
      <Sel label="Modelis" value={f.model} onChange={(v) => set('model', v)} options={models.map((m) => [m, m])} disabled={!f.make} />
      <Sel label="Degviela" value={f.fuel} onChange={(v) => set('fuel', v)} options={[['petrol', FUEL_LABEL.petrol], ['diesel', FUEL_LABEL.diesel], ['electric', FUEL_LABEL.electric], ['hybrid', 'Hibrīds / plug-in']]} />
      <Sel label="Virsbūve" value={f.body} onChange={(v) => set('body', v)} options={Object.entries(BODY_LABEL)} />
      <div className="grid grid-cols-2 gap-3">
        <Sel label="Ātrumkārba" value={f.gear} onChange={(v) => set('gear', v)} options={Object.entries(GEAR_LABEL)} />
        <Sel label="Piedziņa" value={f.drive} onChange={(v) => set('drive', v)} options={[['awd', '4x4'], ['fwd', 'Priekšējā'], ['rwd', 'Aizmugurējā']]} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Num label="Cena no €" value={f.minPrice} onChange={(v) => set('minPrice', v)} />
        <Num label="Cena līdz €" value={f.maxPrice} onChange={(v) => set('maxPrice', v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Sel label="Gads no" value={f.minYear} onChange={(v) => set('minYear', v)} options={years.map((y) => [String(y), String(y)])} />
        <Sel label="Gads līdz" value={f.maxYear} onChange={(v) => set('maxYear', v)} options={years.map((y) => [String(y), String(y)])} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Num label="Nobraukums līdz km" value={f.maxKm} onChange={(v) => set('maxKm', v)} />
        <Num label="Līdz €/mēn." value={f.maxMonthly} onChange={(v) => set('maxMonthly', v)} />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-ink-2">
        <input type="checkbox" checked={f.status === 'all'} onChange={(e) => set('status', e.target.checked ? 'all' : '')} className="h-4 w-4 accent-[#0f5a63]" />
        Rādīt arī pārdotos auto
      </label>
      {active > 0 && (
        <button onClick={clear} className="btn btn-ghost w-full">
          Notīrīt filtrus ({active})
        </button>
      )}
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-2xl border border-line bg-white p-5">{panel}</div>
      </aside>
      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-ink-2" aria-live="polite">
            Atrasti <span className="num font-bold text-ink">{list.length}</span> auto
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setDrawer(true)} className="btn btn-ghost !py-2 lg:hidden">
              <SlidersHorizontal className="h-4 w-4" /> Filtri {active > 0 && <span className="num rounded-full bg-signal px-1.5 text-xs">{active}</span>}
            </button>
            <select className="field !w-auto !py-2" value={f.sort || 'new'} onChange={(e) => set('sort', e.target.value)} aria-label="Kārtot">
              {Object.entries(SORTS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
            <p className="font-semibold text-ink">Pēc šiem kritērijiem auto nav.</p>
            <p className="mt-1 text-sm text-ink-2">Noņem kādu filtru vai pasūti auto — atradīsim to Eiropā.</p>
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={clear} className="btn btn-ghost">Notīrīt filtrus</button>
              <a href="/pasutit-auto" className="btn btn-primary">Pasūtīt auto</a>
            </div>
          </div>
        ) : (
          <motion.div layout className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence initial={false}>
              {list.map((c, i) => (
                <motion.div key={c.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  <CarCard car={c} leasing={{ ...leasing, downPct: down }} priority={i < 3} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {drawer && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/50" onClick={() => setDrawer(false)} />
            <motion.div
              className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-paper p-5"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              role="dialog"
              aria-label="Filtri"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="display-md text-xl">Filtri</p>
                <button onClick={() => setDrawer(false)} aria-label="Aizvērt"><X className="h-6 w-6" /></button>
              </div>
              {panel}
              <button onClick={() => setDrawer(false)} className="btn btn-primary mt-4 w-full">
                Rādīt {list.length} auto
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Sel({ label, value, onChange, options, disabled }: { label: string; value?: string; onChange: (v: string) => void; options: [string, string][]; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="field" value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">Visi</option>
        {options.map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    </label>
  );
}
function Num({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="field num" inputMode="numeric" value={value || ''} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} />
    </label>
  );
}
