-- lizingsauto.lv — datubāzes shēma (AC Industry SIA)
-- Palaist vienreiz Supabase SQL Editor.

create extension if not exists pgcrypto;

-- ============ ADMINI ============
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  admin_code text unique not null,              -- piem. LA-001 (ar šo ID admins pieslēdzas)
  email text not null,
  full_name text,
  phone text,
  role text not null default 'admin' check (role in ('developer','admin','editor')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from admins where user_id = auth.uid() and active);
$$;

-- Izstrādātājs (pilna tehniskā kontrole)
create or replace function public.is_developer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from admins where user_id = auth.uid() and active and role = 'developer');
$$;

-- Login ar admin ID: atgriež e-pastu aktīvam adminam
create or replace function public.admin_login_email(code text) returns text
language sql stable security definer set search_path = public as $$
  select email from admins where upper(admin_code) = upper(trim(code)) and active limit 1;
$$;
grant execute on function public.admin_login_email(text) to anon, authenticated;

-- Admin konti tiek piesaistīti automātiski pēc e-pasta (atļauto sarakstu glabā admin_allowlist).
create table if not exists public.admin_allowlist (
  email text primary key,
  admin_code text unique not null,
  full_name text,
  role text not null check (role in ('developer','admin','editor'))
);
insert into public.admin_allowlist(email, admin_code, full_name, role) values
  ('barops.edijs@gmail.com', 'LA-DEV', 'Izstrādātājs', 'developer'),
  ('baropsedijs@gmail.com',  'LA-DEV2', 'Izstrādātājs', 'developer'),
  ('lizingsauto@gmail.com',  'LA-001', 'LīzingsAuto', 'admin')
on conflict (email) do nothing;

create or replace function public.attach_admin() returns trigger
language plpgsql security definer set search_path = public as $$
declare a admin_allowlist%rowtype;
begin
  select * into a from admin_allowlist where lower(email) = lower(new.email);
  if found then
    insert into admins(user_id, admin_code, email, full_name, role)
    values (new.id, a.admin_code, new.email, a.full_name, a.role)
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_attach_admin on auth.users;
create trigger on_auth_user_attach_admin after insert on auth.users
  for each row execute function public.attach_admin();

-- ============ AUTOMAŠĪNAS ============
create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  legacy_slug text,
  status text not null default 'draft' check (status in ('draft','published','reserved','sold','archived')),
  title text not null,
  make text not null,
  model text not null,
  year int,
  first_registration date,
  fuel text check (fuel in ('petrol','diesel','electric','hybrid','plugin_hybrid','lpg','cng')),
  engine_volume numeric(3,1),
  power_kw int,
  battery_kwh numeric(5,1),
  range_km int,
  body_type text,
  transmission text check (transmission in ('automatic','manual')),
  drive text check (drive in ('fwd','rwd','awd')),
  mileage int,
  color text,
  doors int,
  seats int,
  vin text,
  reg_number text,
  ta_until date,
  euro_class text,
  co2 int,
  consumption numeric(4,1),
  price int not null default 0,
  old_price int,
  vat_included boolean not null default false,
  vat_deductible boolean not null default false,
  description text,
  equipment text[] not null default '{}',
  badges text[] not null default '{}',
  featured boolean not null default false,
  sort int not null default 0,
  views int not null default 0,
  video_url text,
  internal_note text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  sold_at timestamptz
);
create index if not exists cars_status_idx on public.cars(status);
create index if not exists cars_make_idx on public.cars(make);
create index if not exists cars_price_idx on public.cars(price);

create table if not exists public.car_images (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  url text not null,          -- publiska bildes adrese
  storage_path text,          -- ja glabājas Supabase Storage
  source_url text,            -- oriģinālā adrese (importam)
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists car_images_car_idx on public.car_images(car_id, sort);

create or replace function public.touch_car() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  new.updated_by = coalesce(auth.uid(), new.updated_by);
  if new.status = 'published' and (old.status is distinct from 'published') and new.published_at is null then new.published_at = now(); end if;
  if new.status = 'sold' and (old.status is distinct from 'sold') then new.sold_at = now(); end if;
  return new;
end $$;
drop trigger if exists cars_touch on public.cars;
create trigger cars_touch before update on public.cars for each row execute function public.touch_car();

create or replace function public.increment_car_view(car_slug text) returns void
language sql security definer set search_path = public as $$
  update cars set views = views + 1 where slug = car_slug and status in ('published','reserved','sold');
$$;
grant execute on function public.increment_car_view(text) to anon, authenticated;

-- ============ PIETEIKUMI ============
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('leasing','contact','sell_car','test_drive','reserve','car_order','trade_in')),
  car_id uuid references public.cars(id) on delete set null,
  name text,
  phone text,
  email text,
  message text,
  data jsonb not null default '{}',
  status text not null default 'new' check (status in ('new','in_progress','done','rejected')),
  assigned_to uuid references auth.users(id),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_status_idx on public.leads(status, created_at desc);

-- ============ PORTĀLU PUBLIKĀCIJAS ============
create table if not exists public.portal_listings (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  portal text not null check (portal in ('ss_lv','autoplius','mobile_de','auto24','autogidas')),
  enabled boolean not null default true,
  status text not null default 'pending' check (status in ('pending','ready','published','error','removed')),
  external_id text,
  external_url text,
  last_payload jsonb,
  last_error text,
  last_sync_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (car_id, portal)
);

