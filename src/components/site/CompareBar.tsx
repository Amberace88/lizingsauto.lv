'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCompare } from './favorites';

export function CompareBar() {
  const { ids, clear } = useCompare();
  const path = usePathname();
  if (ids.length === 0 || path.startsWith('/salidzinat')) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-ink px-4 py-2.5 text-sm text-white shadow-xl print:hidden">
      <span className="num">Salīdzināšanai: {ids.length}/3</span>
      <Link href={`/salidzinat?ids=${ids.join(',')}`} className="rounded-full bg-signal px-3 py-1 font-semibold text-ink">Salīdzināt</Link>
      <button onClick={clear} className="text-white/60 hover:text-white">Notīrīt</button>
    </div>
  );
}
