'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { LayoutDashboard, Pencil, ShieldCheck } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';

// Rediģēšanas logs tiek ielādēts tikai adminiem — parastajiem apmeklētājiem šis kods netiek lejupielādēts.
const QuickEdit = dynamic(() => import('./AdminQuickEdit').then((m) => m.AdminQuickEdit), { ssr: false });

type AdminCtx = { admin: { role: string; name: string | null } | null; edit: (id: string) => void };
const Ctx = createContext<AdminCtx>({ admin: null, edit: () => {} });
export const useAdmin = () => useContext(Ctx);

/** Ja pārlūkā ir aktīva admina sesija, publiskajā lapā parādās rediģēšanas iespējas. Tiesības pārbauda arī datubāze (RLS). */
export function AdminLiveProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminCtx['admin']>(null);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return;
        const { data } = await sb.from('admins').select('role,full_name,active').eq('user_id', session.user.id).maybeSingle();
        if (alive && data?.active) setAdmin({ role: data.role, name: data.full_name });
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  const edit = useCallback((id: string) => setEditing(id), []);

  return (
    <Ctx.Provider value={{ admin, edit }}>
      {children}
      {admin && (
        <div className="fixed bottom-4 left-4 z-40 flex items-center gap-1 rounded-full border border-line bg-card/95 p-1 pl-3 text-sm shadow-[var(--shadow-lift)] backdrop-blur">
          <span className="flex items-center gap-1.5 font-semibold text-ink"><ShieldCheck className="h-4 w-4 text-ok" /> Admina režīms</span>
          <Link href="/admin" className="ml-1 flex items-center gap-1 rounded-full px-3 py-1.5 font-semibold text-ink-2 hover:bg-paper hover:text-ink"><LayoutDashboard className="h-4 w-4" /> Panelis</Link>
        </div>
      )}
      {admin && editing && <QuickEdit id={editing} onClose={() => setEditing(null)} />}
    </Ctx.Provider>
  );
}

/** Poga auto lapā — redzama tikai adminam. */
export function AdminEditButton({ id }: { id: string }) {
  const { admin, edit } = useAdmin();
  if (!admin) return null;
  return (
    <button type="button" onClick={() => edit(id)} className="btn btn-signal !px-3 !py-2 text-sm">
      <Pencil className="h-4 w-4" /> Rediģēt auto
    </button>
  );
}

/** Zīmulis uz kataloga kartītes — redzams tikai adminam. */
export function AdminCardEdit({ id }: { id: string }) {
  const { admin, edit } = useAdmin();
  if (!admin) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        edit(id);
      }}
      className="absolute right-3 top-16 z-20 grid h-10 w-10 place-items-center rounded-full bg-signal text-white shadow-md transition hover:scale-105"
      aria-label="Rediģēt auto"
      title="Rediģēt auto"
    >
      <Pencil className="h-4 w-4" />
    </button>
  );
}
