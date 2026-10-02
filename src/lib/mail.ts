// E-pasti caur Resend (https://resend.com). Atslēga tikai Netlify vidē: RESEND_API_KEY.
// MAIL_FROM — sūtītājs no apstiprināta domēna, piem. "Tavs Auto <pieteikumi@tavsauto.eu>".
// Kamēr domēns nav apstiprināts, sūtām no onboarding@resend.dev (Resend to atļauj tikai uz konta e-pastu).
import type { Car, CompanySettings } from './types';
import { SITE_URL, SITE_HOST, carName, carUrl, coverImage, km, money, FUEL_LABEL, GEAR_LABEL } from './format';
import { FIELD_LABEL, LEAD_TYPE_LABEL } from './lead-labels';

const RED = '#d91d2b';
const INK = '#111214';
const MUTE = '#6b7079';
const LINE = '#e6e8ec';
const PAPER = '#f4f5f7';

export const mailConfigured = () => !!process.env.RESEND_API_KEY;
const domainVerified = () => !!process.env.MAIL_FROM;
const FROM = () => process.env.MAIL_FROM || 'Tavs Auto <onboarding@resend.dev>';

export async function sendMail(m: { to: string | string[]; subject: string; html: string; text: string; replyTo?: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: 'RESEND_API_KEY nav iestatīts' };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM(), to: Array.isArray(m.to) ? m.to : [m.to], subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo || undefined }),
      signal: ctrl.signal,
    });
    if (!r.ok) return { ok: false, error: `${r.status} ${(await r.text()).slice(0, 300)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'fetch' };
  } finally {
    clearTimeout(t);
  }
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const nl2br = (s: string) => esc(s).replace(/\n/g, '<br>');
const telHref = (p: string) => `tel:${p.replace(/[^+0-9]/g, '')}`;
const waHref = (p: string, text = '') => {
  let n = p.replace(/[^0-9]/g, '');
  if (n.length === 8) n = `371${n}`;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

function button(href: string, label: string, primary = true) {
  return `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 20px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;${primary ? `background:${RED};color:#ffffff;` : `background:#ffffff;color:${INK};border:1px solid ${LINE};`}">${esc(label)}</a>`;
}

/** Kopējais rāmis: tumša galvene ar logo, balta kartīte, kājene ar uzņēmuma datiem. */
function layout(o: { preheader: string; title: string; body: string; company: CompanySettings; note?: string }) {
  const c = o.company;
  return `<!doctype html><html lang="lv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
  <tr><td style="background:${INK};border-radius:16px 16px 0 0;padding:22px 28px;border-bottom:3px solid ${RED};">
    <a href="${SITE_URL}" style="text-decoration:none"><img src="${SITE_URL}/logo-tavs-auto-white.png" width="150" height="40" alt="Tavs Auto" style="display:block;border:0;height:40px;width:auto;"></a>
  </td></tr>
  <tr><td style="background:#ffffff;padding:28px;border-radius:0 0 16px 16px;">
    <h1 style="margin:0 0 6px;font-size:22px;line-height:1.3;color:${INK};">${esc(o.title)}</h1>
    ${o.body}
  </td></tr>
  <tr><td style="padding:20px 12px;text-align:center;font-size:12px;line-height:1.6;color:${MUTE};">
    <b style="color:${INK}">${esc(c.brand || 'Tavs Auto')}</b> · ${esc(c.name)} · Reģ. nr. ${esc(c.regNr)}<br>
    ${esc(c.address)} · <a href="${telHref(c.phone)}" style="color:${MUTE}">${esc(c.phone)}</a> · <a href="mailto:${esc(c.email)}" style="color:${MUTE}">${esc(c.email)}</a><br>
    <a href="${SITE_URL}" style="color:${RED};text-decoration:none;font-weight:600">${esc(SITE_HOST)}</a>${o.note ? `<br><span style="font-size:11px">${esc(o.note)}</span>` : ''}
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function carBlock(car: Car) {
  const img = coverImage(car);
  const facts = [car.year, car.mileage != null ? km(car.mileage) : null, car.fuel ? FUEL_LABEL[car.fuel] : null, car.transmission ? GEAR_LABEL[car.transmission] : null].filter(Boolean).join(' · ');
  const url = `${SITE_URL}${carUrl(car)}`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid ${LINE};border-radius:14px;overflow:hidden;">
<tr>${img ? `<td width="170" style="width:170px;padding:0;vertical-align:top;"><a href="${esc(url)}"><img src="${esc(img)}" width="170" alt="" style="display:block;width:170px;height:118px;object-fit:cover;border:0;"></a></td>` : ''}
<td style="padding:14px 16px;vertical-align:top;">
  <a href="${esc(url)}" style="font-size:16px;font-weight:700;color:${INK};text-decoration:none;">${esc(carName(car))}</a>
  <div style="font-size:13px;color:${MUTE};margin-top:4px;">${esc(facts)}</div>
  <div style="font-size:18px;font-weight:800;color:${RED};margin-top:8px;">${esc(money(car.price))}</div>
</td></tr></table>`;
}

