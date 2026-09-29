'use client';
import { useState } from 'react';
import { Armchair, BatteryCharging, CarFront, Check, ChevronDown, ClipboardCheck, Gauge, KeyRound, Lightbulb, MonitorSmartphone, Music, ShieldCheck, Snowflake, Sparkles, Star, Thermometer, Wrench, Zap } from 'lucide-react';
import type { EquipIcon } from '@/lib/equipment';

export const EQUIP_ICON: Record<EquipIcon, typeof Check> = {
  thermometer: Thermometer,
  shield: ShieldCheck,
  monitor: MonitorSmartphone,
  armchair: Armchair,
  lightbulb: Lightbulb,
  car: CarFront,
  clipboard: ClipboardCheck,
  sparkles: Sparkles,
  wrench: Wrench,
  zap: Zap,
  snowflake: Snowflake,
  music: Music,
  battery: BatteryCharging,
  star: Star,
  gauge: Gauge,
  key: KeyRound,
};

/** Ekstras pa kategorijām; garus sarakstus sakļauj ar “Rādīt visu”. */
export function EquipmentGroups({ groups }: { groups: { id: string; label: string; icon: EquipIcon; items: string[] }[] }) {
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  const long = total > 24;
  const [all, setAll] = useState(!long);
  return (
    <div className="relative">
      <div className={`gap-3 sm:columns-2 ${!all ? 'max-h-[34rem] overflow-hidden' : ''}`}>
        {groups.map((g) => {
          const I = EQUIP_ICON[g.icon] || Sparkles;
          return (
            <div key={g.id} className="mb-3 break-inside-avoid rounded-2xl border border-line p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-signal-soft text-signal"><I className="h-4 w-4" /></span>
                {g.label}
                <span className="num ml-auto text-xs font-semibold text-mute">{g.items.length}</span>
              </p>
              <ul className="space-y-1.5">
                {g.items.map((t) => (
                  <li key={t} className="flex gap-2 text-[0.92rem] leading-snug text-ink-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      {!all && <div className="pointer-events-none absolute inset-x-0 bottom-12 h-24 bg-gradient-to-t from-card to-transparent" />}
      {long && (
        <button onClick={() => setAll((v) => !v)} className="btn btn-ghost mt-3 w-full" aria-expanded={all}>
          {all ? 'Rādīt mazāk' : `Rādīt visu aprīkojumu (${total})`} <ChevronDown className={`h-4 w-4 transition ${all ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}
