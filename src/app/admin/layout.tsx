import type { Metadata } from 'next';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s — Admin | LīzingsAuto' }, robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-[#eef1f0]">{children}</div>;
}
