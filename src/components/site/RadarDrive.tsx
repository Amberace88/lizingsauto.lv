'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Volume2, VolumeX, LocateFixed, Box, Square, AlertTriangle, ShieldCheck, Play, Loader2, Search, ArrowLeft, MapPin, Clock, Fuel, Zap, Layers, Sun, Moon, SunMoon, SquareParking, ShoppingCart, Pill, Hospital, Landmark, Wrench,
  ArrowUp, ArrowUpRight, ArrowUpLeft, CornerUpRight, CornerUpLeft, CornerRightDown, CornerLeftDown, Undo2, RotateCw, Flag, Navigation2, Merge, Split,
  Phone, MessageCircle, Car, Share2, Route as RouteIcon, ChevronRight, type LucideIcon,
} from 'lucide-react';
import type { Map as GLMap, Marker, GeoJSONSource } from 'maplibre-gl';
import { KIND, bearing, distance, fmtDist, radarPoint, type Radar, type RadarKind } from '@/lib/radars';
import {
  TAVS_AUTO, TAVS_CONTACT, searchPlaces, fetchRoutes, project, pointAt, fmtDur, fmtClock, recentPlaces, rememberPlace, loadPois, loadPoisNear,
  type Place, type Route, type LL, type Maneuver,
} from '@/lib/nav';
import { POI_CATS, POI_ORDER, SUB_LABEL, hoursLabel, type Poi, type PoiCat } from '@/lib/poi';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { track } from '@/lib/track';
import { speak, unlockVoice, preloadVoice, distKey, maneuverKey, radarKey, speedKey } from '@/lib/voice';

type Pos = { p: LL; speed: number | null; heading: number | null; acc: number; t: number };
type Mode = 'free' | 'search' | 'preview' | 'nav' | 'arrived';
const WARN = 600;
const LOOKAHEAD = 6000;
const RIGA: LL = [56.9496, 24.1052];
const BLUE = '#2f7bff';

type Theme = 'auto' | 'day' | 'night';
const isNightHour = () => {
  const h = new Date().getHours();
  return h >= 20 || h < 7;
};
const styleUrl = (day: boolean) => `https://tiles.openfreemap.org/styles/${day ? 'liberty' : 'dark'}`;
const readTheme = (): Theme => {
  try {
    const v = localStorage.getItem('ta_nav_theme');
    return v === 'day' || v === 'night' ? v : 'auto';
  } catch {
    return 'auto';
  }
};
const angleLerp = (a: number, b: number, t: number) => {
  const d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
};
const zoomFor = (kmh: number | null) => (kmh == null ? 16 : kmh < 30 ? 16.6 : kmh < 60 ? 16 : kmh < 90 ? 15.3 : 14.7);
const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const MAN: Record<Maneuver, LucideIcon> = {
  straight: ArrowUp, 'slight-right': ArrowUpRight, right: CornerUpRight, 'sharp-right': CornerRightDown, 'slight-left': ArrowUpLeft, left: CornerUpLeft,
  'sharp-left': CornerLeftDown, uturn: Undo2, roundabout: RotateCw, arrive: Flag, depart: Navigation2, merge: Merge, 'fork-left': Split, 'fork-right': Split,
};

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

