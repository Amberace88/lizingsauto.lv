'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cookie } from 'lucide-react';

type W = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; fbq?: ((...a: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown } };
const KEY = 'ta_consent';

function loadScripts(ga4: string, pixel: string) {
  const w = window as W;
  if (ga4 && !w.gtag) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${ga4}`;
    document.head.appendChild(s);
    w.dataLayer = w.dataLayer || [];
    w.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    };
    w.gtag('js', new Date());
    w.gtag('config', ga4, { anonymize_ip: true });
  }
  if (pixel && !w.fbq) {
    const f = function (...a: unknown[]) {
      const self = f as unknown as { callMethod?: (...x: unknown[]) => void; queue: unknown[] };
      if (self.callMethod) self.callMethod(...a);
      else self.queue.push(a);
    } as W['fbq'] & { queue: unknown[] };
    f!.queue = [];
    f!.loaded = true;
    f!.version = '2.0';
    w.fbq = f;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
    w.fbq!('init', pixel);
    w.fbq!('track', 'PageView');
  }
}

/** Sīkdatņu piekrišana + GA4/Meta Pixel (tikai ja admins ievadījis ID un apmeklētājs piekritis). */
export function Analytics({ ga4Id, metaPixelId }: { ga4Id: string; metaPixelId: string }) {
  const [consent, setConsent] = useState<string | null | undefined>(undefined);
  const path = usePathname();
  const enabled = !!(ga4Id || metaPixelId);

  useEffect(() => {
    try {
      setConsent(localStorage.getItem(KEY));
    } catch {
      setConsent(null);
    }
  }, []);

  useEffect(() => {
    if (consent === 'all' && enabled) loadScripts(ga4Id, metaPixelId);
  }, [consent, enabled, ga4Id, metaPixelId]);

  // Lapas skatījumi pie navigācijas un pieteikumu notikumi
  useEffect(() => {
    if (consent !== 'all') return;
    const w = window as W;
    w.gtag?.('event', 'page_view', { page_path: path });
    w.fbq?.('track', 'PageView');
  }, [path, consent]);
  useEffect(() => {
    const on = (e: Event) => {
      if (consent !== 'all') return;
      const type = (e as CustomEvent).detail?.type;
      const w = window as W;
      w.gtag?.('event', 'generate_lead', { lead_type: type });
      w.fbq?.('track', 'Lead', { content_category: type });
    };
    window.addEventListener('la:lead', on);
    return () => window.removeEventListener('la:lead', on);
  }, [consent]);

  const choose = (v: 'all' | 'necessary') => {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    setConsent(v);
  };

  return (
    <AnimatePresence>
      {enabled && consent === null && (
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-2xl rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow-lift)] sm:p-5" role="dialog" aria-label="Sīkdatnes">
          <div className="flex gap-3">
            <Cookie className="mt-0.5 h-6 w-6 shrink-0 text-signal" />
            <div className="text-sm text-ink-2">
              <p className="font-bold text-ink">Sīkdatnes</p>
              <p className="mt-1">Izmantojam analītikas sīkdatnes, lai uzlabotu lapu un piedāvājumus. Tās ieslēdzam tikai ar tavu piekrišanu. <Link href="/privatuma-politika" className="underline">Uzzināt vairāk</Link></p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button onClick={() => choose('necessary')} className="btn btn-ghost !py-2 text-sm">Tikai nepieciešamās</button>
            <button onClick={() => choose('all')} className="btn btn-signal !py-2 text-sm">Piekrītu</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
