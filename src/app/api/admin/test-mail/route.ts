import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/admin-guard';
import { getPublicCars, getSettings } from '@/lib/data';
import { leadConfirmation, leadNotification, mailConfigured, notifyRecipients, sendMail } from '@/lib/mail';

// Nosūta paraugpaziņojumu uz uzņēmuma e-pastu (un klienta apstiprinājuma paraugu, ja domēns apstiprināts)
export async function POST() {
  const ctx = await requireAdmin({ api: true });
  if (!ctx) return NextResponse.json({ error: 'Nav piekļuves' }, { status: 401 });
  if (!mailConfigured()) return NextResponse.json({ error: 'E-pasts nav pieslēgts: Netlify vidē nav RESEND_API_KEY.' }, { status: 400 });
  const [{ company }, cars] = await Promise.all([getSettings(), getPublicCars()]);
  const car = cars[0] || null;
  const to = notifyRecipients(company);
  const lead = { type: 'leasing', name: 'Testa Klients', phone: company.phone, email: to[0], message: 'Šis ir testa pieteikums no admin paneļa, lai pārbaudītu e-pasta izskatu.', data: { down: 0, term: 72, monthly: 199, page: '/katalogs' } };
  const n = leadNotification(lead, car, company);
  const c = leadConfirmation(lead, car, company);
  const res = await Promise.all([...to.map((t) => sendMail({ to: t, ...n, subject: `[TESTS] ${n.subject}` })), ...(c ? [sendMail({ to: to[0], ...c, subject: `[TESTS] ${c.subject}` })] : [])]);
  const bad = res.find((r) => !r.ok);
  if (bad) return NextResponse.json({ error: bad.error }, { status: 502 });
  return NextResponse.json({ ok: true, to, customerCopy: !!c });
}