/** Attālums līdz posma beigām pa līniju un vai esam uz posma. */
function onSection(r: Radar, p: LL) {
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

const CAT_ICON: Record<PoiCat, LucideIcon> = { fuel: Fuel, ev: Zap, parking: SquareParking, shop: ShoppingCart, pharmacy: Pill, health: Hospital, gov: Landmark, auto: Wrench };
const iconKey = (p: Poi) => (p.k === 'parking' ? `parking-${p.f || 'u'}` : p.k === 'fuel' && p.s !== 'fuel' ? 'fuel-gas' : p.k);

/** Kartes ikona: noapaļots kvadrāts kategorijas krāsā ar baltu lucide ikonu (atšķiras no apaļajiem radariem). */
async function poiImage(I: LucideIcon, color: string, badge?: string) {
  const d = document.createElement('div');
  const root = createRoot(d);
  flushSync(() => root.render(<I color="#fff" size={24} strokeWidth={2.5} />));
  const svg = d.innerHTML.replace(/\swidth="24"/, '').replace(/\sheight="24"/, '').replace(/\sclass="[^"]*"/, '').replace('<svg', '<svg x="14" y="14" width="28" height="28"');
  root.unmount();
  const b = badge ? `<circle cx="47" cy="11" r="10" fill="#fff"/><text x="47" y="15.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="900" fill="${color}">${badge}</text>` : '';
  const full = `<svg xmlns="http://www.w3.org/2000/svg" width="58" height="58" viewBox="0 0 58 58"><rect x="5" y="5" width="46" height="46" rx="14" fill="${color}" stroke="#fff" stroke-width="4"/>${svg}${b}</svg>`;
  const img = new Image(58, 58);
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(full);
  await img.decode().catch(() => {});
  return img;
}

const fc = <T,>(features: T[]) => ({ type: 'FeatureCollection' as const, features });
const line = (coords: LL[], properties: Record<string, unknown> = {}) => ({ type: 'Feature' as const, properties, geometry: { type: 'LineString' as const, coordinates: coords.map(([a, b]) => [b, a]) } });

export default function RadarDrive({ radars, onClose, initialDest, initialLayers }: { radars: Radar[]; onClose: () => void; initialDest?: Place | null; initialLayers?: PoiCat[] }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<GLMap | null>(null);
  const ml = useRef<typeof import('maplibre-gl') | null>(null);
  const puck = useRef<Marker | null>(null);
  const destMarker = useRef<Marker | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [styleGen, setStyleGen] = useState(0);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [nightNow, setNightNow] = useState(isNightHour);
  const day = theme === 'day' || (theme === 'auto' && !nightNow);
  const dayRef = useRef(day);
  dayRef.current = day;
  const styleRef = useRef('');
  const [pos, setPos] = useState<Pos | null>(null);
  const [err, setErr] = useState('');
  const [sound, setSound] = useState(true);
  const [three, setThree] = useState(true);
  const [follow, setFollow] = useState(true);
  const [demo, setDemo] = useState(false);
  const heading = useRef(0);
  const prev = useRef<Pos | null>(null);
  const warned = useRef(new Map<number, number>());
  const section = useRef<{ id: number; start: number; dist: number; last: LL } | null>(null);
  const lastOver = useRef(0);
  const fix = useRef<{ p: LL; mps: number; gpsHeading: number | null; t: number } | null>(null);
  const compass = useRef<number | null>(null);
  const followRef = useRef(true);
  const threeRef = useRef(true);
  followRef.current = follow;
  threeRef.current = three;
  const [sel, setSel] = useState<Radar | null>(null);
  const [waited, setWaited] = useState(false);

  // Navigācija
  const [mode, setMode] = useState<Mode>('free');
  const modeRef = useRef<Mode>('free');
  modeRef.current = mode;
  const [dest, setDest] = useState<Place | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [ri, setRi] = useState(0);
  const [routing, setRouting] = useState(false);
  const [routeErr, setRouteErr] = useState('');
  const [fromCenter, setFromCenter] = useState(false);
  const routeRef = useRef<Route | null>(null);
  const navRef = useRef({ at: 0, i: 0, off: 0 });
  const [navAt, setNavAt] = useState(0);
  const routeGen = useRef(0);
  const spoken = useRef(new Map<string, number>());
  const offCount = useRef(0);
  const lastReroute = useRef(0);
  const [rerouting, setRerouting] = useState(false);
  const [demoRoute, setDemoRoute] = useState<Route | null>(null);
  const abort = useRef<AbortController | null>(null);

  // Degvielas un uzlādes vietas
  const [layers, setLayers] = useState<Set<PoiCat>>(() => new Set(initialLayers || []));
  const [layerSheet, setLayerSheet] = useState(false);
  const [poiCount, setPoiCount] = useState<Partial<Record<PoiCat, number>>>({});
  const [poiLoading, setPoiLoading] = useState<Set<PoiCat>>(new Set());
  const [poiSel, setPoiSel] = useState<Poi | null>(null);
  const toggleLayer = useCallback((c: PoiCat, on?: boolean) => setLayers((v) => {
    const n = new Set(v);
    if (on ?? !n.has(c)) n.add(c);
    else n.delete(c);
    return n;
  }), []);

  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 5000);
    return () => clearTimeout(t);
  }, []);

  // Dienas / nakts karte: automātiski pēc laika vai pēc izvēles
  useEffect(() => {
    const t = setInterval(() => setNightNow(isNightHour()), 60000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('ta_nav_theme', theme);
    } catch {}
    const m = map.current;
    if (!m || !loaded) return;
    const url = styleUrl(day);
    if (styleRef.current === url) return;
    styleRef.current = url;
    m.setStyle(url, { diff: false });
  }, [day, theme, loaded]);
  const cycleTheme = () => setTheme((t) => (t === 'auto' ? (day ? 'night' : 'day') : t === 'day' ? 'night' : 'auto'));

  // Ekrāns ieslēgts + lapas ritināšana bloķēta
  useEffect(() => {
    preloadVoice();
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
      abort.current?.abort();
    };
  }, []);

  // Karte
  useEffect(() => {
    let gone = false;
    (async () => {
      const lib = await import('maplibre-gl');
      const M = lib.default;
      ml.current = M;
      if (gone || !el.current) return;
      styleRef.current = styleUrl(dayRef.current);
      const m = new M.Map({
        container: el.current,
        style: styleRef.current,
        center: [RIGA[1], RIGA[0]],
        zoom: 12.5,
        pitch: 55,
        attributionControl: false,
        maxPitch: 70,
      });
      map.current = m;
      m.addControl(new M.AttributionControl({ compact: true, customAttribution: 'Maršruti: <a href="https://routing.openstreetmap.de" target="_blank">FOSSGIS OSRM</a> · Meklēšana: <a href="https://photon.komoot.io" target="_blank">Photon</a>' }), 'bottom-left');
      const stop = () => setFollow(false);
      m.on('dragstart', stop);
      m.on('rotatestart', (e) => e.originalEvent && stop());
      let bound = false;
      const setup = async () => {
        const dark = !dayRef.current;
        const st = m.getStyle();
        const firstSymbol = st.layers.find((l) => l.type === 'symbol')?.id;
        // 3D ēkas, ja stilā to nav
        if (!st.layers.some((l) => l.type === 'fill-extrusion')) {
          const src = Object.entries(st.sources).find(([, s]) => s.type === 'vector')?.[0];
          if (src)
            m.addLayer(
              { id: 'bld3d', type: 'fill-extrusion', source: src, 'source-layer': 'building', minzoom: 14, paint: { 'fill-extrusion-color': dark ? '#2b2e35' : '#dcd6cc', 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8], 'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': 0.8 } },
              firstSymbol,
            );
        }
        const pts = radars.filter((r) => r.lat != null && r.kind !== 'toll');
        m.addSource('routes', { type: 'geojson', data: fc([]) });
        m.addSource('radars', {
          type: 'geojson',
          data: fc(pts.map((r) => ({ type: 'Feature' as const, id: r.id, properties: { id: r.id, kind: r.kind, color: KIND[r.kind].color, approx: r.approx ? 1 : 0 }, geometry: { type: 'Point' as const, coordinates: [r.lng!, r.lat!] } }))),
        });
        m.addSource('sections', { type: 'geojson', data: fc(radars.filter((r) => r.geom?.length).flatMap((r) => r.geom!.map((g) => line(g, { id: r.id })))) });
        for (const c of POI_ORDER) m.addSource(`poi-${c}`, { type: 'geojson', data: fc([]), cluster: true, clusterMaxZoom: 12, clusterRadius: 46 });
        const imgs: [string, LucideIcon, string, string?][] = POI_ORDER.filter((c) => c !== 'parking').map((c) => [c, CAT_ICON[c], POI_CATS[c].color] as [string, LucideIcon, string]);
        imgs.push(['fuel-gas', Fuel, '#16a34a', 'G'], ['parking-no', SquareParking, '#16a34a'], ['parking-yes', SquareParking, '#2563eb', '€'], ['parking-u', SquareParking, '#64748b']);
        await Promise.all(imgs.map(async ([id, I, col, badge]) => !m.hasImage(id) && m.addImage(id, await poiImage(I, col, badge), { pixelRatio: 2 })));
        if (gone) return;
        const onRoute = ['boolean', ['feature-state', 'route'], false];
        m.addLayer({ id: 'route-alt', type: 'line', source: 'routes', filter: ['==', ['get', 'active'], 0], paint: { 'line-color': dark ? '#5d6b85' : '#9fb3d1', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 16, 12] }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        m.addLayer({ id: 'route-case', type: 'line', source: 'routes', filter: ['==', ['get', 'active'], 1], paint: { 'line-color': '#1546a8', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 6, 16, 17] }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        m.addLayer({ id: 'route', type: 'line', source: 'routes', filter: ['==', ['get', 'active'], 1], paint: { 'line-color': BLUE, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 16, 12] }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        m.addLayer({ id: 'sec-glow', type: 'line', source: 'sections', paint: { 'line-color': '#f59e0b', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 16, 18], 'line-opacity': 0.25, 'line-blur': 4 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        m.addLayer({ id: 'sec', type: 'line', source: 'sections', paint: { 'line-color': '#f59e0b', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2, 16, 7], 'line-opacity': 0.95 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        for (const c of POI_ORDER) {
          const src = `poi-${c}`;
          const col = POI_CATS[c].color;
          m.addLayer({ id: `${c}-cl`, type: 'circle', source: src, filter: ['has', 'point_count'], layout: { visibility: 'none' }, paint: { 'circle-color': col, 'circle-opacity': 0.88, 'circle-radius': ['step', ['get', 'point_count'], 14, 20, 18, 100, 23], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2.5 } });
          m.addLayer({ id: `${c}-cln`, type: 'symbol', source: src, filter: ['has', 'point_count'], layout: { visibility: 'none', 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-allow-overlap': true }, paint: { 'text-color': '#fff' } });
          m.addLayer({
            id: `${c}-pt`, type: 'symbol', source: src, filter: ['!', ['has', 'point_count']],
            layout: { visibility: 'none', 'icon-image': ['get', 'icon'], 'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 16, 1], 'icon-allow-overlap': true, 'text-field': ['step', ['zoom'], '', 14.5, ['coalesce', ['get', 'b'], ['get', 'n']]], 'text-font': ['Noto Sans Bold'], 'text-size': 11.5, 'text-offset': [0, 1.55], 'text-anchor': 'top', 'text-optional': true, 'text-max-width': 9 },
            paint: { 'text-color': dark ? '#f1f5f9' : '#1f2430', 'text-halo-color': dark ? '#0b0c0e' : '#ffffff', 'text-halo-width': 1.6 },
          });
          if (bound) continue;
          m.on('click', `${c}-pt`, (e) => {
            const f = e.features?.[0];
            if (!f) return;
            const p = f.properties as unknown as Poi;
            setSel(null);
            setFollow(false);
            setPoiSel({ ...p, c: p.c != null && String(p.c) !== 'null' ? Number(p.c) : null });
            m.easeTo({ center: [Number(p.lng), Number(p.lat)], zoom: Math.max(m.getZoom(), 15.5), padding: { top: 0, bottom: m.getContainer().clientHeight * 0.4, left: 0, right: 0 }, duration: 700 });
          });
          m.on('click', `${c}-cl`, async (e) => {
            const f = e.features?.[0];
            if (!f) return;
            setFollow(false);
            const z = await (m.getSource(src) as GeoJSONSource).getClusterExpansionZoom(f.properties.cluster_id as number);
            m.easeTo({ center: (f.geometry as unknown as { coordinates: [number, number] }).coordinates, zoom: z + 0.3, duration: 600 });
          });
          for (const id of [`${c}-pt`, `${c}-cl`]) {
            m.on('mouseenter', id, () => (m.getCanvas().style.cursor = 'pointer'));
            m.on('mouseleave', id, () => (m.getCanvas().style.cursor = ''));
          }
        }
        m.addLayer({ id: 'rad-halo', type: 'circle', source: 'radars', paint: { 'circle-color': ['get', 'color'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, ['case', onRoute, 10, 6], 16, ['case', onRoute, 32, 26]], 'circle-opacity': ['case', ['boolean', ['feature-state', 'next'], false], 0.38, onRoute, 0.28, 0.15], 'circle-pitch-alignment': 'map' } } as never);
        m.addLayer({ id: 'rad', type: 'circle', source: 'radars', paint: { 'circle-color': ['get', 'color'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, ['case', onRoute, 5.5, 3.5], 16, ['case', onRoute, 13, 11]], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 16, 3], 'circle-stroke-opacity': ['case', ['==', ['get', 'approx'], 1], 0.6, 1] } } as never);
        if (!bound) {
        bound = true;
        const pick = (e: { features?: { properties: { id: number } }[] }) => {
          const id = e.features?.[0]?.properties?.id;
          const r = radars.find((x) => x.id === Number(id));
          if (!r) return;
          setFollow(false);
          setPoiSel(null);
          setSel(r);
          const pt = r.lat != null ? [r.lng!, r.lat] : r.geom?.[0]?.[0] ? [r.geom[0][0][1], r.geom[0][0][0]] : null;
          if (pt) m.easeTo({ center: pt as [number, number], zoom: Math.max(m.getZoom(), 15), padding: { top: 0, bottom: m.getContainer().clientHeight * 0.35, left: 0, right: 0 }, duration: 700 });
        };
        for (const id of ['rad', 'rad-halo', 'sec']) {
          m.on('click', id, pick as never);
          m.on('mouseenter', id, () => (m.getCanvas().style.cursor = 'pointer'));
          m.on('mouseleave', id, () => (m.getCanvas().style.cursor = ''));
        }
        m.on('click', 'route-alt', (e) => {
          const i = Number(e.features?.[0]?.properties?.idx);
          if (modeRef.current === 'preview' && !Number.isNaN(i)) setRi(i);
        });
        for (const id of ['route-alt']) {
          m.on('mouseenter', id, () => (m.getCanvas().style.cursor = 'pointer'));
          m.on('mouseleave', id, () => (m.getCanvas().style.cursor = ''));
        }
        m.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
        }
        setLoaded(true);
        setStyleGen((g) => g + 1);
      };
      m.on('style.load', setup);
      const dot = document.createElement('div');
      dot.className = 'drv-puck';
      dot.style.opacity = '0';
      dot.innerHTML = '<svg viewBox="0 0 48 48" width="58" height="58"><defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-opacity=".45"/></filter></defs><path filter="url(#s)" d="M24 5 L39 40 L24 32 L9 40 Z" fill="#2f7bff" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/></svg>';
      puck.current = new M.Marker({ element: dot, rotationAlignment: 'map', pitchAlignment: 'map' }).setLngLat([RIGA[1], RIGA[0]]).addTo(m);
    })();
    return () => {
      gone = true;
      map.current?.remove();
      map.current = null;
    };
  }, [radars]);

  const onPos = useCallback((np: Pos) => {
    let h = np.heading;
    if ((h == null || Number.isNaN(h) || (np.speed ?? 0) < 4) && prev.current && distance(prev.current.p, np.p) > 8) h = bearing(prev.current.p, np.p);
    let shown = np.p;
    // Navigācijā "pielīmējam" bultiņu pie maršruta, kā īstā navigācijā
    const r = routeRef.current;
    if (r && (modeRef.current === 'nav' || modeRef.current === 'arrived')) {
      const n = navRef.current;
      let pr = project(r, np.p, n.i - 5, n.i + 600);
      if (pr.off > 60) pr = project(r, np.p);
      navRef.current = { at: pr.at, i: pr.i, off: pr.off };
      if (pr.off < 30) {
        shown = pointAt(r, pr.at).p;
        if ((np.speed ?? 0) >= 3 || h == null) h = bearing(pointAt(r, Math.max(0, pr.at - 5)).p, pointAt(r, pr.at + 20).p);
      }
      setNavAt(pr.at);
    }
    if (h != null && !Number.isNaN(h)) heading.current = angleLerp(heading.current, h, 0.6);
    if (!prev.current || distance(prev.current.p, np.p) > 8) prev.current = { ...np, heading: h };
    fix.current = { p: shown, mps: (np.speed ?? 0) / 3.6, gpsHeading: h != null && !Number.isNaN(h) && (np.speed ?? 0) >= 8 ? h : null, t: performance.now() };
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
      (g) => {
        setErr('');
        onPos({ p: [g.coords.latitude, g.coords.longitude], speed: g.coords.speed != null && g.coords.speed >= 0 ? Math.round(g.coords.speed * 3.6) : null, heading: g.coords.heading, acc: g.coords.accuracy, t: g.timestamp });
      },
      () => setErr('Nav piekļuves atrašanās vietai. Atļauj to pārlūka iestatījumos vai izmēģini demonstrāciju.'),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [demo, onPos]);

  // Demonstrācija: pa maršrutu vai pa vidējā ātruma posmu
  useEffect(() => {
    if (!demo) return;
    if (demoRoute) {
      let at = 0;
      const t = setInterval(() => {
        const left = demoRoute.distance - at;
        const speed = at < 1200 || left < 1200 ? 46 : 78;
        at = Math.min(demoRoute.distance, at + speed / 3.6);
        const a = pointAt(demoRoute, at).p;
        const b = pointAt(demoRoute, Math.min(demoRoute.distance, at + 15)).p;
        onPos({ p: a, speed: left < 5 ? 0 : speed, heading: distance(a, b) > 1 ? bearing(a, b) : null, acc: 5, t: Date.now() });
        if (at >= demoRoute.distance) clearInterval(t);
      }, 1000);
      return () => clearInterval(t);
    }
    const sec = radars.find((r) => r.kind === 'average' && r.geom && r.geom.flat().length > 10) || radars.find((r) => r.geom?.length);
    if (!sec?.geom) return;
    const pts = sec.geom.flat();
    const b0 = bearing(pts[1], pts[0]);
    const lead: LL[] = [];
    for (let k = 15; k >= 1; k--) lead.push([pts[0][0] + Math.cos((b0 * Math.PI) / 180) * 0.0009 * k, pts[0][1] + (Math.sin((b0 * Math.PI) / 180) * 0.0009 * k) / Math.cos((pts[0][0] * Math.PI) / 180)]);
    const path = [...lead, ...pts];
    let i = 0;
    let f = 0;
    const speed = 88;
    const step = speed / 3.6;
    const t = setInterval(() => {
      let left = step;
      while (left > 0 && i < path.length - 1) {
        const seg = distance(path[i], path[i + 1]);
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
      if (i >= path.length - 1) {
        i = 0;
        f = 0;
      }
      const a = path[i];
      const b = path[i + 1] || a;
      onPos({ p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], speed, heading: bearing(a, b), acc: 5, t: Date.now() });
    }, 1000);
    return () => clearInterval(t);
  }, [demo, demoRoute, radars, onPos]);

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

  // Pirms pagrieziena kamera pietuvinās
  const zoomBoost = useRef(0);

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
      const target = f.gpsHeading ?? compass.current ?? heading.current;
      heading.current = target;
      const ahead = Math.min(1.3, (now - f.t) / 1000) * f.mps;
      const hd = ((f.gpsHeading ?? 0) * Math.PI) / 180;
      const lat = f.p[0] + (f.gpsHeading != null ? (Math.cos(hd) * ahead) / 111320 : 0);
      const lng = f.p[1] + (f.gpsHeading != null ? (Math.sin(hd) * ahead) / (111320 * Math.cos((f.p[0] * Math.PI) / 180)) : 0);
      if (Number.isNaN(disp.lat)) {
        disp.lat = lat;
        disp.lng = lng;
        disp.bearing = target;
        const e = puck.current?.getElement();
        if (e) e.style.opacity = '1';
      }
      const k = 1 - Math.pow(0.0015, dt);
      disp.lat += (lat - disp.lat) * k;
      disp.lng += (lng - disp.lng) * k;
      disp.bearing = angleLerp(disp.bearing, target, 1 - Math.pow(0.02, dt));
      disp.zoom += (zoomFor(f.mps * 3.6) + zoomBoost.current - disp.zoom) * (1 - Math.pow(0.3, dt));
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

  const route = routes[ri] || null;
  const navigating = mode === 'nav' || mode === 'arrived';

  // ---------- Maršruts ----------
  const fitRoute = useCallback((r: Route) => {
    const m = map.current;
    if (!m || !ml.current) return;
    const b = new ml.current.LngLatBounds();
    r.coords.forEach(([a, c]) => b.extend([c, a]));
    const h = m.getContainer().clientHeight;
    const wide = m.getContainer().clientWidth > 900;
    m.setPadding({ top: 0, bottom: 0, left: 0, right: 0 }); // braukšanas kameras atkāpe citādi saskaitās ar šo
    m.fitBounds(b, { padding: wide ? { top: 90, bottom: 90, left: 460, right: 90 } : { top: 60, bottom: h * 0.56 + 10, left: 40, right: 40 }, bearing: 0, pitch: 0, duration: 900, maxZoom: 16 });
  }, []);

  const placeDest = useCallback((p: Place | null) => {
    destMarker.current?.remove();
    destMarker.current = null;
    if (!p || !map.current || !ml.current) return;
    const e = document.createElement('div');
    const ta = p.special === 'tavsauto';
    e.innerHTML = `<svg width="44" height="54" viewBox="0 0 44 54" style="filter:drop-shadow(0 4px 6px rgba(0,0,0,.4))"><path d="M22 52s18-17.5 18-30A18 18 0 0 0 4 22c0 12.5 18 30 18 30z" fill="${ta ? '#d91d2b' : '#ea4335'}" stroke="#fff" stroke-width="3"/>${ta ? '<text x="22" y="27.5" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="900" fill="#fff">TA</text>' : '<circle cx="22" cy="22" r="6.5" fill="#fff"/>'}</svg>`;
    destMarker.current = new ml.current.Marker({ element: e, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(map.current);
  }, []);

  const plan = useCallback(
    async (p: Place, from?: LL) => {
      abort.current?.abort();
      const ac = new AbortController();
      abort.current = ac;
      const start = from || fix.current?.p || null;
      setFromCenter(!start);
      setRouting(true);
      setRouteErr('');
      try {
        const rs = await fetchRoutes(start || RIGA, [p.lat, p.lng], radars, ac.signal);
        if (ac.signal.aborted) return null;
        return rs;
      } catch (e) {
        if (!ac.signal.aborted) setRouteErr(e instanceof Error ? e.message : 'Maršrutu neizdevās aprēķināt');
        return null;
      } finally {
        if (!ac.signal.aborted) setRouting(false);
      }
    },
    [radars],
  );

  const choose = useCallback(
    async (p: Place) => {
      rememberPlace(p);
      setDest(p);
      setSel(null);
      setPoiSel(null);
      setMode('preview');
      setFollow(false);
      setRoutes([]);
      setRi(0);
      placeDest(p);
      map.current?.easeTo({ center: [p.lng, p.lat], zoom: 13, pitch: 0, bearing: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 700 });
      track('tool_use', { tool: 'Navigācija: galamērķis', dest: p.special || p.kind || 'adrese' }, 'nav_dest');
      const rs = await plan(p);
      if (rs) {
        setRoutes(rs);
        fitRoute(rs[0]);
      }
    },
    [plan, placeDest, fitRoute],
  );

  const endNav = useCallback(() => {
    abort.current?.abort();
    routeRef.current = null;
    setRoutes([]);
    setDest(null);
    setDemoRoute(null);
    setDemo(false);
    setMode('free');
    setRouteErr('');
    setRouting(false);
    placeDest(null);
    setFollow(true);
    zoomBoost.current = 0;
  }, [placeDest]);

  const start = useCallback(
    (withDemo: boolean) => {
      if (!route) return;
      routeGen.current++;
      routeRef.current = route;
      navRef.current = { at: 0, i: 0, off: 0 };
      setNavAt(0);
      spoken.current.clear();
      warned.current.clear();
      offCount.current = 0;
      lastReroute.current = Date.now();
      setSel(null);
      setPoiSel(null);
      setMode('nav');
      setFollow(true);
      setThree(true);
      if (withDemo || demo || !fix.current) {
        setDemoRoute(route);
        setDemo(true);
      }
      track('tool_use', { tool: 'Navigācija: sākt', km: Math.round(route.distance / 1000), radars: route.radars.length, demo: withDemo }, 'nav_start');
      unlockVoice();
      if (sound) speak(['start', route.radars.length ? 'start_radars' : 'start_clear'], 2);
    },
    [route, demo, sound],
  );

  // Maršruta zīmēšana
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    const src = m.getSource('routes') as GeoJSONSource | undefined;
    if (!src) return;
    if (mode === 'preview') {
      src.setData(fc(routes.map((r, i) => line(r.coords, { idx: i, active: i === ri ? 1 : 0 })).sort((a, b) => (a.properties.active as number) - (b.properties.active as number))));
    } else if (navigating && routeRef.current) {
      const r = routeRef.current;
      const n = navRef.current;
      const here = pointAt(r, n.at).p;
      src.setData(fc([line([here, ...r.coords.slice(n.i + 1)], { idx: 0, active: 1 })]));
    } else src.setData(fc([]));
  }, [routes, ri, mode, loaded, navigating, navAt, styleGen]);

  // Radari maršrutā — izceļam kartē
  const routeRadars = useMemo(() => (navigating ? routeRef.current?.radars : route?.radars) || [], [navigating, route, navAt === 0]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    const ids = new Set(routeRadars.map((x) => x.r.id));
    for (const r of radars) if (r.lat != null && r.kind !== 'toll') m.setFeatureState({ source: 'radars', id: r.id }, { route: ids.has(r.id) });
  }, [routeRadars, loaded, radars, styleGen]);

  useEffect(() => {
    if (mode === 'preview' && route) fitRoute(route);
  }, [ri]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sākuma galamērķis (piem., /navigacija?to=tavsauto)
  const initDone = useRef(false);
  useEffect(() => {
    if (!initialDest || initDone.current || !loaded) return;
    if (!pos && !err && !waited) {
      const t = setTimeout(() => setWaited(true), 2500);
      return () => clearTimeout(t);
    }
    initDone.current = true;
    choose(initialDest);
  }, [initialDest, loaded, pos, err, waited, choose]);

  // Navigācijas progress
  const steps = useMemo(() => (navigating && routeRef.current ? routeRef.current.steps : []), [navigating, routes]); // eslint-disable-line react-hooks/exhaustive-deps
  const stepIdx = steps.findIndex((s) => s.type !== 'depart' && s.at > navAt + 3);
  const step = stepIdx >= 0 ? steps[stepIdx] : null;
  const toStep = step ? Math.max(0, step.at - navAt) : 0;
  const then = step && steps[stepIdx + 1] && steps[stepIdx + 1].at - step.at < 150 ? steps[stepIdx + 1] : null;
  const total = routeRef.current?.distance || 0;
  const remain = navigating ? Math.max(0, total - navAt) : 0;
  const remainSec = navigating && routeRef.current ? routeRef.current.duration * (remain / (total || 1)) : 0;

  useEffect(() => {
    zoomBoost.current = mode === 'nav' && step && toStep < 220 && step.type !== 'arrive' ? 0.7 : 0;
  }, [mode, step, toStep]);

  // Balss norādes
  useEffect(() => {
    if (mode !== 'nav' || !step || !sound) return;
    const key = `${routeGen.current}-${stepIdx}`;
    const lvl = spoken.current.get(key) ?? 9;
    const prevAt = stepIdx > 0 ? steps[stepIdx - 1].at : 0;
    const gap = step.at - prevAt;
    const man = maneuverKey(step.type, step.modifier, step.exit);
    let keys: (string | null)[] | null = null;
    let nl = lvl;
    if (toStep <= 45 && lvl > 1) {
      nl = 1;
      keys = step.type === 'arrive' ? null : [man];
    } else if (toStep <= 320 && toStep > 60 && lvl > 2 && gap > 380) {
      nl = 2;
      keys = [distKey(toStep), man];
    } else if (toStep <= 900 && toStep > 550 && lvl > 3 && gap > 1300) {
      nl = 3;
      keys = [distKey(toStep), man];
    }
    if (nl !== lvl) {
      spoken.current.set(key, nl);
      if (keys) speak(keys, nl === 1 ? 3 : 2).then((ok) => !ok && nl === 1 && beep(740, 120));
    }
  }, [mode, step, stepIdx, toStep, sound, steps]);

  // Ierašanās
  useEffect(() => {
    if (mode !== 'nav' || !routeRef.current || !pos) return;
    const near = dest ? distance(pos.p, [dest.lat, dest.lng]) : Infinity;
    if (remain < 25 || near < 30) {
      setMode('arrived');
      setDemo(false);
      setDemoRoute(null);
      zoomBoost.current = 0;
      if (sound) speak([dest?.special === 'tavsauto' ? 'arrived_ta' : 'arrived'], 3);
      track('tool_use', { tool: 'Navigācija: ieradās', dest: dest?.special || 'adrese' }, 'nav_arrive');
    }
  }, [mode, remain, pos, dest, sound]);

  // Pārrēķins, ja nobrauc no maršruta — ātri un gudri:
  //  • nobraukšanu nosakām pēc attāluma (ņemot vērā GPS precizitāti) UN pēc braukšanas virziena pret maršrutu;
  //  • ja brauc pa kādu no alternatīvajiem maršrutiem — pārslēdzamies uzreiz, bez interneta;
  //  • jaunais maršruts sākas braukšanas virzienā (bez “apgriezieties”), vecais pieprasījums tiek atcelts.
  const reroutingRef = useRef(false);
  const switchTo = useCallback((r: Route, at = 0, i = 0) => {
    routeGen.current++;
    routeRef.current = r;
    navRef.current = { at, i, off: 0 };
    offCount.current = 0;
    setNavAt(at);
  }, []);
  useEffect(() => {
    if (mode !== 'nav' || demo || !pos || !dest) return;
    const r = routeRef.current;
    if (!r) return;
    const n = navRef.current;
    const acc = Math.min(pos.acc || 20, 60);
    const tol = Math.max(30, acc * 1.2);
    let bad = n.off > tol;
    // virziens: brauc pretēji vai prom no maršruta, kaut arī vēl tuvu tam
    if (!bad && n.off > 14 && (pos.speed ?? 0) > 12 && pos.heading != null) {
      const rb = bearing(pointAt(r, n.at).p, pointAt(r, n.at + 30).p);
      if (Math.abs(((pos.heading - rb + 540) % 360) - 180) > 75) bad = true;
    }
    if (!bad) {
      offCount.current = 0;
      if (reroutingRef.current) {
        abort.current?.abort(); // atgriezies uz maršruta — pārrēķins vairs nav vajadzīgs
        reroutingRef.current = false;
        setRerouting(false);
      }
      return;
    }
    offCount.current++;
    const urgent = n.off > Math.max(80, acc * 2);
    if (!urgent && offCount.current < 2) return;
    // 1) varbūt brauc pa alternatīvu, kas jau ir rokā
    for (const alt of routes) {
      if (alt === r) continue;
      const pr = project(alt, pos.p);
      if (pr.off < Math.max(22, acc)) {
        switchTo(alt, pr.at, pr.i);
        setRi(routes.indexOf(alt));
        if (sound) speak(['changed'], 2).then((ok) => !ok && beep(990, 120));
        return;
      }
    }
    if (reroutingRef.current || Date.now() - lastReroute.current < 3500) return;
    lastReroute.current = Date.now();
    reroutingRef.current = true;
    setRerouting(true);
    const ac = new AbortController();
    abort.current?.abort();
    abort.current = ac;
    fetchRoutes(pos.p, [dest.lat, dest.lng], radars, ac.signal, { heading: (pos.speed ?? 0) > 6 ? pos.heading : null })
      .then((rs) => {
        if (ac.signal.aborted || modeRef.current !== 'nav' || !rs.length) return;
        const cur = fix.current?.p || pos.p;
        const pr = project(rs[0], cur);
        switchTo(rs[0], pr.at, pr.i);
        setRoutes(rs);
        setRi(0);
        if (sound) speak(['rerouted'], 2).then((ok) => !ok && beep(990, 120));
      })
      .catch(() => {
        lastReroute.current = Date.now() - 2000; // ātri mēģinām vēlreiz
      })
      .finally(() => {
        if (abort.current === ac) {
          reroutingRef.current = false;
          setRerouting(false);
        }
      });
  }, [pos]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Radari ----------
  const next = useMemo(() => {
    if (!pos) return null;
    if (mode === 'nav' && routeRef.current) {
      const n = routeRef.current.radars.find((x) => x.at > navAt - 15);
      return n ? { r: n.r, d: Math.max(0, n.at - navAt) } : null;
    }
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
  }, [pos, radars, mode, navAt]);

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

  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    for (const r of radars) if (r.lat != null && r.kind !== 'toll') m.setFeatureState({ source: 'radars', id: r.id }, { next: next?.r.id === r.id });
  }, [next?.r.id, loaded, radars, styleGen]);

  // Brīdinājumi
  useEffect(() => {
    if (!next || !sound) return;
    const last = warned.current.get(next.r.id) ?? Infinity;
    const stepW = next.d < 200 ? 200 : next.d < WARN ? WARN : null;
    if (stepW && stepW < last) {
      warned.current.set(next.r.id, stepW);
      const keys = stepW === 200 ? ['r_attn', radarKey(next.r.kind)] : [distKey(next.d), radarKey(next.r.kind), speedKey(next.r.speed)];
      speak(keys, stepW === 200 ? 4 : 3).then((ok) => {
        if (ok) return;
        beep(stepW === 200 ? 1175 : 880, 220);
        if (stepW === 200) setTimeout(() => beep(1175, 220), 280);
      });
      navigator.vibrate?.(stepW === 200 ? [120, 80, 120] : 150);
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
    setTimeout(() => speak(['over'], 2), 500);
  }, [over, sound]);

  // Vidējā ātruma posma sākums / beigas
  const secId = useRef<number | null>(null);
  useEffect(() => {
    const id = inSection?.r.id ?? null;
    if (id === secId.current) return;
    const was = secId.current;
    secId.current = id;
    if (!sound) return;
    if (id != null) speak(['sec_in'], 3);
    else if (was != null) speak(['sec_out'], 1);
  }, [inSection, sound]);

  // ---------- Degviela / uzlāde ----------
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    let live = true;
    for (const c of POI_ORDER) {
      const on = layers.has(c);
      for (const id of [`${c}-cl`, `${c}-cln`, `${c}-pt`]) if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
      if (!on) continue;
      if (poiCount[c] == null) setPoiLoading((v) => new Set(v).add(c));
      loadPois(c).then(async (all) => {
        let list = all;
        if (!list.length) {
          // kopējie dati vēl nav pieejami — ielādējam apkārtni tieši no OpenStreetMap
          const ce = map.current?.getCenter();
          const at: LL = fix.current?.p || (ce ? [ce.lat, ce.lng] : RIGA);
          list = await loadPoisNear(c, at);
        }
        setPoiLoading((v) => {
          const n = new Set(v);
          n.delete(c);
          return n;
        });
        if (!live && !map.current) return;
        setPoiCount((v) => ({ ...v, [c]: list.length }));
        (map.current?.getSource(`poi-${c}`) as GeoJSONSource | undefined)?.setData(fc(list.map((p) => ({ type: 'Feature' as const, properties: { ...p, icon: iconKey(p), b: p.b || null }, geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] } }))));
      });
    }
    return () => {
      live = false;
    };
  }, [layers, loaded, styleGen]); // eslint-disable-line react-hooks/exhaustive-deps

  const nearest = useCallback(async (k: PoiCat) => {
    const c = map.current?.getCenter();
    const from: LL = fix.current?.p || (c ? [c.lat, c.lng] : RIGA);
    let all = await loadPois(k);
    if (!all.length) all = await loadPoisNear(k, from);
    const best = all.slice().sort((a, b) => distance(from, [a.lat, a.lng]) - distance(from, [b.lat, b.lng]))[0];
    toggleLayer(k, true);
    return best || null;
  }, [toggleLayer]);

  const poiPlace = (p: Poi): Place => ({ id: `poi${p.lat},${p.lng}`, name: p.n, sub: p.a || p.b || SUB_LABEL[p.s] || POI_CATS[p.k].label, lat: p.lat, lng: p.lng, kind: p.k });

  const alert = !!next && next.d < WARN;
  const progress = next ? Math.max(0, Math.min(1, 1 - next.d / 1500)) : 0;
  const shareEta = async () => {
    if (!dest) return;
    const text = `Esmu ceļā uz ${dest.name}. Ierašanās ap ${fmtClock(remainSec)} (${fmtDist(remain)} atlikuši).`;
    try {
      if (navigator.share) await navigator.share({ title: 'Mans ierašanās laiks', text });
      else await navigator.clipboard.writeText(text);
    } catch {}
  };

  const ManIcon = step ? MAN[step.icon] : ArrowUp;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`drv fixed inset-0 z-[2000] h-[100dvh] overflow-hidden text-(--fg) ${day ? 'drv-day' : ''}`} role="dialog" aria-label="Tavs Auto navigācija">
      <div className="drv-map absolute inset-0"><div ref={el} className="h-full w-full" /></div>
      {!loaded && <div className="absolute inset-0 grid place-items-center"><Loader2 className="h-7 w-7 animate-spin text-(--fg)/60" /></div>}

      {/* ------- Augša ------- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-3 pt-[calc(0.75rem+env(safe-area-inset-top))] lg:max-w-[440px]">
        {mode === 'nav' ? (
          <>
            <motion.div layout className="pointer-events-auto overflow-hidden rounded-[22px] bg-[#0e7a4c] shadow-2xl text-white [--fg:#fff]">
              <div className="flex items-center gap-3 p-3.5">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15"><ManIcon className={`h-10 w-10 ${step?.icon === 'fork-left' ? '-scale-x-100' : ''}`} strokeWidth={2.6} /></span>
                <div className="min-w-0 flex-1">
                  <p className="num text-[2rem] font-black leading-none tracking-tight">{step ? fmtDist(toStep) : '—'}</p>
                  <p className="mt-1 truncate text-[15px] font-bold">{step ? step.text : 'Turpiniet pa maršrutu'}</p>
                  {step && (step.ref || step.name) && step.type !== 'arrive' && <p className="truncate text-sm text-(--fg)/75">{[step.ref?.split(';')[0], step.name].filter(Boolean).join(' · ')}</p>}
                  {step?.type === 'arrive' && dest && <p className="truncate text-sm text-(--fg)/75">{dest.name}</p>}
                </div>
              </div>
              {then && (
                <div className="flex items-center gap-2 bg-black/20 px-4 py-2 text-sm font-semibold">
                  Pēc tam {(() => { const I = MAN[then.icon]; return <I className="h-4 w-4" />; })()} <span className="truncate text-(--fg)/80">{then.name || lc(then.text)}</span>
                </div>
              )}
            </motion.div>
            <div className="mt-2 flex flex-wrap gap-2">
              {next && next.d < 8000 && (
                <button onClick={() => { setSel(next.r); setFollow(false); }} className={`pointer-events-auto flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold shadow-xl backdrop-blur-xl ${alert ? 'bg-[#d91d2b] text-white [--fg:#fff]' : 'bg-(--panel)'}`}>
                  {alert ? <AlertTriangle className="h-4 w-4 animate-pulse" /> : <span className="h-3 w-3 rounded-full text-white" style={{ background: KIND[next.r.kind].color }} />}
                  {KIND[next.r.kind].short} <span className="num">{fmtDist(next.d)}</span>
                  {next.r.speed ? <span className="num grid h-7 w-7 place-items-center rounded-full border-[3px] border-[#d91d2b] bg-white text-xs font-black text-black">{next.r.speed}</span> : null}
                </button>
              )}
              {rerouting && <span className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-(--panel) px-3 py-2 text-sm font-semibold"><Loader2 className="h-4 w-4 animate-spin" /> Pārrēķina maršrutu…</span>}
            </div>
          </>
        ) : mode === 'free' ? (
          <>
            <motion.div layout className={`pointer-events-auto overflow-hidden rounded-[22px] shadow-2xl backdrop-blur-xl transition-colors duration-300 ${alert ? 'bg-[#d91d2b]/95 text-white [--fg:#fff]' : 'bg-(--panel)'}`}>
              <div className="flex items-center gap-3 p-3.5">
                {next ? (
                  <>
                    <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${alert ? 'bg-white/20' : ''}`} style={alert ? undefined : { background: KIND[next.r.kind].color }}>
                      {alert ? <AlertTriangle className="h-7 w-7 animate-pulse" /> : <span className="text-[11px] font-black uppercase leading-none tracking-wide">{next.r.kind === 'average' ? 'Vid.' : next.r.kind === 'mobile' ? 'Mob.' : 'Foto'}</span>}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="num text-[2rem] font-black leading-none tracking-tight">{fmtDist(next.d)}</p>
                      <p className="mt-1 truncate text-[13px] font-semibold text-(--fg)/85">{KIND[next.r.kind].short}</p>
                      <p className="truncate text-xs text-(--fg)/60">{next.r.name}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-500/20 text-(--t-green)"><ShieldCheck className="h-7 w-7" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold leading-tight">{pos ? 'Ceļš priekšā brīvs' : err ? 'Nav atrašanās vietas' : 'Nosaku atrašanās vietu…'}</p>
                      <p className="text-xs text-(--fg)/60">{err || `Brīdināsim ${WARN} m pirms radara braukšanas virzienā`}</p>
                    </div>
                  </>
                )}
                {limit && <SpeedSign v={limit} />}
              </div>
              {next && <div className="h-1 bg-(--fg)/10"><motion.div className="h-full bg-white" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.8 }} /></div>}
            </motion.div>
            <div className="pointer-events-auto mt-2 flex gap-2">
              <button onClick={() => setMode('search')} className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-white px-4 text-left text-[15px] font-semibold text-[#5b6170] shadow-xl">
                <Search className="h-5 w-5 shrink-0 text-[#2f7bff]" /> <span className="truncate">Kurp brauksim?</span>
              </button>
              <button onClick={() => choose(TAVS_AUTO)} className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#d91d2b] px-4 text-sm font-bold shadow-xl text-white" title="Navigēt uz Tavs Auto autoplaci">
                <Car className="h-5 w-5" /> Tavs Auto
              </button>
            </div>
          </>
        ) : null}

        {navigating || mode === 'free' ? (
          <AnimatePresence>
            {inSection && (
              <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="pointer-events-auto mt-2 flex items-center gap-3 rounded-2xl bg-[#f59e0b] px-4 py-2.5 text-[#1b1203] shadow-xl">
                <span className="text-xs font-black uppercase tracking-wide">Vidējā ātruma posms</span>
                <span className="num ml-auto text-sm font-bold">vēl {fmtDist(inSection.left)}</span>
                {avgSpeed != null && <span className={`num rounded-lg px-2 py-0.5 text-sm font-black ${inSection.r.speed && avgSpeed > inSection.r.speed ? 'bg-[#d91d2b] text-white' : 'bg-black/15'}`}>vid. {avgSpeed}</span>}
              </motion.div>
            )}
          </AnimatePresence>
        ) : null}
        {mode === 'free' && (err || (waited && !pos)) && !demo && (
          <button onClick={() => { setErr(''); setDemo(true); }} className="pointer-events-auto mt-2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-lg"><Play className="h-4 w-4" /> Demonstrācija</button>
        )}
      </div>

      {/* Slāņi: degviela un uzlāde */}
      {(mode === 'free' || mode === 'nav') && (
        <div className="pointer-events-auto absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-2">
          <div className="relative">
            <Ctl onClick={() => setLayerSheet(true)} label="Kartes slāņi" on={layers.size > 0} tone="#2f7bff"><Layers className="h-5 w-5" /></Ctl>
            {layers.size > 0 && <span className="num pointer-events-none absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-black text-[#2f7bff] shadow">{layers.size}</span>}
          </div>
          <Ctl onClick={cycleTheme} label={theme === 'auto' ? 'Režīms: automātiski (pēc diennakts laika)' : theme === 'day' ? 'Režīms: diena' : 'Režīms: nakts'}>{theme === 'auto' ? <SunMoon className="h-5 w-5" /> : theme === 'day' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</Ctl>
          {[...layers].slice(0, 4).map((c) => {
            const I = CAT_ICON[c];
            return <Ctl key={c} onClick={() => toggleLayer(c)} label={`Slēpt: ${POI_CATS[c].label}`} on tone={POI_CATS[c].color}>{poiLoading.has(c) ? <Loader2 className="h-5 w-5 animate-spin" /> : <I className="h-5 w-5" />}</Ctl>;
          })}
        </div>
      )}

      {/* ------- Apakša ------- */}
      {(mode === 'free' || mode === 'nav') && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 pb-[calc(0.9rem+env(safe-area-inset-bottom))]">
          <div className={`pointer-events-auto grid h-[84px] w-[84px] shrink-0 place-items-center rounded-full border-4 shadow-2xl backdrop-blur-xl transition-colors sm:h-[92px] sm:w-[92px] ${over ? 'border-white bg-[#d91d2b] text-white [--fg:#fff]' : 'border-(--fg)/15 bg-(--panel)'}`}>
            <div className="text-center leading-none">
              <p className="num text-[2rem] font-black">{pos?.speed != null ? pos.speed : '–'}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-(--fg)/60">km/h</p>
            </div>
          </div>
          {mode === 'nav' && (
            <button onClick={shareEta} aria-label="Kopīgot ierašanās laiku" className="pointer-events-auto flex min-w-0 flex-1 items-center gap-2 rounded-[22px] bg-(--panel) px-3.5 py-2.5 text-left shadow-2xl backdrop-blur-xl">
              <span className="min-w-0 flex-1">
                <span className="num block whitespace-nowrap text-[1.45rem] font-black leading-none text-(--t-green)">{fmtDur(remainSec)}</span>
                <span className="num mt-1 block truncate text-xs font-semibold text-(--fg)/70">{fmtClock(remainSec)} · {fmtDist(remain)}{demo ? ' · DEMO' : ''}</span>
              </span>
              <Share2 className="h-4 w-4 shrink-0 text-(--fg)/50" />
            </button>
          )}
          {mode === 'free' && demo && <span className="pointer-events-auto mb-2 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-black">DEMO</span>}
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            {!follow && (
              <button onClick={() => { setSel(null); setPoiSel(null); setFollow(true); }} className="flex h-12 items-center gap-2 rounded-full bg-[#2f7bff] px-4 text-sm font-bold shadow-xl text-white"><LocateFixed className="h-5 w-5" /> Centrēt</button>
            )}
            <div className="flex gap-2">
              {mode === 'nav' ? (
                <>
                  <Ctl onClick={() => { unlockVoice(); setSound((v) => { if (!v) setTimeout(() => speak(['ready'], 1), 50); return !v; }); }} label={sound ? 'Izslēgt skaņu' : 'Ieslēgt skaņu'}>{sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</Ctl>
                  <Ctl onClick={endNav} label="Beigt navigāciju" tone="#d91d2b" on><X className="h-5 w-5" /></Ctl>
                </>
              ) : (
                <>
                  <Ctl onClick={() => setThree((v) => !v)} label={three ? '2D' : '3D'}>{three ? <Square className="h-5 w-5" /> : <Box className="h-5 w-5" />}</Ctl>
                  <Ctl onClick={() => { unlockVoice(); setSound((v) => { if (!v) setTimeout(() => speak(['ready'], 1), 50); return !v; }); }} label={sound ? 'Izslēgt skaņu' : 'Ieslēgt skaņu'}>{sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</Ctl>
                  <Ctl onClick={onClose} label="Aizvērt"><X className="h-5 w-5" /></Ctl>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {mode === 'search' && (
          <SearchSheet
            key="search"
            near={pos?.p || null}
            onBack={() => setMode(dest ? 'preview' : 'free')}
            onPick={choose}
            onNearest={async (k) => {
              const p = await nearest(k);
              if (p) choose(poiPlace(p));
              return !!p;
            }}
          />
        )}
        {mode === 'preview' && dest && (
          <PreviewSheet
            key="preview"
            dest={dest}
            routes={routes}
            ri={ri}
            setRi={setRi}
            routing={routing}
            err={routeErr}
            fromCenter={fromCenter}
            hasPos={!!pos && !demo}
            onStart={start}
            onClose={endNav}
            onSearch={() => setMode('search')}
            onRadar={(r) => setSel(r)}
            onRetry={() => choose(dest)}
          />
        )}
        {mode === 'arrived' && dest && <ArrivedSheet key="arrived" dest={dest} onDone={endNav} />}
        {sel && <RadarSheet key="radar" r={sel} pos={pos} onClose={() => setSel(null)} onResume={() => { setSel(null); setFollow(true); }} />}
        {layerSheet && <LayerSheet key="layers" on={layers} counts={poiCount} loading={poiLoading} toggle={toggleLayer} clear={() => setLayers(new Set())} onClose={() => setLayerSheet(false)} />}
        {poiSel && (
          <PoiSheet
            key="poi"
            p={poiSel}
            pos={pos}
            onClose={() => setPoiSel(null)}
            onGo={() => {
              const p = poiSel;
              setPoiSel(null);
              choose(poiPlace(p));
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ================= Lapas un kartītes =================

function Sheet({ children, onClose, label, z = 'z-20', maxH = 'max-h-[78dvh]' }: { children: React.ReactNode; onClose: () => void; label: string; z?: string; maxH?: string }) {
  return (
    <motion.div
      role="dialog"
      aria-label={label}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={(_, i) => i.offset.y > 90 && onClose()}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      className={`absolute inset-x-0 bottom-0 ${z} ${maxH} overflow-y-auto overscroll-contain rounded-t-[28px] bg-(--sheet) px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_60px_rgba(0,0,0,.5)] backdrop-blur-xl lg:bottom-4 lg:left-4 lg:right-auto lg:w-[420px] lg:rounded-[28px]`}
    >
      <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-white/20 lg:hidden" />
      {children}
    </motion.div>
  );
}

function SearchSheet({ near, onBack, onPick, onNearest }: { near: LL | null; onBack: () => void; onPick: (p: Place) => void; onNearest: (k: PoiCat) => Promise<boolean> }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [poiBusy, setPoiBusy] = useState<'' | PoiCat>('');
  const [miss, setMiss] = useState('');
  const recent = useMemo(() => recentPlaces(), []);
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => inp.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) {
      setRes([]);
      setBusy(false);
      return;
    }
    const ac = new AbortController();
    setBusy(true);
    const t = setTimeout(() => {
      searchPlaces(s, near, ac.signal)
        .then((x) => setRes(x))
        .catch(() => {})
        .finally(() => !ac.signal.aborted && setBusy(false));
    }, 280);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const Row = ({ p, icon }: { p: Place; icon: React.ReactNode }) => (
    <li>
      <button onClick={() => onPick(p)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-(--fg)/[0.06] active:bg-(--fg)/10">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-(--fg)/10">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{p.name}</span>
          {p.sub && <span className="block truncate text-sm text-(--fg)/55">{p.sub}</span>}
        </span>
        {near && <span className="num shrink-0 text-xs font-semibold text-(--fg)/50">{fmtDist(distance(near, [p.lat, p.lng]))}</span>}
      </button>
    </li>
  );

  const quick = async (k: PoiCat) => {
    setPoiBusy(k);
    setMiss('');
    const ok = await onNearest(k);
    setPoiBusy('');
    if (!ok) setMiss('Šobrīd neizdevās ielādēt staciju sarakstu. Mēģini vēlreiz pēc brīža.');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.22 }} className="absolute inset-0 z-30 flex flex-col bg-(--sheet) backdrop-blur-xl lg:inset-auto lg:left-4 lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:w-[420px] lg:rounded-[28px] lg:shadow-2xl">
      <div className="flex items-center gap-2 p-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button onClick={onBack} aria-label="Atpakaļ" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-(--fg)/10"><ArrowLeft className="h-5 w-5" /></button>
        <div className="relative flex-1">
          <input ref={inp} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Adrese, vieta vai pilsēta" enterKeyHint="search" onKeyDown={(e) => e.key === 'Enter' && res[0] && onPick(res[0])} className="h-12 w-full rounded-full bg-white px-5 pr-11 ring-1 ring-black/15 text-[16px] font-medium text-black outline-none placeholder:text-[#7b8090]" aria-label="Meklēt galamērķi" />
          {busy ? <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-[#2f7bff]" /> : q && <button onClick={() => setQ('')} aria-label="Notīrīt" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b8090]"><X className="h-5 w-5" /></button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {q.trim().length >= 2 ? (
          <ul className="mt-1">
            {res.map((p) => <Row key={p.id} p={p} icon={<MapPin className="h-5 w-5 text-(--fg)/80" />} />)}
            {!busy && !res.length && <li className="px-3 py-6 text-center text-sm text-(--fg)/50">Nekas netika atrasts. Pamēģini ielu ar pilsētu, piem. „Brīvības iela 100, Rīga”.</li>}
          </ul>
        ) : (
          <>
            <button onClick={() => onPick(TAVS_AUTO)} className="group mt-1 flex w-full items-center gap-3.5 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#d91d2b] to-[#8f0f19] p-4 text-left shadow-xl text-white [--fg:#fff]">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-base font-black text-[#d91d2b]">TA</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-black">Tavs Auto autoplacis</span>
                <span className="block truncate text-sm text-(--fg)/80">{TAVS_AUTO.sub} · {TAVS_CONTACT.hours}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
            </button>
            <p className="mb-1.5 mt-5 px-2 text-xs font-bold uppercase tracking-wider text-(--fg)/40">Tuvākā</p>
            <div className="grid grid-cols-3 gap-2">
              {(['fuel', 'ev', 'parking', 'pharmacy', 'shop', 'auto'] as PoiCat[]).map((k) => {
                const I = CAT_ICON[k];
                return (
                  <button key={k} onClick={() => quick(k)} className="flex flex-col items-center gap-1.5 rounded-2xl bg-(--fg)/[0.07] px-2 py-3 text-xs font-bold transition hover:bg-(--fg)/10 active:scale-95">
                    <span className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: POI_CATS[k].color }}>{poiBusy === k ? <Loader2 className="h-5 w-5 animate-spin" /> : <I className="h-5 w-5" />}</span>
                    {k === 'fuel' ? 'Degviela' : POI_CATS[k].label}
                  </button>
                );
              })}
            </div>
            {miss && <p className="mt-2 rounded-xl bg-(--fg)/[0.06] p-3 text-sm text-(--fg)/70">{miss}</p>}
            {recent.length > 0 && (
              <>
                <p className="mb-1 mt-5 px-2 text-xs font-bold uppercase tracking-wider text-(--fg)/40">Nesen</p>
                <ul>{recent.map((p) => <Row key={p.id} p={p} icon={<Clock className="h-5 w-5 text-(--fg)/70" />} />)}</ul>
              </>
            )}
            <p className="mt-6 px-2 text-xs leading-relaxed text-(--fg)/40">Maršrutā parādīsim visus stacionāros radarus, vidējā ātruma posmus un iespējamās mobilo radaru vietas. Atrašanās vieta paliek tikai tavā ierīcē.</p>
          </>
        )}
      </div>
    </motion.div>
  );
}

function KindDots({ list }: { list: { r: Radar }[] }) {
  const c = list.reduce((a, x) => ((a[x.r.kind] = (a[x.r.kind] || 0) + 1), a), {} as Partial<Record<RadarKind, number>>);
  const ks = (['fixed', 'average', 'mobile'] as RadarKind[]).filter((k) => c[k]);
  if (!ks.length) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-(--t-green)"><ShieldCheck className="h-3.5 w-3.5" /> Bez radariem</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {ks.map((k) => <span key={k} className="inline-flex items-center gap-1 text-xs font-semibold text-(--fg)/85"><span className="h-2.5 w-2.5 rounded-full ring-2 ring-white/80 text-white" style={{ background: KIND[k].color }} />{c[k]} {k === 'fixed' ? 'foto' : k === 'average' ? 'vid. ātr.' : 'mob.'}</span>)}
    </span>
  );
}

function PreviewSheet(props: {
  dest: Place; routes: Route[]; ri: number; setRi: (i: number) => void; routing: boolean; err: string; fromCenter: boolean; hasPos: boolean;
  onStart: (demo: boolean) => void; onClose: () => void; onSearch: () => void; onRadar: (r: Radar) => void; onRetry: () => void;
}) {
  const { dest, routes, ri, setRi, routing, err, fromCenter, hasPos, onStart, onClose, onSearch, onRadar, onRetry } = props;
  const r = routes[ri];
  const fastest = routes.length ? Math.min(...routes.map((x) => x.duration)) : 0;
  const gm = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`;
  const waze = `https://waze.com/ul?ll=${dest.lat},${dest.lng}&navigate=yes`;
  return (
    <Sheet onClose={onClose} label={`Maršruts uz ${dest.name}`} maxH="max-h-[56dvh] lg:max-h-[calc(100dvh-2rem)]">
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${dest.special ? 'bg-[#d91d2b] text-sm font-black' : 'bg-[#ea4335]'}`}>{dest.special ? 'TA' : <MapPin className="h-5 w-5" />}</span>
        <button onClick={onSearch} className="min-w-0 flex-1 text-left">
          <h3 className="truncate text-lg font-bold leading-tight">{dest.name}</h3>
          <p className="truncate text-sm text-(--fg)/55">{dest.sub}</p>
        </button>
        <button onClick={onClose} aria-label="Aizvērt" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-(--fg)/10"><X className="h-5 w-5" /></button>
      </div>

      {routing && !routes.length && <div className="mt-6 flex items-center justify-center gap-2 py-6 text-(--fg)/70"><Loader2 className="h-5 w-5 animate-spin" /> Aprēķinu maršrutu un radarus…</div>}
      {err && (
        <div className="mt-4 rounded-2xl bg-[#d91d2b]/15 p-4 text-sm text-(--t-red)">
          {err}. <button onClick={onRetry} className="font-bold text-(--fg) underline">Mēģināt vēlreiz</button>
        </div>
      )}

      {routes.length > 0 && (
        <>
          <div className="mt-4 flex snap-x gap-2 overflow-x-auto pb-1">
            {routes.map((x, i) => (
              <button key={i} onClick={() => setRi(i)} className={`min-w-[150px] flex-1 snap-start rounded-2xl p-3 text-left transition ${i === ri ? 'bg-[#2f7bff] text-white shadow-lg [--fg:#fff]' : 'bg-(--fg)/[0.07] hover:bg-(--fg)/10'}`}>
                <p className="num text-xl font-black leading-none">{fmtDur(x.duration)}</p>
                <p className="num mt-1 text-xs font-semibold text-(--fg)/75">{fmtDist(x.distance)}{x.summary ? ` · ${x.summary}` : ''}</p>
                <div className="mt-2"><KindDots list={x.radars} /></div>
                {routes.length > 1 && x.duration === fastest && <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-[#a7f3d0]">Ātrākais</p>}
                {routes.length > 1 && x.duration !== fastest && x.radars.length < Math.min(...routes.map((y) => y.radars.length)) + 1 && x.radars.length < routes[0].radars.length && <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-(--t-amber)">Mazāk radaru</p>}
              </button>
            ))}
          </div>
          {r && <p className="num mt-2 text-sm text-(--fg)/60">Ierašanās ap <b className="text-(--fg)">{fmtClock(r.duration)}</b>{fromCenter ? ' · maršruts no Rīgas centra (atrašanās vieta nav noteikta)' : ''}</p>}

          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <button onClick={() => onStart(!hasPos)} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#2f7bff] text-[17px] font-black shadow-xl active:scale-[.98] text-white">
              <Navigation2 className="h-5 w-5 fill-white" /> {hasPos ? 'Sākt' : 'Sākt demonstrāciju'}
            </button>
            {hasPos && <button onClick={() => onStart(true)} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-(--fg)/10 px-4 text-sm font-bold"><Play className="h-4 w-4" /> Demo</button>}
            {!hasPos && <span />}
          </div>

          {r && r.radars.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-(--fg)/45"><RouteIcon className="h-3.5 w-3.5" /> Radari maršrutā ({r.radars.length})</p>
              <ul className="divide-y divide-(--fg)/[0.08] overflow-hidden rounded-2xl bg-(--fg)/[0.04]">
                {r.radars.slice(0, 12).map(({ r: x, at }) => (
                  <li key={x.id}>
                    <button onClick={() => onRadar(x)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-(--fg)/[0.05]">
                      <span className="h-3 w-3 shrink-0 rounded-full text-white" style={{ background: KIND[x.kind].color }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{x.name}</span>
                        <span className="text-xs text-(--fg)/50">{KIND[x.kind].short}{x.speed ? ` · ${x.speed} km/h` : ''}</span>
                      </span>
                      <span className="num shrink-0 text-xs font-bold text-(--fg)/70">{fmtDist(at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {r.radars.length > 12 && <p className="mt-1.5 text-center text-xs text-(--fg)/45">+ vēl {r.radars.length - 12} kartē</p>}
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={waze} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center rounded-2xl bg-(--fg)/[0.07] text-sm font-bold">Atvērt Waze</a>
            <a href={gm} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center rounded-2xl bg-(--fg)/[0.07] text-sm font-bold">Google Maps</a>
          </div>
        </>
      )}
    </Sheet>
  );
}

function ArrivedSheet({ dest, onDone }: { dest: Place; onDone: () => void }) {
  const ta = dest.special === 'tavsauto';
  return (
    <Sheet onClose={onDone} label="Esat galamērķī">
      <div className="text-center">
        <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16 }} className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${ta ? 'bg-[#d91d2b]' : 'bg-[#0e7a4c]'}`}>
          <Flag className="h-8 w-8" />
        </motion.span>
        <h3 className="mt-3 text-xl font-black">{ta ? 'Laipni lūdzam Tavs Auto!' : 'Esat galamērķī'}</h3>
        <p className="mt-1 text-sm text-(--fg)/60">{dest.name}{dest.sub ? ` · ${dest.sub}` : ''}</p>
      </div>
      {ta ? (
        <>
          <p className="mt-4 rounded-2xl bg-(--fg)/[0.06] p-3.5 text-center text-sm text-(--fg)/75">Darba laiks: {TAVS_CONTACT.hours}. Piezvani — sagaidīsim pie vārtiem un parādīsim auto.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={`tel:${TAVS_CONTACT.phone.replace(/\s/g, '')}`} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white font-bold text-black"><Phone className="h-5 w-5" /> Zvanīt</a>
            <a href={`https://wa.me/${TAVS_CONTACT.wa}?text=${encodeURIComponent('Sveiki! Esmu ieradies autoplacī.')}`} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#25d366] font-bold text-[#062b14]"><MessageCircle className="h-5 w-5" /> WhatsApp</a>
            <a href="/katalogs" className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#d91d2b] font-bold text-white"><Car className="h-5 w-5" /> Skatīt auto piedāvājumu</a>
          </div>
        </>
      ) : null}
      <button onClick={onDone} className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl bg-(--fg)/10 font-bold">Gatavs</button>
    </Sheet>
  );
}

function LayerSheet({ on, counts, loading, toggle, clear, onClose }: { on: Set<PoiCat>; counts: Partial<Record<PoiCat, number>>; loading: Set<PoiCat>; toggle: (c: PoiCat) => void; clear: () => void; onClose: () => void }) {
  const groups: [string, PoiCat[]][] = [['Ceļā', ['fuel', 'ev', 'parking', 'auto']], ['Ikdienā', ['shop', 'pharmacy', 'health', 'gov']]];
  return (
    <>
      <motion.div className="absolute inset-0 z-[25] bg-black/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <Sheet onClose={onClose} label="Kartes slāņi" z="z-[26]">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#2f7bff] text-white"><Layers className="h-5 w-5" /></span>
          <div className="flex-1">
            <h3 className="text-lg font-bold leading-tight">Kartes slāņi</h3>
            <p className="text-sm text-(--fg)/55">Izvēlies, ko rādīt kartē visā Latvijā</p>
          </div>
          <button onClick={onClose} aria-label="Aizvērt" className="grid h-10 w-10 place-items-center rounded-full bg-(--fg)/10"><X className="h-5 w-5" /></button>
        </div>
        {groups.map(([g, cats]) => (
          <div key={g}>
            <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-(--fg)/40">{g}</p>
            <div className="grid grid-cols-2 gap-2">
              {cats.map((c) => {
                const I = CAT_ICON[c];
                const active = on.has(c);
                return (
                  <button key={c} onClick={() => toggle(c)} aria-pressed={active} className={`flex items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[.98] ${active ? 'bg-[#2f7bff]/15 ring-2 ring-[#2f7bff]' : 'bg-(--fg)/[0.07] hover:bg-(--fg)/10'}`}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: POI_CATS[c].color }}>{loading.has(c) ? <Loader2 className="h-5 w-5 animate-spin" /> : <I className="h-5 w-5" />}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold leading-tight">{POI_CATS[c].label}</span>
                      <span className={`block truncate text-[11px] text-(--fg)/50`}>{counts[c] != null ? `${counts[c]} vietas` : POI_CATS[c].hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {on.has('fuel') && (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 rounded-2xl bg-(--fg)/[0.05] p-3 text-xs text-(--fg)/70">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#16a34a]" /> Degviela</span>
            <span className="flex items-center gap-1.5"><span className="grid h-4 w-4 place-items-center rounded-full bg-white text-[9px] font-black text-[#16a34a]">G</span> Ir arī gāze (LPG/CNG)</span>
          </div>
        )}
        {on.has('parking') && (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 rounded-2xl bg-(--fg)/[0.05] p-3 text-xs text-(--fg)/70">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#16a34a]" /> Bezmaksas</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#2563eb]" /> Maksas (€)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#64748b]" /> Nav zināms</span>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          {on.size > 0 && <button onClick={clear} className="h-12 flex-1 rounded-2xl bg-(--fg)/10 font-bold">Notīrīt</button>}
          <button onClick={onClose} className="h-12 flex-1 rounded-2xl bg-[#2f7bff] font-bold text-white">Gatavs</button>
        </div>
        <p className="mt-3 text-center text-[11px] text-(--fg)/35">Dati: © OpenStreetMap līdzautori · atjaunojam katru dienu</p>
      </Sheet>
    </>
  );
}

function PoiSheet({ p, pos, onClose, onGo }: { p: Poi; pos: Pos | null; onClose: () => void; onGo: () => void }) {
  const cat = POI_CATS[p.k] || POI_CATS.fuel;
  const I = CAT_ICON[p.k] || MapPin;
  const d = pos ? distance(pos.p, [p.lat, p.lng]) : null;
  const sub = SUB_LABEL[p.s] || cat.label;
  const fee = p.k === 'parking' ? (p.f === 'no' ? 'Bezmaksas' : p.f === 'yes' ? 'Maksas' : 'Maksa nav zināma') : '';
  const color = p.k === 'parking' ? (p.f === 'no' ? '#16a34a' : p.f === 'yes' ? '#2563eb' : '#64748b') : cat.color;
  return (
    <Sheet onClose={onClose} label={p.n}>
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-4 ring-(--fg)/10 text-white" style={{ background: color }}><I className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{sub}{p.b ? ` · ${p.b}` : ''}</p>
          <h3 className="mt-1 text-lg font-bold leading-snug">{p.n}</h3>
          {p.a && <p className="text-sm text-(--fg)/55">{p.a}</p>}
        </div>
        <button onClick={onClose} aria-label="Aizvērt" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-(--fg)/10"><X className="h-5 w-5" /></button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {fee && <Fact l="Maksa" v={fee} />}
        {d != null && <Fact l="Attālums" v={fmtDist(d)} />}
        {p.h && <Fact l="Darba laiks" v={<span className="text-sm">{hoursLabel(p.h)}</span>} />}
        {p.x && <Fact l={p.k === 'ev' ? 'Savienotāji' : p.k === 'fuel' ? 'Degviela' : 'Informācija'} v={<span className="text-sm">{p.x}</span>} />}
        {p.c ? <Fact l={p.k === 'ev' ? 'Uzlādes vietas' : 'Vietu skaits'} v={String(p.c)} /> : null}
      </div>
      <div className={`mt-4 grid gap-2 ${p.ph ? 'grid-cols-[1fr_auto]' : ''}`}>
        <button onClick={onGo} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#2f7bff] text-[17px] font-black text-white"><Navigation2 className="h-5 w-5 fill-white" /> Navigēt šeit</button>
        {p.ph && <a href={`tel:${p.ph.replace(/\s/g, '')}`} aria-label="Zvanīt" className="grid h-14 w-14 place-items-center rounded-2xl bg-(--fg)/10"><Phone className="h-5 w-5" /></a>}
      </div>
      <p className="mt-3 text-center text-[11px] text-(--fg)/35">Dati: © OpenStreetMap līdzautori · var nebūt pilnīgi</p>
    </Sheet>
  );
}

const lineLen = (g: LL[][]) => g.reduce((a, l) => a + l.slice(1).reduce((x, q, i) => x + distance(l[i], q), 0), 0);
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

function Fact({ l, v }: { l: string; v: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-(--fg)/[0.06] px-3.5 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-(--fg)/45">{l}</p>
      <p className="num mt-0.5 text-lg font-bold leading-tight">{v}</p>
    </div>
  );
}

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
  return (
    <>
      <motion.div className="absolute inset-0 z-[25]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <Sheet onClose={onClose} label={r.name} z="z-[26]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-(--fg)/10 text-white" style={{ background: k.color }} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: k.color }}>{k.short}{r.road ? ` · ${r.road}` : ''}{r.region ? ` · ${r.region}` : ''}</p>
            <h3 className="mt-1 text-lg font-bold leading-snug">{r.name}</h3>
          </div>
          {r.speed ? <SpeedSign v={r.speed} /> : null}
          <button onClick={onClose} aria-label="Aizvērt" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-(--fg)/10"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
          {d != null && <Fact l="Attālums" v={fmtDist(d)} />}
          {rel != null && <Fact l="Virziens" v={rel < 60 ? 'Priekšā' : rel > 120 ? 'Aizmugurē' : 'Sānis'} />}
          {eta != null && <Fact l="Būsi pēc" v={eta < 60 ? `${Math.round(eta)} s` : `${Math.round(eta / 60)} min`} />}
          {len != null && <Fact l="Posma garums" v={fmtDist(len)} />}
          {minTime != null && <Fact l={`Min. laiks ar ${r.speed}`} v={mmss(minTime)} />}
          {r.speed != null && <Fact l="Atļautais ātrums" v={`${r.speed} km/h`} />}
        </div>

        {r.kind === 'average' && (
          <p className="mt-4 rounded-2xl bg-[#f59e0b]/12 p-3.5 text-sm leading-relaxed text-(--t-amber)">
            Kameras posma sākumā un beigās aprēķina vidējo ātrumu. {minTime ? <>Ievērojot {r.speed} km/h, posmu nevajadzētu izbraukt ātrāk par <b>{mmss(minTime)}</b>.</> : 'Ievēro atļauto ātrumu visā posmā.'}
          </p>
        )}
        {r.kind === 'mobile' && <p className="mt-4 rounded-2xl bg-[#3b82f6]/12 p-3.5 text-sm leading-relaxed text-(--t-blue)">Valsts policijas publicēta vieta, kur <b>var</b> atrasties pārvietojamais fotoradars. Tas tur nav vienmēr.{r.approx ? ' Vieta kartē noteikta pēc adreses — aptuveni.' : ''}</p>}
        {r.note && <div className="mt-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-(--fg)/45">{r.kind === 'fixed' ? 'Kāpēc šeit ir radars' : 'Piezīme'}</p><p className="mt-1 text-sm leading-relaxed text-(--fg)/80">{r.note}</p></div>}
        {r.direction && <p className="mt-3 text-sm text-(--fg)/70">Kontroles virziens: <b className="text-(--fg)">{r.direction}</b></p>}

        <div className="mt-5 grid grid-cols-2 gap-2">
          {waze && <a href={waze} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#33ccff] font-bold text-[#0b1a22]">Waze</a>}
          {gm && <a href={gm} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white font-bold text-black">Google Maps</a>}
          <button onClick={onResume} className="flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#2f7bff] text-sm font-bold text-white"><LocateFixed className="h-5 w-5" /> Turpināt</button>
          <button onClick={share} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-(--fg)/10 font-bold">Kopīgot</button>
        </div>
        <p className="mt-4 text-center text-[11px] text-(--fg)/35">Avots: {r.source === 'csdd' ? 'CSDD' : r.source === 'vp' ? 'Valsts policija' : r.source === 'osm' ? 'OpenStreetMap' : 'Tavs Auto'} · informācija uzziņai</p>
      </Sheet>
    </>
  );
}

function Ctl({ onClick, label, children, on, tone }: { onClick: () => void; label: string; children: React.ReactNode; on?: boolean; tone?: string }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} aria-pressed={on} style={on && tone ? { background: tone } : undefined} className="grid h-12 w-12 place-items-center rounded-full bg-(--panel) shadow-xl backdrop-blur-xl transition active:scale-90">
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
