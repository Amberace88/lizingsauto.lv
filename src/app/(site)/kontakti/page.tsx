import type { Metadata } from 'next';
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';
import { getSettings } from '@/lib/data';
import { PageHead } from '@/components/site/PageHead';
import { LeadForm } from '@/components/site/LeadForm';

export const metadata: Metadata = {
  title: 'Kontakti — Krustabaznīcas iela 24, Rīga',
  description: 'Sazinies ar Tavs Auto: +371 23776197, lizingsauto@gmail.com. Krustabaznīcas iela 24, Rīga. Atbildēsim uz jautājumiem par auto iegādi, līzingu un auto stāvokli.',
  alternates: { canonical: '/kontakti' },
};

export default async function ContactPage() {
  const { company } = await getSettings();
  const tel = company.phone.replace(/\s/g, '');
  return (
    <>
      <PageHead crumb="Kontakti" title="Nekautrējies sazināties" lead="Esam auto tirdzniecības speciālisti — atbildēsim uz visiem jautājumiem par auto iegādi, līzingu un auto stāvokli." />
      <div className="mx-auto mt-10 grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-3">
          {[
            { i: Phone, t: 'Tālrunis', v: company.phone, href: `tel:${tel}` },
            { i: MessageCircle, t: 'WhatsApp / SMS', v: company.phone, href: `https://wa.me/${company.whatsapp}` },
            { i: Mail, t: 'E-pasts', v: company.email, href: `mailto:${company.email}` },
            { i: MapPin, t: 'Adrese', v: company.address, href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(company.address)}` },
          ].map(({ i: I, t, v, href }) => (
            <a key={t} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl border border-line bg-card p-5 transition hover:border-petrol">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-petrol-soft text-petrol"><I className="h-5 w-5" /></span>
              <span><span className="block text-sm text-mute">{t}</span><span className="num font-semibold text-ink">{v}</span></span>
            </a>
          ))}
          <div className="flex items-start gap-4 rounded-2xl border border-line bg-card p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-petrol-soft text-petrol"><Clock className="h-5 w-5" /></span>
            <span className="text-sm"><span className="block text-mute">Darba laiks</span>Darba dienās <b className="num">{company.hours.weekdays}</b><br />Sestdienās <b className="num">{company.hours.saturday}</b><br />Svētdienās <b>{company.hours.sunday}</b></span>
          </div>
        </div>
        <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-lift)] sm:p-8">
          <h2 className="display-md mb-6 text-2xl">Uzraksti mums</h2>
          <LeadForm type="contact" />
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
        <iframe title="Karte" src={`https://maps.google.com/maps?q=${encodeURIComponent(company.address)}&z=15&output=embed`} className="h-96 w-full rounded-2xl border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        <p className="mt-4 text-sm text-mute">{company.name}, reģ. nr. {company.regNr}. Juridiskā adrese: {company.legalAddress}.</p>
      </div>
    </>
  );
}
