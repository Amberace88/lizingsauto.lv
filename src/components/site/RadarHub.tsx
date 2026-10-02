'use client';

import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LocateFixed, Navigation, Search, X, Volume2, VolumeX, Car, AlertTriangle, Gauge, ChevronRight, Loader2, Layers } from 'lucide-react';
import type { Map as LMap, LayerGroup } from 'leaflet';
import { KIND, bearing, compass, distance, fmtDist, radarPoint, type Radar, type RadarKind } from '@/lib/radars';
import { matchRadar, type RadarFilter } from '@/lib/radar-pages';
import { track } from '@/lib/track';

type R = Radar;
const KINDS: RadarKind[] = ['fixed', 'average', 'mobile', 'toll'];
const WARN = 600; // m — brīdinājuma attālums braukšanas režīmā
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const ICON: Record<RadarKind, string> = {
  fixed: '<path d="M4 8h10l3-3h3v10h-3l-3-3H4z"/><circle cx="8" cy="10" r="1.8"/>',
  average: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/>',
  mobile: '<rect x="3" y="9" width="18" height="7" rx="2"/><path d="M6 9l2-3h8l2 3"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/>',
  toll: '<path d="M4 20V8l8-4 8 4v12"/><path d="M9 20v-6h6v6"/>',
};
const pin = (k: RadarKind, approx: boolean) =>
  `<span class="rdr${approx ? ' rdr-approx' : ''}" style="--c:${KIND[k].color}"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg></span>`;

function beep(freq = 880, ms = 180) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    o.type = 'sine';
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + ms / 1000 + 0.05);
    setTimeout(() => ctx.close(), ms + 200);
  } catch {}
}