-- ============ IESTATĪJUMI ============
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default true,
  technical boolean not null default false,   -- tehniskos iestatījumus maina tikai izstrādātājs
  updated_at timestamptz not null default now()
);

insert into public.settings(key, value, is_public, technical) values
 ('leasing', '{"rate":9,"term":84,"minTerm":12,"maxTerm":96,"downPct":0,"minDownPct":0,"maxDownPct":50,"residualPct":0,"contractFee":0,"monthlyFee":0}', true),
 ('company', '{"name":"SIA AC Industry","brand":"LīzingsAuto","regNr":"40203125692","legalAddress":"Kvēles iela 23-64, Rīga, LV-1024","address":"Krustabaznīcas iela 24, Rīga, LV-1026","phone":"+371 23776197","email":"lizingsauto@gmail.com","whatsapp":"37123776197","facebook":"https://www.facebook.com/lizingsauto.lv/","instagram":"https://www.instagram.com/lizingsauto.lv","hours":{"weekdays":"9:00–18:00","saturday":"10:00–15:00","sunday":"Pēc vienošanās"}}', true, false),
 ('portals', '{"ss_lv":{"enabled":true},"autoplius":{"enabled":false,"contactId":"","cityId":""},"mobile_de":{"enabled":false,"sellerId":""},"auto24":{"enabled":false}}', false, true)
on conflict (key) do nothing;

-- ============ AKTIVITĀŠU ŽURNĀLS ============
create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  action text not null,
  entity text,
  entity_id text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function public.log_car_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  insert into activity_log(user_id, action, entity, entity_id, meta)
  values (auth.uid(), lower(tg_op), 'car', coalesce(new.id, old.id)::text,
          jsonb_build_object('title', coalesce(new.title, old.title), 'status', coalesce(new.status, old.status), 'price', coalesce(new.price, old.price)));
  return coalesce(new, old);
end $$;
drop trigger if exists cars_log on public.cars;
create trigger cars_log after insert or update or delete on public.cars for each row execute function public.log_car_change();

-- ============ RLS ============
alter table public.admins enable row level security;
alter table public.cars enable row level security;
alter table public.car_images enable row level security;
alter table public.leads enable row level security;
alter table public.portal_listings enable row level security;
alter table public.settings enable row level security;
alter table public.activity_log enable row level security;

drop policy if exists admins_select on public.admins;
create policy admins_select on public.admins for select using (public.is_admin());
drop policy if exists admins_dev_write on public.admins;
create policy admins_dev_write on public.admins for all using (public.is_developer()) with check (public.is_developer());
drop policy if exists admins_self_update on public.admins;
create policy admins_self_update on public.admins for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and role = (select role from admins a where a.user_id = auth.uid()));
alter table public.admin_allowlist enable row level security;
drop policy if exists allowlist_dev on public.admin_allowlist;
create policy allowlist_dev on public.admin_allowlist for all using (public.is_developer()) with check (public.is_developer());

drop policy if exists cars_public_read on public.cars;
create policy cars_public_read on public.cars for select using (status in ('published','reserved','sold') or public.is_admin());
drop policy if exists cars_admin_write on public.cars;
create policy cars_admin_write on public.cars for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists car_images_public_read on public.car_images;
create policy car_images_public_read on public.car_images for select using (
  exists (select 1 from public.cars c where c.id = car_id and (c.status in ('published','reserved','sold') or public.is_admin())));
drop policy if exists car_images_admin_write on public.car_images;
create policy car_images_admin_write on public.car_images for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists leads_public_insert on public.leads;
create policy leads_public_insert on public.leads for insert with check (status = 'new' and assigned_to is null and admin_note is null);
drop policy if exists leads_admin_all on public.leads;
create policy leads_admin_all on public.leads for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists portal_admin_all on public.portal_listings;
create policy portal_admin_all on public.portal_listings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_public_read on public.settings;
create policy settings_public_read on public.settings for select using (is_public or public.is_admin());
drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings for all
  using ((public.is_admin() and not technical) or public.is_developer())
  with check ((public.is_admin() and not technical) or public.is_developer());

drop policy if exists activity_admin_read on public.activity_log;
create policy activity_admin_read on public.activity_log for select using (public.is_admin());
drop policy if exists activity_admin_insert on public.activity_log;
create policy activity_admin_insert on public.activity_log for insert with check (public.is_admin() and user_id = auth.uid());

-- ============ STORAGE ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cars', 'cars', true, 15728640, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;

drop policy if exists cars_bucket_read on storage.objects;
create policy cars_bucket_read on storage.objects for select using (bucket_id = 'cars');
drop policy if exists cars_bucket_admin_insert on storage.objects;
create policy cars_bucket_admin_insert on storage.objects for insert with check (bucket_id = 'cars' and public.is_admin());
drop policy if exists cars_bucket_admin_update on storage.objects;
create policy cars_bucket_admin_update on storage.objects for update using (bucket_id = 'cars' and public.is_admin());
drop policy if exists cars_bucket_admin_delete on storage.objects;
create policy cars_bucket_admin_delete on storage.objects for delete using (bucket_id = 'cars' and public.is_admin());

-- Piesaista jau eksistējošos lietotājus no atļautā saraksta
insert into public.admins(user_id, admin_code, email, full_name, role)
select u.id, a.admin_code, u.email, a.full_name, a.role
from auth.users u join public.admin_allowlist a on lower(a.email) = lower(u.email)
on conflict (user_id) do nothing;
