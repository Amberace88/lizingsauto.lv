'use client';
import { useEffect, useState } from 'react';
import { Loader2, Save, Lock } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { AdminTitle } from '@/components/admin/AdminShell';
import { Card } from '@/components/admin/CarEditor';
import { useToast } from '@/components/admin/Toast';
import { revalidateSite } from '@/components/admin/revalidate';
import { DEFAULT_LEASING } from '@/lib/leasing';
import { DEFAULT_EKII } from '@/lib/ekii';
import { DEFAULT_WARRANTY } from '@/lib/warranty';
import { normalizeBadgeOrder } from '@/lib/format';
import { BadgeDefaultOrder } from '@/components/admin/BadgeOrder';

type Def = { key: string; label: string; type?: 'number' | 'text' | 'textarea' | 'bool'; hint?: string };
const SECTIONS: { key: string; title: string; hint: string; tech?: boolean; fields: Def[] }[] = [
  {
    key: 'content', title: 'Sākumlapas teksti', hint: 'Galvenais virsraksts un paziņojumu josla lapas augšā.',
    fields: [
      { key: 'heroTitle', label: 'Galvenais virsraksts' },
      { key: 'heroText', label: 'Apakšteksts', type: 'textarea' },
      { key: 'announcement', label: 'Paziņojumu josla (atstāj tukšu, lai paslēptu)', hint: 'Piem., “Svētku dienās strādājam 10:00–14:00”' },
    ],
  },
  {
    key: 'company', title: 'Uzņēmuma informācija', hint: 'Rādās kājenē, kontaktos un meklētājiem.',
    fields: [
      { key: 'brand', label: 'Zīmols' }, { key: 'name', label: 'Juridiskais nosaukums' }, { key: 'regNr', label: 'Reģ. nr.' },
      { key: 'legalAddress', label: 'Juridiskā adrese' }, { key: 'address', label: 'Faktiskā adrese' }, { key: 'phone', label: 'Tālrunis' },
      { key: 'email', label: 'E-pasts' }, { key: 'whatsapp', label: 'WhatsApp numurs (bez +)' }, { key: 'facebook', label: 'Facebook saite' }, { key: 'instagram', label: 'Instagram saite' },
      { key: 'hours.weekdays', label: 'Darba laiks darba dienās' }, { key: 'hours.saturday', label: 'Sestdienās' }, { key: 'hours.sunday', label: 'Svētdienās' },
    ],
  },
  {
    key: 'leasing', title: 'Līzinga kalkulators', hint: 'Šie parametri tiek izmantoti visos maksājumu aprēķinos lapā.',
    fields: [
      { key: 'rate', label: 'Procentu likme, % gadā', type: 'number' }, { key: 'term', label: 'Noklusētais termiņš, mēn.', type: 'number' },
      { key: 'minTerm', label: 'Min. termiņš', type: 'number' }, { key: 'maxTerm', label: 'Maks. termiņš', type: 'number' },
      { key: 'downPct', label: 'Noklusētā pirmā iemaksa, %', type: 'number' }, { key: 'maxDownPct', label: 'Maks. pirmā iemaksa, %', type: 'number' },
      { key: 'residualPct', label: 'Atlikusī vērtība, %', type: 'number' }, { key: 'contractFee', label: 'Līguma maksa, €', type: 'number' }, { key: 'monthlyFee', label: 'Ikmēneša komisija, €', type: 'number' },
    ],
  },
  {
    key: 'ekii', title: 'EKII atbalsts elektroauto', hint: 'Pēc MK noteikumiem Nr. 238 (21.04.2026), pieteikšanās līdz 31.12.2029. Ja nosacījumi mainās, atjauno summas šeit — kalkulators un auto lapas pielāgosies.',
    fields: [
      { key: 'active', label: 'Programma aktīva', type: 'bool' },
      { key: 'usedAmount', label: 'Lietots auto, €', type: 'number' }, { key: 'newAmount', label: 'Jauns auto, €', type: 'number' },
      { key: 'familyUsed5', label: 'Goda ģimene, lietots 5+ vietas, €', type: 'number' }, { key: 'familyUsed7', label: 'Goda ģimene, lietots 7+ vietas, €', type: 'number' },
      { key: 'familyNew5', label: 'Goda ģimene, jauns 5+ vietas, €', type: 'number' }, { key: 'familyNew7', label: 'Goda ģimene, jauns 7+ vietas, €', type: 'number' },
      { key: 'scrapBonus', label: 'Par vecā auto nodošanu, €', type: 'number' }, { key: 'extraChild', label: 'Par katru bērnu no 4., €', type: 'number' },
      { key: 'priceCap5', label: 'Cenas limits bez PVN (līdz 5 vietām), €', type: 'number' }, { key: 'priceCap6', label: 'Cenas limits bez PVN (6+ vietas), €', type: 'number' },
      { key: 'usedMaxAgeYears', label: 'Lietota auto maks. vecums, gadi', type: 'number' }, { key: 'usedMaxKm', label: 'Lietota auto maks. nobraukums, km', type: 'number' },
      { key: 'maxIntensityPct', label: 'Atbalsts ne vairāk kā % no cenas', type: 'number', hint: 'MK noteikumi Nr. 238 — 90%' }, { key: 'phevMaxCo2', label: 'Plug-in hibrīdam maks. CO₂, g/km', type: 'number' },
    ],
  },
  {
    key: 'warranty', title: 'Pagarinātā garantija (Mango Insurance)', hint: 'Cenas par katru plānu un termiņu. Atstāj tukšu — lapā rādīs “cena pēc pieprasījuma”.',
    fields: [
      { key: 'enabled', label: 'Rādīt garantijas piedāvājumu', type: 'bool' }, { key: 'provider', label: 'Partneris' },
      ...(['plus', 'comfort', 'advantage', 'deluxe'] as const).flatMap((p) => (['12', '24', '36'] as const).map((m) => ({ key: `prices.${p}.${m}`, label: `${p.toUpperCase()} — ${m} mēn., €`, type: 'number' as const }))),
      { key: 'rentalPerDay', label: 'Maiņas auto, € dienā', type: 'number' }, { key: 'rentalDays', label: 'Maiņas auto, maks. dienas', type: 'number' },
      { key: 'towing', label: 'Evakuators, € gadījumā', type: 'number' },
      { key: 'examples', label: 'Remontu piemēri (katrā rindā: nosaukums; summa)', type: 'textarea' },
    ],
  },
  {
    key: 'portals', title: 'Portālu integrācijas', hint: 'Tehniskie parametri. Paroles un API atslēgas glabājas tikai servera vidē (Netlify), ne datubāzē.', tech: true,
    fields: [
      { key: 'autoplius.contactId', label: 'Autoplius kontakta (filiāles) ID' }, { key: 'autoplius.cityId', label: 'Autoplius pilsētas ID (Rīga = 161)' },
      { key: 'autoplius.phone', label: 'Autoplius sludinājumu tālrunis' }, { key: 'mobile_de.sellerId', label: 'Mobile.de pārdevēja ID (mobileSellerId)' },
    ],
  },
];

