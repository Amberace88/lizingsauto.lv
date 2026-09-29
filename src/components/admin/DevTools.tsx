'use client';
import { useState } from 'react';
import { Loader2, ImageDown, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from './CarEditor';
import { useToast } from './Toast';

export function DevTools({ total, pending: initialPending, env }: { total: number; pending: number; env: Record<string, boolean> }) {
  const toast = useToast();
  const [pending, setPending] = useState(initialPending);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  async function migrate() {
    setRunning(true);
    setLog([]);
    let left = pending;
    let rounds = 0;
    while (left > 0 && rounds < 400) {
      rounds++;
      const res = await fetch('/api/admin/migrate-images', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(j.error || 'Kļūda', 'err');
        break;
      }
      left = j.remaining;
      setPending(left);
      if (j.errors?.length) setLog((l) => [...l, ...j.errors].slice(-30));
      if (j.done === 0 && j.errors?.length) break;
    }
    setRunning(false);
    toast(left === 0 ? 'Visas bildes pārceltas' : `Palika ${left} bildes`);
  }

  async function revalidate() {
    await fetch('/api/admin/revalidate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    toast('Lapas kešatmiņa atjaunota');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Bilžu pārcelšana no vecās lapas" hint="Kopē bildes no vecā WordPress uz Supabase Storage, samazina līdz 1600 px un pārvērš WEBP. Jāveic pirms domēna pārslēgšanas.">
        <p className="num text-3xl font-bold">{total - pending} / {total}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper"><div className="h-full bg-petrol transition-all" style={{ width: `${total ? ((total - pending) / total) * 100 : 0}%` }} /></div>
        <button onClick={migrate} disabled={running || pending === 0} className="btn btn-primary mt-4">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />} {pending === 0 ? 'Viss pārcelts' : `Pārcelt ${pending} bildes`}</button>
        {log.length > 0 && <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-paper p-3 text-xs">{log.join('\n')}</pre>}
      </Card>
      <Card title="Servera iestatījumi" hint="Slepenās vērtības glabājas Netlify vides mainīgajos.">
        <ul className="space-y-2 text-sm">
          {Object.entries(env).map(([k, v]) => (
            <li key={k} className="flex items-center justify-between"><span className="font-mono text-xs">{k}</span>{v ? <span className="flex items-center gap-1 font-semibold text-ok"><CheckCircle2 className="h-4 w-4" /> Pieslēgts</span> : <span className="flex items-center gap-1 text-mute"><XCircle className="h-4 w-4" /> Nav</span>}</li>
          ))}
        </ul>
        <button onClick={revalidate} className="btn btn-ghost mt-4"><RefreshCw className="h-4 w-4" /> Atjaunot visas lapas</button>
      </Card>
    </div>
  );
}
