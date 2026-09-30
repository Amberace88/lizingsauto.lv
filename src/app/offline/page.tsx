import type { Metadata } from 'next';
import { WifiOff, Phone, RotateCw } from 'lucide-react';

export const metadata: Metadata = { title: 'Nav interneta savienojuma', robots: { index: false, follow: false } };
export const dynamic = 'force-static';

// Rāda service worker, ja lietotnei nav interneta. Bez datubāzes datiem — jāstrādā pilnīgi bezsaistē.
export default function Offline() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#0c0d0e] px-6 text-center text-white">
      <div className="max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-tavs-auto-white.png" alt="Tavs Auto" width={184} height={49} className="mx-auto h-10 w-auto" />
        <span className="mx-auto mt-10 grid h-16 w-16 place-items-center rounded-2xl bg-white/10"><WifiOff className="h-8 w-8 text-[#ff3b47]" /></span>
        <h1 className="mt-6 text-2xl font-bold">Nav interneta savienojuma</h1>
        <p className="mt-2 text-white/60">Pārbaudi savienojumu un mēģini vēlreiz. Ja steidzami — zvani mums, atbildēsim uz visiem jautājumiem.</p>
        <div className="mt-8 flex flex-col gap-2">
          {/* Pilna pārlāde apzināti — jāpārbauda savienojums */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#d91d2b] font-semibold hover:brightness-110"><RotateCw className="h-4 w-4" /> Mēģināt vēlreiz</a>
          <a href="tel:+37123776197" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 font-semibold hover:bg-white/10"><Phone className="h-4 w-4" /> +371 23776197</a>
        </div>
      </div>
    </main>
  );
}
