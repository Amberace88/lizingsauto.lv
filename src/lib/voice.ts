// Balss norādes latviski no iepriekš sagatavotiem audio fragmentiem (/voice/*.mp3).
// Strādā visās ierīcēs — arī tur, kur nav latviešu runas sintēzes (iPhone, daudzi Android).
// Atskaņojam caur Web Audio, lai fragmenti skanētu bez pauzēm viens pēc otra.

import { SUPABASE_URL } from './supabase/env';

/** Fragmenti glabājas Supabase krātuvē (ģenerē admin panelī: Fotoradari → Balss norādes). */
export const VOICE_PATH = 'voice/';
export const VOICE_VERSION = '1';
const BASE = `${SUPABASE_URL}/storage/v1/object/public/cars/${VOICE_PATH}`;

/** Teksti, no kuriem ģenerē balss fragmentus. Komats beigās — intonācija turpinās nākamajā fragmentā. */
export const VOICE_PHRASES: Record<string, string> = {
  d50: "Pēc piecdesmit metriem,",
  d100: "Pēc simts metriem,",
  d150: "Pēc simt piecdesmit metriem,",
  d200: "Pēc divsimt metriem,",
  d250: "Pēc divsimt piecdesmit metriem,",
  d300: "Pēc trīssimt metriem,",
  d400: "Pēc četrsimt metriem,",
  d500: "Pēc piecsimt metriem,",
  d600: "Pēc sešsimt metriem,",
  d700: "Pēc septiņsimt metriem,",
  d800: "Pēc astoņsimt metriem,",
  d900: "Pēc deviņsimt metriem,",
  d1000: "Pēc viena kilometra,",
  d1500: "Pēc pusotra kilometra,",
  d2000: "Pēc diviem kilometriem,",
  d3000: "Pēc trim kilometriem,",
  d5000: "Pēc pieciem kilometriem,",
  m_right: "pagriezieties pa labi.",
  m_left: "pagriezieties pa kreisi.",
  m_slight_right: "turieties nedaudz pa labi.",
  m_slight_left: "turieties nedaudz pa kreisi.",
  m_sharp_right: "strauji pagriezieties pa labi.",
  m_sharp_left: "strauji pagriezieties pa kreisi.",
  m_uturn: "apgriezieties.",
  m_straight: "turpiniet taisni.",
  m_ra: "iebrauciet aplī.",
  m_ra_exit: "izbrauciet no apļa.",
  m_offramp_right: "nobrauciet pa labi.",
  m_offramp_left: "nobrauciet pa kreisi.",
  m_offramp: "nobrauciet no ceļa.",
  m_onramp: "uzbrauciet uz ceļa.",
  m_fork_right: "pie atzarojuma turieties pa labi.",
  m_fork_left: "pie atzarojuma turieties pa kreisi.",
  m_end_right: "ceļa galā pagriezieties pa labi.",
  m_end_left: "ceļa galā pagriezieties pa kreisi.",
  m_merge: "iekļaujieties satiksmē.",
  m_arrive: "būs galamērķis.",
  m_ra1: "aplī brauciet uz pirmo izbrauktuvi.",
  m_ra2: "aplī brauciet uz otro izbrauktuvi.",
  m_ra3: "aplī brauciet uz trešo izbrauktuvi.",
  m_ra4: "aplī brauciet uz ceturto izbrauktuvi.",
  m_ra5: "aplī brauciet uz piekto izbrauktuvi.",
  m_ra6: "aplī brauciet uz sesto izbrauktuvi.",
  r_fixed: "fotoradars.",
  r_avg: "vidējā ātruma kontrole.",
  r_mobile: "iespējams mobilais radars.",
  r_attn: "Uzmanību!",
  s30: "atļautais ātrums trīsdesmit.",
  s40: "atļautais ātrums četrdesmit.",
  s50: "atļautais ātrums piecdesmit.",
  s60: "atļautais ātrums sešdesmit.",
  s70: "atļautais ātrums septiņdesmit.",
  s80: "atļautais ātrums astoņdesmit.",
  s90: "atļautais ātrums deviņdesmit.",
  s100: "atļautais ātrums simts.",
  s110: "atļautais ātrums simts desmit.",
  s120: "atļautais ātrums simts divdesmit.",
  s130: "atļautais ātrums simts trīsdesmit.",
  start: "Sākam braucienu. Laimīgu ceļu!",
  start_radars: "Maršrutā ir radari. Brīdināsim laikus.",
  start_clear: "Maršrutā radaru nav.",
  rerouted: "Maršruts pārrēķināts.",
  changed: "Maršruts mainīts.",
  arrived: "Esat ieradies galamērķī.",
  arrived_ta: "Esat ieradies Tavs Auto autoplacī. Laipni lūdzam!",
  over: "Pārsniegts atļautais ātrums!",
  sec_in: "Sākas vidējā ātruma kontroles posms.",
  sec_out: "Vidējā ātruma posms ir beidzies.",
  ready: "Balss norādes ieslēgtas.",
};
const DIST = [50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 3000, 5000];
const SPEEDS = [30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130];

