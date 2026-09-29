import { STATUS_LABEL } from '@/lib/format';

export const LEAD_TYPE: Record<string, string> = {
  leasing: 'Līzings',
  contact: 'Jautājums',
  sell_car: 'Pārdot auto',
  test_drive: 'Testa brauciens',
  reserve: 'Rezervācija',
  car_order: 'Auto pasūtījums',
  trade_in: 'Maiņa',
  warranty: 'Garantija',
  alert: 'Gaida auto',
  valuation: 'Novērtējums',
};
export const LEAD_STATUS: Record<string, string> = { new: 'Jauns', in_progress: 'Procesā', done: 'Pabeigts', rejected: 'Noraidīts' };
export const PORTALS: Record<string, { name: string; country: string }> = {
  ss_lv: { name: 'SS.lv', country: 'Latvija' },
  autoplius: { name: 'Autoplius.lt', country: 'Lietuva' },
  mobile_de: { name: 'Mobile.de', country: 'Vācija' },
  auto24: { name: 'Auto24', country: 'Igaunija / Latvija' },
};

export function describe(action: string, entity: string | null, meta: Record<string, unknown>) {
  const t = (meta?.title as string) || '';
  if (action === 'login') return 'Pieslēgšanās admin panelim';
  if (entity === 'car') return `${action === 'insert' ? 'Pievienots' : action === 'delete' ? 'Dzēsts' : 'Labots'} auto: ${t}${meta?.status ? ` (${STATUS_LABEL[meta.status as string] || meta.status})` : ''}`;
  return `${action} ${entity ?? ''} ${t}`;
}


/** Pieteikuma faktiskais veids (jaunie veidi glabājas data.kind). */
export const leadKind = (l: { type: string; data?: Record<string, unknown> | null }) => String(l.data?.kind || l.type);
