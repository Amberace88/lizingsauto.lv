'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, MonitorDown, Smartphone, Share, SquarePlus, X, Check, MoreVertical, PlusSquare, AppWindow } from 'lucide-react';

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
type Platform = 'chromium' | 'ios' | 'mac-safari' | 'firefox' | 'android-other' | 'other';
declare global {
  interface Window {
    __bip?: BIP | null;
  }
}

const KEY = 'la_pwa';
const SILENCE_DAYS = 45;
const DELAY_MS = 25_000;

function readKey() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function writeKey(v: string) {
  try {
    localStorage.setItem(KEY, v);
  } catch {}
}

function detect(): { platform: Platform; mobile: boolean } {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const mobile = ios || /android|mobile/i.test(ua);
  if (ios) return { platform: 'ios', mobile: true };
  if (/firefox|fxios/i.test(ua)) return { platform: 'firefox', mobile };
  if (/chrome|chromium|crios|edg\//i.test(ua)) return { platform: 'chromium', mobile };
  if (/safari/i.test(ua) && /macintosh/i.test(ua)) return { platform: 'mac-safari', mobile: false };
  return { platform: mobile ? 'android-other' : 'other', mobile };
}

/** Kopējais stāvoklis: vai var instalēt ar vienu klikšķi, vai jau instalēts, platforma. */
export function usePwa() {
  const [bip, setBip] = useState<BIP | null>(null);
  const [installed, setInstalled] = useState(false);
  const [env, setEnv] = useState<{ platform: Platform; mobile: boolean } | null>(null);

  useEffect(() => {
    const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    if (standalone) writeKey('installed');
    setEnv(detect());
    setBip(window.__bip || null);
    const onBip = () => setBip(window.__bip || null);
    const onInst = () => {
      setInstalled(true);
      setBip(null);
    };
    addEventListener('la:bip', onBip);
    addEventListener('la:installed', onInst);
    return () => {
      removeEventListener('la:bip', onBip);
      removeEventListener('la:installed', onInst);
    };
  }, []);

  const install = useCallback(async () => {
    const e = window.__bip;
    if (!e) return 'unavailable' as const;
    try {
      await e.prompt();
      const c = await e.userChoice;
      window.__bip = null;
      setBip(null);
      writeKey(c.outcome === 'accepted' ? 'installed' : String(Date.now()));
      return c.outcome;
    } catch {
      return 'unavailable' as const;
    }
  }, []);

  return { canPrompt: !!bip, installed, platform: env?.platform, mobile: env?.mobile ?? false, ready: !!env, install };
}

/** Soli pa solim instrukcijas pārlūkiem, kur nav vienas pogas instalēšanas. */
export function InstallSteps({ platform, mobile }: { platform?: Platform; mobile: boolean }) {
  const steps: { i: typeof Share; t: React.ReactNode }[] =
    platform === 'ios'
      ? [
          { i: Share, t: <>Safari apakšā spied <b>Kopīgot</b> (kvadrāts ar bultu)</> },
          { i: SquarePlus, t: <>Izvēlies <b>„Pievienot sākuma ekrānam”</b></> },
          { i: Check, t: <>Spied <b>Pievienot</b> — ikona parādīsies starp lietotnēm</> },
        ]
      : platform === 'mac-safari'
        ? [
            { i: AppWindow, t: <>Safari izvēlnē atver <b>Fails</b> (File)</> },
            { i: PlusSquare, t: <>Izvēlies <b>„Pievienot Dock”</b> (Add to Dock)</> },
            { i: Check, t: <>Tavs Auto atvērsies kā atsevišķa programma no Dock un Launchpad</> },
          ]
        : platform === 'firefox'
          ? [
              { i: AppWindow, t: <>Firefox datorā lietotnes neinstalē — atver šo lapu <b>Chrome</b> vai <b>Edge</b> pārlūkā</> },
              { i: MonitorDown, t: <>Adreses joslas labajā pusē spied <b>instalēšanas ikonu</b></> },
            ]
          : mobile
            ? [
                { i: MoreVertical, t: <>Pārlūka augšējā stūrī atver izvēlni <b>⋮</b></> },
                { i: SquarePlus, t: <>Izvēlies <b>„Instalēt lietotni”</b> vai <b>„Pievienot sākuma ekrānam”</b></> },
              ]
            : [
                { i: MonitorDown, t: <>Adreses joslas labajā pusē spied <b>instalēšanas ikonu</b> (monitors ar bultu)</> },
                { i: MoreVertical, t: <>vai izvēlnē <b>⋮</b> → <b>Saglabāt un kopīgot</b> → <b>Instalēt lapu kā lietotni</b></> },
                { i: Check, t: <>Ikona parādīsies uz darbvirsmas, uzdevumjoslā un Start izvēlnē</> },
              ];
  return (
    <ol className="space-y-2.5">
      {steps.map(({ i: I, t }, n) => (
        <li key={n} className="flex items-start gap-3 text-sm text-ink-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-signal-soft text-signal"><I className="h-4 w-4" /></span>
          <span className="pt-1">{t}</span>
        </li>
      ))}
    </ol>
  );
}

function StepsModal({ open, onClose, platform, mobile }: { open: boolean; onClose: () => void; platform?: Platform; mobile: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-label="Instalēt lietotni" className="relative w-full max-w-md rounded-[24px] border border-line bg-card p-6 text-ink shadow-[var(--shadow-lift)]" initial={{ y: 24, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 24, scale: 0.97 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={onClose} aria-label="Aizvērt" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-mute hover:bg-paper hover:text-ink"><X className="h-4 w-4" /></button>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 rounded-xl" />
              <div>
                <p className="text-lg font-bold">Instalē Tavs Auto</p>
                <p className="text-sm text-mute">{mobile ? 'Uz telefona sākuma ekrāna' : 'Uz datora kā programma'}</p>
              </div>
            </div>
            <div className="mt-5"><InstallSteps platform={platform} mobile={mobile} /></div>
            <p className="mt-5 rounded-xl bg-paper p-3 text-xs text-mute">Bez App Store un bez lejupielādēm — lietotne aizņem mazāk par 1 MB un vienmēr ir atjaunināta.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Poga kājenē, admin panelī un /lietotne lapā. Ja pārlūks atļauj — instalē ar vienu klikšķi, citādi parāda soļus. */
export function InstallButton({ variant = 'footer', className = '' }: { variant?: 'footer' | 'admin' | 'hero'; className?: string }) {
  const { canPrompt, installed, platform, mobile, ready, install } = usePwa();
  const [steps, setSteps] = useState(false);
  if (!ready) return variant === 'hero' ? <span className={`btn btn-signal pointer-events-none opacity-0 ${className}`}>Instalēt</span> : null;
  const label = mobile ? 'Pievienot telefonam' : 'Instalēt uz datora';
  const Icon = mobile ? Smartphone : MonitorDown;
  const click = async () => {
    if (canPrompt) {
      const r = await install();
      if (r !== 'unavailable') return;
    }
    setSteps(true);
  };
  if (installed)
    return variant === 'hero' ? (
      <span className={`inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-600 ${className}`}><Check className="h-4 w-4" /> Lietotne jau ir instalēta</span>
    ) : null;
  const cls =
    variant === 'admin'
      ? 'flex w-full items-center justify-center gap-1.5 rounded-lg bg-signal/90 py-2 text-xs font-semibold text-white hover:bg-signal'
      : variant === 'hero'
        ? 'btn btn-signal'
        : 'inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/20';
  return (
    <>
      <button type="button" onClick={click} className={`${cls} ${className}`}>
        <Icon className={variant === 'admin' ? 'h-3.5 w-3.5' : 'h-4 w-4'} /> {variant === 'admin' ? 'Instalēt kā programmu' : label}
      </button>
      <StepsModal open={steps} onClose={() => setSteps(false)} platform={platform} mobile={mobile} />
    </>
  );
}

/** Neuzbāzīgs piedāvājums pēc ~25 s: vienreiz, atceras “Ne tagad”. */
export function InstallPrompt() {
  const path = usePathname() || '';
  const { canPrompt, installed, platform, mobile, ready, install } = usePwa();
  const [show, setShow] = useState(false);
  const [steps, setSteps] = useState(false);

  useEffect(() => {
    if (!ready || installed) return;
    const v = readKey();
    if (v === 'installed') return;
    if (v && (Date.now() - Number(v)) / 864e5 < SILENCE_DAYS) return;
    const t = setTimeout(() => {
      // Nerādām virs sīkdatņu paziņojuma
      let consent: string | null = 'x';
      try {
        consent = localStorage.getItem('ta_consent');
      } catch {}
      if (consent === null && document.querySelector('[aria-label="Sīkdatnes"]')) return;
      setShow(true);
    }, DELAY_MS);
    return () => clearTimeout(t);
  }, [ready, installed]);

  const offer = canPrompt || platform === 'ios' || platform === 'mac-safari' || (!mobile && platform === 'chromium');
  const visible = show && offer && !installed && !path.startsWith('/admin');
  const dismiss = () => {
    writeKey(String(Date.now()));
    setShow(false);
  };
  const go = async () => {
    if (canPrompt) {
      const r = await install();
      if (r !== 'unavailable') return setShow(false);
    }
    setSteps(true);
  };

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            role="region"
            aria-label="Instalēt lietotni"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[60] sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[380px] print:hidden"
          >
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-night/95 p-4 text-white shadow-2xl backdrop-blur">
              <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-signal/30 blur-3xl" />
              <button onClick={dismiss} aria-label="Aizvērt" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
              <div className="flex items-start gap-3 pr-7">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl ring-1 ring-white/10" />
                <div className="min-w-0">
                  <p className="font-bold leading-snug">{mobile ? 'Tavs Auto telefonā' : 'Tavs Auto uz tava datora'}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/65">
                    {mobile ? 'Pievieno sākuma ekrānam — jaunākie auto un kalkulatori vienā pieskārienā, bez App Store.' : 'Instalē kā programmu — atveras atsevišķā logā ar ikonu darbvirsmā un uzdevumjoslā.'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={go} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-signal text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]">
                  <Download className="h-4 w-4" /> {canPrompt ? 'Instalēt' : 'Kā instalēt?'}
                </button>
                <button onClick={dismiss} className="h-10 rounded-xl border border-white/15 px-4 text-sm font-semibold text-white/80 hover:bg-white/10">Ne tagad</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <StepsModal open={steps} onClose={() => setSteps(false)} platform={platform} mobile={mobile} />
    </>
  );
}
