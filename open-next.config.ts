// OpenNext konfigurācija Cloudflare Workers būvējumam. Netlify būvējums (`npm run build`) šo failu nelasa.
// Skat. docs/CLOUDFLARE_MIGRATION.md.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache';
import d1NextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache';
import memoryQueue from '@opennextjs/cloudflare/overrides/queue/memory-queue';

export default defineCloudflareConfig({
  // ISR lapas (export const revalidate = …) glabājas R2 (NEXT_INC_CACHE_R2_BUCKET), priekšā reģionālais Cache API kešs
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' }),
  // Admin "revalidatePath" (auto saglabāšana, iestatījumi) — tagu krātuve D1 (NEXT_TAG_CACHE_D1)
  tagCache: d1NextTagCache,
  // Laika revalidācija fonā caur WORKER_SELF_REFERENCE
  queue: memoryQueue,
  // Kešotu lapu atdod, vēl neielādējot Next.js serveri — mazāk CPU
  enableCacheInterception: true,
});
