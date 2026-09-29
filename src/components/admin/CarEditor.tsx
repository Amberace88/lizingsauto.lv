'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, ImagePlus, Loader2, Save, Star, Trash2, Wand2, X, ExternalLink, GripVertical } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Car } from '@/lib/types';
import { BODY_LABEL, DRIVE_LABEL, FUEL_LABEL, GEAR_LABEL, STATUS_LABEL, carBadges, money, normalizeBadgeStyle, slugify, type BadgeStyle } from '@/lib/format';
import { DEFAULT_LEASING, fromPayment } from '@/lib/leasing';
import { BadgeOverlay } from '@/components/site/CarCard';
import { BadgeStyleProvider } from '@/components/site/BadgeOrderContext';
import { useToast } from './Toast';
import { revalidateSite } from './revalidate';
import { PortalPanel } from './PortalPanel';
import { BadgeOrder } from './BadgeOrder';
import { CsddPanel } from './CsddPanel';

type Img = { id?: string; url: string; storage_path?: string | null; sort: number; uploading?: boolean; removed?: boolean; is_promo?: boolean };
type Priv = { purchase_price: number | null; seller_name: string | null; seller_phone: string | null; internal_note: string | null };

const MAKES = ['Alfa Romeo', 'Audi', 'BMW', 'BYD', 'Chevrolet', 'Chrysler', 'Citroen', 'Cupra', 'Dacia', 'Fiat', 'Ford', 'Honda', 'Hyundai', 'Jaguar', 'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Mazda', 'Mercedes-Benz', 'MG', 'MINI', 'Mitsubishi', 'Nissan', 'Opel', 'Peugeot', 'Polestar', 'Porsche', 'Renault', 'Seat', 'Skoda', 'Subaru', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo'];
const EQUIPMENT_PRESETS = ['Klimatkontrole', 'Kruīzkontrole', 'Adaptīvā kruīzkontrole', 'Navigācija', 'Atpakaļskata kamera', '360° kamera', 'Parkošanās sensori', 'Krēslu apsilde', 'Stūres apsilde', 'Ādas salons', 'Elektriski regulējami krēsli', 'Panorāmas lūka', 'LED lukturi', 'Head-Up displejs', 'Apple CarPlay / Android Auto', 'Keyless Go', 'Elektriskais bagāžnieks', 'Sakabes āķis', 'Vieglmetāla diski', 'Līniju asistents', 'Aklo zonu asistents', 'Ziemas un vasaras riepas'];

const EMPTY: Partial<Car> = { status: 'draft', make: '', model: '', title: '', price: 0, fuel: 'diesel', transmission: 'automatic', body_type: 'sedan', equipment: [], badges: [], vat_included: false, vat_deductible: false, featured: false, sort: 0 };

async function resize(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const max = 2000;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Neizdevās apstrādāt bildi'))), 'image/webp', 0.85));
}

export function CarEditor({ id }: { id?: string }) {
  const sb = supabaseBrowser();
  const router = useRouter();
  const toast = useToast();
  const isNew = !id;
  const carId = useRef(id || crypto.randomUUID());
  const [car, setCar] = useState<Partial<Car>>(EMPTY);
  const [imgs, setImgs] = useState<Img[]>([]);
  const [priv, setPriv] = useState<Priv>({ purchase_price: null, seller_name: null, seller_phone: null, internal_note: null });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [eqInput, setEqInput] = useState('');
  const dragFrom = useRef<number | null>(null);
  const [badgeStyle, setBadgeStyle] = useState<BadgeStyle>(normalizeBadgeStyle());
  const badgeOrder = badgeStyle.order;

  useEffect(() => {
    sb.from('settings').select('value').eq('key', 'badges').maybeSingle().then(({ data }: { data: { value: unknown } | null }) => setBadgeStyle(normalizeBadgeStyle(data?.value)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const [{ data, error }, { data: p }] = await Promise.all([
        sb.from('cars').select('*, car_images(id,url,storage_path,sort,is_promo)').eq('id', id).single(),
        sb.from('car_private').select('*').eq('car_id', id).maybeSingle(),
      ]);
      if (error || !data) {
        toast('Auto nav atrasts', 'err');
        router.replace('/admin/auto');
        return;
      }
      const { car_images, ...rest } = data as Car;
      setCar(rest);
      setImgs([...(car_images || [])].sort((a, b) => a.sort - b.sort).map((i) => ({ ...i })));
      if (p) setPriv(p as Priv);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <K extends keyof Car>(k: K, v: Car[K] | null) => {
    setDirty(true);
    setCar((c) => {
      const next = { ...c, [k]: v };
      if (!slugTouched && ['make', 'model', 'year'].includes(k as string)) next.slug = slugify(`${next.make || ''} ${next.model || ''} ${next.year || ''}`);
      return next;
    });
  };
  const num = (v: string) => (v === '' ? null : Number(v.replace(',', '.')));

  const autoTitle = () => {
    const parts = [
      `${car.make} ${car.model}`.trim(),
      car.engine_volume ? `${car.engine_volume.toFixed(1)} ${car.fuel ? FUEL_LABEL[car.fuel].toLowerCase() : ''}`.trim() : car.fuel ? FUEL_LABEL[car.fuel].toLowerCase() : '',
      car.power_kw ? `${car.power_kw} kW` : '',
      car.transmission ? GEAR_LABEL[car.transmission].toLowerCase() : '',
    ].filter(Boolean);
    set('title', parts.join(', '));
  };

  const autoDescription = () => {
    const lines = [
      `${car.make} ${car.model}${car.year ? `, ${car.year}. gads` : ''}.`,
      car.badges?.includes('warranty') ? 'Pieejama garantija, iespējams pagarināt līdz 36 mēnešiem.' : '',
      car.badges?.includes('fresh_ta') ? 'Svaiga tehniskā apskate.' : '',
      car.consumption ? `Vidējais degvielas patēriņš ap ${car.consumption} l/100 km.` : '',
      'Ar auto iespējams veikt testa braucienu, kā arī pašam pārliecināties par tā stāvokli servisā.',
      'Iespēja atstāt savu veco auto tirdzniecībā vai kā pirmo iemaksu. Līzinga iespējas visiem, arī ar sabojātu kredītvēsturi.',
    ].filter(Boolean);
    set('description', lines.join('\n\n'));
  };

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).filter((f) => /image\/(jpeg|png|webp)/.test(f.type));
    if (list.length < files.length) toast('Daļa failu izlaisti — atbalstīti JPG, PNG, WEBP', 'err');
    const start = imgs.filter((i) => !i.removed).length;
    const temp: Img[] = list.map((f, k) => ({ url: URL.createObjectURL(f), sort: start + k, uploading: true }));
    setImgs((p) => [...p, ...temp]);
    setDirty(true);
    await Promise.all(
      list.map(async (f, k) => {
        try {
          const blob = await resize(f);
          const path = `${carId.current}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
          const { error } = await sb.storage.from('cars').upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000' });
          if (error) throw error;
          const url = sb.storage.from('cars').getPublicUrl(path).data.publicUrl;
          setImgs((p) => p.map((x) => (x.url === temp[k].url ? { ...x, url, storage_path: path, uploading: false } : x)));
        } catch (e) {
          toast(`Bilde neaugšupielādējās: ${e instanceof Error ? e.message : ''}`, 'err');
          setImgs((p) => p.filter((x) => x.url !== temp[k].url));
        }
      }),
    );
  }

  const visible = imgs.filter((i) => !i.removed);
  const moveImg = (from: number, to: number) => {
    if (to < 0 || to >= visible.length) return;
    const arr = [...visible];
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    setImgs([...arr.map((x, i) => ({ ...x, sort: i })), ...imgs.filter((i) => i.removed)]);
    setDirty(true);
  };
  const removeImg = (i: Img) => {
    setImgs((p) => p.map((x) => (x === i ? { ...x, removed: true } : x)));
    setDirty(true);
  };

  async function save(nextStatus?: Car['status']) {
    if (!car.make || !car.model) return toast('Norādi marku un modeli', 'err');
    if (!car.price || car.price <= 0) return toast('Norādi cenu', 'err');
    if (visible.some((i) => i.uploading)) return toast('Pagaidi, kamēr bildes augšupielādējas', 'err');
    setSaving(true);
    const payload: Partial<Car> = { ...car, status: nextStatus || car.status, title: car.title || `${car.make} ${car.model}`, slug: slugify(car.slug || `${car.make} ${car.model} ${car.year || ''}`) };
    delete (payload as Record<string, unknown>).car_images;
    delete (payload as Record<string, unknown>).created_at;
    delete (payload as Record<string, unknown>).updated_at;
    delete (payload as Record<string, unknown>).views;
    try {
      if (isNew) {
        const { error } = await sb.from('cars').insert({ ...payload, id: carId.current, published_at: payload.status === 'published' ? new Date().toISOString() : null });
        if (error) throw error;
      } else {
        const { error } = await sb.from('cars').update(payload).eq('id', carId.current);
        if (error) throw error;
      }
      // Bildes
      const removed = imgs.filter((i) => i.removed && i.id);
      if (removed.length) {
        await sb.from('car_images').delete().in('id', removed.map((i) => i.id!));
        const paths = removed.map((i) => i.storage_path).filter(Boolean) as string[];
        if (paths.length) await sb.storage.from('cars').remove(paths);
      }
      const upserts = visible.map((i, k) => ({ ...(i.id ? { id: i.id } : {}), car_id: carId.current, url: i.url, storage_path: i.storage_path || null, sort: k }));
      const existing = upserts.filter((u) => 'id' in u);
      const fresh = upserts.filter((u) => !('id' in u));
      if (existing.length) {
        const { error } = await sb.from('car_images').upsert(existing);
        if (error) throw error;
      }
      if (fresh.length) {
        const { data, error } = await sb.from('car_images').insert(fresh).select('id,url');
        if (error) throw error;
        setImgs((p) => p.map((x) => ({ ...x, id: x.id || data?.find((d: { id: string; url: string }) => d.url === x.url)?.id })));
      }
      setImgs((p) => p.filter((x) => !x.removed));
      // Privātie dati
      if (priv.purchase_price != null || priv.seller_name || priv.seller_phone || priv.internal_note) {
        await sb.from('car_private').upsert({ car_id: carId.current, ...priv, updated_at: new Date().toISOString() });
      }
      setDirty(false);
      if (nextStatus) setCar((c) => ({ ...c, status: nextStatus }));
      toast(isNew ? 'Auto pievienots' : 'Izmaiņas saglabātas');
      revalidateSite([payload.slug!]);
      if (isNew) router.replace(`/admin/auto/${carId.current}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message || e);
      toast(msg.includes('cars_slug_key') ? 'Šāda saite (slug) jau eksistē — nomaini to' : msg, 'err');
    } finally {
      setSaving(false);
    }
  }

  const badges = useMemo(() => carBadges({ badges: car.badges || [], fuel: car.fuel || null, old_price: car.old_price || null, price: car.price || 0, vat_included: !!car.vat_included, drive: car.drive || null, odometer_history: car.odometer_history || null }, badgeOrder), [car, badgeOrder]);

  if (loading) return <div className="grid place-items-center p-20"><Loader2 className="h-6 w-6 animate-spin text-mute" /></div>;

  return (
    <div className="pb-28">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/admin/auto" className="rounded-lg p-2 hover:bg-white" aria-label="Atpakaļ"><ArrowLeft /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="display-md truncate text-2xl text-ink">{isNew ? 'Jauns auto' : `${car.make} ${car.model}`}</h1>
          <p className="text-sm text-mute">{STATUS_LABEL[car.status || 'draft']}{car.views ? ` · ${car.views} skatījumi` : ''}</p>
        </div>
        {!isNew && car.slug && <a href={`/auto/${car.slug}`} target="_blank" className="btn btn-ghost !py-2"><ExternalLink className="h-4 w-4" /> Skatīt lapā</a>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title="Bildes" hint="Pirmā bilde ir galvenā. Velc, lai mainītu secību. Bildes tiek automātiski samazinātas un optimizētas.">
            <label
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-paper px-4 py-8 text-center transition hover:border-petrol"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFiles(e.dataTransfer.files);
              }}
            >
              <ImagePlus className="h-8 w-8 text-petrol" />
              <span className="font-semibold text-ink">Ievelc bildes šeit vai izvēlies no datora</span>
              <span className="text-xs text-mute">JPG, PNG, WEBP · var vairākas uzreiz</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
            </label>
            {visible.length > 0 && (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {visible.map((im, k) => (
                  <li
                    key={im.url}
                    draggable
                    onDragStart={() => (dragFrom.current = k)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragFrom.current != null) moveImg(dragFrom.current, k);
                      dragFrom.current = null;
                    }}
                    className={`group relative aspect-[4/3] overflow-hidden rounded-lg bg-line ${k === 0 ? 'ring-2 ring-signal' : ''}`}
                  >
                    <Image src={im.url} alt="" fill sizes="220px" className="object-cover" unoptimized={im.url.startsWith('blob:')} />
                    {im.uploading && <div className="absolute inset-0 grid place-items-center bg-white/60"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                    {k === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-signal px-1.5 text-[10px] font-bold text-white">GALVENĀ</span>}
                    {im.is_promo && <span className="absolute bottom-9 left-1.5 rounded bg-ink/80 px-1.5 text-[10px] font-bold text-white" title="Reklāmas baneris no vecās lapas — pircējiem un portālos netiek rādīts">BANERIS · slēpts</span>}
                    <GripVertical className="absolute right-1.5 top-1.5 h-5 w-5 rounded bg-white/80 p-0.5 text-ink opacity-0 group-hover:opacity-100" />
                    <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1 opacity-0 transition group-hover:opacity-100">
                      <div className="flex gap-1">
                        <IconBtn onClick={() => moveImg(k, k - 1)} label="Pa kreisi"><ArrowUp className="h-3.5 w-3.5 -rotate-90" /></IconBtn>
                        <IconBtn onClick={() => moveImg(k, k + 1)} label="Pa labi"><ArrowDown className="h-3.5 w-3.5 -rotate-90" /></IconBtn>
                        {k > 0 && <IconBtn onClick={() => moveImg(k, 0)} label="Padarīt par galveno"><Star className="h-3.5 w-3.5" /></IconBtn>}
                      </div>
                      <IconBtn onClick={() => removeImg(im)} label="Dzēst" danger><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Pamatinformācija">
            <div className="grid gap-4 sm:grid-cols-3">
              <F label="Marka *"><input className="field" list="makes" value={car.make || ''} onChange={(e) => set('make', e.target.value)} /><datalist id="makes">{MAKES.map((m) => <option key={m} value={m} />)}</datalist></F>
              <F label="Modelis *"><input className="field" value={car.model || ''} onChange={(e) => set('model', e.target.value)} placeholder="piem., Passat B8" /></F>
              <F label="Izlaiduma gads"><input className="field num" inputMode="numeric" value={car.year ?? ''} onChange={(e) => set('year', num(e.target.value))} /></F>
            </div>
            <F label="Virsraksts" className="mt-4">
              <div className="flex gap-2">
                <input className="field" value={car.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="piem., VW Passat B8, 2.0 dīzelis, automāts" maxLength={160} />
                <button type="button" onClick={autoTitle} className="btn btn-ghost !px-3" title="Ģenerēt no datiem"><Wand2 className="h-4 w-4" /></button>
              </div>
            </F>
            <F label="Saite (URL)" className="mt-4" hint={`lizingsauto.lv/auto/${car.slug || '…'}`}>
              <input className="field" value={car.slug || ''} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} />
            </F>
          </Card>

          <Card title="Tehniskie dati">
            <div className="grid gap-4 sm:grid-cols-3">
              <F label="Degviela"><Select value={car.fuel} onChange={(v) => set('fuel', v as Car['fuel'])} options={FUEL_LABEL} /></F>
              <F label="Ātrumkārba"><Select value={car.transmission} onChange={(v) => set('transmission', v as Car['transmission'])} options={GEAR_LABEL} /></F>
              <F label="Virsbūve"><Select value={car.body_type} onChange={(v) => set('body_type', v)} options={BODY_LABEL} /></F>
              <F label="Piedziņa"><Select value={car.drive} onChange={(v) => set('drive', (v || null) as Car['drive'])} options={DRIVE_LABEL} allowEmpty /></F>
              <F label="Nobraukums, km"><input className="field num" inputMode="numeric" value={car.mileage ?? ''} onChange={(e) => set('mileage', num(e.target.value))} /></F>
              <F label="Dzinēja tilpums, l"><input className="field num" inputMode="decimal" value={car.engine_volume ?? ''} onChange={(e) => set('engine_volume', num(e.target.value))} placeholder="2.0" /></F>
              <F label="Jauda, kW"><input className="field num" inputMode="numeric" value={car.power_kw ?? ''} onChange={(e) => set('power_kw', num(e.target.value))} /></F>
              <F label="Patēriņš, l/100 km"><input className="field num" inputMode="decimal" value={car.consumption ?? ''} onChange={(e) => set('consumption', num(e.target.value))} /></F>
              <F label="CO₂, g/km"><input className="field num" inputMode="numeric" value={car.co2 ?? ''} onChange={(e) => set('co2', num(e.target.value))} /></F>
              {car.fuel === 'electric' || car.fuel === 'plugin_hybrid' ? (
                <>
                  <F label="Baterija, kWh"><input className="field num" inputMode="decimal" value={car.battery_kwh ?? ''} onChange={(e) => set('battery_kwh', num(e.target.value))} /></F>
                  <F label="Nobraukums ar uzlādi, km"><input className="field num" inputMode="numeric" value={car.range_km ?? ''} onChange={(e) => set('range_km', num(e.target.value))} /></F>
                </>
              ) : null}
              <F label="Krāsa"><input className="field" value={car.color || ''} onChange={(e) => set('color', e.target.value)} /></F>
              <F label="Durvis"><input className="field num" inputMode="numeric" value={car.doors ?? ''} onChange={(e) => set('doors', num(e.target.value))} /></F>
              <F label="Sēdvietas"><input className="field num" inputMode="numeric" value={car.seats ?? ''} onChange={(e) => set('seats', num(e.target.value))} /></F>
              <F label="Euro klase"><input className="field" value={car.euro_class || ''} onChange={(e) => set('euro_class', e.target.value)} placeholder="Euro 6" /></F>
              <F label="VIN"><input className="field uppercase" maxLength={17} value={car.vin || ''} onChange={(e) => set('vin', e.target.value.toUpperCase())} /></F>
              <F label="Valsts numurs" hint="Lapā netiek rādīts"><input className="field uppercase" value={car.reg_number || ''} onChange={(e) => set('reg_number', e.target.value.toUpperCase())} /></F>
              <F label="Pirmā reģistrācija"><input type="date" className="field" value={car.first_registration || ''} onChange={(e) => set('first_registration', e.target.value || null)} /></F>
              <F label="Tehniskā apskate līdz"><input type="date" className="field" value={car.ta_until || ''} onChange={(e) => set('ta_until', e.target.value || null)} /></F>
            </div>
          </Card>

          <CsddPanel car={car} onChange={set} />

          <Card title="Aprīkojums" hint="Spied Enter, lai pievienotu. Ātri pievieno no populārajiem.">
            <div className="flex gap-2">
              <input
                className="field"
                value={eqInput}
                onChange={(e) => setEqInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && eqInput.trim()) {
                    e.preventDefault();
                    const items = eqInput.split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
                    set('equipment', [...new Set([...(car.equipment || []), ...items])]);
                    setEqInput('');
                  }
                }}
                placeholder="piem., Krēslu apsilde (vai vairāki, atdalot ar ;)"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(car.equipment || []).map((e) => (
                <span key={e} className="inline-flex items-center gap-1 rounded-full bg-petrol-soft py-1 pl-3 pr-1.5 text-sm text-petrol">
                  {e}
                  <button onClick={() => set('equipment', (car.equipment || []).filter((x) => x !== e))} className="rounded-full p-0.5 hover:bg-petrol/10" aria-label={`Noņemt ${e}`}><X className="h-3.5 w-3.5" /></button>
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-4">
              {EQUIPMENT_PRESETS.filter((p) => !(car.equipment || []).includes(p)).map((p) => (
                <button key={p} onClick={() => set('equipment', [...(car.equipment || []), p])} className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-2 hover:border-petrol hover:text-petrol">+ {p}</button>
              ))}
            </div>
          </Card>

          <Card title="Apraksts" actions={<button type="button" onClick={autoDescription} className="btn btn-ghost !px-3 !py-1.5 text-sm"><Wand2 className="h-4 w-4" /> Sagatavot tekstu</button>}>
            <textarea className="field min-h-[200px]" value={car.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Stāvoklis, apkopes vēsture, īpašas priekšrocības. Tukša rinda = jauna rindkopa." />
          </Card>

          {!isNew && <PortalPanel car={car as Car} images={visible.filter((i) => !i.is_promo).map((i) => i.url)} />}
        </div>

        <div className="space-y-6">
          <Card title="Cena">
            <F label="Cena, € *"><input className="field num text-lg font-bold" inputMode="numeric" value={car.price || ''} onChange={(e) => set('price', num(e.target.value) ?? 0)} /></F>
            <F label="Vecā cena, € (rāda nosvītrotu)" className="mt-3"><input className="field num" inputMode="numeric" value={car.old_price ?? ''} onChange={(e) => set('old_price', num(e.target.value))} /></F>
            <div className="mt-3 space-y-2">
              <Check label="Cena ar PVN" checked={!!car.vat_included} onChange={(v) => set('vat_included', v)} />
              <Check label="PVN atskaitāms (uzņēmumiem)" checked={!!car.vat_deductible} onChange={(v) => set('vat_deductible', v)} />
            </div>
            {car.price ? <p className="num mt-3 rounded-lg bg-signal-soft px-3 py-2 text-sm">Līzingā no <b>{fromPayment(car.price, DEFAULT_LEASING)} €/mēn.</b></p> : null}
          </Card>

          <Card title="Zīmes uz bildes" hint="Rādās uz galvenās bildes katalogā un auto lapā. Krāsas un novietojumu maina Iestatījumos.">
            <BadgeStyleProvider value={badgeStyle}>
              {visible[0] && (
                <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-lg bg-line">
                  <Image src={visible[0].url} alt="" fill sizes="320px" className="object-cover" unoptimized={visible[0].url.startsWith('blob:')} />
                  <BadgeOverlay badges={badges} />
                </div>
              )}
              <BadgeOrder car={car} defaultOrder={badgeOrder} onChange={(b) => set('badges', b)} />
            </BadgeStyleProvider>
          </Card>

          <Card title="Publicēšana">
            <F label="Statuss"><Select value={car.status} onChange={(v) => set('status', v as Car['status'])} options={STATUS_LABEL} /></F>
            <div className="mt-3"><Check label="Izcelt sākumlapā" checked={!!car.featured} onChange={(v) => set('featured', v)} /></div>
          </Card>

          <Card title="Privāti (redz tikai admini)">
            <F label="Iepirkuma cena, €"><input className="field num" inputMode="numeric" value={priv.purchase_price ?? ''} onChange={(e) => { setDirty(true); setPriv({ ...priv, purchase_price: num(e.target.value) }); }} /></F>
            {priv.purchase_price && car.price ? <p className="num mt-1 text-xs text-mute">Starpība: {money(car.price - priv.purchase_price)}</p> : null}
            <F label="Pārdevējs / avots" className="mt-3"><input className="field" value={priv.seller_name || ''} onChange={(e) => { setDirty(true); setPriv({ ...priv, seller_name: e.target.value }); }} /></F>
            <F label="Pārdevēja tālrunis" className="mt-3"><input className="field" value={priv.seller_phone || ''} onChange={(e) => { setDirty(true); setPriv({ ...priv, seller_phone: e.target.value }); }} /></F>
            <F label="Piezīmes" className="mt-3"><textarea className="field" rows={3} value={priv.internal_note || ''} onChange={(e) => { setDirty(true); setPriv({ ...priv, internal_note: e.target.value }); }} /></F>
          </Card>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="hidden text-sm text-mute sm:block">{dirty ? 'Ir nesaglabātas izmaiņas' : 'Viss saglabāts'}</p>
          <div className="ml-auto flex gap-2">
            {car.status !== 'published' && (
              <button onClick={() => save('published')} className="btn btn-signal" disabled={saving}>Publicēt</button>
            )}
            <button onClick={() => save()} className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Saglabāt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Card({ title, hint, actions, children }: { title: string; hint?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-ink">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-mute">{hint}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
function F({ label, hint, className = '', children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  );
}
function Select({ value, onChange, options, allowEmpty }: { value?: string | null; onChange: (v: string) => void; options: Record<string, string>; allowEmpty?: boolean }) {
  return (
    <select className="field" value={value || ''} onChange={(e) => onChange(e.target.value)}>
      {allowEmpty && <option value="">—</option>}
      {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm text-ink hover:bg-paper">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#d91d2b]" />
      {label}
    </label>
  );
}
function IconBtn({ onClick, label, danger, children }: { onClick: () => void; label: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={`grid h-7 w-7 place-items-center rounded-md shadow ${danger ? 'bg-bad text-white' : 'bg-white text-ink'}`}>
      {children}
    </button>
  );
}
