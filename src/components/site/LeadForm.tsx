'use client';
import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export type LeadType = 'leasing' | 'contact' | 'sell_car' | 'test_drive' | 'reserve' | 'car_order' | 'trade_in' | 'warranty';

type Field = { name: string; label: string; type?: 'text' | 'tel' | 'email' | 'textarea' | 'select' | 'number'; required?: boolean; options?: string[]; half?: boolean; placeholder?: string };

const PRESETS: Record<string, Field[]> = {
  contact: [
    { name: 'name', label: 'Vārds', required: true, half: true },
    { name: 'phone', label: 'Tālrunis', type: 'tel', required: true, half: true },
    { name: 'email', label: 'E-pasts', type: 'email' },
    { name: 'message', label: 'Ziņa', type: 'textarea', required: true },
  ],
  test_drive: [
    { name: 'name', label: 'Vārds', required: true, half: true },
    { name: 'phone', label: 'Tālrunis', type: 'tel', required: true, half: true },
    { name: 'when', label: 'Vēlamais laiks', placeholder: 'piem., sestdien ap 11:00' },
    { name: 'message', label: 'Komentārs', type: 'textarea' },
  ],
  reserve: [
    { name: 'name', label: 'Vārds', required: true, half: true },
    { name: 'phone', label: 'Tālrunis', type: 'tel', required: true, half: true },
    { name: 'message', label: 'Komentārs', type: 'textarea' },
  ],
};

export function LeadForm({ type, carId, fields, extra, submitLabel = 'Nosūtīt', successText = 'Paldies! Sazināsimies ar tevi tuvākajā laikā — parasti tās pašas dienas laikā.' }: { type: LeadType; carId?: string; fields?: Field[]; extra?: Record<string, unknown>; submitLabel?: string; successText?: string }) {
  const list = fields || PRESETS[type] || PRESETS.contact;
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values = Object.fromEntries(fd.entries()) as Record<string, string>;
    if (!values.consent) {
      setErr('Lūdzu, apstiprini piekrišanu datu apstrādei.');
      return;
    }
    setState('sending');
    setErr('');
    const { name, phone, email, message, website, consent, ...rest } = values;
    void consent;
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, car_id: carId || null, name, phone, email, message, website, data: { ...rest, ...(extra || {}), page: location.pathname } }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Neizdevās nosūtīt');
      setState('done');
    } catch (e) {
      setState('error');
      setErr(e instanceof Error ? e.message : 'Neizdevās nosūtīt. Mēģini vēlreiz vai zvani mums.');
    }
  }

  if (state === 'done')
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center rounded-2xl bg-petrol-soft p-8 text-center" role="status">
        <CheckCircle2 className="h-12 w-12 text-ok" />
        <p className="mt-3 text-lg font-bold text-ink">Pieteikums saņemts</p>
        <p className="mt-1 max-w-sm text-ink-2">{successText}</p>
      </motion.div>
    );

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-4" noValidate={false}>
      {list.map((f) => (
        <label key={f.name} className={f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}>
          <span className="label">
            {f.label}
            {f.required && <span className="text-bad"> *</span>}
          </span>
          {f.type === 'textarea' ? (
            <textarea name={f.name} required={f.required} rows={4} maxLength={3000} className="field" placeholder={f.placeholder} />
          ) : f.type === 'select' ? (
            <select name={f.name} required={f.required} className="field" defaultValue="">
              <option value="" disabled>Izvēlies…</option>
              {f.options?.map((o) => <option key={o}>{o}</option>)}
            </select>
          ) : (
            <input
              name={f.name}
              type={f.type === 'number' ? 'text' : f.type || 'text'}
              inputMode={f.type === 'number' ? 'numeric' : undefined}
              required={f.required}
              maxLength={f.type === 'email' ? 160 : 120}
              autoComplete={f.name === 'name' ? 'name' : f.name === 'phone' ? 'tel' : f.name === 'email' ? 'email' : 'off'}
              className="field"
              placeholder={f.placeholder}
            />
          )}
        </label>
      ))}
      {/* Aizsardzība pret robotiem */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="col-span-2 flex items-start gap-2.5 text-sm text-ink-2">
        <input type="checkbox" name="consent" value="1" className="mt-0.5 h-4 w-4 shrink-0 accent-[#d91d2b]" />
        <span>
          Piekrītu, ka SIA AC Industry apstrādā manus datus, lai sagatavotu piedāvājumu. <Link href="/privatuma-politika" className="text-petrol underline">Privātuma politika</Link>
        </span>
      </label>
      {err && <p className="col-span-2 text-sm font-medium text-bad" role="alert">{err}</p>}
      <button type="submit" className="btn btn-primary col-span-2 text-base" disabled={state === 'sending'}>
        {state === 'sending' ? <Loader2 className="h-5 w-5 animate-spin" /> : submitLabel}
      </button>
    </form>
  );
}

export const LEASING_FIELDS: Field[] = [
  { name: 'name', label: 'Vārds, uzvārds', required: true, half: true },
  { name: 'phone', label: 'Tālrunis', type: 'tel', required: true, half: true },
  { name: 'email', label: 'E-pasts', type: 'email', half: true },
  { name: 'client_type', label: 'Pieteicējs', type: 'select', options: ['Privātpersona', 'Uzņēmums'], required: true, half: true },
  { name: 'income', label: 'Ienākumi mēnesī (neto)', type: 'select', options: ['līdz 800 €', '800–1200 €', '1200–2000 €', '2000–3000 €', 'virs 3000 €'], required: true, half: true },
  { name: 'employment', label: 'Darba vieta', type: 'select', options: ['Strādāju Latvijā', 'Strādāju ārzemēs', 'Pašnodarbināts / uzņēmējs', 'Pensionārs', 'Cits'], required: true, half: true },
  { name: 'work_months', label: 'Darba stāžs pašreizējā vietā (mēn.)', type: 'number', half: true },
  { name: 'credit_history', label: 'Kredītvēsture', type: 'select', options: ['Laba', 'Ir bijuši kavējumi', 'Ir aktīvi parādi', 'Nezinu'], half: true },
  { name: 'company', label: 'Uzņēmuma nosaukums un reģ. nr. (ja uzņēmums)' },
  { name: 'message', label: 'Komentārs', type: 'textarea', placeholder: 'Piemēram, vēlos nodot savu auto kā pirmo iemaksu.' },
];
