'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';

export function Equipment({ items }: { items: string[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 16);
  return (
    <div className="mt-4">
      <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {shown.map((t) => (
          <li key={t} className="flex gap-2 text-[0.95rem] text-ink-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-petrol" /> {t}
          </li>
        ))}
      </ul>
      {items.length > 16 && (
        <button onClick={() => setAll((v) => !v)} className="mt-4 font-semibold text-petrol hover:underline">
          {all ? 'Rādīt mazāk' : `Rādīt visu aprīkojumu (${items.length})`}
        </button>
      )}
    </div>
  );
}
