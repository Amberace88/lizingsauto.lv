'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { LayoutDashboard, Car, Inbox, Settings, Share2, Users, History, Wrench, UserCircle, LogOut, Menu, X, ExternalLink, BarChart3, Radar } from 'lucide-react';
import { InstallButton } from '@/components/site/InstallApp';
import type { AdminProfile } from '@/lib/types';
import { Logo } from '@/components/site/Header';
import { ToastProvider } from './Toast';

export function AdminShell({ profile, newLeads, children }: { profile: AdminProfile; newLeads: number; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const dev = profile.role === 'developer';
  // Jauno pieteikumu skaits vienmēr aktuāls: atjaunojas uzreiz pēc pieteikuma atvēršanas/statusa maiņas,
  // pie jauna pieteikuma (reāllaikā), pārejot starp lapām, atgriežoties cilnē un ik pēc 30 s
  const [newCount, setNewCount] = useState(newLeads);
  useEffect(() => {
    const sb = supabaseBrowser();
    let alive = true;
    const refresh = async () => {
      const { count, error } = await sb.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new');
      if (alive && !error) setNewCount(count || 0);
    };
    refresh();
    const t = setInterval(refresh, 30000);
    const onFocus = () => document.visibilityState === 'visible' && refresh();
    window.addEventListener('leads:changed', refresh);
    document.addEventListener('visibilitychange', onFocus);
    const ch = sb.channel('leads-badge').on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => refresh()).subscribe();
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener('leads:changed', refresh);
      document.removeEventListener('visibilitychange', onFocus);
      sb.removeChannel(ch);
    };
  }, [path]);
  const nav = [
    { href: '/admin', label: 'Pārskats', icon: LayoutDashboard, exact: true },
    { href: '/admin/auto', label: 'Automašīnas', icon: Car },
    { href: '/admin/pieteikumi', label: 'Pieteikumi', icon: Inbox, badge: newCount },
    { href: '/admin/statistika', label: 'Statistika', icon: BarChart3 },
    { href: '/admin/fotoradari', label: 'Fotoradari', icon: Radar },
    { href: '/admin/portali', label: 'Portāli', icon: Share2 },
    { href: '/admin/iestatijumi', label: 'Lapas iestatījumi', icon: Settings },
    { href: '/admin/zurnals', label: 'Darbību žurnāls', icon: History },
    ...(dev ? [{ href: '/admin/admini', label: 'Administratori', icon: Users }, { href: '/admin/riki', label: 'Izstrādātāja rīki', icon: Wrench }] : []),
    { href: '/admin/profils', label: 'Mans profils', icon: UserCircle },
  ];
  const side = (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="px-5 py-5"><Logo light /></Link>
      <nav className="flex-1 space-y-0.5 px-3" aria-label="Admin navigācija">
        {nav.map((n) => {
          const active = n.exact ? path === n.href : path.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-white/12 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'}`}>
              <n.icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{n.label}</span>
              {n.badge ? <span className="num rounded-full bg-signal px-2 text-xs font-bold text-white">{n.badge}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="text-sm font-semibold text-white">{profile.full_name || profile.email}</p>
        <p className="text-xs text-white/50">{profile.admin_code} · {dev ? 'Izstrādātājs' : profile.role === 'admin' ? 'Administrators' : 'Redaktors'}</p>
        <div className="mt-3 flex gap-2">
          <a href="/" target="_blank" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/10 py-2 text-xs font-semibold text-white hover:bg-white/15"><ExternalLink className="h-3.5 w-3.5" /> Lapa</a>
          <form action="/api/admin/logout" method="post" className="flex-1">
            <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/10 py-2 text-xs font-semibold text-white hover:bg-white/15"><LogOut className="h-3.5 w-3.5" /> Iziet</button>
          </form>
        </div>
        <div className="mt-2"><InstallButton variant="admin" /></div>
      </div>
    </div>
  );
  return (
    <div className="lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-ink lg:block">{side}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-ink">{side}</aside>
        </div>
      )}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Izvēlne">{open ? <X /> : <Menu />}</button>
        <Logo ink className="h-8 w-auto" />
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><ToastProvider>{children}</ToastProvider></main>
    </div>
  );
}

export function AdminTitle({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display-md text-[1.9rem] text-ink">{title}</h1>
        {sub && <p className="mt-1 text-sm text-mute">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
