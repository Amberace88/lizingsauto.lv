'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cake, CalendarDays, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Moon, PartyPopper, Search, Snowflake, Sun } from 'lucide-react';
import { holidayInfo, tyreInfo } from '@/lib/holidays';
import { useTrackUse } from '@/lib/track';
import { MONTHS, NAMEDAYS, dayLabel, rigaDay, slugName } from '@/lib/namedays';

type Wx = { t: number; feels: number; code: number; wind: number; day: boolean; max: number; min: number };

function wxInfo(code: number, day: boolean): { I: typeof Sun; label: string } {
  if (code === 0) return { I: day ? Sun : Moon, label: 'Skaidrs' };
  if (code <= 2) return { I: day ? CloudSun : CloudMoon, label: 'Mākoņains ar skaidrību' };
  if (code === 3) return { I: Cloud, label: 'Apmācies' };
  if (code === 45 || code === 48) return { I: CloudFog, label: 'Migla' };
  if (code >= 51 && code <= 57) return { I: CloudDrizzle, label: 'Smidzina' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { I: CloudRain, label: 'Lietus' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { I: CloudSnow, label: 'Sniegs' };
  if (code >= 95) return { I: CloudLightning, label: 'Pērkona negaiss' };
  return { I: Cloud, label: 'Mākoņains' };
}

/** Plāna informatīvā josla lapas augšā: vārda dienas, svētki, ziemas riepas un laikapstākļi Rīgā. */
export function NameDayBar() {
  const [day, setDay] = useState(() => rigaDay());
  const [wx, setWx] = useState<Wx | null>(null);
  const [slot, setSlot] = useState(0);
  useEffect(() => {
    const tick = () => setDay(rigaDay());
    tick();
    const id = setInterval(tick, 60_000);
    const load = () => fetch('/api/weather').then((r) => (r.ok ? r.json() : null)).then((j) => j && !j.error && setWx(j)).catch(() => {});
    load();
    const w = setInterval(load, 15 * 60_000);
    const rot = setInterval(() => setSlot((x) => x + 1), 5000);
    return () => {
      clearInterval(id);
      clearInterval(w);
      clearInterval(rot);
    };
  }, []);
  const names = NAMEDAYS[day.key] || [];
  const tomorrow = NAMEDAYS[rigaDay(1).key] || [];
  const hol = holidayInfo(day);
  const tyre = tyreInfo(day);
  const W = wx ? wxInfo(wx.code, wx.day) : null;
  const icy = wx && wx.min <= 1;

  const items: { key: string; node: React.ReactNode; href?: string; mobile?: boolean }[] = [
    {
      key: 'names',
      href: '/vardadienas',
      node: (
        <>
          <span className="relative grid h-5 w-5 shrink-0 place-items-center rounded-full bg-signal"><Cake className="h-3 w-3" /><span className="absolute inset-0 animate-ping rounded-full bg-signal/60 [animation-duration:2.5s]" /></span>
          <span className="shrink-0 font-semibold text-white/60">{dayLabel(day.key)}</span>
          <span className="truncate">{names.length ? <>Vārda dienu svin <b className="text-white">{names.join(', ')}</b></> : 'Šodien vārda dienu nesvin neviens'}{tomorrow.length > 0 && <span className="hidden text-white/50 xl:inline"> · rīt {tomorrow.join(', ')}</span>}</span>
        </>
      ),
    },
    tomorrow.length ? { key: 'tom', mobile: true, href: '/vardadienas', node: <><Cake className="h-4 w-4 shrink-0 text-white/50" /><span className="truncate"><span className="text-white/60">Rīt svin</span> <b className="text-white">{tomorrow.join(', ')}</b></span></> } : null,
    hol.today.length
      ? { key: 'hol', href: '/vardadienas#svetki', node: <><PartyPopper className="h-4 w-4 shrink-0 text-signal" /><span className="truncate">Šodien: <b className="text-white">{hol.today.map((h) => h.name).join(', ')}</b></span></> }
      : hol.next
        ? { key: 'hol', href: '/vardadienas#svetki', node: <><CalendarDays className="h-4 w-4 shrink-0 text-signal" /><span className="truncate">{hol.next.in === 1 ? 'Rīt' : `Pēc ${hol.next.in} d.`}: <b className="text-white">{hol.next.name}</b>{hol.nextOff && hol.nextOff.date !== hol.next.date && <span className="text-white/50"> · brīvdiena pēc {hol.nextOff.in} d.</span>}</span></> }
        : null,
    tyre ? { key: 'tyre', node: <><Snowflake className="h-4 w-4 shrink-0 text-sky-300" /><span className="truncate">{tyre.text}{tyre.sub && <span className="text-white/50"> · {tyre.sub}</span>}</span></> } : null,
  ].filter(Boolean) as { key: string; node: React.ReactNode; href?: string; mobile?: boolean }[];
  const cur = items[slot % items.length];
  const Item = ({ it, className = '' }: { it: (typeof items)[number]; className?: string }) =>
    it.href ? <Link href={it.href} className={`flex min-w-0 items-center gap-2 hover:text-white ${className}`}>{it.node}</Link> : <span className={`flex min-w-0 items-center gap-2 ${className}`}>{it.node}</span>;

  return (
    <div className="border-b border-white/10 bg-night text-[13px] text-white/85" suppressHydrationWarning>
      <div className="mx-auto flex h-9 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Plašiem ekrāniem — viss vienā rindā */}
        <div className="hidden min-w-0 flex-1 items-center gap-5 xl:flex">
          {items.filter((it) => !it.mobile).map((it, i) => (
            <span key={it.key} className="flex min-w-0 items-center gap-5">
              {i > 0 && <span className="h-4 w-px shrink-0 bg-white/15" />}
              <Item it={it} />
            </span>
          ))}
        </div>
        {/* Mazākiem ekrāniem — mainās pa vienam */}
        <div className="relative h-9 min-w-0 flex-1 overflow-hidden xl:hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={cur.key} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 flex items-center">
              <Item it={cur} />
            </motion.div>
          </AnimatePresence>
        </div>
        {W && wx && (
          <span className="flex shrink-0 items-center gap-1.5" title={`${W.label}, jūtas kā ${wx.feels}°, vējš ${wx.wind} m/s`}>
            <W.I className="h-4 w-4 text-white/80" />
            <span className="hidden text-white/60 sm:inline">Rīgā</span>
            <b className="num text-white">{wx.t > 0 ? '+' : ''}{wx.t}°</b>
            <span className="num hidden text-white/50 md:inline">{wx.min}°…{wx.max}°</span>
            {icy && <span className="hidden items-center gap-1 rounded-full bg-sky-400/15 px-2 py-0.5 text-[11px] font-semibold text-sky-200 lg:flex"><Snowflake className="h-3 w-3" /> Iespējams slidens</span>}
          </span>
        )}
      </div>
    </div>
  );
}

/** Šodienas kartīte ar animētiem vārdiem + rīt/parīt. */
export function NameDayHero() {
  const [base, setBase] = useState<Date | null>(null);
  useEffect(() => setBase(new Date()), []);
  const days = useMemo(() => [0, 1, 2].map((o) => rigaDay(o, base || new Date())), [base]);
  const t = days[0];
  const weekday = new Intl.DateTimeFormat('lv-LV', { weekday: 'long', timeZone: 'Europe/Riga' }).format(base || new Date());
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]" suppressHydrationWarning>
      <div className="relative overflow-hidden rounded-[28px] bg-night p-7 text-white sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-signal/30 blur-3xl" />
        <div className="relative flex items-end gap-4">
          <span className="num display text-7xl leading-none sm:text-8xl" suppressHydrationWarning>{t.d}</span>
          <span className="pb-2 leading-tight">
            <span className="block text-lg font-bold" suppressHydrationWarning>{MONTHS[t.m - 1]}</span>
            <span className="block text-sm capitalize text-white/60" suppressHydrationWarning>{weekday}</span>
          </span>
        </div>
        <p className="relative mt-6 text-sm font-semibold uppercase tracking-wider text-signal">Šodien vārda dienu svin</p>
        <div className="relative mt-3 flex flex-wrap gap-2" key={t.key}>
          {(NAMEDAYS[t.key] || []).map((n, i) => (
            <motion.span key={n} initial={{ opacity: 0, y: 14, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.08 * i, type: 'spring', stiffness: 260, damping: 18 }}>
              <Link href={`/vardadienas/${slugName(n)}`} className="display-md inline-block rounded-2xl bg-white/10 px-4 py-2 text-2xl transition hover:bg-signal sm:text-3xl">{n}</Link>
            </motion.span>
          ))}
          {!(NAMEDAYS[t.key] || []).length && <span className="text-xl text-white/70">Šodien kalendārā nav vārdu.</span>}
        </div>
      </div>
      <div className="grid gap-4">
        {days.slice(1).map((d, i) => (
          <div key={d.key} className="rounded-[24px] border border-line bg-card p-6">
            <p className="text-sm font-semibold text-mute" suppressHydrationWarning>{i === 0 ? 'Rīt' : 'Parīt'} · {dayLabel(d.key)}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {(NAMEDAYS[d.key] || []).map((n) => <Link key={n} href={`/vardadienas/${slugName(n)}`} className="text-lg font-bold text-ink hover:text-signal">{n}</Link>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Meklēšana pēc vārda (pilnais saraksts tiek padots no servera). */
export function NameSearch({ index }: { index: [string, string, string[]][] }) {
  const [q, setQ] = useState('');
  useTrackUse('Vārda dienu meklēšana', [q.length >= 2]);
  const res = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const norm = (x: string) => slugName(x);
    const ns = norm(s);
    return index.filter(([name]) => name.toLowerCase().startsWith(s) || norm(name).startsWith(ns)).slice(0, 12);
  }, [q, index]);
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-mute" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Meklē vārdu, piem., Anna, Jānis, Miķelis" className="field !h-14 !pl-12 !text-lg" aria-label="Meklēt vārdu" />
      {res.length > 0 && (
        <ul className="absolute inset-x-0 top-16 z-20 overflow-hidden rounded-2xl border border-line bg-card shadow-[var(--shadow-lift)]">
          {res.map(([name, slug, days]) => (
            <li key={slug}>
              <Link href={`/vardadienas/${slug}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper">
                <span className="font-semibold text-ink">{name}</span>
                <span className="num text-sm text-mute">{days.map(dayLabel).join(', ')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && res.length === 0 && <p className="mt-2 text-sm text-mute">Šāds vārds kalendārā nav atrasts.</p>}
    </div>
  );
}

/** Dienas līdz nākamajai vārda dienai. */
export function NameCountdown({ day }: { day: string }) {
  const [txt, setTxt] = useState<string | null>(null);
  useEffect(() => {
    const t = rigaDay();
    const [m, d] = day.split('-').map(Number);
    const today = Date.UTC(t.y, t.m - 1, t.d);
    let next = Date.UTC(t.y, m - 1, d);
    if (next < today) next = Date.UTC(t.y + 1, m - 1, d);
    const n = Math.round((next - today) / 864e5);
    setTxt(n === 0 ? 'Vārda diena ir šodien! 🎉' : n === 1 ? 'Vārda diena ir rīt' : `Līdz vārda dienai ${n} dienas`);
  }, [day]);
  if (!txt) return null;
  return <p className="inline-flex items-center gap-2 rounded-full bg-signal-soft px-4 py-1.5 text-sm font-bold text-signal">{txt}</p>;
}
