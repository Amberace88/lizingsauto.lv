'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Mail } from 'lucide-react';
import { Logo } from '@/components/site/Header';

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: 'err' | 'ok'; m: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch(mode === 'password' ? '/api/admin/login' : '/api/admin/magic', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, password }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ t: 'err', m: j.error || 'Neizdevās pieslēgties' });
    if (mode === 'link') return setMsg({ t: 'ok', m: j.message });
    router.replace('/admin');
    router.refresh();
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo ink /></div>
        <form onSubmit={submit} className="rounded-2xl bg-white p-7 shadow-[var(--shadow-lift)]">
          <h1 className="display-md text-2xl text-ink">Admin panelis</h1>
          <p className="mt-1 text-sm text-mute">{mode === 'password' ? 'Pieslēdzies ar savu admin ID.' : 'Nosūtīsim pieslēgšanās saiti uz admina e-pastu.'}</p>
          <label className="mt-6 block">
            <span className="label">Admin ID</span>
            <input className="field uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="LA-001" autoComplete="username" required autoFocus />
          </label>
          {mode === 'password' && (
            <label className="mt-4 block">
              <span className="label">Parole</span>
              <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </label>
          )}
          {msg && <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${msg.t === 'err' ? 'bg-bad/10 text-bad' : 'bg-ok/10 text-ok'}`} role="alert">{msg.m}</p>}
          <button className="btn btn-primary mt-6 w-full" disabled={busy}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === 'password' ? <><Lock className="h-4 w-4" /> Pieslēgties</> : <><Mail className="h-4 w-4" /> Sūtīt saiti</>}
          </button>
          <button type="button" onClick={() => { setMode(mode === 'password' ? 'link' : 'password'); setMsg(null); }} className="mt-4 w-full text-center text-sm font-medium text-petrol hover:underline">
            {mode === 'password' ? 'Pirmā pieslēgšanās vai aizmirsi paroli?' : 'Atpakaļ uz paroli'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-mute">Piekļuve tikai pilnvarotiem administratoriem. Darbības tiek reģistrētas.</p>
      </div>
    </div>
  );
}
