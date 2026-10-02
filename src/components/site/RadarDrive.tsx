'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, LocateFixed, Box, Square, AlertTriangle, ShieldCheck, Play, Loader2 } from 'lucide-react';
import type { Map as GLMap, Marker, GeoJSONSource } from 'maplibre-gl';
import { KIND, bearing, distance, fmtDist, radarPoint, type Radar } from '@/lib/radars';

type Pos = { p: [number, number]; speed: number | null; heading: number | null; acc: number; t: number };
const WARN = 600;
const LOOKAHEAD = 6000;

const night = () => {
  const h = new Date().getHours();
  return document.documentElement.dataset.theme === 'dark' || h >= 19 || h < 7;
};
const angleLerp = (a: number, b: number, t: number) => {
  const d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
};
const zoomFor = (kmh: number | null) => (kmh == null ? 16 : kmh < 30 ? 16.6 : kmh < 60 ? 16 : kmh < 90 ? 15.3 : 14.7);

function beep(freq = 880, ms = 200) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.45, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + ms / 1000 + 0.05);
    setTimeout(() => ctx.close(), ms + 250);
  } catch {}
}
function say(text: string) {
  try {
    const v = speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith('lv'));
    if (!v) return false;
    const u = new SpeechSynthesisUtterance(text);
    u.voice = v;
    u.lang = v.lang;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

/** Attālums līdz posma beigām pa līniju un vai esam uz posma. */
function onSection(r: Radar, p: [number, number]) {
  if (!r.geom?.length) return null;
  let best = { d: Infinity, li: 0, vi: 0 };
  r.geom.forEach((line, li) => line.forEach((q, vi) => {
    const d = distance(p, q);
    if (d < best.d) best = { d, li, vi };
  }));
  if (best.d > 60) return null;
  let left = 0;
  const line = r.geom[best.li];
  for (let i = best.vi; i < line.length - 1; i++) left += distance(line[i], line[i + 1]);
  for (let l = best.li + 1; l < r.geom.length; l++) for (let i = 0; i < r.geom[l].length - 1; i++) left += distance(r.geom[l][i], r.geom[l][i + 1]);
  return { left };
}

export default function RadarDrive({ radars, onClose }: { radars: Radar[]; onClose: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<GLMap | null>(null);
  const puck = useRef<Marker | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [err, setErr] = useState('');
  const [sound, setSound] = useState(true);
  const [three, setThree] = useState(true);
  const [follow, setFollow] = useState(true);
  const [demo, setDemo] = useState(false);
  const heading = useRef(0);
  const prev = useRef<Pos | null>(null);
  const warned = useRef(new Map<number, number>());
  const section = useRef<{ id: number; start: number; dist: number; last: [number, number] } | null>(null);
  const lastOver = useRef(0);
  const fix = useRef<{ p: [number, number]; mps: number; gpsHeading: number | null; t: number } | null>(null);
  const compass = useRef<number | null>(null);
  const followRef = useRef(true);
  const threeRef = useRef(true);
  followRef.current = follow;
  threeRef.current = three;
  const [sel, setSel] = useState<Radar | null>(null);
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 5000);
    return () => clearTimeout(t);
  }, []);

  // Ekrāns ieslēgts + lapas ritināšana bloķēta
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {});
    const o = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    try {
      speechSynthesis.getVoices();
    } catch {}
    return () => {
      document.body.style.overflow = o;
      lock?.release().catch(() => {});
    };
  }, []);

  // Karte
  useEffect(() => {
    let gone = false;
    (async () => {
      const ml = (await import('maplibre-gl')).default;
      if (gone || !el.current) return;
      const m = new ml.Map({
        container: el.current,
        style: `https://tiles.openfreemap.org/styles/${night() ? 'dark' : 'liberty'}`,
        center: [24.1052, 56.9496],
        zoom: 13,
        pitch: 55,
        attributionControl: { compact: true },
        maxPitch: 70,
      });
      map.current = m;
      const stop = () => setFollow(false);
      m.on('dragstart', stop);
      m.on('rotatestart', (e) => e.originalEvent && stop());
      m.on('load', () => {
        const pts = radars.filter((r) => r.lat != null && r.kind !== 'toll');
        m.addSource('radars', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: pts.map((r) => ({ type: 'Feature', id: r.id, properties: { id: r.id, kind: r.kind, color: KIND[r.kind].color, approx: r.approx ? 1 : 0 }, geometry: { type: 'Point', coordinates: [r.lng!, r.lat!] } })) },
        });
        m.addSource('sections', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: radars.filter((r) => r.geom?.length).flatMap((r) => r.geom!.map((line) => ({ type: 'Feature' as const, properties: { id: r.id }, geometry: { type: 'LineString' as const, coordinates: line.map(([a, b]) => [b, a]) } }))) },
        });
        m.addLayer({ id: 'sec-glow', type: 'line', source: 'sections', paint: { 'line-color': '#f59e0b', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 16, 18], 'line-opacity': 0.25, 'line-blur': 4 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        m.addLayer({ id: 'sec', type: 'line', source: 'sections', paint: { 'line-color': '#f59e0b', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2, 16, 7], 'line-opacity': 0.95 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        m.addLayer({ id: 'rad-halo', type: 'circle', source: 'radars', paint: { 'circle-color': ['get', 'color'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 6, 16, 26], 'circle-opacity': ['case', ['boolean', ['feature-state', 'next'], false], 0.35, 0.15], 'circle-pitch-alignment': 'map' } });
        m.addLayer({ id: 'rad', type: 'circle', source: 'radars', paint: { 'circle-color': ['get', 'color'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3.5, 16, 11], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 16, 3], 'circle-stroke-opacity': ['case', ['==', ['get', 'approx'], 1], 0.6, 1] } });
        const pick = (e: { features?: { properties: { id: number } }[] }) => {
          const id = e.features?.[0]?.properties?.id;
          const r = radars.find((x) => x.id === Number(id));
          if (!r) return;
          setFollow(false);
          setSel(r);
          const pt = r.lat != null ? [r.lng!, r.lat] : r.geom?.[0]?.[0] ? [r.geom[0][0][1], r.geom[0][0][0]] : null;
          if (pt) m.easeTo({ center: pt as [number, number], zoom: Math.max(m.getZoom(), 15), padding: { top: 0, bottom: m.getContainer().clientHeight * 0.35, left: 0, right: 0 }, duration: 700 });
        };
        for (const id of ['rad', 'rad-halo', 'sec']) {
          m.on('click', id, pick as never);
          m.on('mouseenter', id, () => (m.getCanvas().style.cursor = 'pointer'));
          m.on('mouseleave', id, () => (m.getCanvas().style.cursor = ''));
        }
        setLoaded(true);
      });
      const dot = document.createElement('div');
      dot.className = 'drv-puck';
      dot.innerHTML = '<svg viewBox="0 0 48 48" width="58" height="58"><defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-opacity=".45"/></filter></defs><path filter="url(#s)" d="M24 5 L39 40 L24 32 L9 40 Z" fill="#2f7bff" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/></svg>';
      puck.current = new ml.Marker({ element: dot, rotationAlignment: 'map', pitchAlignment: 'map' }).setLngLat([24.1052, 56.9496]).addTo(m);
    })();
    return () => {
      gone = true;
      map.current?.remove();
      map.current = null;
    };
  }, [radars]);

  const onPos = useCallback((np: Omit<Pos, 'heading'> & { heading: number | null }) => {
    let h = np.heading;
    if ((h == null || Number.isNaN(h) || (np.speed ?? 0) < 4) && prev.current && distance(prev.current.p, np.p) > 8) h = bearing(prev.current.p, np.p);
    if (h != null && !Number.isNaN(h)) heading.current = angleLerp(heading.current, h, 0.6);
    if (!prev.current || distance(prev.current.p, np.p) > 8) prev.current = { ...np, heading: h };
    fix.current = { p: np.p, mps: (np.speed ?? 0) / 3.6, gpsHeading: h != null && !Number.isNaN(h) && (np.speed ?? 0) >= 8 ? h : null, t: performance.now() };
    setPos({ ...np, heading: h == null ? compass.current : heading.current });
  }, []);

  // GPS
  useEffect(() => {
    if (demo) return;
    if (!('geolocation' in navigator)) {
      setErr('Pārlūks neatbalsta atrašanās vietu.');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (g) => onPos({ p: [g.coords.latitude, g.coords.longitude], speed: g.coords.speed != null && g.coords.speed >= 0 ? Math.round(g.coords.speed * 3.6) : null, heading: g.coords.heading, acc: g.coords.accuracy, t: g.timestamp }),
      () => setErr('Nav piekļuves atrašanās vietai. Atļauj to pārlūka iestatījumos vai izmēģini demonstrāciju.'),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [demo, onPos]);

  // Demonstrācija: brauciens pa vidējā ātruma posmu ar 88 km/h
  useEffect(() => {
    if (!demo) return;
    const sec = radars.find((r) => r.kind === 'average' && r.geom && r.geom.flat().length > 10) || radars.find((r) => r.geom?.length);
    if (!sec?.geom) return;
    const line = sec.geom.flat();
    const back = line.slice(0, 1);
    // sākam ~1,5 km pirms posma, turpinot pirmo segmentu atpakaļ
    const b0 = bearing(line[1], line[0]);
    const lead: [number, number][] = [];
    for (let k = 15; k >= 1; k--) lead.push([back[0][0] + Math.cos((b0 * Math.PI) / 180) * 0.0009 * k, back[0][1] + (Math.sin((b0 * Math.PI) / 180) * 0.0009 * k) / Math.cos((back[0][0] * Math.PI) / 180)]);
    const route = [...lead, ...line];
    let i = 0;
    let f = 0;
    const speed = 88;
    const step = (speed / 3.6) * 1; // m sekundē
    const t = setInterval(() => {
      let left = step;
      while (left > 0 && i < route.length - 1) {
        const seg = distance(route[i], route[i + 1]);
        const rest = seg * (1 - f);
        if (left < rest) {
          f += left / seg;
          left = 0;
        } else {
          left -= rest;
          i++;
          f = 0;
        }
      }
      if (i >= route.length - 1) {
        i = 0;
        f = 0;
      }
      const a = route[i];
      const b = route[i + 1] || a;
      const p: [number, number] = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      onPos({ p, speed, heading: bearing(a, b), acc: 5, t: Date.now() });
    }, 1000);
    return () => clearInterval(t);
  }, [demo, radars, onPos]);

  // Kompass (kā Google Maps — karte griežas līdzi telefonam, kad stāvi vai brauc lēni)
  useEffect(() => {
    const on = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      let h: number | null = null;
      if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
      else if (e.absolute && e.alpha != null) h = 360 - e.alpha;
      if (h == null) return;
      const so = (screen.orientation?.angle as number | undefined) ?? 0;
      compass.current = (h + so + 360) % 360;
    };
    const evt = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(evt, on as EventListener, true);
    return () => window.removeEventListener(evt, on as EventListener, true);
  }, []);

  // Plūdena kamera 60 fps: prognozējam kustību starp GPS punktiem un vienmērīgi griežam karti
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const disp = { lat: NaN, lng: NaN, bearing: 0, zoom: 16, pitch: 58 };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const m = map.current;
      const f = fix.current;
      if (!m || !f) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      // mērķa virziens: GPS braucot, kompass stāvot
      const target = f.gpsHeading ?? compass.current ?? heading.current;
      heading.current = target;
      // prognozētā vieta
      const ahead = Math.min(1.3, (now - f.t) / 1000) * f.mps;
      const hd = ((f.gpsHeading ?? 0) * Math.PI) / 180;
      const lat = f.p[0] + (f.gpsHeading != null ? (Math.cos(hd) * ahead) / 111320 : 0);
      const lng = f.p[1] + (f.gpsHeading != null ? (Math.sin(hd) * ahead) / (111320 * Math.cos((f.p[0] * Math.PI) / 180)) : 0);
      if (Number.isNaN(disp.lat)) {
        disp.lat = lat;
        disp.lng = lng;
        disp.bearing = target;
      }
      const k = 1 - Math.pow(0.0015, dt); // ~ kritiski slāpēta tuvināšanās
      disp.lat += (lat - disp.lat) * k;
      disp.lng += (lng - disp.lng) * k;
      disp.bearing = angleLerp(disp.bearing, target, 1 - Math.pow(0.02, dt));
      disp.zoom += (zoomFor(f.mps * 3.6) - disp.zoom) * (1 - Math.pow(0.3, dt));
      disp.pitch += ((threeRef.current ? 58 : 0) - disp.pitch) * (1 - Math.pow(0.01, dt));
      puck.current?.setLngLat([disp.lng, disp.lat]).setRotation(disp.bearing);
      if (followRef.current) {
        const h = m.getContainer().clientHeight;
        m.jumpTo({ center: [disp.lng, disp.lat], bearing: disp.bearing, zoom: disp.zoom, pitch: disp.pitch, padding: { top: h * 0.42, bottom: 0, left: 0, right: 0 } });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Nākamais radars braukšanas virzienā
  const next = useMemo(() => {
    if (!pos) return null;
    let best: { r: Radar; d: number } | null = null;
    for (const r of radars) {
      if (r.kind === 'toll') continue;
      const p = radarPoint(r, pos.p);
      if (!p) continue;
      const d = distance(pos.p, p);
      if (d > LOOKAHEAD) continue;
      if (pos.heading != null && d > 60) {
        const diff = Math.abs(((bearing(pos.p, p) - pos.heading + 540) % 360) - 180);
        if (diff > 65) continue;
      }
      if (!best || d < best.d) best = { r, d };
    }
    return best;
  }, [pos, radars]);

  // Vidējā ātruma posms, kurā atrodamies
  const inSection = useMemo(() => {
    if (!pos) return null;
    for (const r of radars) {
      if (r.kind !== 'average') continue;
      const s = onSection(r, pos.p);
      if (s) return { r, left: s.left };
    }
    return null;
  }, [pos, radars]);

  const avgSpeed = useMemo(() => {
    if (!pos || !inSection) {
      section.current = null;
      return null;
    }
    const s = section.current;
    if (!s || s.id !== inSection.r.id) {
      section.current = { id: inSection.r.id, start: pos.t, dist: 0, last: pos.p };
      return null;
    }
    s.dist += distance(s.last, pos.p);
    s.last = pos.p;
    const sec = (pos.t - s.start) / 1000;
    return sec > 8 ? Math.round((s.dist / sec) * 3.6) : null;
  }, [pos, inSection]);

  // Iezīmējam nākamo radaru kartē
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    const src = m.getSource('radars') as GeoJSONSource | undefined;
    if (!src) return;
    for (const r of radars) if (r.lat != null) m.setFeatureState({ source: 'radars', id: r.id }, { next: next?.r.id === r.id });
  }, [next, loaded, radars]);

  // Brīdinājumi
  useEffect(() => {
    if (!next || !sound) return;
    const last = warned.current.get(next.r.id) ?? Infinity;
    const step = next.d < 200 ? 200 : next.d < WARN ? WARN : null;
    if (step && step < last) {
      warned.current.set(next.r.id, step);
      const words = next.r.kind === 'average' ? 'vidējā ātruma kontrole' : next.r.kind === 'mobile' ? 'iespējams mobilais radars' : 'fotoradars';
      const spoke = say(step === 200 ? `Uzmanību, ${words}` : `Pēc ${Math.round(next.d / 100) * 100} metriem ${words}${next.r.speed ? `, ${next.r.speed}` : ''}`);
      if (!spoke) {
        beep(step === 200 ? 1175 : 880, 220);
        if (step === 200) setTimeout(() => beep(1175, 220), 280);
      }
      navigator.vibrate?.(step === 200 ? [120, 80, 120] : 150);
    }
  }, [next, sound]);

  const limit = inSection?.r.speed ?? (next && next.d < 1500 ? next.r.speed : null) ?? null;
  const over = limit != null && pos?.speed != null && pos.speed > limit + 2;
  useEffect(() => {
    if (!over || !sound) return;
    if (Date.now() - lastOver.current < 12000) return;
    lastOver.current = Date.now();
    beep(660, 160);
    setTimeout(() => beep(660, 160), 220);
  }, [over, sound]);

  const alert = !!next && next.d < WARN;
  const progress = next ? Math.max(0, Math.min(1, 1 - next.d / 1500)) : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] h-[100dvh] overflow-hidden bg-[#0b0c0e] text-white" role="dialog" aria-label="Braukšanas režīms">
      <div className="absolute inset-0"><div ref={el} className="h-full w-full" /></div>
      {!loaded && <div className="absolute inset-0 grid place-items-center"><Loader2 className="h-7 w-7 animate-spin text-white/60" /></div>}

      {/* Augšējais panelis — nākamais radars */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <motion.div layout className={`pointer-events-auto overflow-hidden rounded-[22px] shadow-2xl backdrop-blur-xl transition-colors duration-300 ${alert ? 'bg-[#d91d2b]/95' : 'bg-[#111214]/88'}`}>
          <div className="flex items-center gap-3 p-3.5">
            {next ? (
              <>
                <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${alert ? 'bg-white/20' : ''}`} style={alert ? undefined : { background: KIND[next.r.kind].color }}>
                  {alert ? <AlertTriangle className="h-7 w-7 animate-pulse" /> : <span className="text-[11px] font-black uppercase leading-none tracking-wide">{next.r.kind === 'average' ? 'Vid.' : next.r.kind === 'mobile' ? 'Mob.' : 'Foto'}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="num text-[2rem] font-black leading-none tracking-tight">{fmtDist(next.d)}</p>
                  <p className="mt-1 truncate text-[13px] font-semibold text-white/85">{KIND[next.r.kind].short}</p>
                  <p className="truncate text-xs text-white/60">{next.r.name}</p>
                </div>
              </>
            ) : (
              <>
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-300"><ShieldCheck className="h-7 w-7" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold leading-tight">{pos ? 'Ceļš priekšā brīvs' : err ? 'Nav atrašanās vietas' : 'Nosaku atrašanās vietu…'}</p>
                  <p className="text-xs text-white/60">{err || `Brīdināsim ${WARN} m pirms radara braukšanas virzienā`}</p>
                </div>
              </>
            )}
            {limit && <SpeedSign v={limit} />}
          </div>
          {next && <div className="h-1 bg-white/10"><motion.div className="h-full bg-white" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.8 }} /></div>}
        </motion.div>

        <AnimatePresence>
          {inSection && (
            <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="pointer-events-auto mt-2 flex items-center gap-3 rounded-2xl bg-[#f59e0b] px-4 py-2.5 text-[#1b1203] shadow-xl">
              <span className="text-xs font-black uppercase tracking-wide">Vidējā ātruma posms</span>
              <span className="num ml-auto text-sm font-bold">vēl {fmtDist(inSection.left)}</span>
              {avgSpeed != null && <span className={`num rounded-lg px-2 py-0.5 text-sm font-black ${inSection.r.speed && avgSpeed > inSection.r.speed ? 'bg-[#d91d2b] text-white' : 'bg-black/15'}`}>vid. {avgSpeed}</span>}
            </motion.div>
          )}
        </AnimatePresence>
        {(err || (waited && !pos)) && !demo && (
          <button onClick={() => { setErr(''); setDemo(true); }} className="pointer-events-auto mt-2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-lg"><Play className="h-4 w-4" /> Demonstrācija</button>
        )}
      </div>

      {/* Apakšējais panelis */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 pb-[calc(0.9rem+env(safe-area-inset-bottom))]">
        <div className={`pointer-events-auto grid h-[92px] w-[92px] place-items-center rounded-full border-4 shadow-2xl backdrop-blur-xl transition-colors ${over ? 'border-white bg-[#d91d2b]' : 'border-white/15 bg-[#111214]/90'}`}>
          <div className="text-center leading-none">
            <p className="num text-[2.1rem] font-black">{pos?.speed != null ? pos.speed : '–'}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">km/h</p>
          </div>
        </div>
        {demo && <span className="pointer-events-auto mb-2 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-black">DEMO</span>}
        <div className="pointer-events-auto flex flex-col gap-2">
          {!follow && (
            <button onClick={() => { setSel(null); setFollow(true); }} className="flex h-12 items-center gap-2 rounded-full bg-[#2f7bff] px-4 text-sm font-bold shadow-xl"><LocateFixed className="h-5 w-5" /> Centrēt</button>
          )}
          <div className="flex gap-2 self-end">
            <Ctl onClick={() => setThree((v) => !v)} label={three ? '2D' : '3D'}>{three ? <Square className="h-5 w-5" /> : <Box className="h-5 w-5" />}</Ctl>
            <Ctl onClick={() => setSound((v) => !v)} label={sound ? 'Izslēgt skaņu' : 'Ieslēgt skaņu'}>{sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</Ctl>
            <Ctl onClick={onClose} label="Aizvērt"><X className="h-5 w-5" /></Ctl>
          </div>
        </div>
      </div>

      <AnimatePresence>{sel && <RadarSheet r={sel} pos={pos} onClose={() => setSel(null)} onResume={() => { setSel(null); setFollow(true); }} />}</AnimatePresence>
    </motion.div>
  );
}

const lineLen = (g: [number, number][][]) => g.reduce((a, l) => a + l.slice(1).reduce((x, q, i) => x + distance(l[i], q), 0), 0);
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

/** Informācija par izvēlēto radaru (kā Google Maps vietas kartīte). */
function RadarSheet({ r, pos, onClose, onResume }: { r: Radar; pos: Pos | null; onClose: () => void; onResume: () => void }) {
  const pt = radarPoint(r, pos?.p);
  const d = pos && pt ? distance(pos.p, pt) : null;
  const rel = pos && pt && pos.heading != null ? Math.abs(((bearing(pos.p, pt) - pos.heading + 540) % 360) - 180) : null;
  const eta = d != null && pos?.speed && pos.speed > 5 ? d / (pos.speed / 3.6) : null;
  const len = r.geom?.length ? lineLen(r.geom) : null;
  const minTime = len && r.speed ? (len / 1000 / r.speed) * 3600 : null;
  const k = KIND[r.kind];
  const gm = pt ? `https://www.google.com/maps/dir/?api=1&destination=${pt[0]},${pt[1]}&travelmode=driving` : null;
  const waze = pt ? `https://waze.com/ul?ll=${pt[0]},${pt[1]}&navigate=yes` : null;
  const share = async () => {
    const url = `${location.origin}/fotoradari${r.road ? `/${r.road.toLowerCase()}` : ''}`;
    try {
      await navigator.share?.({ title: r.name, text: `${k.short}: ${r.name}`, url });
    } catch {}
  };
  const Fact = ({ l, v }: { l: string; v: React.ReactNode }) => (
    <div className="rounded-2xl bg-white/[0.06] px-3.5 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{l}</p>
      <p className="num mt-0.5 text-lg font-bold leading-tight">{v}</p>
    </div>
  );
  return (
    <>
      <motion.div className="absolute inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        role="dialog"
        aria-label={r.name}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, i) => i.offset.y > 90 && onClose()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className="absolute inset-x-0 bottom-0 z-20 max-h-[78dvh] overflow-y-auto rounded-t-[28px] bg-[#141518]/97 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_60px_rgba(0,0,0,.5)] backdrop-blur-xl"
      >
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-white/20" />
        <div className="flex items-start gap-3">
          <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-white/10" style={{ background: k.color }} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: k.color }}>{k.short}{r.road ? ` · ${r.road}` : ''}{r.region ? ` · ${r.region}` : ''}</p>
            <h3 className="mt-1 text-lg font-bold leading-snug">{r.name}</h3>
          </div>
          {r.speed ? <SpeedSign v={r.speed} /> : null}
          <button onClick={onClose} aria-label="Aizvērt" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {d != null && <Fact l="Attālums" v={fmtDist(d)} />}
          {rel != null && <Fact l="Virziens" v={rel < 60 ? 'Priekšā' : rel > 120 ? 'Aizmugurē' : 'Sānis'} />}
          {eta != null && <Fact l="Būsi pēc" v={eta < 60 ? `${Math.round(eta)} s` : `${Math.round(eta / 60)} min`} />}
          {len != null && <Fact l="Posma garums" v={fmtDist(len)} />}
          {minTime != null && <Fact l={`Min. laiks ar ${r.speed}`} v={mmss(minTime)} />}
          {r.speed != null && <Fact l="Atļautais ātrums" v={`${r.speed} km/h`} />}
        </div>

        {r.kind === 'average' && (
          <p className="mt-4 rounded-2xl bg-[#f59e0b]/12 p-3.5 text-sm leading-relaxed text-[#ffd48a]">
            Kameras posma sākumā un beigās aprēķina vidējo ātrumu. {minTime ? <>Ievērojot {r.speed} km/h, posmu nevajadzētu izbraukt ātrāk par <b>{mmss(minTime)}</b>.</> : 'Ievēro atļauto ātrumu visā posmā.'}
          </p>
        )}
        {r.kind === 'mobile' && <p className="mt-4 rounded-2xl bg-[#3b82f6]/12 p-3.5 text-sm leading-relaxed text-[#a9c8ff]">Valsts policijas publicēta vieta, kur <b>var</b> atrasties pārvietojamais fotoradars. Tas tur nav vienmēr.{r.approx ? ' Vieta kartē noteikta pēc adreses — aptuveni.' : ''}</p>}
        {r.note && <div className="mt-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{r.kind === 'fixed' ? 'Kāpēc šeit ir radars' : 'Piezīme'}</p><p className="mt-1 text-sm leading-relaxed text-white/80">{r.note}</p></div>}
        {r.direction && <p className="mt-3 text-sm text-white/70">Kontroles virziens: <b className="text-white">{r.direction}</b></p>}

        <div className="mt-5 grid grid-cols-2 gap-2">
          {waze && <a href={waze} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#33ccff] font-bold text-[#0b1a22]">Waze</a>}
          {gm && <a href={gm} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white font-bold text-black">Google Maps</a>}
          <button onClick={onResume} className="flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#2f7bff] text-sm font-bold"><LocateFixed className="h-5 w-5" /> Turpināt braucienu</button>
          <button onClick={share} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 font-bold">Kopīgot</button>
        </div>
        <p className="mt-4 text-center text-[11px] text-white/35">Avots: {r.source === 'csdd' ? 'CSDD' : r.source === 'vp' ? 'Valsts policija' : r.source === 'osm' ? 'OpenStreetMap' : 'Tavs Auto'} · informācija uzziņai</p>
      </motion.div>
    </>
  );
}

function Ctl({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="grid h-12 w-12 place-items-center rounded-full bg-[#111214]/90 shadow-xl backdrop-blur-xl transition active:scale-90">
      {children}
    </button>
  );
}

function SpeedSign({ v }: { v: number }) {
  return (
    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-[5px] border-[#d91d2b] bg-white text-black shadow-lg">
      <span className="num text-lg font-black leading-none">{v}</span>
    </span>
  );
}
