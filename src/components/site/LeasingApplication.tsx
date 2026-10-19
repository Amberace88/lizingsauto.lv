'use client';
/* eslint-disable @next/next/no-img-element -- mazi sīktēli no Supabase krātuves */
// Līzinga pieteikums 3 soļos: auto un summa → ienākumi un darbs → kontakti.
// Dod pārdevējam visu, kas vajadzīgs, lai uzreiz varētu izvērtēt un atbildēt.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Car as CarIcon, Link2, Search, CheckCircle2, Loader2, ArrowRight, ArrowLeft, HelpCircle, Check } from 'lucide-react';
import type { LeasingSettings } from '@/lib/types';
import { monthlyPayment } from '@/lib/leasing';
import { creditExample, pct } from '@/lib/credit';
import { CreditWarning } from './Credit';

export type PickCar = { id: string; title: string; price: number; img?: string | null; year?: number | null; km?: number | null; reserved?: boolean };
type Source = 'catalog' | 'other' | 'none';

const SOURCE_LABEL: Record<Source, string> = { catalog: 'Mūsu katalogā', other: 'Cits auto', none: 'Vēl nav izvēlēts' };
const TERMS = [12, 24, 36, 48, 60, 72, 84, 96];
const num = (s: string) => {
  const n = Number(String(s).replace(/[^\d.,]/g, '').replace(',', '.'));
  return isFinite(n) ? Math.round(n) : 0;
};
const eur = (n: number) => `${Math.round(n).toLocaleString('lv-LV')} €`;