export function RadarHub({ radars, preset = {}, height = 'h-[62vh] min-h-[420px] lg:h-[70vh]' }: { radars: R[]; preset?: RadarFilter; height?: string }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const me = useRef<LayerGroup | null>(null);
  const L = useRef<typeof import('leaflet') | null>(null);
  const [ready, setReady] = useState(false);
  const [kinds, setKinds] = useState<Set<RadarKind>>(new Set(preset.kind ? [preset.kind] : ['fixed', 'average', 'mobile']));
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState('');
  const [q, setQ] = useState('');
  const [drive, setDrive] = useState(false);

  const scoped = useMemo(() => radars.filter((r) => matchRadar(r, { region: preset.region, road: preset.road })), [radars, preset.region, preset.road]);
  const shown = useMemo(() => scoped.filter((r) => kinds.has(r.kind)), [scoped, kinds]);
  const counts = useMemo(() => KINDS.reduce((a, k) => ((a[k] = scoped.filter((r) => r.kind === k).length), a), {} as Record<RadarKind, number>), [scoped]);

  const nearby = useMemo(() => {
    if (!pos) return [];
    return shown
      .map((r) => {
        const p = radarPoint(r, pos);
        return p ? { r, p, d: distance(pos, p), b: bearing(pos, p) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a!.d - b!.d)
      .slice(0, 8) as { r: R; p: [number, number]; d: number; b: number }[];
  }, [pos, shown]);

  const results = useMemo(() => {
    if (q.trim().length < 2) return [];
    const s = q.toLowerCase();
    return shown.filter((r) => `${r.name} ${r.road || ''} ${r.region || ''}`.toLowerCase().includes(s)).slice(0, 8);
  }, [q, shown]);

  // Karte
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lf = (await import('leaflet')).default;
      if (cancelled || !mapEl.current || map.current) return;
      L.current = lf;
      const m = lf.map(mapEl.current, { zoomControl: false, attributionControl: true, preferCanvas: true }).setView([56.88, 24.6], 7);
      const dark = document.documentElement.dataset.theme === 'dark';
      lf.tileLayer(`https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'rastertiles/voyager'}/{z}/{x}/{y}{r}.png`, {
        subdomains: 'abcd',
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a> · dati: CSDD, VP',
      }).addTo(m);
      lf.control.zoom({ position: 'bottomright' }).addTo(m);
      layer.current = lf.layerGroup().addTo(m);
      me.current = lf.layerGroup().addTo(m);
      map.current = m;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Punkti
  useEffect(() => {
    const lf = L.current;
    if (!ready || !lf || !layer.current || !map.current) return;
    layer.current.clearLayers();
    const bounds: [number, number][] = [];
    for (const r of shown) {
      const color = KIND[r.kind].color;
      const nav = r.lat != null ? `<a class="rdr-nav" href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}" target="_blank" rel="noopener">Maršruts ↗</a>` : '';
      const html = `<div class="rdr-pop"><span class="rdr-tag" style="background:${color}">${KIND[r.kind].short}${r.speed ? ` · ${r.speed} km/h` : ''}</span><b>${esc(r.name)}</b>${r.note ? `<p>${esc(r.note.slice(0, 220))}${r.note.length > 220 ? '…' : ''}</p>` : ''}${r.approx ? '<p class="rdr-muted">Vieta pēc adreses — aptuvena.</p>' : ''}${nav}</div>`;
      if (r.geom?.length) {
        for (const line of r.geom) {
          lf.polyline(line, { color, weight: 6, opacity: 0.85, lineCap: 'round' }).bindPopup(html).addTo(layer.current);
          lf.polyline(line, { color: '#fff', weight: 2, opacity: 0.6, dashArray: '2 10' }).addTo(layer.current);
          bounds.push(...line);
        }
      }
      if (r.lat != null && r.lng != null) {
        lf.marker([r.lat, r.lng], { icon: lf.divIcon({ html: pin(r.kind, r.approx), className: '', iconSize: [28, 28], iconAnchor: [14, 14] }), title: r.name, riseOnHover: true }).bindPopup(html).addTo(layer.current);
        bounds.push([r.lat, r.lng]);
      }
    }
    if ((preset.region || preset.road || preset.kind) && bounds.length && !pos) map.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, shown]);

  // Mana atrašanās vieta kartē
  useEffect(() => {
    const lf = L.current;
    if (!lf || !me.current || !pos) return;
    me.current.clearLayers();
    lf.circle(pos, { radius: 2000, color: '#3b82f6', weight: 1, fillOpacity: 0.06 }).addTo(me.current);
    lf.marker(pos, { icon: lf.divIcon({ html: '<span class="rdr-me"></span>', className: '', iconSize: [22, 22], iconAnchor: [11, 11] }), zIndexOffset: 1000 }).addTo(me.current);
  }, [pos]);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) return setGeoErr('Pārlūks neatbalsta atrašanās vietu.');
    setLocating(true);
    setGeoErr('');
    track('tool_use', { tool: 'Fotoradari: man apkārt' }, 'radar_locate');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here: [number, number] = [p.coords.latitude, p.coords.longitude];
        setPos(here);
        setLocating(false);
        map.current?.flyTo(here, 12, { duration: 1.2 });
      },
      () => {
        setLocating(false);
        setGeoErr('Neizdevās noteikt atrašanās vietu. Atļauj piekļuvi pārlūka iestatījumos.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }, []);

  const focus = (r: R, p?: [number, number] | null) => {
    const t = p || radarPoint(r, pos || undefined);
    if (t) map.current?.flyTo(t, 15, { duration: 0.9 });
    mapEl.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const toggleKind = (k: RadarKind) => {
    track('tool_use', { tool: 'Fotoradari: filtri' }, 'radar_filter');
    setKinds((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n.size ? n : s;
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className={`relative overflow-hidden rounded-[24px] border border-line bg-card shadow-[var(--shadow-lift)] ${height}`}>
        <div ref={mapEl} className="absolute inset-0 z-0" aria-label="Fotoradaru karte" role="region" />
        {!ready && <div className="absolute inset-0 grid place-items-center bg-paper"><Loader2 className="h-6 w-6 animate-spin text-mute" /></div>}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex flex-wrap gap-1.5">
          {KINDS.filter((k) => counts[k] > 0).map((k) => (
            <button
              key={k}
              onClick={() => toggleKind(k)}
              className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur transition ${kinds.has(k) ? 'bg-night/90 text-white' : 'bg-white/80 text-ink-2 line-through decoration-1 dark:bg-black/50 dark:text-white/50'}`}
              aria-pressed={kinds.has(k)}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND[k].color }} /> {KIND[k].short} <span className="num opacity-60">{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="absolute bottom-3 left-3 z-[500] flex gap-2">
          <button onClick={locate} className="inline-flex items-center gap-2 rounded-full bg-signal px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-95">
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />} Radari man apkārt
          </button>
          <button
            onClick={() => {
              track('tool_use', { tool: 'Fotoradari: braukšanas režīms' }, 'radar_drive');
              setDrive(true);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-night/90 px-4 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur transition hover:bg-night active:scale-95"
          >
            <Navigation className="h-4 w-4" /> <span className="hidden sm:inline">Braukšanas režīms</span><span className="sm:hidden">Braukt</span>
          </button>
        </div>
      </div>

      <aside className="flex min-h-0 flex-col gap-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Meklēt ielu, pilsētu vai ceļu (A2)…" className="field !pl-10" aria-label="Meklēt radaru" />
          {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-mute" aria-label="Notīrīt"><X className="h-4 w-4" /></button>}
        </div>
        {results.length > 0 && (
          <ul className="overflow-hidden rounded-2xl border border-line bg-card">
            {results.map((r) => (
              <li key={r.id}>
                <button onClick={() => focus(r)} className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-paper">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: KIND[r.kind].color }} />
                  <span className="min-w-0"><b className="line-clamp-2 text-ink">{r.name}</b><span className="text-xs text-mute">{KIND[r.kind].short}</span></span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex-1 overflow-hidden rounded-2xl border border-line bg-card">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-bold text-ink">{pos ? 'Tuvākie radari' : 'Radari tavā tuvumā'}</p>
            {pos && <button onClick={locate} className="text-xs font-semibold text-signal hover:underline">Atjaunot</button>}
          </div>
          {!pos ? (
            <div className="p-5 text-sm text-ink-2">
              <p>Nospied <b>„Radari man apkārt”</b> — parādīsim tuvākos fotoradarus, attālumu un virzienu. Atrašanās vieta netiek saglabāta un neatstāj tavu ierīci.</p>
              {geoErr && <p className="mt-3 rounded-xl bg-signal-soft p-3 text-signal">{geoErr}</p>}
              <button onClick={locate} className="btn btn-signal mt-4 w-full justify-center">{locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />} Noteikt atrašanās vietu</button>
            </div>
          ) : (
            <ul className="max-h-[52vh] divide-y divide-line overflow-auto">
              {nearby.map(({ r, p, d, b }) => (
                <li key={r.id}>
                  <button onClick={() => focus(r, p)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: KIND[r.kind].color }}>
                      <Navigation className="h-4 w-4" style={{ transform: `rotate(${b - 45}deg)` }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
                      <span className="text-xs text-mute">{KIND[r.kind].short}{r.speed ? ` · ${r.speed} km/h` : ''}</span>
                    </span>
                    <span className="num shrink-0 text-right text-sm font-bold text-ink">{fmtDist(d)}<span className="block text-[11px] font-medium text-mute">{compass(b)}</span></span>
                  </button>
                </li>
              ))}
              {!nearby.length && <li className="p-5 text-sm text-mute">Tuvumā radaru nav atrasts.</li>}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-card p-4 text-xs leading-relaxed text-mute">
          <p className="mb-2 flex items-center gap-1.5 font-semibold text-ink-2"><Layers className="h-3.5 w-3.5" /> Apzīmējumi</p>
          {KINDS.filter((k) => counts[k] > 0).map((k) => (
            <p key={k} className="mt-1.5 flex gap-2"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: KIND[k].color }} /><span><b className="text-ink-2">{KIND[k].label}.</b> {KIND[k].hint}</span></p>
          ))}
        </div>
      </aside>

      {ready && createPortal(<AnimatePresence>{drive && <DriveMode radars={radars} onClose={() => setDrive(false)} />}</AnimatePresence>, document.body)}
    </div>
  );
}

/** Braukšanas režīms: tuvākais radars priekšā, attālums, ātrums, skaņas brīdinājums. */
function DriveMode({ radars, onClose }: { radars: R[]; onClose: () => void }) {
  const [pos, setPos] = useState<{ p: [number, number]; speed: number | null; heading: number | null; acc: number } | null>(null);
  const [err, setErr] = useState('');
  const [sound, setSound] = useState(true);
  const warned = useRef<Map<number, number>>(new Map());
  const prev = useRef<[number, number] | null>(null);

  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {});
    if (!('geolocation' in navigator)) {
      setErr('Pārlūks neatbalsta atrašanās vietu.');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (g) => {
        const p: [number, number] = [g.coords.latitude, g.coords.longitude];
        let heading = g.coords.heading != null && !Number.isNaN(g.coords.heading) ? g.coords.heading : null;
        if (heading == null && prev.current && distance(prev.current, p) > 15) heading = bearing(prev.current, p);
        if (!prev.current || distance(prev.current, p) > 15) prev.current = p;
        setPos({ p, speed: g.coords.speed != null ? Math.round(g.coords.speed * 3.6) : null, heading, acc: g.coords.accuracy });
      },
      () => setErr('Nav piekļuves atrašanās vietai. Atļauj to pārlūka iestatījumos.'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    return () => {
      navigator.geolocation.clearWatch(id);
      lock?.release().catch(() => {});
    };
  }, []);

  // Tuvākais radars braukšanas virzienā (±70°), ja virziens zināms
  const next = useMemo(() => {
    if (!pos) return null;
    let best: { r: R; d: number; b: number } | null = null;
    for (const r of radars) {
      if (r.kind === 'toll') continue;
      const p = radarPoint(r, pos.p);
      if (!p) continue;
      const d = distance(pos.p, p);
      if (d > 5000) continue;
      const b = bearing(pos.p, p);
      if (pos.heading != null && d > 80) {
        const diff = Math.abs(((b - pos.heading + 540) % 360) - 180);
        if (diff > 70) continue;
      }
      if (!best || d < best.d) best = { r, d, b };
    }
    return best;
  }, [pos, radars]);

  useEffect(() => {
    if (!next || !sound) return;
    const last = warned.current.get(next.r.id) || Infinity;
    const step = next.d < 200 ? 200 : next.d < WARN ? WARN : null;
    if (step && step < last) {
      warned.current.set(next.r.id, step);
      beep(step === 200 ? 1175 : 880, 220);
      if (step === 200) setTimeout(() => beep(1175, 220), 280);
      navigator.vibrate?.(step === 200 ? [120, 80, 120] : 150);
    }
  }, [next, sound]);

  const alert = next && next.d < WARN;
  const over = next?.r.speed && pos?.speed != null && pos.speed > next.r.speed;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`fixed inset-0 z-[2000] flex flex-col text-white transition-colors duration-500 ${alert ? 'bg-[#3a0a0e]' : 'bg-[#0c0d0e]'}`} role="dialog" aria-label="Braukšanas režīms">
      <div className="flex items-center justify-between p-4">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/70"><Car className="h-4 w-4" /> Braukšanas režīms</span>
        <div className="flex gap-2">
          <button onClick={() => setSound((s) => !s)} className="grid h-11 w-11 place-items-center rounded-full bg-white/10" aria-label={sound ? 'Izslēgt skaņu' : 'Ieslēgt skaņu'}>{sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</button>
          <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-white/10" aria-label="Aizvērt"><X className="h-5 w-5" /></button>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        {err ? (
          <p className="max-w-sm text-white/70">{err}</p>
        ) : !pos ? (
          <p className="flex items-center gap-2 text-white/70"><Loader2 className="h-5 w-5 animate-spin" /> Nosaku atrašanās vietu…</p>
        ) : next ? (
          <>
            <motion.div key={next.r.id} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="grid h-24 w-24 place-items-center rounded-3xl" style={{ background: KIND[next.r.kind].color }}>
              {alert ? <AlertTriangle className="h-11 w-11" /> : <Gauge className="h-11 w-11" />}
            </motion.div>
            <p className="num mt-6 text-7xl font-black tracking-tight sm:text-8xl">{fmtDist(next.d)}</p>
            <p className="mt-2 text-lg font-semibold">{KIND[next.r.kind].short}{next.r.speed ? ` · ${next.r.speed} km/h` : ''}</p>
            <p className="mt-1 max-w-md text-sm text-white/60">{next.r.name}</p>
          </>
        ) : (
          <>
            <div className="grid h-24 w-24 place-items-center rounded-3xl bg-emerald-500/20 text-emerald-300"><Gauge className="h-11 w-11" /></div>
            <p className="mt-6 text-2xl font-bold">Tuvumā radaru nav</p>
            <p className="mt-1 text-sm text-white/60">Brīdināsim {WARN} m pirms nākamā radara braukšanas virzienā.</p>
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className={`rounded-2xl p-4 ${over ? 'bg-signal' : 'bg-white/10'}`}>
          <p className="text-xs text-white/60">Tavs ātrums</p>
          <p className="num text-3xl font-bold">{pos?.speed != null ? pos.speed : '—'}<span className="text-base font-medium text-white/60"> km/h</span></p>
        </div>
        <div className="rounded-2xl bg-white/10 p-4">
          <p className="text-xs text-white/60">GPS precizitāte</p>
          <p className="num text-3xl font-bold">{pos ? Math.round(pos.acc) : '—'}<span className="text-base font-medium text-white/60"> m</span></p>
        </div>
        <p className="col-span-2 text-center text-[11px] leading-snug text-white/40">Ekrānam jāpaliek ieslēgtam. Ievēro ātruma ierobežojumus vienmēr — dati ir informatīvi (CSDD, VP, OpenStreetMap). Telefonu braucot neturi rokās.</p>
      </div>
    </motion.div>
  );
}

export function RadarListLink({ href, label, count }: { href: string; label: string; count?: number }) {
  return (
    <a href={href} className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink-2/40">
      <span>{label}</span>
      <span className="flex items-center gap-1 text-mute">{count != null && <span className="num text-xs">{count}</span>}<ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
    </a>
  );
}
