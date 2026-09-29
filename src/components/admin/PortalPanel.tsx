'use client';
import { useEffect, useState } from 'react';
import { Copy, Download, ExternalLink, Loader2, Check, Send, RefreshCw, Trash2 } from 'lucide-react';
import JSZip from 'jszip';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Car } from '@/lib/types';
import { BODY_LABEL, FUEL_LABEL, GEAR_LABEL, DRIVE_LABEL, number } from '@/lib/format';
import { Card } from './CarEditor';
import { useToast } from './Toast';
import { PORTALS } from './labels';

type Listing = { id?: string; portal: string; enabled: boolean; status: string; external_url: string | null; external_id: string | null; last_error: string | null; last_sync_at: string | null };

const RU_FUEL: Record<string, string> = { petrol: 'Бензин', diesel: 'Дизель', electric: 'Электро', hybrid: 'Гибрид', plugin_hybrid: 'Плагин-гибрид', lpg: 'Бензин/газ', cng: 'Газ' };
const RU_GEAR: Record<string, string> = { automatic: 'Автомат', manual: 'Механика' };
const RU_BODY: Record<string, string> = { suv: 'Внедорожник', wagon: 'Универсал', sedan: 'Седан', hatchback: 'Хэтчбек', coupe: 'Купе', minivan: 'Минивэн', van: 'Микроавтобус', convertible: 'Кабриолет', pickup: 'Пикап' };

export function ssText(car: Car, lang: 'lv' | 'ru', siteUrl: string) {
  const lines: string[] = [];
  if (lang === 'lv') {
    lines.push(`${car.make} ${car.model}${car.year ? `, ${car.year}` : ''}. ${car.title}`);
    if (car.badges?.includes('warranty')) lines.push('Pieejama garantija (iespējams pagarināt līdz 36 mēn.).');
    if (car.badges?.includes('fresh_ta')) lines.push('Svaiga tehniskā apskate.');
    lines.push('');
    if (car.equipment?.length) lines.push(...car.equipment.slice(0, 30).map((e) => `- ${e}`), '');
    if (car.consumption) lines.push(`Vidējais patēriņš ap ${car.consumption} l/100 km.`);
    lines.push('Testa brauciens un pārbaude servisā pēc jūsu izvēles.', 'Līzings visiem — arī ar sabojātu kredītvēsturi un ārzemēs strādājošajiem, no 0% pirmās iemaksas.', 'Jūsu vecais auto var būt pirmā iemaksa.', '', `Vairāk bilžu un līzinga kalkulators: ${siteUrl}/auto/${car.slug}`);
  } else {
    lines.push(`${car.make} ${car.model}${car.year ? `, ${car.year}` : ''}. ${car.fuel ? RU_FUEL[car.fuel] : ''}${car.engine_volume ? ` ${car.engine_volume.toFixed(1)}` : ''}${car.transmission ? `, ${RU_GEAR[car.transmission].toLowerCase()}` : ''}${car.power_kw ? `, ${car.power_kw} кВт` : ''}.`);
    if (car.body_type) lines.push(`Кузов: ${RU_BODY[car.body_type] || car.body_type}${car.mileage != null ? `, пробег ${car.mileage.toLocaleString('lv-LV')} км` : ''}.`);
    if (car.badges?.includes('warranty')) lines.push('Доступна гарантия (возможно продление до 36 мес.).');
    if (car.badges?.includes('fresh_ta')) lines.push('Свежий техосмотр.');
    lines.push('');
    if (car.equipment?.length) lines.push('Комплектация:', ...car.equipment.slice(0, 30).map((e) => `- ${e}`), '');
    lines.push('Тест-драйв и проверка в сервисе на ваш выбор.', 'Лизинг для всех — в том числе с плохой кредитной историей и работающим за границей, первый взнос от 0%.', 'Ваш старый автомобиль может быть первым взносом.', '', `Больше фото и калькулятор лизинга: ${siteUrl}/auto/${car.slug}`);
  }
  return lines.join('\n');
}

