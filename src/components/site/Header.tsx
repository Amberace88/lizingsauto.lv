'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, Phone, Heart } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFavorites } from './favorites';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { href: '/katalogs', label: 'Auto katalogs' },
  { href: '/lizings', label: 'Līzings' },
  { href: '/elektroauto', label: 'Elektroauto' },
  { href: '/garantija', label: 'Garantija' },
  { href: '/kalkulatori', label: 'Kalkulatori' },
  { href: '/pardot-auto', label: 'Pārdot auto' },
  { href: '/kontakti', label: 'Kontakti' },
];

/* eslint-disable @next/next/no-img-element */
export function Logo({ light = false, className = 'h-9 w-auto sm:h-10' }: { light?: boolean; className?: string }) {
  if (light) return <img src="/logo-tavs-auto-white.png" alt="Tavs Auto — lizingsauto.lv" width={461} height={123} className={className} />;
  return (
    <>
      <img src="/logo-tavs-auto.png" alt="Tavs Auto — lizingsauto.lv" width={461} height={123} className={`${className} dark:hidden`} />
      <img src="/logo-tavs-auto-white.png" alt="Tavs Auto — lizingsauto.lv" width={461} height={123} className={`${className} hidden dark:block`} />
    </>
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
    <header className={`sticky top-0 z-40 transition-[background,box-shadow] ${scrolled ? 'bg-card/90 shadow-[0_1px_0_var(--color-line)] backdrop-blur' : 'bg-paper'}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Tavs Auto — sākums">
          <Logo />
        </Link>
        <nav className="ml-2 hidden items-center gap-0.5 xl:flex" aria-label="Galvenā navigācija">
          {NAV.map((n) => {
            const active = path === n.href || path.startsWith(n.href + '/');
            return (
              <Link key={n.href} href={n.href} className={`rounded-lg px-2.5 py-2 text-[0.9rem] font-semibold transition-colors ${active ? 'text-petrol' : 'text-ink-2 hover:text-ink'}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link href="/izlase" className="relative rounded-lg p-2 text-ink-2 hover:text-ink" aria-label={`Izlase (${ids.length})`}>
            <Heart className="h-5 w-5" />
            {ids.length > 0 && (
              <span className="num absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-signal px-1 text-[10px] font-bold text-white">{ids.length}</span>
            )}
          </Link>
          <a href={`tel:${phone.replace(/\s/g, '')}`} className="btn btn-signal hidden !py-2.5 lg:inline-flex">
            <Phone className="h-4 w-4" /> <span className="num">{phone}</span>
          </a>
          <button className="rounded-lg p-2 xl:hidden" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Izvēlne">
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
            className="overflow-hidden border-t border-line bg-card xl:hidden"
            aria-label="Mobilā navigācija"
          >
            <div className="flex flex-col px-4 py-3">
              {[...NAV, { href: '/parbaudes', label: 'Bezmaksas OCTA pārbaude' }].map((n) => (
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
