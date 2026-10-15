// Kreditēšanas reklāmas obligātie elementi (PTAL 8.³ pants): brīdinājums un reprezentatīvais piemērs.
import Link from 'next/link';
import type { LeasingSettings } from '@/lib/types';
import { CREDIT_DEFAULTS, CREDIT_WARNING, creditExample, exampleText, pct } from '@/lib/credit';

type L = LeasingSettings & { exampleAmount?: number; lender?: string; extras?: string; aprOverride?: number | null };

/**
 * Obligātais brīdinājums: melni burti uz balta fona, reklāmas apakšā, pēc iespējas lielā burtu izmērā.
 * `lg` — atsevišķa josla (≥10% no reklāmas laukuma), `md` — kalkulatora/piedāvājuma bloka apakšā.
 */
export function CreditWarning({ size = 'md', className = '' }: { size?: 'lg' | 'md' | 'sm'; className?: string }) {
  const s = size === 'lg' ? 'px-4 py-5 text-[1.6rem] sm:py-7 sm:text-[2.6rem] lg:text-[3.2rem]' : size === 'md' ? 'px-3 py-3 text-lg sm:text-xl' : 'px-2.5 py-1.5 text-sm';
  return (
    <p role="note" className={`credit-warning rounded-xl border-2 border-black bg-white text-center font-black leading-tight tracking-tight text-black ${s} ${className}`}>
      {CREDIT_WARNING}
    </p>
  );
}

export function exampleFor(leasing: L, price?: number, opts?: { downPct?: number; term?: number; down?: number }) {
  return creditExample(price ?? leasing.exampleAmount ?? CREDIT_DEFAULTS.exampleAmount, leasing, opts);
}

/** GPL rādītājs, kas jārāda vismaz tikpat pamanāmi kā mēneša maksājums vai likme. */
export const aprLabel = (leasing: L, price: number) => `GPL ${pct(exampleFor(leasing, price).apr)}`;

/** Reprezentatīvā piemēra teksts ar kredīta devēju un obligātajiem papildu pakalpojumiem. */
export function CreditExample({ leasing, price, opts, className = '' }: { leasing: L; price?: number; opts?: { downPct?: number; term?: number; down?: number }; className?: string }) {
  const e = exampleFor(leasing, price, opts);
  return (
    <p className={`text-xs leading-relaxed text-ink-2 ${className}`}>
      {exampleText(e, leasing.lender || CREDIT_DEFAULTS.lender)} {leasing.extras ?? CREDIT_DEFAULTS.extras}{' '}
      <Link href="/atbildiga-kreditesana" className="font-semibold underline">Vairāk par nosacījumiem</Link>
    </p>
  );
}

/** Josla katras lapas apakšā (pirms kājenes) — lapā ir līzinga piedāvājumi ar mēneša maksājumiem. */
export function CreditNotice({ leasing }: { leasing: L }) {
  const e = exampleFor(leasing);
  return (
    <section aria-label="Informācija par kreditēšanu" className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
      <div className="overflow-hidden rounded-[20px] border border-line bg-white text-black">
        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-black/55">Reprezentatīvais piemērs</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              {[
                ['Auto cena', `${e.price.toLocaleString('lv-LV')} €`],
                ['Pirmā iemaksa', `${e.down.toLocaleString('lv-LV')} €`],
                ['Kredīta summa', `${e.credit.toLocaleString('lv-LV')} €`],
                ['Termiņš', `${e.term} mēn.`],
                ['Aizņēmuma likme', `${pct(e.rate)} gadā`],
                ['Ikmēneša maksājums', `${e.monthly.toLocaleString('lv-LV')} €`],
                ['Kopā atmaksājams', `${e.total.toLocaleString('lv-LV')} €`],
                ['GPL', pct(e.apr)],
                ...(e.contractFee ? [['Līguma maksa', `${e.contractFee} €`]] : []),
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-black/55">{k}</dt>
                  <dd className="num text-base font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-black/65">
              Kredītu izsniedz {leasing.lender || CREDIT_DEFAULTS.lender}. Galīgos nosacījumus nosaka kredīta devējs pēc kredītspējas izvērtēšanas. {leasing.extras ?? CREDIT_DEFAULTS.extras}{' '}
              <Link href="/atbildiga-kreditesana" className="font-semibold underline">Par kreditēšanu un tavām tiesībām</Link>
            </p>
          </div>
          <CreditWarning size="lg" />
        </div>
      </div>
    </section>
  );
}