export function PortalPanel({ car, images }: { car: Car; images: string[] }) {
  const sb = supabaseBrowser();
  const toast = useToast();
  const [list, setList] = useState<Record<string, Listing>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [ssOpen, setSsOpen] = useState(false);

  async function load() {
    const { data } = await sb.from('portal_listings').select('*').eq('car_id', car.id);
    setList(Object.fromEntries((data || []).map((l: Listing) => [l.portal, l])));
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [car.id]);

  async function upsert(portal: string, patch: Partial<Listing>) {
    const cur = list[portal] || { portal, enabled: true, status: 'pending', external_url: null, external_id: null, last_error: null, last_sync_at: null };
    const next = { ...cur, ...patch };
    const { id, ...rest } = next;
    void id;
    const { error } = await sb.from('portal_listings').upsert({ ...rest, car_id: car.id }, { onConflict: 'car_id,portal' });
    if (error) return toast(error.message, 'err');
    load();
  }

  async function mobileDe(action: 'publish' | 'delete') {
    setBusy('mobile_de');
    const res = await fetch('/api/admin/portals/mobile-de', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ carId: car.id, action }) });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) toast(j.error || 'Kļūda', 'err');
    else toast(action === 'publish' ? 'Nosūtīts uz mobile.de' : 'Noņemts no mobile.de');
    load();
  }

  async function zip() {
    setBusy('zip');
    try {
      const z = new JSZip();
      await Promise.all(
        images.map(async (u, i) => {
          const r = await fetch(u);
          const b = await r.blob();
          const ext = b.type.includes('webp') ? 'webp' : b.type.includes('png') ? 'png' : 'jpg';
          z.file(`${String(i + 1).padStart(2, '0')}.${ext}`, b);
        }),
      );
      const blob = await z.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${car.slug}-bildes.zip`;
      a.click();
    } catch {
      toast('Neizdevās sagatavot ZIP (pārbaudi, vai bildes pārceltas uz Supabase)', 'err');
    } finally {
      setBusy(null);
    }
  }

  const status = (p: string) => {
    const l = list[p];
    if (!l || !l.enabled) return <span className="text-xs text-mute">Nav publicēts</span>;
    const tone = l.status === 'published' ? 'text-ok' : l.status === 'error' ? 'text-bad' : 'text-warn';
    const label = { pending: 'Gaida', ready: 'Sagatavots', published: 'Publicēts', error: 'Kļūda', removed: 'Noņemts' }[l.status] || l.status;
    return <span className={`text-xs font-bold ${tone}`}>{label}</span>;
  };

  return (
    <Card title="Publicēt citos portālos" hint="Viens auto — vairāki portāli. Statusi un saites tiek saglabāti šeit.">
      <div className="divide-y divide-line">
        {/* SS.LV */}
        <Row name={PORTALS.ss_lv.name} sub="Sagatavots sludinājums LV + RU, bildes vienā ZIP, ielīmē ss.lv formā" status={status('ss_lv')}>
          <button onClick={() => { setSsOpen(true); if (!list.ss_lv) upsert('ss_lv', { status: 'ready' }); }} className="btn btn-ghost !py-1.5 text-sm">Sagatavot</button>
        </Row>
        {/* AUTOPLIUS */}
        <Row name={PORTALS.autoplius.name} sub="Automātiski caur XML plūsmu (atjaunojas pati)" status={status('autoplius')}>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={!!list.autoplius?.enabled} onChange={(e) => upsert('autoplius', { enabled: e.target.checked, status: e.target.checked ? 'ready' : 'removed' })} className="h-4 w-4 accent-[#d91d2b]" /> Iekļaut plūsmā
          </label>
        </Row>
        {/* MOBILE.DE */}
        <Row name={PORTALS.mobile_de.name} sub={list.mobile_de?.last_error ? `Kļūda: ${list.mobile_de.last_error}` : 'Tieša publicēšana caur Seller API'} status={status('mobile_de')}>
          <div className="flex gap-1">
            <button onClick={() => mobileDe('publish')} className="btn btn-ghost !py-1.5 text-sm" disabled={busy === 'mobile_de'}>
              {busy === 'mobile_de' ? <Loader2 className="h-4 w-4 animate-spin" /> : list.mobile_de?.external_id ? <RefreshCw className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {list.mobile_de?.external_id ? 'Atjaunot' : 'Publicēt'}
            </button>
            {list.mobile_de?.external_id && <button onClick={() => mobileDe('delete')} className="btn btn-ghost !px-2 !py-1.5 text-bad" aria-label="Noņemt"><Trash2 className="h-4 w-4" /></button>}
          </div>
        </Row>
        {/* AUTO24 */}
        <Row name={PORTALS.auto24.name} sub="Sagatavots teksts un bildes (auto24 importu saskaņo ar portālu)" status={status('auto24')}>
          <button onClick={() => { setSsOpen(true); upsert('auto24', { status: 'ready' }); }} className="btn btn-ghost !py-1.5 text-sm">Sagatavot</button>
        </Row>
      </div>

      {ssOpen && <SsModal car={car} onClose={() => setSsOpen(false)} onZip={zip} zipping={busy === 'zip'} listing={list.ss_lv} onSave={(url) => upsert('ss_lv', { external_url: url, status: url ? 'published' : 'ready' })} />}
    </Card>
  );
}

function Row({ name, sub, status, children }: { name: string; sub: string; status: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{name} <span className="ml-1">{status}</span></p>
        <p className="text-xs text-mute">{sub}</p>
      </div>
      {children}
    </div>
  );
}

function SsModal({ car, onClose, onZip, zipping, listing, onSave }: { car: Car; onClose: () => void; onZip: () => void; zipping: boolean; listing?: Listing; onSave: (url: string) => void }) {
  const [lang, setLang] = useState<'lv' | 'ru'>('lv');
  const [copied, setCopied] = useState('');
  const [url, setUrl] = useState(listing?.external_url || '');
  const site = typeof window !== 'undefined' ? location.origin : 'https://lizingsauto.lv';
  const text = ssText(car, lang, site);
  const fields: [string, string][] = [
    ['Marka', car.make],
    ['Modelis', car.model],
    ['Izlaiduma gads', String(car.year ?? '')],
    ['Motors', `${car.engine_volume ? car.engine_volume.toFixed(1) + ' ' : ''}${car.fuel ? FUEL_LABEL[car.fuel] : ''}`],
    ['Ātrumkārba', car.transmission ? GEAR_LABEL[car.transmission] : ''],
    ['Nobraukums', car.mileage != null ? `${number(car.mileage)} km` : ''],
    ['Virsbūves tips', car.body_type ? BODY_LABEL[car.body_type] : ''],
    ['Piedziņa', car.drive ? DRIVE_LABEL[car.drive] : ''],
    ['Krāsa', car.color || ''],
    ['Tehniskā apskate', car.ta_until || ''],
    ['VIN', car.vin || ''],
    ['Cena', `${car.price} €${car.vat_included ? ' (ar PVN)' : ''}`],
  ];
  const copy = async (t: string, k: string) => {
    await navigator.clipboard.writeText(t);
    setCopied(k);
    setTimeout(() => setCopied(''), 1500);
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/50 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="display-md text-xl">Sludinājums SS.lv / citiem portāliem</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-paper" aria-label="Aizvērt">✕</button>
        </div>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink-2">
          <li>Lejupielādē bildes ZIP un atver SS.lv jauna sludinājuma formu.</li>
          <li>Aizpildi laukus pēc tabulas (spied, lai nokopētu).</li>
          <li>Ielīmē tekstu (SS.lv prasa unikālu tekstu katram sludinājumam).</li>
          <li>Pēc publicēšanas ielīmē sludinājuma saiti šeit — tā saglabāsies.</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={onZip} className="btn btn-primary !py-2" disabled={zipping}>{zipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Bildes (ZIP)</button>
          <a href="https://www.ss.com/lv/transport/cars/" target="_blank" rel="noopener noreferrer" className="btn btn-ghost !py-2"><ExternalLink className="h-4 w-4" /> Atvērt SS.lv</a>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <p className="label">Lauki</p>
            <ul className="divide-y divide-line rounded-xl border border-line text-sm">
              {fields.filter(([, v]) => v).map(([k, v]) => (
                <li key={k}>
                  <button onClick={() => copy(v, k)} className="flex w-full justify-between gap-3 px-3 py-2 text-left hover:bg-paper">
                    <span className="text-mute">{k}</span>
                    <span className="flex items-center gap-1.5 font-semibold">{v} {copied === k ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5 text-mute" />}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="label !mb-0">Teksts</p>
              <div className="flex rounded-lg bg-paper p-0.5 text-xs font-bold">
                {(['lv', 'ru'] as const).map((l) => <button key={l} onClick={() => setLang(l)} className={`rounded-md px-2 py-1 ${lang === l ? 'bg-white shadow-sm' : 'text-mute'}`}>{l.toUpperCase()}</button>)}
              </div>
            </div>
            <textarea readOnly value={text} className="field h-64 font-mono text-xs" />
            <button onClick={() => copy(text, 'text')} className="btn btn-ghost mt-2 w-full !py-2">{copied === 'text' ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />} Kopēt tekstu</button>
          </div>
        </div>
        <div className="mt-5 flex gap-2 border-t border-line pt-4">
          <input className="field" placeholder="https://www.ss.com/msg/lv/transport/cars/…" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button onClick={() => { onSave(url); onClose(); }} className="btn btn-primary">Saglabāt</button>
        </div>
      </div>
    </div>
  );
}
