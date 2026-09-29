'use client';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { BadgeChips, StatusRibbon } from './CarCard';

export function Gallery({ images, alt, badges, status }: { images: string[]; alt: string; badges: string[]; status: string }) {
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  const [dir, setDir] = useState(0);
  const n = images.length;
  const go = useCallback((d: number) => {
    setDir(d);
    setI((p) => (p + d + n) % n);
  }, [n]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'Escape') setFull(false);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [go]);

  useEffect(() => {
    document.body.style.overflow = full ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [full]);

  if (n === 0) return <div className="aspect-[4/3] rounded-2xl bg-line" />;

  const slide = (big: boolean) => (
    <AnimatePresence initial={false} custom={dir} mode="popLayout">
      <motion.div
        key={i}
        custom={dir}
        initial={{ x: dir > 0 ? '30%' : '-30%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: dir > 0 ? '-30%' : '30%', opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
        className="absolute inset-0"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) go(1);
          else if (info.offset.x > 60) go(-1);
        }}
      >
        <Image src={images[i]} alt={`${alt} — foto ${i + 1}`} fill priority={i === 0} sizes={big ? '100vw' : '(max-width:1024px) 100vw, 60vw'} className={big ? 'object-contain' : 'object-cover'} draggable={false} />
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-night">
        {slide(false)}
        <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[75%]">
          <BadgeChips badges={badges} max={6} size="md" />
        </div>
        <StatusRibbon status={status} />
        <button onClick={() => go(-1)} className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-card/90 shadow hover:bg-card" aria-label="Iepriekšējā bilde"><ChevronLeft /></button>
        <button onClick={() => go(1)} className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-card/90 shadow hover:bg-card" aria-label="Nākamā bilde"><ChevronRight /></button>
        <button onClick={() => setFull(true)} className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-night/70 px-3 py-1.5 text-sm font-semibold text-white hover:bg-night" aria-label="Pilnekrāna režīms">
          <Expand className="h-4 w-4" /> <span className="num">{i + 1}/{n}</span>
        </button>
      </div>
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {images.map((src, k) => (
          <button key={src} onClick={() => { setDir(k > i ? 1 : -1); setI(k); }} className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 transition ${k === i ? 'ring-signal' : 'ring-transparent opacity-70 hover:opacity-100'}`} aria-label={`Foto ${k + 1}`}>
            <Image src={src} alt="" fill sizes="96px" className="object-cover" />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {full && (
          <motion.div className="fixed inset-0 z-[60] bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="Bilžu galerija">
            <div className="absolute inset-0">{slide(true)}</div>
            <button onClick={() => setFull(false)} className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Aizvērt"><X /></button>
            <button onClick={() => go(-1)} className="absolute left-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Iepriekšējā"><ChevronLeft /></button>
            <button onClick={() => go(1)} className="absolute right-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Nākamā"><ChevronRight /></button>
            <p className="num absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm text-white">{i + 1} / {n}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
