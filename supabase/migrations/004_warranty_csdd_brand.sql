-- 004: garantijas pieteikumi, reklāmas bildes, CSDD nobraukuma vēsture, zīmols "Tavs Auto"

alter table public.leads drop constraint if exists leads_type_check;
alter table public.leads add constraint leads_type_check check (type in ('leasing','contact','sell_car','test_drive','reserve','car_order','trade_in','warranty'));

-- Mango u.c. reklāmas baneri auto galerijās: glabājam, bet publiskajā galerijā nerādām
alter table public.car_images add column if not exists is_promo boolean not null default false;
update public.car_images set is_promo = true where coalesce(source_url, url) ~* '/(Mango|MElektro)[^/]*$';
grant select (is_promo) on public.car_images to anon;

-- CSDD nobraukuma vēsture (ievada admins no e-CSDD "Tehniskās apskates dati")
alter table public.cars add column if not exists odometer_history jsonb;
alter table public.cars add column if not exists csdd_checked_at timestamptz;
grant select (odometer_history, csdd_checked_at) on public.cars to anon;

update public.settings set value = jsonb_set(value, '{brand}', '"Tavs Auto"') where key = 'company';
