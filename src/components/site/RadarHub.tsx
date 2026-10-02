'use client';

import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import { LocateFixed, Navigation, Search, X, ChevronRight, Loader2, Layers } from 'lucide-react';
import type { Map as LMap, LayerGroup } from 'leaflet';
import { KIND, bearing, compass, distance, fmtDist, radarPoint, type Radar, type RadarKind } from '@/lib/radars';
import { matchRadar, type RadarFilter } from '@/lib/radar-pages';
import { track } from '@/lib/track';

type R = Radar;
const KINDS: RadarKind[] = ['fixed', 'average', 'mobile', 'toll'];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const ICON: Record<RadarKind, string> = {
  fixed: '<path d="M4 8h10l3-3h3v10h-3l-3-3H4z"/><circle cx="8" cy="10" r="1.8"/>',
  average: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/>',
  mobile: '<rect x="3" y="9" width="18" height="7" rx="2"/><path d="M6 9l2-3h8l2 3"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/>',
  toll: '<path d="M4 20V8l8-4 8 4v12"/><path d="M9 20v-6h6v6"/>',
};
const pin = (k: RadarKind, approx: boolean) =>
  `<span class="rdr${approx ? ' rdr-approx' : ''}" style="--c:${KIND[k].color}"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg></span>`;

const RadarDrive = dynamic(() => import('./RadarDrive'), { ssr: false });

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
      lf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · dati: CSDD, VP',
      }).addTo(m);
      // Mazā tālummaiņā punkti mazāki, lai karte nebūtu pārblīvēta
      const zoomClass = () => mapEl.current?.classList.toggle('rdr-low', m.getZoom() <= 8);
      m.on('zoomend', zoomClass);
      zoomClass();
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
        lf.marker([r.lat, r.lng], { icon: lf.divIcon({ html: pin(r.kind, r.approx), className: 'rdr-wrap', iconSize: [28, 28], iconAnchor: [14, 14] }), title: r.name, riseOnHover: true }).bindPopup(html).addTo(layer.current);
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
      <div className={`relative isolate overflow-hidden rounded-[24px] border border-line bg-card shadow-[var(--shadow-lift)] ${height}`}>
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
              track('tool_use', { tool: 'Fotoradari: navigācija' }, 'radar_drive');
              // iPhone kompasam vajag atļauju, ko var prasīt tikai pēc pieskāriena
              const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
              DOE?.requestPermission?.().catch(() => {});
              setDrive(true);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-night/90 px-4 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur transition hover:bg-night active:scale-95"
          >
            <Navigation className="h-4 w-4" /> <span className="hidden sm:inline">Navigācija ar radariem</span><span className="sm:hidden">Navigācija</span>
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

      {ready && createPortal(<AnimatePresence>{drive && <RadarDrive radars={radars} onClose={() => setDrive(false)} />}</AnimatePresence>, document.body)}
    </div>
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
