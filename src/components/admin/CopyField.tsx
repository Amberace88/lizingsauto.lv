'use client';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyField({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={value} className="field !py-2 font-mono text-xs" onFocus={(e) => e.target.select()} />
      <button type="button" onClick={async () => { await navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1500); }} className="btn btn-ghost !px-3 !py-2" aria-label="Kopēt">{ok ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}</button>
    </div>
  );
}
