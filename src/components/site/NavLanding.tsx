'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigation2, Car, Route, Volume2, Fuel, Box, ShieldCheck, Search, Smartphone } from 'lucide-react';
import { KIND, type Radar } from '@/lib/radars';
import { TAVS_AUTO, type Place } from '@/lib/nav';
import { isPoiCat, type PoiCat } from '@/lib/poi';
import { track } from '@/lib/track';
import { unlockVoice } from '@/lib/voice';

const RadarDrive = dynamic(() => import('./RadarDrive'), { ssr: false });

const FEATURES = [
  { i: Search, t: 'Adrešu meklēšana', d: 'Ieteikumi jau rakstot — ielas, mājas numuri, veikali, pilsētas visā Latvijā.' },
  { i: Route, t: 'Radari uz maršruta', d: 'Pirms brauciena redzi, cik stacionāro, vidējā ātruma un mobilo radaru ir ceļā — un vari izvēlēties citu maršrutu.' },
  { i: Volume2, t: 'Balss un skaņas brīdinājumi', d: 'Norādes pagriezieniem un brīdinājums ~600 un 200 m pirms radara. Ātruma pārsniegšanas signāls.' },
  { i: Box, t: '3D karte, kas griežas', d: 'Kā īstā navigācijā — karte griežas līdzi braukšanas virzienam, ēkas 3D, plūdena kustība.' },
  { i: Fuel, t: 'Viss vajadzīgais kartē', d: 'Degvielas un gāzes (LPG/CNG) uzpildes, EV uzlāde, maksas un bezmaksas stāvvietas, veikali, aptiekas, iestādes un autoservisi visā Latvijā.' },
  { i: ShieldCheck, t: 'Bez reģistrācijas', d: 'Bezmaksas, bez lietotnes lejupielādes. Atrašanās vieta netiek glabāta mūsu serverī.' },
];

const STEPS = ['Nospied „Sākt navigāciju” un atļauj atrašanās vietu.', 'Ieraksti galamērķi vai izvēlies Tavs Auto autoplaci.', 'Izvēlies maršrutu — redzēsi laiku, attālumu un radarus.', 'Novieto telefonu turētājā un brauc — par pārējo parūpēsimies.'];

