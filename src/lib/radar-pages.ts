// SEO apakšlapas fotoradaru kartei: pēc veida, reģiona un autoceļa.
import type { Radar, RadarKind } from './radars';

export type RadarFilter = { kind?: RadarKind; region?: string; road?: string };
export type RadarPage = { slug: string; title: string; h1: string; lead: string; filter: RadarFilter; group: 'kind' | 'region' | 'road' };

const REGION_SLUG: Record<string, string> = { Rīga: 'riga', Pierīga: 'pieriga', Zemgale: 'zemgale', Vidzeme: 'vidzeme', Kurzeme: 'kurzeme', Latgale: 'latgale' };
const REGION_LOC: Record<string, string> = { Rīga: 'Rīgā', Pierīga: 'Pierīgā', Zemgale: 'Zemgalē', Vidzeme: 'Vidzemē', Kurzeme: 'Kurzemē', Latgale: 'Latgalē' };

export const KIND_PAGES: RadarPage[] = [
  { slug: 'stacionarie', group: 'kind', filter: { kind: 'fixed' }, title: 'Stacionārie fotoradari Latvijā — karte un saraksts', h1: 'Stacionārie fotoradari Latvijā', lead: 'Visi CSDD stacionārie fotoradari kartē ar precīzu atrašanās vietu un iemeslu, kāpēc radars tur uzstādīts.' },
  { slug: 'videja-atruma-kontrole', group: 'kind', filter: { kind: 'average' }, title: 'Vidējā ātruma kontroles posmi Latvijā — karte', h1: 'Vidējā ātruma kontroles posmi', lead: 'Posmi, kur mēra vidējo ātrumu starp diviem punktiem. Kartē redzams viss posms, tā garums un atļautais ātrums.' },
  { slug: 'parvietojamie-radari', group: 'kind', filter: { kind: 'mobile' }, title: 'Pārvietojamo fotoradaru iespējamās vietas — karte', h1: 'Pārvietojamo fotoradaru iespējamās vietas', lead: 'Valsts policijas publicētās vietas, kur var atrasties pārvietojamie fotoradari, sakārtotas pa reģioniem un autoceļiem.' },
];

export function regionPages(): RadarPage[] {
  return Object.entries(REGION_SLUG).map(([region, slug]) => ({
    slug,
    group: 'region',
    filter: { region },
    title: `Fotoradari ${REGION_LOC[region]} — karte, vidējā ātruma posmi`,
    h1: `Fotoradari ${REGION_LOC[region]}`,
    lead: `Stacionārie fotoradari, vidējā ātruma posmi un pārvietojamo radaru iespējamās vietas ${REGION_LOC[region]} vienā kartē.`,
  }));
}

export function roadPages(radars: Pick<Radar, 'road'>[]): RadarPage[] {
  const n = new Map<string, number>();
  for (const r of radars) if (r.road && /^A\d+$/.test(r.road)) n.set(r.road, (n.get(r.road) || 0) + 1);
  return [...n.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => parseInt(a[0].slice(1)) - parseInt(b[0].slice(1)))
    .map(([road]) => ({
      slug: road.toLowerCase(),
      group: 'road',
      filter: { road },
      title: `Fotoradari uz autoceļa ${road} — karte`,
      h1: `Fotoradari uz ${road}`,
      lead: `Visi stacionārie fotoradari, vidējā ātruma posmi un iespējamās mobilās kontroles vietas uz valsts galvenā autoceļa ${road}.`,
    }));
}

export function allRadarPages(radars: Pick<Radar, 'road'>[]) {
  return [...KIND_PAGES, ...regionPages(), ...roadPages(radars)];
}

export function matchRadar(r: Pick<Radar, 'kind' | 'region' | 'road'>, f: RadarFilter) {
  if (f.kind && r.kind !== f.kind) return false;
  if (f.region && r.region !== f.region) return false;
  if (f.road && r.road !== f.road) return false;
  return true;
}