let ctx: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
let playing: AudioBufferSourceNode[] = [];
let playingPrio = 0;
let busyUntil = 0;

function audio() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  return ctx;
}

/** Jāizsauc no lietotāja pieskāriena (iPhone citādi neatļauj skaņu). */
export function unlockVoice() {
  try {
    // iOS 17+: skan arī tad, ja telefons ir klusajā režīmā
    const s = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (s) s.type = 'playback';
  } catch {}
  const c = audio();
  if (!c) return;
  if (c.state !== 'running') c.resume().catch(() => {});
  // klusa skaņa atbloķē atskaņošanu
  try {
    const b = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = b;
    src.connect(c.destination);
    src.start(0);
  } catch {}
}

function load(key: string) {
  let p = buffers.get(key);
  if (!p) {
    const c = audio();
    p = c
      ? fetch(`${BASE}${key}.mp3?v=${VOICE_VERSION}`)
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
          .then((a) => new Promise<AudioBuffer>((res, rej) => c.decodeAudioData(a, res, rej)))
          .catch(() => {
            buffers.delete(key);
            return null;
          })
      : Promise.resolve(null);
    buffers.set(key, p);
  }
  return p;
}

/** Ielādējam visus fragmentus iepriekš (≈ 0,5 MB), lai norāde skan uzreiz. */
export function preloadVoice() {
  for (const k of ALL_KEYS) load(k);
}

/**
 * Atskaņo fragmentu virkni. Augstākas prioritātes ziņa pārtrauc zemāku
 * (piem., "Uzmanību, fotoradars" pārtrauc pagrieziena norādi).
 */
export async function speak(keys: (string | null | undefined)[], prio = 1) {
  const c = audio();
  const list = keys.filter(Boolean) as string[];
  if (!c || !list.length) return false;
  const now = performance.now();
  if (now < busyUntil && prio < playingPrio) return true; // svarīgāka ziņa vēl skan
  if (c.state !== 'running') await c.resume().catch(() => {});
  const bufs = (await Promise.all(list.map(load))).filter(Boolean) as AudioBuffer[];
  if (!bufs.length) return false;
  for (const s of playing) {
    try {
      s.stop();
    } catch {}
  }
  playing = [];
  let t = c.currentTime + 0.05;
  for (const b of bufs) {
    const src = c.createBufferSource();
    src.buffer = b;
    src.connect(c.destination);
    src.start(t);
    playing.push(src);
    t += b.duration + 0.06;
  }
  playingPrio = prio;
  busyUntil = now + (t - c.currentTime) * 1000;
  return true;
}

export function distKey(m: number) {
  if (m < 40) return null;
  let best = DIST[0];
  for (const d of DIST) if (Math.abs(d - m) < Math.abs(best - m)) best = d;
  return `d${best}`;
}

export function speedKey(v: number | null | undefined) {
  if (!v) return null;
  const s = SPEEDS.reduce((a, x) => (Math.abs(x - v) < Math.abs(a - v) ? x : a), SPEEDS[0]);
  return Math.abs(s - v) <= 5 ? `s${s}` : null;
}

/** OSRM manevrs → fragmenta atslēga. */
export function maneuverKey(type: string, mod?: string, exit?: number) {
  const side = mod?.includes('left') ? 'left' : mod?.includes('right') ? 'right' : '';
  switch (type) {
    case 'arrive':
      return 'm_arrive';
    case 'roundabout':
    case 'rotary':
    case 'roundabout turn':
      return exit && exit <= 6 ? `m_ra${exit}` : 'm_ra';
    case 'exit roundabout':
    case 'exit rotary':
      return 'm_ra_exit';
    case 'merge':
      return 'm_merge';
    case 'on ramp':
      return 'm_onramp';
    case 'off ramp':
      return side ? `m_offramp_${side}` : 'm_offramp';
    case 'fork':
      return side ? `m_fork_${side}` : 'm_straight';
    case 'end of road':
      return side ? `m_end_${side}` : 'm_uturn';
  }
  if (mod === 'uturn') return 'm_uturn';
  if (!mod || mod === 'straight') return 'm_straight';
  if (mod.startsWith('slight')) return `m_slight_${side}`;
  if (mod.startsWith('sharp')) return `m_sharp_${side}`;
  return `m_${side}`;
}

export const radarKey = (kind: string) => (kind === 'average' ? 'r_avg' : kind === 'mobile' ? 'r_mobile' : 'r_fixed');

const ALL_KEYS = Object.keys(VOICE_PHRASES);
