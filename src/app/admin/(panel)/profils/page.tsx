'use client';
import { useEffect, useState } from 'react';
import { Loader2, KeyRound, Save } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { AdminTitle } from '@/components/admin/AdminShell';
import { Card } from '@/components/admin/CarEditor';
import { useToast } from '@/components/admin/Toast';

export default function ProfilePage() {
  const sb = supabaseBrowser();
  const toast = useToast();
  const [me, setMe] = useState<{ user_id: string; admin_code: string; email: string; full_name: string | null; phone: string | null; role: string } | null>(null);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      const { data } = await sb.from('admins').select('*').eq('user_id', user?.id).single();
      setMe(data);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile() {
    const { error } = await sb.from('admins').update({ full_name: me!.full_name, phone: me!.phone }).eq('user_id', me!.user_id);
    if (error) return toast(error.message, 'err');
    toast('Profils saglabāts');
  }
  async function changePw() {
    if (pw.length < 10) return toast('Parolei jābūt vismaz 10 simbolus garai', 'err');
    if (!/[A-Za-zĀ-ž]/.test(pw) || !/\d/.test(pw)) return toast('Parolē jābūt gan burtiem, gan cipariem', 'err');
    if (pw !== pw2) return toast('Paroles nesakrīt', 'err');
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast(error.message, 'err');
    setPw('');
    setPw2('');
    toast('Parole nomainīta');
  }

  if (!me) return <div className="grid place-items-center p-20"><Loader2 className="h-6 w-6 animate-spin text-mute" /></div>;
  return (
    <>
      <AdminTitle title="Mans profils" sub={`Admin ID: ${me.admin_code} · ${me.email}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Informācija">
          <label className="block"><span className="label">Vārds</span><input className="field" value={me.full_name || ''} onChange={(e) => setMe({ ...me, full_name: e.target.value })} /></label>
          <label className="mt-3 block"><span className="label">Tālrunis</span><input className="field" value={me.phone || ''} onChange={(e) => setMe({ ...me, phone: e.target.value })} /></label>
          <button onClick={saveProfile} className="btn btn-primary mt-4"><Save className="h-4 w-4" /> Saglabāt</button>
        </Card>
        <Card title="Parole" hint="Ja pieslēdzies pirmo reizi ar saiti — uzstādi paroli šeit. Vismaz 10 simboli, burti un cipari.">
          <label className="block"><span className="label">Jaunā parole</span><input type="password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label>
          <label className="mt-3 block"><span className="label">Atkārto paroli</span><input type="password" className="field" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></label>
          <button onClick={changePw} className="btn btn-primary mt-4" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Nomainīt paroli</button>
        </Card>
      </div>
    </>
  );
}