const DEFAULTS: Record<string, Record<string, unknown>> = { leasing: DEFAULT_LEASING as unknown as Record<string, unknown>, ekii: DEFAULT_EKII as unknown as Record<string, unknown>, warranty: DEFAULT_WARRANTY as unknown as Record<string, unknown> };
const get = (o: Record<string, unknown>, path: string) => path.split('.').reduce<unknown>((a, k) => (a as Record<string, unknown>)?.[k], o);
const setDeep = (o: Record<string, unknown>, path: string, v: unknown) => {
  const keys = path.split('.');
  const copy = structuredClone(o);
  let cur = copy as Record<string, unknown>;
  keys.slice(0, -1).forEach((k) => { cur[k] = { ...((cur[k] as object) || {}) }; cur = cur[k] as Record<string, unknown>; });
  cur[keys.at(-1)!] = v;
  return copy;
};

export default function SettingsPage() {
  const sb = supabaseBrowser();
  const toast = useToast();
  const [vals, setVals] = useState<Record<string, Record<string, unknown>> | null>(null);
  const [isDev, setDev] = useState(false);
  const [saving, setSaving] = useState('');
  const [badgeOrder, setBadgeOrder] = useState<string[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      const [{ data }, { data: me }] = await Promise.all([sb.from('settings').select('key,value'), sb.from('admins').select('role').eq('user_id', user?.id).maybeSingle()]);
      setDev(me?.role === 'developer');
      const m: Record<string, Record<string, unknown>> = {};
      for (const s of SECTIONS) m[s.key] = { ...structuredClone(DEFAULTS[s.key] || {}), ...((data || []).find((r: { key: string }) => r.key === s.key)?.value || {}) };
      setVals(m);
      setBadgeOrder(normalizeBadgeOrder(((data || []).find((r: { key: string }) => r.key === 'badges')?.value as { order?: string[] } | undefined)?.order));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(key: string, tech?: boolean) {
    setSaving(key);
    const value = key === 'badges' ? { order: badgeOrder } : vals![key];
    const { error } = await sb.from('settings').upsert({ key, value, is_public: !tech, technical: !!tech, updated_at: new Date().toISOString() });
    setSaving('');
    if (error) return toast(error.message, 'err');
    toast('Iestatījumi saglabāti');
    revalidateSite();
  }

  if (!vals) return <div className="grid place-items-center p-20"><Loader2 className="h-6 w-6 animate-spin text-mute" /></div>;

  return (
    <>
      <AdminTitle title="Lapas iestatījumi" sub="Teksti, kontakti, līzinga, EKII un garantijas parametri. Izmaiņas lapā redzamas uzreiz." />
      <div className="space-y-6">
        {SECTIONS.filter((s) => !s.tech || isDev).map((s) => (
          <Card key={s.key} title={s.title} hint={s.hint} actions={s.tech ? <span className="flex items-center gap-1 text-xs font-semibold text-mute"><Lock className="h-3.5 w-3.5" /> Tikai izstrādātājam</span> : undefined}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {s.fields.map((f) => {
                const v = get(vals[s.key], f.key);
                const on = (nv: unknown) => setVals({ ...vals, [s.key]: setDeep(vals[s.key], f.key, nv) });
                return (
                  <label key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2 lg:col-span-3' : ''}>
                    <span className="label">{f.label}</span>
                    {f.type === 'bool' ? (
                      <input type="checkbox" checked={!!v} onChange={(e) => on(e.target.checked)} className="h-5 w-5 accent-[#d91d2b]" />
                    ) : f.type === 'textarea' ? (
                      <textarea className="field" rows={3} value={String(v ?? '')} onChange={(e) => on(e.target.value)} />
                    ) : (
                      <input className={`field ${f.type === 'number' ? 'num' : ''}`} inputMode={f.type === 'number' ? 'decimal' : undefined} value={String(v ?? '')} onChange={(e) => on(f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value.replace(',', '.'))) : e.target.value)} />
                    )}
                    {f.hint && <span className="mt-1 block text-xs text-mute">{f.hint}</span>}
                  </label>
                );
              })}
            </div>
            <div className="mt-5 flex justify-end">
              <button onClick={() => save(s.key, s.tech)} className="btn btn-primary" disabled={saving === s.key}>{saving === s.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Saglabāt</button>
            </div>
          </Card>
        ))}
        <Card title="Zīmju svarīgums" hint="Kādā secībā zīmes rādās uz auto bildēm visā lapā. Velc vai spied bultiņas — svarīgākā augšā. Konkrētam auto secību var mainīt arī auto kartītē.">
          {badgeOrder && <BadgeDefaultOrder order={badgeOrder} onChange={setBadgeOrder} />}
          <div className="mt-5 flex justify-end">
            <button onClick={() => save('badges')} className="btn btn-primary" disabled={saving === 'badges'}>{saving === 'badges' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Saglabāt</button>
          </div>
        </Card>
      </div>
    </>
  );
}
