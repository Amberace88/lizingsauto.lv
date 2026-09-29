'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Cake, ChevronRight, Search } from 'lucide-react';
import { MONTHS, NAMEDAYS, dayLabel, rigaDay, slugName } from '@/lib/namedays';

/** Plāna josla lapas augšā: šodienas vārda dienas (Rīgas laikā, atjaunojas pati pusnaktī). */
export function NameDayBar() {
  const [day, setDay] = useState(() => rigaDay());
  useEffect(() => {
    const tick = () => setDay(rigaDay());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  const names = NAMEDAYS[day.key] || [];
  const tomorrow = NAMEDAYS[rigaDay(1).key] || [];
  return (
    <div className="border-b border-white/10 bg-night text-white">
      <Link href="/vardadienas" className="group mx-auto flex h-9 max-w-7xl items-center gap-2 overflow-hidden px-4 text-[13px] sm:px-6" suppressHydrationWarning>
        <span className="relative grid h-5 w-5 shrink-0 place-items-center rounded-full bg-signal">
          <Cake className="h-3 w-3" />
          <span className="absolute inset-0 animate-ping rounded-full bg-signal/60 [animation-duration:2.5s]" />
        </span>
        <span className="shrink-0 font-semibold text-white/60" suppressHydrationWarning>{dayLabel(day.key)}</span>
        <span className="truncate" suppressHydrationWarning>
          {names.length ? <>Vārda dienu svin <b className="text-white">{names.join(', ')}</b></> : 'Šodien vārda dienu nesvin neviens'}
          {tomorrow.length > 0 && <span className="hidden text-white/50 md:inline"> · rīt {tomorrow.join(', ')}</span>}
        </span>
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white" />
      </Link>
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