function rows(items: [string, string][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;border-collapse:collapse;font-size:14px;">${items
    .map(([k, v], i) => `<tr><td style="padding:9px 12px;color:${MUTE};width:42%;vertical-align:top;${i ? `border-top:1px solid ${LINE};` : ''}">${esc(k)}</td><td style="padding:9px 12px;font-weight:600;vertical-align:top;${i ? `border-top:1px solid ${LINE};` : ''}">${v}</td></tr>`)
    .join('')}</table>`;
}

export type MailLead = {
  type: string; // faktiskais veids (arī alert/valuation)
  name: string;
  phone: string;
  email?: string | null;
  message?: string | null;
  data: Record<string, string | number | boolean>;
};

/** Paziņojums uzņēmumam par jaunu pieteikumu. */
export function leadNotification(lead: MailLead, car: Car | null, company: CompanySettings) {
  const kind = LEAD_TYPE_LABEL[lead.type] || lead.type;
  const when = new Date().toLocaleString('lv-LV', { timeZone: 'Europe/Riga', dateStyle: 'medium', timeStyle: 'short' });
  const contact: [string, string][] = [
    ['Vārds', esc(lead.name)],
    ['Tālrunis', `<a href="${telHref(lead.phone)}" style="color:${RED};text-decoration:none">${esc(lead.phone)}</a>`],
  ];
  if (lead.email) contact.push(['E-pasts', `<a href="mailto:${esc(lead.email)}" style="color:${RED};text-decoration:none">${esc(lead.email)}</a>`]);
  const extra = Object.entries(lead.data)
    .filter(([k, v]) => !['ip_hash', 'kind', 'car'].includes(k) && v !== '' && v != null)
    .map(([k, v]) => [FIELD_LABEL[k] || k, k === 'page' ? `<a href="${SITE_URL}${esc(v)}" style="color:${INK}">${esc(v)}</a>` : esc(typeof v === 'boolean' ? (v ? 'Jā' : 'Nē') : v)] as [string, string]);
  const body = `
    <p style="margin:0 0 4px;font-size:14px;color:${MUTE};">${esc(when)} · no lapas ${esc(SITE_HOST)}</p>
    <span style="display:inline-block;margin-top:10px;padding:5px 12px;border-radius:999px;background:#fdecee;color:${RED};font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;">${esc(kind)}</span>
    ${rows(contact)}
    ${car ? carBlock(car) : lead.data.car ? `<p style="font-size:14px;margin:12px 0"><b>Auto:</b> ${esc(lead.data.car)}</p>` : ''}
    ${lead.message ? `<div style="margin:14px 0;padding:14px 16px;background:${PAPER};border-radius:12px;font-size:14px;line-height:1.55;"><div style="font-size:12px;color:${MUTE};margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Ziņa</div>${nl2br(lead.message)}</div>` : ''}
    ${extra.length ? `<div style="margin-top:18px;font-size:12px;color:${MUTE};font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Papildu informācija</div>${rows(extra)}` : ''}
    <div style="margin-top:20px;">
      ${button(telHref(lead.phone), `Zvanīt ${lead.phone}`)}
      ${button(waHref(lead.phone, `Labdien, ${lead.name}! Rakstām no Tavs Auto par jūsu pieteikumu.`), 'WhatsApp', false)}
      ${button(`${SITE_URL}/admin/pieteikumi`, 'Atvērt admin panelī', false)}
    </div>`;
  const subject = `Jauns pieteikums: ${kind} — ${lead.name}${car ? ` · ${carName(car)} ${car.year ?? ''}`.trimEnd() : ''}`;
  const text = [
    `Jauns pieteikums (${kind}) — ${when}`,
    `Vārds: ${lead.name}`,
    `Tālrunis: ${lead.phone}`,
    lead.email ? `E-pasts: ${lead.email}` : '',
    car ? `Auto: ${carName(car)} ${car.year ?? ''} — ${money(car.price)} — ${SITE_URL}${carUrl(car)}` : '',
    lead.message ? `\nZiņa:\n${lead.message}` : '',
    extra.length ? `\n${extra.map(([k, v]) => `${k}: ${v.replace(/<[^>]+>/g, '')}`).join('\n')}` : '',
    `\nAdmin panelis: ${SITE_URL}/admin/pieteikumi`,
  ]
    .filter(Boolean)
    .join('\n');
  return { subject, text, html: layout({ preheader: `${lead.name}, ${lead.phone}${car ? ` — ${carName(car)}` : ''}`, title: `Jauns pieteikums: ${kind}`, body, company, note: 'Atbildot uz šo e-pastu, atbilde aizies klientam.' }) };
}

const NEXT_STEP: Record<string, string> = {
  leasing: 'Mūsu līzinga speciālists izvērtēs pieteikumu un sazināsies ar tevi, lai precizētu nosacījumus. Parasti atbildam tās pašas darba dienas laikā.',
  test_drive: 'Sazināsimies, lai vienotos par ērtu laiku testa braucienam.',
  reserve: 'Sazināsimies, lai apstiprinātu rezervāciju un pārrunātu nākamos soļus.',
  sell_car: 'Apskatīsim informāciju par tavu auto un sazināsimies ar piedāvājumu.',
  valuation: 'Apskatīsim informāciju par tavu auto un sazināsimies ar novērtējumu un piedāvājumu.',
  trade_in: 'Izvērtēsim tavu auto un sazināsimies ar maiņas piedāvājumu.',
  car_order: 'Sāksim meklēt atbilstošu auto Eiropā un sazināsimies ar variantiem.',
  warranty: 'Sazināsimies, lai noformētu pagarināto garantiju.',
  alert: 'Tiklīdz katalogā parādīsies atbilstošs auto, mēs tev paziņosim.',
  contact: 'Atbildēsim uz tavu jautājumu tuvākajā laikā.',
};

/** Apstiprinājums klientam (tikai, ja ir apstiprināts sūtītāja domēns). */
export function leadConfirmation(lead: MailLead, car: Car | null, company: CompanySettings) {
  if (!lead.email || !domainVerified()) return null;
  const first = lead.name.split(' ')[0];
  const body = `
    <p style="margin:8px 0 0;font-size:15px;line-height:1.6;">Labdien, ${esc(first)}! Paldies — tavs pieteikums ir saņemts.</p>
    <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#33363b;">${esc(NEXT_STEP[lead.type] || NEXT_STEP.contact)}</p>
    ${car ? carBlock(car) : ''}
    <div style="margin:18px 0;padding:16px;background:${PAPER};border-radius:12px;font-size:14px;line-height:1.7;">
      <b>Jautājumi? Sazinies ar mums</b><br>
      Tālrunis: <a href="${telHref(company.phone)}" style="color:${RED};text-decoration:none;font-weight:700">${esc(company.phone)}</a><br>
      Adrese: ${esc(company.address)}<br>
      Darba laiks: darba dienās ${esc(company.hours?.weekdays)}, sestdienās ${esc(company.hours?.saturday)}
    </div>
    <div style="margin-top:6px;">
      ${button(waHref(company.whatsapp || company.phone), 'Rakstīt WhatsApp')}
      ${button(`${SITE_URL}/katalogs`, 'Skatīt auto katalogu', false)}
    </div>`;
  return {
    subject: car ? `Pieteikums saņemts — ${carName(car)} ${car.year ?? ''}`.trimEnd() : 'Tavs pieteikums ir saņemts — Tavs Auto',
    text: `Labdien, ${first}! Paldies — tavs pieteikums ir saņemts.\n${NEXT_STEP[lead.type] || NEXT_STEP.contact}\n${car ? `\nAuto: ${carName(car)} ${car.year ?? ''} — ${SITE_URL}${carUrl(car)}\n` : ''}\nTālrunis: ${company.phone}\nAdrese: ${company.address}\n${SITE_URL}`,
    html: layout({ preheader: 'Paldies! Sazināsimies ar tevi tuvākajā laikā.', title: 'Paldies! Pieteikums saņemts', body, company, note: 'Šo e-pastu saņēmi, jo aizpildīji pieteikumu mūsu mājaslapā.' }),
  };
}

/** Kam sūtīt paziņojumus: uzņēmuma e-pasts no iestatījumiem + LEAD_NOTIFY_TO (komatiem). */
export function notifyRecipients(company: CompanySettings) {
  const list = [company.email, ...(process.env.LEAD_NOTIFY_TO || '').split(',')].map((s) => s?.trim().toLowerCase()).filter((s): s is string => !!s && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
  return [...new Set(list)];
}
