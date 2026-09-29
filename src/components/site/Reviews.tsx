import { Star, ExternalLink } from 'lucide-react';
import type { Review } from '@/lib/data';

const Stars = ({ n, size = 'h-4 w-4' }: { n: number; size?: string }) => (
  <span className="flex gap-0.5" aria-label={`${n} no 5`}>
    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`${size} ${i <= Math.round(n) ? 'fill-[#f5b301] text-[#f5b301]' : 'text-line'}`} />)}
  </span>
);

/** Īstas Google atsauksmes (admins ievada iestatījumos). Ja nav datu — sadaļa netiek rādīta. */
export function ReviewsSection({ r }: { r: { googleUrl: string; profileUrl: string; rating: number; count: number; items: Review[] } }) {
  if (!r.items.length && !r.rating) return null;
  return (
    <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="display-md text-3xl text-ink sm:text-4xl">Ko saka mūsu klienti</h2>
          {r.rating > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <span className="num display-md text-3xl text-ink">{r.rating.toFixed(1)}</span>
              <div><Stars n={r.rating} size="h-5 w-5" />{r.count > 0 && <p className="text-sm text-mute">{r.count} atsauksmes Google</p>}</div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {r.profileUrl && <a href={r.profileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">Visas atsauksmes <ExternalLink className="h-4 w-4" /></a>}
          {r.googleUrl && <a href={r.googleUrl} target="_blank" rel="noopener noreferrer" className="btn btn-signal">Atstāt atsauksmi</a>}
        </div>
      </div>
      {r.items.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-8 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
          {r.items.map((it, i) => (
            <figure key={i} className="w-[85%] shrink-0 snap-start rounded-[24px] border border-line bg-card p-6 sm:w-auto">
              <Stars n={it.rating} />
              <blockquote className="mt-3 text-ink-2">“{it.text}”</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-night text-sm font-bold text-white">{it.name.charAt(0).toUpperCase()}</span>
                <span className="font-semibold text-ink">{it.name}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
