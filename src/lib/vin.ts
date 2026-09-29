// VIN atšifrēšana bez ārējiem servisiem: ražotājs (WMI), valsts, modeļa gads, kontrolcipars.
const WMI: Record<string, string> = {
  WAU: 'Audi', WA1: 'Audi (SUV)', WUA: 'Audi Sport', TRU: 'Audi (Ungārija)',
  WBA: 'BMW', WBS: 'BMW M', WBY: 'BMW i', WBX: 'BMW (SUV)', '5UX': 'BMW (ASV, SUV)', WMW: 'MINI',
  WDB: 'Mercedes-Benz', WDD: 'Mercedes-Benz', WDC: 'Mercedes-Benz (SUV)', W1K: 'Mercedes-Benz', W1N: 'Mercedes-Benz (SUV)', W1V: 'Mercedes-Benz Van', WDF: 'Mercedes-Benz Van', '4JG': 'Mercedes-Benz (ASV)',
  WVW: 'Volkswagen', WV1: 'Volkswagen komerc.', WV2: 'Volkswagen (Transporter)', WVG: 'Volkswagen (SUV)', '3VW': 'Volkswagen (Meksika)',
  WP0: 'Porsche', WP1: 'Porsche (SUV)',
  TMB: 'Škoda', VSS: 'SEAT / Cupra', VWV: 'Volkswagen (Spānija)',
  WF0: 'Ford (Vācija)', WF1: 'Ford', '1FA': 'Ford (ASV)', '1FM': 'Ford (ASV, SUV)',
  W0L: 'Opel', W0V: 'Opel', VXK: 'Opel',
  VF1: 'Renault', VF3: 'Peugeot', VF7: 'Citroën', VR3: 'Peugeot', VR7: 'Citroën / DS', VR1: 'DS', UU1: 'Dacia', VF6: 'Renault Trucks',
  ZFA: 'Fiat', ZFF: 'Ferrari', ZAR: 'Alfa Romeo', ZHW: 'Lamborghini', ZAM: 'Maserati', ZCF: 'Iveco',
  YV1: 'Volvo', YV4: 'Volvo (SUV)', LVY: 'Volvo (Ķīna)', LPS: 'Polestar',
  SAL: 'Land Rover', SAJ: 'Jaguar', SCC: 'Lotus', SCB: 'Bentley', SCF: 'Aston Martin', SAR: 'Rover',
  JTD: 'Toyota', JTE: 'Toyota', JTH: 'Lexus', JTJ: 'Lexus (SUV)', JTM: 'Toyota (SUV)', NMT: 'Toyota (Turcija)', SB1: 'Toyota (Lielbritānija)', VNK: 'Toyota (Francija)', TMA: 'Hyundai (Čehija)',
  JHM: 'Honda', SHH: 'Honda (Lielbritānija)', SHS: 'Honda (Lielbritānija, SUV)',
  JMZ: 'Mazda', JM1: 'Mazda', JN1: 'Nissan', JN8: 'Nissan (SUV)', SJN: 'Nissan (Lielbritānija)', VSK: 'Nissan (Spānija)',
  JMB: 'Mitsubishi', JMY: 'Mitsubishi', JF1: 'Subaru', JF2: 'Subaru (SUV)', JS1: 'Suzuki', JSA: 'Suzuki', TSM: 'Suzuki (Ungārija)',
  KMH: 'Hyundai', KMJ: 'Hyundai', KNA: 'Kia', KNE: 'Kia', U5Y: 'Kia (Slovākija)', U6Y: 'Kia (Slovākija)', KL1: 'Chevrolet / Daewoo',
  '5YJ': 'Tesla (ASV)', LRW: 'Tesla (Ķīna)', XP7: 'Tesla (Vācija)', '7SA': 'Tesla (ASV)',
  LGX: 'BYD', LC0: 'BYD', LSJ: 'MG (SAIC)', SDB: 'MG', LVS: 'Ford (Ķīna)',
  '1G1': 'Chevrolet (ASV)', '1C4': 'Jeep / Chrysler (ASV)', '1J4': 'Jeep (ASV)', ZAC: 'Jeep (Itālija)', '2T1': 'Toyota (Kanāda)',
};

const REGION: [RegExp, string][] = [
  [/^[A-H]/, 'Āfrika'], [/^J/, 'Japāna'], [/^K[L-R]/, 'Dienvidkoreja'], [/^L/, 'Ķīna'], [/^M[A-E]/, 'Indija'], [/^N[L-R]/, 'Turcija'],
  [/^S[A-M]/, 'Lielbritānija'], [/^S[N-T]/, 'Vācija (bij. VDR)'], [/^S[U-Z]/, 'Polija'], [/^T[A-H]/, 'Šveice'], [/^T[J-P]/, 'Čehija'], [/^T[R-V]/, 'Ungārija'], [/^U[5-7]/, 'Slovākija'],
  [/^V[A-E]/, 'Austrija'], [/^V[F-R]/, 'Francija'], [/^V[S-W]/, 'Spānija'], [/^W/, 'Vācija'], [/^X[L-R]/, 'Nīderlande'], [/^X[3-9]/, 'Krievija'], [/^Y[A-E]/, 'Beļģija'], [/^Y[F-K]/, 'Somija'], [/^Y[S-W]/, 'Zviedrija'],
  [/^Z/, 'Itālija'], [/^[1-5]/, 'ASV / Ziemeļamerika'], [/^[6-7]/, 'Austrālija / Okeānija'], [/^[8-9]/, 'Dienvidamerika'],
];

const YEARS = 'ABCDEFGHJKLMNPRSTVWXY123456789';

export function decodeVin(raw: string) {
  const vin = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const problems: string[] = [];
  if (vin.length !== 17) problems.push(`VIN jābūt 17 simboliem (ievadīti ${vin.length})`);
  if (/[IOQ]/.test(vin)) problems.push('VIN nedrīkst saturēt burtus I, O vai Q');
  const wmi = vin.slice(0, 3);
  const maker = WMI[wmi] || null;
  const country = REGION.find(([re]) => re.test(vin))?.[1] || null;
  // Modeļa gads (10. simbols) — cikls atkārtojas ik 30 gadus; izvēlamies ticamāko (ne nākotnē)
  const yc = vin[9];
  let year: number | null = null;
  const idx = YEARS.indexOf(yc);
  if (idx >= 0) {
    const now = new Date().getFullYear() + 1;
    year = 2010 + idx;
    if (year > now) year -= 30;
  }
  // Kontrolcipars (9. simbols) — obligāts Ziemeļamerikā, Eiropā bieži netiek lietots
  const map: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
  const w = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < Math.min(17, vin.length); i++) sum += (/\d/.test(vin[i]) ? +vin[i] : map[vin[i]] || 0) * w[i];
  const chk = sum % 11 === 10 ? 'X' : String(sum % 11);
  const checkOk = vin.length === 17 ? vin[8] === chk : null;
  return { vin, valid: problems.length === 0, problems, wmi, maker, country, year, plant: vin[10] || null, serial: vin.slice(11), checkOk };
}
