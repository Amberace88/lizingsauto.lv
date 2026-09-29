export type CarStatus = 'draft' | 'published' | 'reserved' | 'sold' | 'archived';
export type Fuel = 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'plugin_hybrid' | 'lpg' | 'cng';

export interface CarImage {
  id: string;
  car_id: string;
  url: string;
  storage_path: string | null;
  source_url: string | null;
  sort: number;
  is_promo?: boolean;
}

export interface Car {
  id: string;
  slug: string;
  legacy_slug: string | null;
  status: CarStatus;
  title: string;
  make: string;
  model: string;
  year: number | null;
  first_registration: string | null;
  fuel: Fuel | null;
  engine_volume: number | null;
  power_kw: number | null;
  battery_kwh: number | null;
  range_km: number | null;
  body_type: string | null;
  transmission: 'automatic' | 'manual' | null;
  drive: 'fwd' | 'rwd' | 'awd' | null;
  mileage: number | null;
  color: string | null;
  doors: number | null;
  seats: number | null;
  vin: string | null;
  reg_number: string | null;
  ta_until: string | null;
  euro_class: string | null;
  co2: number | null;
  consumption: number | null;
  price: number;
  old_price: number | null;
  vat_included: boolean;
  vat_deductible: boolean;
  description: string | null;
  equipment: string[];
  badges: string[];
  featured: boolean;
  sort: number;
  views: number;
  video_url: string | null;
  odometer_history?: { date: string; km: number }[] | null;
  csdd_checked_at?: string | null;
  internal_note?: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  sold_at: string | null;
  car_images?: CarImage[];
}

export interface LeasingSettings {
  rate: number;
  term: number;
  minTerm: number;
  maxTerm: number;
  downPct: number;
  minDownPct: number;
  maxDownPct: number;
  residualPct: number;
  contractFee: number;
  monthlyFee: number;
}

export interface CompanySettings {
  name: string;
  brand: string;
  regNr: string;
  legalAddress: string;
  address: string;
  phone: string;
  email: string;
  whatsapp: string;
  facebook: string;
  instagram: string;
  hours: { weekdays: string; saturday: string; sunday: string };
}

export interface Lead {
  id: string;
  type: string;
  car_id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  data: Record<string, unknown>;
  status: 'new' | 'in_progress' | 'done' | 'rejected';
  admin_note: string | null;
  created_at: string;
  cars?: { title: string; slug: string } | null;
}

export interface AdminProfile {
  user_id: string;
  admin_code: string;
  email: string;
  full_name: string | null;
  role: 'developer' | 'admin' | 'editor';
  active: boolean;
}