export function LeasingApplication({ cars = [], fixedCar, leasing, initial }: { cars?: PickCar[]; fixedCar?: PickCar; leasing: LeasingSettings; initial?: { down?: number; term?: number } }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [source, setSource] = useState<Source>(fixedCar ? 'catalog' : 'catalog');
  const [carId, setCarId] = useState(fixedCar?.id || '');
  const [q, setQ] = useState('');
  const [f, setF] = useState<Record<string, string>>({
    car_link: '', make_model: '', car_year: '', car_price: fixedCar ? String(fixedCar.price) : '',
    down: initial?.down != null ? String(initial.down) : '', credit_amount: '', term: String(initial?.term || leasing.term || 72), trade_in: '',
    client_type: '', income_net: '', employment: '', employer: '', work_months: '', obligations: '', dependents: '', credit_history: '', company: '',
    name: '', phone: '', email: '', contact_pref: 'Zvans', message: '',
  });
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setErr('');
    setF((o) => ({ ...o, [k]: e.target.value }));
  };

  const picked = fixedCar || cars.find((c) => c.id === carId);
  const price = source === 'catalog' ? picked?.price || 0 : num(f.car_price);
  const down = num(f.down);
  const autoCredit = Math.max(0, price - down);
  const credit = f.credit_amount ? num(f.credit_amount) : autoCredit;
  const term = Number(f.term) || 72;
  const monthly = credit > 0 ? Math.round(monthlyPayment({ price: credit, down: 0, rate: leasing.rate, term, monthlyFee: leasing.monthlyFee })) : 0;
  const ex = credit > 0 ? creditExample(credit, { ...leasing, residualPct: 0 }, { down: 0, term }) : null;
  const income = num(f.income_net);
  const load = income > 0 ? Math.round(((monthly + num(f.obligations)) / income) * 100) : null;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? cars.filter((c) => c.title.toLowerCase().includes(s) || String(c.year || '').includes(s)) : cars).slice(0, 60);
  }, [cars, q]);

  function validate(s: number) {
    if (s === 0) {
      if (source === 'catalog' && !picked) return 'Izvēlies auto no saraksta vai atzīmē “Cits auto”.';
      if (source === 'other' && !f.car_link.trim() && !f.make_model.trim()) return 'Ieliec saiti uz sludinājumu vai ieraksti auto marku un modeli.';
      if (source === 'other' && f.car_link.trim() && !/^https?:\/\/\S+\.\S+/i.test(f.car_link.trim())) return 'Saitei jāsākas ar https://';
      if (credit <= 0) return source === 'none' ? 'Ieraksti, cik lielu summu vēlies finansēt.' : 'Norādi auto cenu vai vajadzīgo līzinga summu.';
    }
    if (s === 1) {
      if (!f.client_type) return 'Izvēlies, kas piesakās — privātpersona vai uzņēmums.';
      if (!income) return 'Ieraksti ienākumus mēnesī pēc nodokļiem.';
      if (!f.employment) return 'Izvēlies nodarbinātību.';
      if (f.client_type === 'Uzņēmums' && !f.company.trim()) return 'Ieraksti uzņēmuma nosaukumu un reģ. nr.';
    }
    if (s === 2) {
      if (f.name.trim().length < 2) return 'Ieraksti vārdu un uzvārdu.';
      if (!/^[+0-9 ()-]{6,}$/.test(f.phone.trim())) return 'Ieraksti derīgu tālruņa numuru.';
      if (!consent) return 'Lūdzu, apstiprini piekrišanu datu apstrādei.';
    }
    return '';
  }
  function go(to: number) {
    if (to > step) {
      const e = validate(step);
      if (e) return setErr(e);
    }
    setErr('');
    setDir(to > step ? 1 : -1);
    setStep(to);
  }

  async function submit() {
    const e = validate(2);
    if (e) return setErr(e);
    setState('sending');
    setErr('');
    const carTitle = source === 'catalog' ? picked?.title : source === 'other' ? [f.make_model, f.car_year].filter(Boolean).join(', ') || 'Cits auto (skat. saiti)' : 'Vēl nav izvēlēts';
    const data: Record<string, string | number> = {
      car_source: SOURCE_LABEL[source],
      car: carTitle || '',
      ...(source === 'other' && f.car_link.trim() ? { car_link: f.car_link.trim() } : {}),
      ...(price ? { car_price: price } : {}),
      ...(down ? { down } : {}),
      credit_amount: credit,
      term,
      monthly,
      ...(ex ? { apr: ex.apr } : {}),
      ...(f.trade_in.trim() ? { trade_in: f.trade_in.trim() } : {}),
      client_type: f.client_type,
      income_net: income,
      employment: f.employment,
      ...(f.employer.trim() ? { employer: f.employer.trim() } : {}),
      ...(f.work_months ? { work_months: num(f.work_months) } : {}),
      ...(f.obligations ? { obligations: num(f.obligations) } : {}),
      ...(f.dependents ? { dependents: f.dependents } : {}),
      ...(f.credit_history ? { credit_history: f.credit_history } : {}),
      ...(f.company.trim() ? { company: f.company.trim() } : {}),
      contact_pref: f.contact_pref,
      page: location.pathname,
    };
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'leasing', car_id: source === 'catalog' && picked ? picked.id : null, name: f.name, phone: f.phone, email: f.email, message: f.message, website: '', data }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Neizdevās nosūtīt');
      setState('done');
      window.dispatchEvent(new CustomEvent('la:lead', { detail: { type: 'leasing' } }));
    } catch (er) {
      setState('idle');
      setErr(er instanceof Error ? er.message : 'Neizdevās nosūtīt. Mēģini vēlreiz vai zvani mums.');
    }
  }

  if (state === 'done')
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center rounded-2xl bg-petrol-soft p-8 text-center" role="status">
        <CheckCircle2 className="h-12 w-12 text-ok" />
        <p className="mt-3 text-lg font-bold text-ink">Pieteikums saņemts</p>
        <p className="mt-1 max-w-sm text-ink-2">Izskatīsim un sazināsimies ar tevi. Lēmumu par līzingu pieņem līzinga devējs pēc kredītspējas izvērtēšanas.</p>
      </motion.div>
    );

  const STEPS = ['Auto un summa', 'Ienākumi', 'Kontakti'];
  return (
    <div>
      {/* Progress */}
      <ol className="mb-5 grid grid-cols-3 gap-2">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => i < step && go(i)} className="w-full text-left" disabled={i >= step}>
              <span className="block h-1.5 overflow-hidden rounded-full bg-line">
                <motion.span className="block h-full rounded-full bg-signal" initial={false} animate={{ width: i < step ? '100%' : i === step ? '50%' : '0%' }} transition={{ duration: 0.35 }} />
              </span>
              <span className={`mt-1.5 flex items-center gap-1 text-xs font-semibold ${i <= step ? 'text-ink' : 'text-mute'}`}>
                {i < step ? <Check className="h-3.5 w-3.5 text-ok" /> : <span className="num">{i + 1}.</span>} {s}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div key={step} custom={dir} initial={{ opacity: 0, x: dir * 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -28 }} transition={{ duration: 0.22 }} className="grid grid-cols-2 gap-4">
            {step === 0 && (
              <>
                {fixedCar ? (
                  <div className="col-span-2 flex items-center gap-3 rounded-xl border border-line bg-paper p-3">
                    <CarIcon className="h-5 w-5 shrink-0 text-signal" />
                    <div className="min-w-0"><p className="truncate font-semibold text-ink">{fixedCar.title}</p><p className="num text-sm text-ink-2">{eur(fixedCar.price)}</p></div>
                  </div>
                ) : (
                  <>
                    <div className="col-span-2">
                      <span className="label">Kuru auto vēlies iegādāties? <span className="text-bad">*</span></span>
                      <div className="grid grid-cols-3 gap-2">
                        {([['catalog', CarIcon], ['other', Link2], ['none', HelpCircle]] as const).map(([k, I]) => (
                          <button key={k} type="button" onClick={() => { setSource(k); setErr(''); }} aria-pressed={source === k} className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-semibold transition sm:text-sm ${source === k ? 'border-signal bg-signal-soft text-ink' : 'border-line text-ink-2 hover:border-ink/30'}`}>
                            <I className={`h-5 w-5 ${source === k ? 'text-signal' : 'text-mute'}`} /> {SOURCE_LABEL[k]}
                          </button>
                        ))}
                      </div>
                    </div>
                    {source === 'catalog' && (
                      <div className="col-span-2">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
                          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Meklē pēc markas, modeļa vai gada" className="field !pl-9" />
                        </div>
                        <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-xl border border-line p-1" role="listbox" aria-label="Auto">
                          {filtered.length === 0 && <li className="p-4 text-center text-sm text-mute">Nekas neatrasts. Izvēlies “Cits auto”.</li>}
                          {filtered.map((c) => (
                            <li key={c.id}>
                              <button type="button" role="option" aria-selected={carId === c.id} onClick={() => { setCarId(c.id); setErr(''); }} className={`flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition ${carId === c.id ? 'bg-signal-soft ring-1 ring-signal' : 'hover:bg-paper'}`}>
                                <span className="h-11 w-16 shrink-0 overflow-hidden rounded-md bg-line">
                                  {c.img && <img src={c.img} alt="" loading="lazy" className="h-full w-full object-cover" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-ink">{c.title}</span>
                                  <span className="num block text-xs text-mute">{[c.year, c.km != null ? `${c.km.toLocaleString('lv-LV')} km` : null, c.reserved ? 'rezervēts' : null].filter(Boolean).join(' · ')}</span>
                                </span>
                                <span className="num shrink-0 text-sm font-bold text-ink">{eur(c.price)}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {source === 'other' && (
                      <>
                        <label className="col-span-2">
                          <span className="label">Saite uz sludinājumu</span>
                          <input value={f.car_link} onChange={set('car_link')} type="url" inputMode="url" maxLength={500} placeholder="https://www.ss.lv/… vai cits portāls" className="field" />
                        </label>
                        <label className="col-span-2 sm:col-span-1"><span className="label">Marka un modelis</span><input value={f.make_model} onChange={set('make_model')} maxLength={80} placeholder="piem., VW Passat" className="field" /></label>
                        <label className="col-span-1 sm:col-span-1"><span className="label">Gads</span><input value={f.car_year} onChange={set('car_year')} inputMode="numeric" maxLength={4} className="field num" /></label>
                        <label className="col-span-1 sm:col-span-2"><span className="label">Auto cena, €</span><input value={f.car_price} onChange={set('car_price')} inputMode="numeric" maxLength={9} className="field num" /></label>
                      </>
                    )}
                  </>
                )}
                {source !== 'none' && (
                  <label className="col-span-1"><span className="label">Pirmā iemaksa, €</span><input value={f.down} onChange={set('down')} inputMode="numeric" maxLength={9} placeholder="0" className="field num" /></label>
                )}
                <label className={source === 'none' ? 'col-span-1' : 'col-span-1'}>
                  <span className="label">Vajadzīgā līzinga summa, € {source === 'none' && <span className="text-bad">*</span>}</span>
                  <input value={f.credit_amount} onChange={set('credit_amount')} inputMode="numeric" maxLength={9} placeholder={autoCredit ? String(autoCredit) : 'piem., 8000'} className="field num" />
                </label>
                <label className="col-span-1">
                  <span className="label">Termiņš</span>
                  <select value={f.term} onChange={set('term')} className="field">
                    {TERMS.filter((t) => t >= (leasing.minTerm || 12) && t <= (leasing.maxTerm || 96)).map((t) => <option key={t} value={t}>{t} mēn. ({t / 12} g.)</option>)}
                  </select>
                </label>
                <label className="col-span-2">
                  <span className="label">Vecais auto kā pirmā iemaksa (neobligāti)</span>
                  <input value={f.trade_in} onChange={set('trade_in')} maxLength={160} placeholder="piem., Opel Astra 2012, 210 000 km" className="field" />
                </label>
                {ex && (
                  <div className="col-span-2 rounded-xl bg-paper p-3 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-ink-2">Aptuvenais maksājums</span>
                      <span className="num text-lg font-bold text-ink">{eur(monthly)}/mēn. · GPL {pct(ex.apr)}</span>
                    </div>
                    <p className="num mt-1 text-xs text-ink-2">Kredīta summa {eur(credit)}, {term} mēn., likme {pct(leasing.rate)} gadā, kopā atmaksājams {eur(ex.total)}. Galīgos nosacījumus nosaka līzinga devējs pēc kredītspējas izvērtēšanas.</p>
                    <CreditWarning size="sm" className="mt-2" />
                  </div>
                )}
              </>
            )}

            {step === 1 && (
              <>
                <Sel label="Pieteicējs" req v={f.client_type} on={set('client_type')} opts={['Privātpersona', 'Uzņēmums']} />
                <label className="col-span-2 sm:col-span-1"><span className="label">Ienākumi mēnesī pēc nodokļiem, € <span className="text-bad">*</span></span><input value={f.income_net} onChange={set('income_net')} inputMode="numeric" maxLength={7} placeholder="piem., 1600" className="field num" /></label>
                <Sel label="Nodarbinātība" req v={f.employment} on={set('employment')} opts={['Darba līgums Latvijā', 'Darba līgums ārzemēs', 'Pašnodarbināts / uzņēmējs', 'Pensionārs', 'Cits']} />
                <label className="col-span-2 sm:col-span-1"><span className="label">Darba devējs un valsts</span><input value={f.employer} onChange={set('employer')} maxLength={120} placeholder="piem., SIA Būve, Latvija" className="field" /></label>
                <label className="col-span-1"><span className="label">Darba stāžs tur, mēn.</span><input value={f.work_months} onChange={set('work_months')} inputMode="numeric" maxLength={4} className="field num" /></label>
                <label className="col-span-1"><span className="label">Citi kredītmaksājumi, €/mēn.</span><input value={f.obligations} onChange={set('obligations')} inputMode="numeric" maxLength={6} placeholder="0" className="field num" /></label>
                <Sel label="Apgādājamie" v={f.dependents} on={set('dependents')} opts={['0', '1', '2', '3+']} />
                <Sel label="Kredītvēsture" v={f.credit_history} on={set('credit_history')} opts={['Bez kavējumiem', 'Ir bijuši kavējumi', 'Ir aktīvi parādi', 'Nezinu']} />
                {f.client_type === 'Uzņēmums' && (
                  <label className="col-span-2"><span className="label">Uzņēmuma nosaukums un reģ. nr. <span className="text-bad">*</span></span><input value={f.company} onChange={set('company')} maxLength={160} className="field" /></label>
                )}
                {load != null && monthly > 0 && (
                  <p className={`col-span-2 rounded-xl px-3 py-2 text-sm ${load <= 40 ? 'bg-ok/10 text-ok' : 'bg-signal-soft text-ink'}`}>
                    Kredītmaksājumi būtu ap <b className="num">{load}%</b> no ienākumiem.{' '}
                    {load <= 40 ? 'Tas iekļaujas ieteicamajā robežā.' : 'Tas ir virs ieteicamā — apsver lielāku pirmo iemaksu, garāku termiņu vai lētāku auto.'}
                  </p>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <label className="col-span-2 sm:col-span-1"><span className="label">Vārds, uzvārds <span className="text-bad">*</span></span><input value={f.name} onChange={set('name')} autoComplete="name" maxLength={120} className="field" /></label>
                <label className="col-span-2 sm:col-span-1"><span className="label">Tālrunis <span className="text-bad">*</span></span><input value={f.phone} onChange={set('phone')} type="tel" autoComplete="tel" maxLength={40} className="field" /></label>
                <label className="col-span-2 sm:col-span-1"><span className="label">E-pasts</span><input value={f.email} onChange={set('email')} type="email" autoComplete="email" maxLength={160} className="field" /></label>
                <Sel label="Kā sazināties" v={f.contact_pref} on={set('contact_pref')} opts={['Zvans', 'WhatsApp', 'E-pasts']} />
                <label className="col-span-2"><span className="label">Komentārs</span><textarea value={f.message} onChange={set('message')} rows={3} maxLength={3000} placeholder="Piem., kad vēlies auto saņemt, vai interesē apdrošināšana" className="field" /></label>
                <label className="col-span-2 flex items-start gap-2.5 text-sm text-ink-2">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#d91d2b]" />
                  <span>Piekrītu, ka SIA AC Industry apstrādā manus datus, lai sagatavotu līzinga piedāvājumu un nodotu tos līzinga devējam. <Link href="/privatuma-politika" className="text-petrol underline">Privātuma politika</Link></span>
                </label>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {err && <p className="mt-4 text-sm font-medium text-bad" role="alert">{err}</p>}
      <div className="mt-5 flex gap-2">
        {step > 0 && (
          <button type="button" onClick={() => go(step - 1)} className="btn btn-ghost"><ArrowLeft className="h-4 w-4" /> Atpakaļ</button>
        )}
        {step < 2 ? (
          <button type="button" onClick={() => go(step + 1)} className="btn btn-primary flex-1 text-base">Tālāk <ArrowRight className="h-4 w-4" /></button>
        ) : (
          <button type="button" onClick={submit} disabled={state === 'sending'} className="btn btn-primary flex-1 text-base">{state === 'sending' ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Nosūtīt pieteikumu'}</button>
        )}
      </div>
    </div>
  );
}

function Sel({ label, v, on, opts, req }: { label: string; v: string; on: (e: React.ChangeEvent<HTMLSelectElement>) => void; opts: string[]; req?: boolean }) {
  return (
    <label className="col-span-2 sm:col-span-1">
      <span className="label">{label}{req && <span className="text-bad"> *</span>}</span>
      <select value={v} onChange={on} className="field">
        <option value="" disabled>Izvēlies…</option>
        {opts.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
