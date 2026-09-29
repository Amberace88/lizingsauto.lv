-- 002: kolonnu līmeņa drošība, privātie auto dati, EKII un satura iestatījumi

-- Privātā informācija par auto (iepirkuma cena, pārdevējs, piezīmes) — tikai adminiem
create table if not exists public.car_private (
  car_id uuid primary key references public.cars(id) on delete cascade,
  purchase_price int,
  seller_name text,
  seller_phone text,
  internal_note text,
  updated_at timestamptz not null default now()
);
alter table public.car_private enable row level security;
drop policy if exists car_private_admin on public.car_private;
create policy car_private_admin on public.car_private for all using (public.is_admin()) with check (public.is_admin());
alter table public.cars drop column if exists internal_note;

-- Anonīmie apmeklētāji drīkst lasīt tikai publiskās kolonnas
revoke select on public.cars from anon;
grant select (id,slug,legacy_slug,status,title,make,model,year,first_registration,fuel,engine_volume,power_kw,battery_kwh,range_km,body_type,transmission,drive,mileage,color,doors,seats,vin,ta_until,euro_class,co2,consumption,price,old_price,vat_included,vat_deductible,description,equipment,badges,featured,sort,views,video_url,created_at,updated_at,published_at,sold_at) on public.cars to anon;
revoke select on public.car_images from anon;
grant select (id,car_id,url,sort) on public.car_images to anon;

-- Anonīmie drīkst tikai IEVIETOT pieteikumus (ne lasīt)
revoke all on public.leads from anon;
grant insert (type,car_id,name,phone,email,message,data) on public.leads to anon;
-- Pieteikuma lauku garuma ierobežojumi (aizsardzība pret surogātpastu)
alter table public.leads drop constraint if exists leads_len;
alter table public.leads add constraint leads_len check (
  coalesce(length(name),0) <= 120 and coalesce(length(phone),0) <= 40 and coalesce(length(email),0) <= 160
  and coalesce(length(message),0) <= 4000 and pg_column_size(data) <= 16000);

-- Tehniskās tabulas anonīmiem nav pieejamas
revoke all on public.admins, public.admin_allowlist, public.portal_listings, public.activity_log from anon;

-- EKII un satura iestatījumi (admins var mainīt)
insert into public.settings(key, value, is_public, technical) values
 ('ekii', '{"active":true,"newAmount":4000,"usedAmount":3000,"familyNew5":6750,"familyNew7":9000,"familyUsed5":5000,"familyUsed7":6750,"scrapBonus":2000,"extraChild":1000,"priceCap5":45000,"priceCap6":60000,"usedMaxAgeYears":7,"usedMaxKm":150000,"newMaxKm":6000,"sourceUrl":"https://www.lvif.gov.lv/"}', true, false),
 ('content', '{"heroTitle":"Auto ar līzingu. Arī tad, ja banka atteica.","heroText":"Pārbaudīti lietoti auto no Eiropas. Līzings no 0% pirmās iemaksas, arī ar sabojātu kredītvēsturi un ārzemēs strādājošajiem.","announcement":""}', true, false)
on conflict (key) do nothing;

-- Login ar admin ID: meklē arī atļautajā sarakstā (pirmajai pieslēgšanās reizei)
create or replace function public.admin_login_email(code text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select email from admins where upper(admin_code) = upper(trim(code)) and active limit 1),
    (select email from admin_allowlist where upper(admin_code) = upper(trim(code)) limit 1));
$$;

-- Reģistrēties var TIKAI e-pasti no atļautā saraksta — citi tiek bloķēti datubāzes līmenī
create or replace function public.guard_signup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from admin_allowlist where lower(email) = lower(new.email)) then
    raise exception 'Reģistrācija nav atļauta';
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_guard on auth.users;
create trigger on_auth_user_guard before insert on auth.users
  for each row execute function public.guard_signup();

-- Jaunie pieteikumi admin panelī parādās uzreiz
do $$ begin
  alter publication supabase_realtime add table public.leads;
exception when others then null; end $$;

-- Portālu plūsmām: publiski pieejams tikai auto ID saraksts un nesensitīvā konfigurācija
create or replace function public.portal_feed_car_ids(p text) returns setof uuid
language sql stable security definer set search_path = public as $$
  select pl.car_id from portal_listings pl join cars c on c.id = pl.car_id
  where pl.portal = p and pl.enabled and c.status in ('published','reserved');
$$;
grant execute on function public.portal_feed_car_ids(text) to anon, authenticated;

create or replace function public.portal_feed_config() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select value from settings where key = 'portals'), '{}'::jsonb);
$$;
grant execute on function public.portal_feed_config() to anon, authenticated;
