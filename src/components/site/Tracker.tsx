'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { track, trackPageview } from '@/lib/track';

/** Lapu skatījumi, zvanu/WhatsApp klikšķi un pieteikumi — pašu anonīmajai statistikai. */
export function Tracker() {
  const path = usePathname();
  useEffect(() => {
    trackPageview(path);
  }, [path]);
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a') as HTMLAnchorElement | null;
      if (!a) return;
      const h = a.getAttribute('href') || '';
      if (h.startsWith('tel:')) track('phone_click');
      else if (/wa\.me|whatsapp/.test(h)) track('whatsapp_click');
      else if (h.startsWith('mailto:')) track('email_click');
      else if (/facebook\.com|instagram\.com/.test(h)) track('social_click');
    };
    const lead = (e: Event) => track('lead', { type: String((e as CustomEvent).detail?.type || '') });
    document.addEventListener('click', click, { capture: true });
    window.addEventListener('la:lead', lead);
    return () => {
      document.removeEventListener('click', click, { capture: true });
      window.removeEventListener('la:lead', lead);
    };
  }, []);
  return null;
}
