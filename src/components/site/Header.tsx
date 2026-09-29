'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, Phone, Heart } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFavorites } from './favorites';

const NAV = [
  { href: '/katalogs', label: 'Auto katalogs' },
  { href: '/lizings', label: 'Līzings' },
  { href: '/kalkulatori', label: 'Kalkulatori' },
  { href: '/pardot-auto', label: 'Pārdot auto' },
  { href: '/par-mums', label: 'Par mums' },
  { href: '/kontakti', label: 'Kontakti' },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="14" fill={light ? '#ffffff' : '#0f5a63'} />
        <path d="M14 42a18 18 0 0 1 36 0" fill="none" stroke="#f5b301" strokeWidth="6" strokeLinecap="round" />
        <path d="M32 42 41 27" stroke={light ? '#0f5a63' : '#fff'} strokeWidth="5" strokeLinecap="round" />
        <circle cx="32" cy="42" r="4.5" fill={light ? '#0f5a63' : '#fff'} />
      </svg>
      <span className={`display-md text-[1.3rem] leading-none ${light ? 'text-white' : 'text-ink'}`}>
        Līzings<span className={light ? 'text-signal' : 'text-petrol'}>Auto</span>
      </span>
    </span>
  );
}

export function Header({ phone }: { phone: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const path = usePathname();
  const { ids } = useFavorites();

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header className={`sticky top-0 z-40 transition-[background,box-shadow] ${scrolled ? 'bg-white/90 shadow-[0_1px_0_#dde2e6] backdrop-blur' : 'bg-paper'}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="LīzingsAuto — sākums">
          <Logo />
        </Link>
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Galvenā navigācija">
          {NAV.map((n) => {
            const active = path === n.href || path.startsWith(n.href + '/');
            return (
              <Link key={n.href} href={n.href} className={`rounded-lg px-3 py-2 text-[0.92rem] font-medium transition-colors ${active ? 'text-petrol' : 'text-ink-2 hover:text-ink'}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/izlase" className="relative rounded-lg p-2 text-ink-2 hover:text-ink" aria-label={`Izlase (${ids.length})`}>
            <Heart className="h-5 w-5" />
            {ids.length > 0 && (
              <span className="num absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-signal px-1 text-[10px] font-bold text-ink">{ids.length}</span>
            )}
          </Link>
          <a href={`tel:${phone.replace(/\s/g, '')}`} className="btn btn-primary hidden !py-2.5 sm:inline-flex">
            <Phone className="h-4 w-4" /> <span className="num">{phone}</span>
          </a>
          <button className="rounded-lg p-2 lg:hidden" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Izvēlne">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line bg-white lg:hidden"
            aria-label="Mobilā navigācija"
          >
            <div className="flex flex-col px-4 py-3">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="border-b border-line/70 py-3.5 text-lg font-semibold last:border-0">
                  {n.label}
                </Link>
              ))}
              <a href={`tel:${phone.replace(/\s/g, '')}`} className="btn btn-primary mt-3">
                <Phone className="h-4 w-4" /> Zvanīt {phone}
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
