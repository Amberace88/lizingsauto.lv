'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Car, Gauge, User } from 'lucide-react';

const MAKES = ['Audi', 'BMW', 'Citroen', 'Ford', 'Honda', 'Hyundai', 'Kia', 'Land Rover', 'Lexus', 'Mazda', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Opel', 'Peugeot', 'Renault', 'Seat', 'Skoda', 'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo'];
const STEPS = [
  { t: 'Auto', i: Car },
  { t: 'Stāvoklis', i: Gauge },
  { t: 'Kontakti', i: User },
];

/** 3 soļu auto novērtējuma pieteikums (tips “valuation”). */
export function ValuationWizard() {
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Record<string, string>>({ goal: 'sell', condition: 'good' });
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [err, setErr] = useState('');
  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));
  const need = [['make', 'model', 'year', 'mileage'], ['fuel', 'gear'], ['name', 'phone']][step];
  const ok = need.every((k) => (v[k] || '').trim());

  async function send() {
    if (!v.consent) return setErr('Lūdzu, apstiprini piekrišanu datu apstrādei.');
    setState('sending');
    setErr('');
    const { name, phone, email, message, consent, ...data } = v;
    void consent;
    const res = await fetch('/api/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'valuation', name, phone, email, message, data: { ...data, page: location.pathname } }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState('idle');
      return setErr(j.error || 'Neizdevās nosūtīt. Mēģini vēlreiz vai zvani.');
    }
    setState('done');
    window.dispatchEvent(new CustomEvent('la:lead', { detail: { type: 'valuation' } }));
  }

  if (state === 'done')
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center rounded-[28px] bg-card p-10 text-center shadow-[var(--shadow-lift)]">
        <CheckCircle2 className="h-14 w-14 text-ok" />
        <p className="display-md mt-4 text-2xl text-ink">Paldies! Novērtējums ceļā</p>
        <p className="mt-2 max-w-md text-ink-2">Mūsu speciālists izvērtēs {v.make} {v.model} un sazināsies ar tevi 24 stundu laikā (darba dienās parasti ātrāk).</p>
      </motion.div>
    );

  const Choice = ({ k, opts }: { k: string; opts: [string, string][] }) => (
    <div className="flex flex-wrap gap-2">
      {opts.map(([val, label]) => (
        <button key={val} type="button" onClick={() => set(k, val)} aria-pressed={v[k] === val} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${v[k] === val ? 'border-signal bg-signal text-white' : 'border-line bg-card text-ink-2 hover:border-ink-2'}`}>{label}</button>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden rounded-[28px] bg-card shadow-[var(--shadow-lift)]">
      <div className="flex border-b border-line">
        {STEPS.map((s, i) => (
          <div key={s.t} className={`flex flex-1 items-center justify-center gap-2 py-4 text-sm font-semibold transition ${i === step ? 'text-ink' : i < step ? 'text-ok' : 'text-mute'}`}>
            <span className={`grid h-7 w-7 place-items-center rounded-full ${i === step ? 'bg-signal text-white' : i < step ? 'bg-ok/15' : 'bg-paper'}`}>{i < step ? <CheckCircle2 className="h-4 w-4" /> : <s.i className="h-4 w-4" />}</span>
            <span className="hidden sm:inline">{s.t}</span>
          </div>
        ))}
      </div>
      <div className="relative h-1 bg-paper"><motion.div className="absolute inset-y-0 left-0 bg-signal" animate={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
      <div className="p-6 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="space-y-5">
            {step === 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label><span className="label">Marka *</span><input className="field" list="val-makes" value={v.make || ''} onChange={(e) => set('make', e.target.value)} placeholder="piem., Volkswagen" /><datalist id="val-makes">{MAKES.map((m) => <option key={m} value={m} />)}</datalist></label>
                  <label><span className="label">Modelis *</span><input className="field" value={v.model || ''} onChange={(e) => set('model', e.target.value)} placeholder="piem., Passat B8" /></label>
                  <label><span className="label">Izlaiduma gads *</span><input className="field num" inputMode="numeric" maxLength={4} value={v.year || ''} onChange={(e) => set('year', e.target.value.replace(/\D/g, ''))} /></label>
                  <label><span className="label">Nobraukums, km *</span><input className="field num" inputMode="numeric" value={v.mileage || ''} onChange={(e) => set('mileage', e.target.value.replace(/\D/g, ''))} /></label>
                </div>
                <label className="block"><span className="label">Valsts numurs (neobligāti — ātrākam novērtējumam)</span><input className="field uppercase" value={v.reg || ''} onChange={(e) => set('reg', e.target.value.toUpperCase())} maxLength={10} /></label>
              </>
            )}
            {step === 1 && (
              <>
                <div><span className="label">Degviela *</span><Choice k="fuel" opts={[['petrol', 'Benzīns'], ['diesel', 'Dīzelis'], ['hybrid', 'Hibrīds'], ['electric', 'Elektro'], ['lpg', 'Gāze']]} /></div>
                <div><span className="label">Ātrumkārba *</span><Choice k="gear" opts={[['automatic', 'Automāts'], ['manual', 'Manuāla']]} /></div>
                <div><span className="label">Stāvoklis</span><Choice k="condition" opts={[['excellent', 'Teicams'], ['good', 'Labs'], ['fair', 'Vajag remontu'], ['damaged', 'Bojāts']]} /></div>
                <div><span className="label">Ko vēlies?</span><Choice k="goal" opts={[['sell', 'Pārdot uzreiz'], ['tradein', 'Mainīt pret citu auto'], ['consign', 'Pārdot ar jūsu palīdzību']]} /></div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label><span className="label">Vārds *</span><input className="field" value={v.name || ''} onChange={(e) => set('name', e.target.value)} /></label>
                  <label><span className="label">Tālrunis *</span><input className="field" type="tel" value={v.phone || ''} onChange={(e) => set('phone', e.target.value)} /></label>
                  <label className="sm:col-span-2"><span className="label">E-pasts</span><input className="field" type="email" value={v.email || ''} onChange={(e) => set('email', e.target.value)} /></label>
                  <label className="sm:col-span-2"><span className="label">Komentārs (defekti, ekstras, vēlamā cena)</span><textarea className="field" rows={3} value={v.message || ''} onChange={(e) => set('message', e.target.value)} /></label>
                </div>
                <label className="flex items-start gap-2 text-sm text-ink-2"><input type="checkbox" checked={!!v.consent} onChange={(e) => set('consent', e.target.checked ? '1' : '')} className="mt-0.5 h-4 w-4 accent-[#d91d2b]" /> Piekrītu, ka SIA AC Industry apstrādā manus datus, lai sagatavotu piedāvājumu.</label>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        {err && <p className="mt-4 text-sm text-bad">{err}</p>}
        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? <button type="button" onClick={() => setStep(step - 1)} className="btn btn-ghost"><ArrowLeft className="h-4 w-4" /> Atpakaļ</button> : <span />}
          {step < 2 ? (
            <button type="button" disabled={!ok} onClick={() => setStep(step + 1)} className="btn btn-signal disabled:opacity-40">Tālāk <ArrowRight className="h-4 w-4" /></button>
          ) : (
            <button type="button" disabled={!ok || state === 'sending'} onClick={send} className="btn btn-signal disabled:opacity-40">{state === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Saņemt novērtējumu</button>
          )}
        </div>
      </div>
    </div>
  );
}
