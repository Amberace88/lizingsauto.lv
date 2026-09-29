'use client';
import { useState } from 'react';
import { Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { decodeVin } from '@/lib/vin';

/** OCTA pārbaudes palīgs: sagatavo numuru un atver LTAB oficiālo bezmaksas pārbaudi. */
export function OctaCheck() {
  const [q, setQ] = useState('');
  const [done, setDone] = useState(false);
  const clean = q.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isVin = clean.length === 17;
  const valid = clean.length >= 2 && clean.length <= 17;

  const go = async () => {
    try {
      await navigator.clipboard.writeText(clean);
    } catch {}
    setDone(true);
    window.open('https://services.ltab.lv/lv/CheckOcta', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col rounded-[24px] bg-night p-6 text-white sm:p-8">
      <div className="flex items-center gap-2 text-sm text-white/70"><ShieldCheck className="h-4 w-4 text-signal" /> Oficiālie LTAB dati · bez maksas</div>
      <h2 className="display-md mt-2 text-3xl">Vai auto ir spēkā OCTA?</h2>
      <p className="mt-2 max-w-lg text-white/70">Ievadi valsts numuru vai VIN — nokopēsim to un atvērsim Latvijas Transportlīdzekļu apdrošinātāju biroja pārbaudi.</p>
      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) go();
        }}
      >
        <label className="sr-only" htmlFor="octa-q">Valsts numurs vai VIN</label>
        <input
          id="octa-q"
          value={q}
          onChange={(e) => { setQ(e.target.value); setDone(false); }}
          placeholder="piem., AB1234 vai VIN"
          maxLength={20}
          autoComplete="off"
          className="num h-14 flex-1 rounded-xl border-2 border-white/20 bg-white/5 px-4 text-xl font-bold uppercase tracking-wider text-white placeholder:normal-case placeholder:tracking-normal placeholder:font-medium placeholder:text-white/35 focus:border-signal focus:outline-none"
        />
        <button type="submit" disabled={!valid} className="btn btn-signal h-14 !px-6 disabled:opacity-50">
          Pārbaudīt LTAB <ExternalLink className="h-4 w-4" />
        </button>
      </form>
      {done && (
        <ol className="mt-5 space-y-1.5 rounded-xl bg-white/5 p-4 text-sm text-white/80">
          <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-signal" /> <span><b className="num text-white">{clean}</b> nokopēts — LTAB lapā ielīmē to laukā “{isVin ? 'VIN numurs' : 'Reģistrācijas numurs'}” (Ctrl+V / ilgi spied).</span></li>
          <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-signal" /> Izvēlies transportlīdzekļa veidu un ievadi drošības kodu no attēla.</li>
          <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-signal" /> Rezultātā redzēsi, vai polise ir spēkā un līdz kuram datumam.</li>
        </ol>
      )}
      {!done && valid && <p className="mt-3 flex items-center gap-1.5 text-xs text-white/50"><Copy className="h-3.5 w-3.5" /> Numurs tiks nokopēts starpliktuvē</p>}
      <dl className="mt-auto grid grid-cols-3 gap-3 pt-8 text-sm">
        {[['Avots', 'LTAB datubāze'], ['Cena', '0 €'], ['Laiks', '~30 sekundes']].map(([k, v]) => (
          <div key={k} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.06)' }}>
            <dt className="text-xs text-white/50">{k}</dt>
            <dd className="mt-0.5 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** VIN atšifrētājs (bez ārējiem servisiem). */
export function VinDecoder() {
  const [q, setQ] = useState('');
  const r = q.replace(/\s/g, '').length >= 11 ? decodeVin(q) : null;
  return (
    <div className="rounded-[24px] border border-line bg-card p-6 sm:p-8">
      <h2 className="display-md text-2xl text-ink">VIN atšifrētājs</h2>
      <p className="mt-1 text-sm text-ink-2">Uzzini ražotāju, izcelsmes valsti un modeļa gadu no 17 simbolu VIN koda.</p>
      <input value={q} onChange={(e) => setQ(e.target.value.toUpperCase())} maxLength={20} placeholder="piem., WVWZZZ3CZJE123456" className="field num mt-4 !h-14 !text-lg uppercase tracking-wider" aria-label="VIN kods" />
      {r && (
        <div className="mt-4">
          {!r.valid && <p className="mb-3 rounded-xl bg-warn/10 p-3 text-sm text-warn">{r.problems.join('. ')}.</p>}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Ražotājs', r.maker || 'Nav datubāzē'],
              ['Valsts', r.country || '—'],
              ['Modeļa gads', r.year ? `${r.year}*` : '—'],
              ['Rūpnīcas kods', r.plant || '—'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-paper p-3"><dt className="text-xs text-mute">{k}</dt><dd className="mt-0.5 font-bold text-ink">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-mute">* Eiropas ražotāji 10. simbolu ne vienmēr izmanto gadam — salīdzini ar reģistrācijas apliecību. {r.checkOk === false ? 'Kontrolcipars neatbilst Ziemeļamerikas standartam (Eiropas auto tas ir normāli).' : r.checkOk ? 'Kontrolcipars pareizs.' : ''}</p>
        </div>
      )}
    </div>
  );
}
