import Link from 'next/link';

export function PageHead({ title, lead, crumb }: { title: string; lead?: string; crumb: string }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <nav className="text-sm text-mute" aria-label="Navigācijas ceļš"><Link href="/" className="hover:text-ink">Sākums</Link> / {crumb}</nav>
      <h1 className="display mt-3 max-w-4xl text-4xl text-ink sm:text-[3.4rem]">{title}</h1>
      {lead && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">{lead}</p>}
    </div>
  );
}
