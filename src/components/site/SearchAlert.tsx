'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, CheckCircle2, Loader2, X } from 'lucide-react';
import { describeCriteria, type Criteria } from '@/lib/landings';

/** “Paziņot man, kad parādīsies” — saglabā klienta meklējumu kā pieteikumu (tips “alert”). */
export function SearchAlert({ criteria, compact = false }: { criteria: Criteria; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [err, setErr] = useState('');
  const summary = describeCriteria(criteria);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    if (!v.consent) return setErr('Lūdzu, apstiprini piekrišanu datu apstrādei.');
    setState('sending');
    setErr('');
    const data: Record<string, string | number> = { summary, channel: v.channel || 'whatsapp', page: location.pathname };
    for (const [k, val] of Object.entries(criteria)) if (val != null && val !== '') data[`c_${k}`] = val as string | number;
    const res = await fetch('/api/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'alert', name: v.name, phone: v.phone, email: v.email, website: v.website, message: v.message, data }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState('idle');
      return setErr(j.error || 'Neizdevās saglabāt. Mēģini vēlreiz.');
    }
    setState('done');
    window.dispatchEvent(new CustomEvent('la:lead', { detail: { type: 'alert' } }));
  }

  return (
    <div className={compact ? '' : 'rounded-[24px] border border-line bg-card p-6 sm:p-8'}>
      {!compact && (
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-signal-soft text-signal"><BellRing className="h-6 w-6" /></span>
          <div>
            <h3 className="display-md text-xl text-ink">Neatradi īsto? Paziņosim, kad parādīsies</h3>
            <p className="mt-1 text-sm text-ink-2">Jauni auto ienāk katru nedēļu — bieži tie tiek pārdoti, pirms nonāk sludinājumos. Saglabā meklējumu: <b className="text-ink">{summary}</b>.</p>
          </div>
        </div>
      )}
      {state === 'done' ? (
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex items-center gap-2 rounded-xl bg-ok/10 p-4 text-sm font-semibold text-ok"><CheckCircle2 className="h-5 w-5" /> Saglabāts! Tiklīdz būs piemērots auto, sazināsimies ar tevi pirmo.</motion.p>
      ) : (
        <>
          {!open && (
            <button type="button" onClick={() => setOpen(true)} className={`btn btn-signal ${compact ? '' : 'mt-5'}`}><BellRing className="h-4 w-4" /> Paziņot man</button>
          )}
          <AnimatePresence>
            {open && (
              <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={submit} className="mt-5 grid gap-3 overflow-hidden sm:grid-cols-2">
                <input name="name" required minLength={2} placeholder="Vārds *" className="field" />
                <input name="phone" required type="tel" placeholder="Tālrunis *" className="field" />
                <input name="email" type="email" placeholder="E-pasts (neobligāti)" className="field" />
                <select name="channel" className="field" defaultValue="whatsapp" aria-label="Kā paziņot">
                  <option value="whatsapp">Paziņot WhatsApp</option>
                  <option value="phone">Zvanīt</option>
                  <option value="email">E-pastā</option>
                </select>
                <input name="message" placeholder="Papildu vēlmes (neobligāti), piem., krāsa, budžets mēnesī" className="field sm:col-span-2" />
                <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                <label className="flex items-start gap-2 text-xs text-ink-2 sm:col-span-2">
                  <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-[#d91d2b]" /> Piekrītu, ka SIA AC Industry apstrādā manus datus, lai paziņotu par piemērotiem auto. Varu atteikties jebkurā brīdī.
                </label>
                {err && <p className="text-sm text-bad sm:col-span-2">{err}</p>}
                <div className="flex gap-2 sm:col-span-2">
                  <button disabled={state === 'sending'} className="btn btn-signal">{state === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />} Saglabāt meklējumu</button>
                  <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost"><X className="h-4 w-4" /> Atcelt</button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
