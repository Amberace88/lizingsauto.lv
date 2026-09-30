'use client';
// Pašu anonīmā statistika: bez sīkdatnēm un IP. Sesijas ID dzīvo tikai pārlūka cilnē (sessionStorage).
import { supabaseBrowser } from '@/lib/supabase/client';

const SKEY = 'la_sid';
const once = new Set<string>();

function sid() {
  try {
    let s = sessionStorage.getItem(SKEY);
    if (!s) {
      s = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SKEY, s);
    }
    return s;
  } catch {
    return 'nosession';
  }
}

function device() {
  const w = window.innerWidth;
  return w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';
}

const TZ_COUNTRY: Record<string, string> = { 'Europe/Riga': 'LV', 'Europe/Vilnius': 'LT', 'Europe/Tallinn': 'EE', 'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Oslo': 'NO', 'Europe/Stockholm': 'SE', 'Europe/Helsinki': 'FI', 'Europe/Copenhagen': 'DK', 'Europe/Berlin': 'DE', 'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Paris': 'FR', 'Europe/Madrid': 'ES', 'Europe/Warsaw': 'PL', 'Europe/Moscow': 'RU', 'Europe/Minsk': 'BY', 'Europe/Kyiv': 'UA', 'Europe/Kiev': 'UA', 'America/New_York': 'US' };
function country() {
  try {
    return TZ_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone] || null;
  } catch {
    return null;
  }
}

/** Avota nosaukums no referrer. */
function source(ref: string) {
  if (!ref) return null;
  try {
    const h = new URL(ref).hostname.replace(/^www\./, '');
    if (h === location.hostname) return null;
    if (/google\./.test(h)) return 'Google';
    if (/bing\./.test(h)) return 'Bing';
    if (/facebook\.|fb\.|messenger/.test(h)) return 'Facebook';
    if (/instagram\./.test(h)) return 'Instagram';
    if (/tiktok\./.test(h)) return 'TikTok';
    if (/ss\.(lv|com)/.test(h)) return 'ss.lv';
    if (/autoplius/.test(h)) return 'Autoplius';
    if (/mobile\.de/.test(h)) return 'mobile.de';
    if (/carbuy/.test(h)) return 'carbuy.lv';
    if (/whatsapp|wa\.me/.test(h)) return 'WhatsApp';
    if (/youtube/.test(h)) return 'YouTube';
    if (/chatgpt|openai|perplexity|claude|gemini|copilot/.test(h)) return 'AI asistenti';
    return h.slice(0, 120);
  } catch {
    return null;
  }
}

function isBot() {
  return /bot|crawl|spider|headless|lighthouse|preview|facebookexternalhit|whatsapp/i.test(navigator.userAgent) || (navigator as Navigator & { webdriver?: boolean }).webdriver === true;
}

let attribution: { ref: string | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null } | null = null;
function attr() {
  if (attribution) return attribution;
  try {
    const saved = sessionStorage.getItem('la_attr');
    if (saved) return (attribution = JSON.parse(saved));
  } catch {}
  const q = new URLSearchParams(location.search);
  attribution = { ref: source(document.referrer), utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'), utm_campaign: q.get('utm_campaign') };
  if (!attribution.ref && q.get('fbclid')) attribution.ref = 'Facebook';
  if (!attribution.ref && q.get('gclid')) attribution.ref = 'Google Ads';
  try {
    sessionStorage.setItem('la_attr', JSON.stringify(attribution));
  } catch {}
  return attribution;
}

let disabled = false;

function send(row: Record<string, unknown>) {
  if (disabled || typeof window === 'undefined' || isBot()) return;
  if (/^\/admin/.test(location.pathname)) return;
  try {
    const a = attr();
    supabaseBrowser()
      .from('analytics_events')
      .insert({ ...row, ...a, device: device(), country: country(), session: sid() })
      .then(({ error }: { error: { code?: string } | null }) => {
        // Ja tabula vēl nav izveidota, šajā sesijā vairs nemēģinām
        if (error && /PGRST205|42P01/.test(String(error.code))) disabled = true;
      });
  } catch {}
}

export function trackPageview(path: string) {
  send({ type: 'pageview', path: path.slice(0, 300) });
}

/** Notikums; `onceKey` — skaitīt tikai vienreiz sesijā (piem., kalkulatora lietošana). */
export function track(name: string, props?: Record<string, string | number | boolean>, onceKey?: string) {
  if (onceKey) {
    const k = `${name}:${onceKey}`;
    if (once.has(k)) return;
    once.add(k);
  }
  send({ type: 'event', name, path: location.pathname.slice(0, 300), props: props || null });
}

import { useEffect, useRef } from 'react';
/** Reģistrē kalkulatora/rīka lietošanu vienreiz sesijā, kad lietotājs pirmo reizi kaut ko maina. */
export function useTrackUse(name: string, deps: unknown[]) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    track('tool_use', { tool: name }, name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
