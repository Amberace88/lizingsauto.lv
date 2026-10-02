-- Fotoradari: CSDD stacionārie, vidējā ātruma posmi (OSM), VP pārvietojamo radaru iespējamās vietas
create table if not exists public.radars (
  id bigserial primary key,
  kind text not null check (kind in ('fixed','average','mobile','toll')),
  name text not null check (char_length(name) <= 300),
  region text,
  road text,
  lat double precision,
  lng double precision,
  geom jsonb,               -- vidējā ātruma posmam: [[ [lat,lng], ... ], ...]
  speed int,
  direction text,
  note text,
  source text not null default 'manual',
  approx boolean not null default false,  -- koordinātas aptuvenas (pēc adreses)
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
create index if not exists radars_kind on public.radars (kind) where active;
alter table public.radars enable row level security;
grant select on public.radars to anon, authenticated;
grant insert, update, delete on public.radars to authenticated;
grant usage on sequence public.radars_id_seq to authenticated;
drop policy if exists radars_read on public.radars;
create policy radars_read on public.radars for select to anon, authenticated using (active or public.is_admin());
drop policy if exists radars_admin on public.radars;
create policy radars_admin on public.radars for all to authenticated using (public.is_admin()) with check (public.is_admin());
select 'ok' as result;
