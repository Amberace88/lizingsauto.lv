# Tavs Auto → Cloudflare Workers

Branch `cloudflare` runs the same Next.js app on Cloudflare Workers via `@opennextjs/cloudflare`.
`main` still builds on Netlify unchanged until the domain is switched.

## What changed
- `next` 15.5.26 → 15.5.27 (patch; required by `@opennextjs/cloudflare`).
- Added `@opennextjs/cloudflare`, `wrangler` (dev deps) and scripts `cf:build`, `cf:preview`, `cf:deploy`.
- `wrangler.jsonc`, `open-next.config.ts`:
  - ISR cache in R2 bucket `tavsauto-cache` (+ regional cache, cache interception),
  - on-demand revalidation (`revalidatePath` from admin) via D1 `tavsauto-tags`,
  - background revalidation through the `WORKER_SELF_REFERENCE` service binding,
  - Cloudflare Images binding `IMAGES` (next/image optimisation + image conversion).
- `sharp` is not available on Workers. `src/lib/image-convert.ts` uses the Cloudflare Images binding on Workers
  and falls back to `sharp` on Node (Netlify / local). Used by `/api/admin/portals/mobile-de` (webp → jpeg)
  and `/api/admin/migrate-images` (one-time migration, already done).
- `netlify.toml` build vars moved to `vars` in `wrangler.jsonc` (NEXT_PUBLIC_SITE_URL, MAIL_FROM).

Verified locally: `opennextjs-cloudflare build` OK, bundle 10.2 MB / **2.05 MB gzip** (fits the free 3 MB limit),
`wrangler dev` → `/`, `/katalogs`, `/auto/*`, `/navigacija`, `/fotoradari`, `/robots.txt`, `/sitemap.xml`,
`/_next/image`, `/admin` (→ login) all respond. Plain `next build` still passes.

## One-time Cloudflare setup
1. R2 → create bucket `tavsauto-cache`.
2. D1 → create database `tavsauto-tags`; put its id into `wrangler.jsonc` (`REPLACE_WITH_D1_ID`).
3. Workers & Pages → Create → Import a repository → GitHub `lizingsauto.lv`:
   - project name `tavsauto`, production branch `cloudflare` (later `main`),
   - build command `npx opennextjs-cloudflare build`, deploy command `npx opennextjs-cloudflare deploy`,
   - build variable `NODE_VERSION=22`.
4. Worker → Settings → Variables and Secrets (runtime, encrypted):
   `RESEND_API_KEY`, `LEAD_NOTIFY_TO` (if used), `FEED_KEY`, `MOBILE_DE_USER`, `MOBILE_DE_PASSWORD` (if used).
   Copy the values from Netlify → Project configuration → Environment variables.
   (Supabase URL / publishable key have safe defaults in `src/lib/supabase/env.ts`.)
5. Test on `https://tavsauto.<account>.workers.dev`: home, catalogue, a car page, leasing form (lead e-mail),
   admin login, car edit + save (revalidation), navigation map.

## Plan
Workers Free allows 10 ms CPU per request; uncached SSR renders usually need more → use **Workers Paid ($5/month,
whole account)**. Cached pages are served without rendering.

## Domain switch (zero downtime)
DNS for tavsauto.eu is at GoDaddy (ns19/ns20.domaincontrol.com).
1. Add zone `tavsauto.eu` to Cloudflare; make sure all records are imported, especially the Resend e-mail records
   (`send` MX/TXT, `resend._domainkey` TXT, DMARC) and the current Netlify A/CNAME records.
2. At GoDaddy change the nameservers to the two Cloudflare nameservers. The site keeps running on Netlify meanwhile.
3. When the zone is Active: Worker → Settings → Domains & Routes → add `tavsauto.eu` and `www.tavsauto.eu`
   (Cloudflare replaces the A/CNAME records itself) — the switch is instant.
4. Supabase Auth URL configuration already uses https://tavsauto.eu — nothing to change.
5. After a week without problems: merge `cloudflare` → `main`, point Workers Builds at `main`,
   stop builds on Netlify (keep lizingsauto.netlify.app as a fallback until Netlify is cancelled).
