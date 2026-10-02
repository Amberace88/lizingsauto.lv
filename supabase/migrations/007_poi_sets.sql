-- Kartes slāņi navigācijā (degviela, uzlāde, stāvvietas, veikali u.c.). Viena rinda = viena kategorija (kompakts JSON no OpenStreetMap).
create table if not exists public.poi_sets (
  cat text primary key check (cat in ('fuel','ev','parking','shop','pharmacy','health','gov','auto')),
  data jsonb not null default '[]'::jsonb,
  count int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.poi_sets enable row level security;
grant select on public.poi_sets to anon, authenticated;
grant insert, update, delete on public.poi_sets to authenticated;
drop policy if exists poi_sets_read on public.poi_sets;
create policy poi_sets_read on public.poi_sets for select to anon, authenticated using (true);
drop policy if exists poi_sets_admin on public.poi_sets;
create policy poi_sets_admin on public.poi_sets for all to authenticated using (public.is_admin()) with check (public.is_admin());
select 'ok' as result;