export function NavLanding({ radars }: { radars: Radar[] }) {
  const [open, setOpen] = useState(false);
  const [dest, setDest] = useState<Place | null>(null);
  const [ready, setReady] = useState(false);
  const [lay, setLay] = useState<PoiCat[]>([]);
  useEffect(() => {
    setReady(true);
    const q = new URLSearchParams(location.search);
    const to = q.get('to');
    const sl = (q.get('slani') || '').split(',').filter(isPoiCat);
    if (sl.length) {
      setLay(sl);
      setOpen(true);
    }
    const lat = Number(q.get('lat'));
    const lng = Number(q.get('lng'));
    if (to === 'tavsauto') {
      setDest(TAVS_AUTO);
      setOpen(true);
    } else if (lat && lng && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      setDest({ id: `q${lat},${lng}`, name: (q.get('name') || 'Galamērķis').slice(0, 80), sub: '', lat, lng });
      setOpen(true);
    }
  }, []);

  const go = (d: Place | null) => {
    track('tool_use', { tool: d ? 'Navigācija: uz Tavs Auto' : 'Navigācija: atvērt' }, 'nav_open');
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    DOE?.requestPermission?.().catch(() => {});
    unlockVoice();
    setDest(d);
    setOpen(true);
  };
  const counts = (['fixed', 'average', 'mobile'] as const).map((k) => [k, radars.filter((r) => r.kind === k).length] as const);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-night text-white">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-60" style={{ background: 'radial-gradient(60% 80% at 80% 10%, rgba(47,123,255,.35), transparent 60%), radial-gradient(50% 60% at 10% 90%, rgba(217,29,43,.28), transparent 60%)' }} />
        <svg className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.12]" aria-hidden>
          <defs><pattern id="g" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0v44" fill="none" stroke="#fff" strokeWidth=".6" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#g)" />
        </svg>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/80"><Navigation2 className="h-3.5 w-3.5" /> Tavs Auto navigācija · bezmaksas</p>
            <h1 className="display mt-4 text-4xl leading-[1.05] sm:text-[3.6rem]">Navigācija ar fotoradaru brīdinājumiem</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/70">Ievadi galamērķi — parādīsim ātrāko maršrutu, visus radarus uz tā un vadīsim ar norādēm latviski. Darbojas pārlūkā, bez lejupielādes.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => go(null)} className="inline-flex h-14 items-center gap-2.5 rounded-2xl bg-[#2f7bff] px-6 text-[17px] font-black shadow-[0_12px_30px_rgba(47,123,255,.45)] transition hover:brightness-110 active:scale-[.98]"><Navigation2 className="h-5 w-5 fill-white" /> Sākt navigāciju</button>
              <button onClick={() => go(TAVS_AUTO)} className="inline-flex h-14 items-center gap-2.5 rounded-2xl bg-white px-6 text-[17px] font-bold text-night transition hover:bg-white/90 active:scale-[.98]"><Car className="h-5 w-5 text-signal" /> Uz Tavs Auto autoplaci</button>
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              {counts.map(([k, n]) => (
                <span key={k} className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3.5 py-1.5 text-sm"><span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND[k].color }} /><b className="num">{n}</b> <span className="text-white/65">{KIND[k].label.toLowerCase()}</span></span>
              ))}
            </div>
          </div>
          <PhoneMock />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="display-md text-3xl text-ink">Viss, kas vajadzīgs ceļā</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ i: I, t, d }, n) => (
            <motion.div key={t} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: n * 0.05 }} className="rounded-[20px] border border-line bg-card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-petrol-soft text-petrol"><I className="h-5 w-5" /></span>
              <h3 className="mt-4 font-bold text-ink">{t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{d}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="display-md text-2xl text-ink">Kā lietot</h2>
            <ol className="mt-5 space-y-3">
              {STEPS.map((s, i) => (
                <li key={s} className="flex gap-4 rounded-2xl border border-line bg-card p-4">
                  <span className="num grid h-9 w-9 shrink-0 place-items-center rounded-full bg-night text-sm font-black text-white">{i + 1}</span>
                  <span className="pt-1.5 text-ink-2">{s}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-[20px] bg-night p-7 text-white">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-signal"><Smartphone className="h-4 w-4" /> Padoms</p>
            <h3 className="display-md mt-2 text-2xl">Pievieno sākuma ekrānam</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/65">Atver šo lapu telefonā un izvēlies „Pievienot sākuma ekrānam” — navigācija atvērsies kā lietotne ar vienu pieskārienu. Ekrāns braukšanas laikā neizslēgsies.</p>
            <p className="mt-4 text-xs leading-relaxed text-white/45">Radaru dati: CSDD, Valsts policija, OpenStreetMap. Maršruti: FOSSGIS OSRM. Karte: OpenFreeMap © OpenStreetMap līdzautori. Informācija uzziņai — vienmēr ievēro ceļa zīmes un satiksmes noteikumus.</p>
          </div>
        </div>
      </section>

      {ready && createPortal(<AnimatePresence>{open && <RadarDrive radars={radars} initialDest={dest} initialLayers={lay} onClose={() => setOpen(false)} />}</AnimatePresence>, document.body)}
    </>
  );
}

function PhoneMock() {
  return (
    <div className="relative mx-auto w-[270px] sm:w-[300px]" aria-hidden>
      <div className="rounded-[44px] bg-[#1b1d22] p-3 shadow-[0_40px_80px_rgba(0,0,0,.55)] ring-1 ring-white/10">
        <div className="relative aspect-[9/18] overflow-hidden rounded-[34px] bg-[#e9e4da]">
          <svg viewBox="0 0 270 540" className="absolute inset-0 h-full w-full">
            <rect width="270" height="540" fill="#ece7dd" />
            <g fill="#ddd6c8">{[[20, 60, 70, 50], [150, 40, 90, 70], [30, 170, 60, 80], [170, 160, 70, 60], [20, 330, 80, 70], [180, 300, 70, 90], [40, 440, 70, 60], [170, 430, 80, 70]].map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} rx="6" />)}</g>
            <path d="M-10 520 L120 380 L120 250 L250 110 L300 60" stroke="#fff" strokeWidth="26" fill="none" strokeLinejoin="round" />
            <path d="M0 250 H270 M120 0 V540" stroke="#fff" strokeWidth="16" />
            <motion.path d="M135 540 L120 380 L120 250 L250 110" stroke="#1546a8" strokeWidth="15" fill="none" strokeLinejoin="round" strokeLinecap="round" />
            <motion.path d="M135 540 L120 380 L120 250 L250 110" stroke="#2f7bff" strokeWidth="10" fill="none" strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.2, ease: 'easeInOut' }} />
            <circle cx="120" cy="300" r="15" fill="#d91d2b" opacity=".25" />
            <circle cx="120" cy="300" r="7" fill="#d91d2b" stroke="#fff" strokeWidth="3" />
            <circle cx="200" cy="164" r="7" fill="#f59e0b" stroke="#fff" strokeWidth="3" />
            <path d="M135 470 l13 30 -13 -7 -13 7z" fill="#2f7bff" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
          </svg>
          <div className="absolute inset-x-2.5 top-3 rounded-2xl bg-[#0e7a4c] p-3 text-white shadow-lg">
            <p className="num text-2xl font-black leading-none">250 m</p>
            <p className="mt-1 text-sm font-bold">Pagriezieties pa labi</p>
            <p className="text-xs text-white/75">Krustabaznīcas iela</p>
          </div>
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="absolute left-2.5 top-[118px] flex items-center gap-1.5 rounded-xl bg-[#d91d2b] px-2.5 py-1.5 text-xs font-bold text-white shadow-lg">Fotoradars 400 m <span className="grid h-6 w-6 place-items-center rounded-full border-[3px] border-[#d91d2b] bg-white text-[10px] font-black text-black ring-1 ring-white">50</span></motion.div>
          <div className="absolute inset-x-2.5 bottom-3 flex items-center gap-2">
            <span className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-white/20 bg-[#111214] text-center text-white"><span className="num text-lg font-black leading-none">48<span className="block text-[8px] font-semibold text-white/60">KM/H</span></span></span>
            <span className="flex-1 rounded-2xl bg-[#111214] px-3 py-2 text-white"><span className="num block text-base font-black leading-none text-[#4ade80]">7 min</span><span className="num text-[10px] text-white/65">3,2 km · Tavs Auto</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
