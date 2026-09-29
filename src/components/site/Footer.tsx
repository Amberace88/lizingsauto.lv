import Link from 'next/link';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

const Facebook = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={p.className} aria-hidden><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.5V21h3z" /></svg>
);
const Instagram = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={p.className} aria-hidden><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
);
import type { CompanySettings } from '@/lib/types';
import { Logo } from './Header';

export function Footer({ company }: { company: CompanySettings }) {
  return (
    <footer className="mt-24 bg-night text-white/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
            Pārbaudīti lietoti auto no Eiropas ar līzingu visiem — arī ar sabojātu kredītvēsturi un ārzemēs strādājošajiem.
          </p>
          <div className="mt-5 flex gap-2">
            <a href={company.facebook} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/10 p-2.5 hover:bg-white/20" aria-label="Facebook">
              <Facebook className="h-5 w-5" />
            </a>
            <a href={company.instagram} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/10 p-2.5 hover:bg-white/20" aria-label="Instagram">
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>
        <nav aria-label="Kājenes navigācija">
          <p className="mb-3 font-semibold text-white">Auto</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/katalogs" className="hover:text-white">Auto katalogs</Link></li>
            <li><Link href="/katalogs?fuel=electric" className="hover:text-white">Elektroauto ar EKII</Link></li>
            <li><Link href="/katalogs?body=suv" className="hover:text-white">Apvidus auto</Link></li>
            <li><Link href="/elektroauto" className="hover:text-white">Elektroauto atbalsts</Link></li>
            <li><Link href="/salidzinat" className="hover:text-white">Salīdzināt auto</Link></li>
            <li><Link href="/izlase" className="hover:text-white">Mana izlase</Link></li>
          </ul>
        </nav>
        <nav aria-label="Pakalpojumi">
          <p className="mb-3 font-semibold text-white">Pakalpojumi</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/lizings" className="hover:text-white">Auto līzings</Link></li>
            <li><Link href="/garantija" className="hover:text-white">Pagarinātā garantija</Link></li>
            <li><Link href="/kalkulatori" className="hover:text-white">Kalkulatori</Link></li>
            <li><Link href="/parbaudes" className="hover:text-white">Bezmaksas OCTA un TA pārbaude</Link></li>
            <li><Link href="/vardadienas" className="hover:text-white">Vārda dienas šodien</Link></li>
            <li><Link href="/pardot-auto" className="hover:text-white">Pārdot vai mainīt auto</Link></li>
            <li><Link href="/pasutit-auto" className="hover:text-white">Pasūtīt auto no Eiropas</Link></li>
            <li><Link href="/par-mums" className="hover:text-white">Par mums</Link></li>
          </ul>
        </nav>
        <div className="space-y-3 text-sm">
          <p className="font-semibold text-white">Kontakti</p>
          <a href={`tel:${company.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-white"><Phone className="h-4 w-4 text-signal" /> <span className="num">{company.phone}</span></a>
          <a href={`mailto:${company.email}`} className="flex items-center gap-2 hover:text-white"><Mail className="h-4 w-4 text-signal" /> {company.email}</a>
          <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-signal" /> {company.address}</p>
          <p className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 text-signal" /> <span>Darba dienās {company.hours.weekdays}<br />Sestdienās {company.hours.saturday}<br />Svētdienās {company.hours.sunday}</span></p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-white/50 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {company.name}, reģ. nr. {company.regNr}. Jur. adrese: {company.legalAddress}.
          </p>
          <p className="flex flex-wrap items-center gap-4">
            <Link href="/privatuma-politika" className="hover:text-white">Privātuma politika</Link>
            <Link href="/lietosanas-noteikumi" className="hover:text-white">Lietošanas noteikumi</Link>
            {/* Darbinieku ieeja: apzināti neuzkrītoša, bez indeksēšanas */}
            <a href="/admin/login" rel="nofollow" className="text-white/20 transition hover:text-white/70" title="Darbinieku ieeja">
              Darbiniekiem
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
