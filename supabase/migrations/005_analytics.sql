-- Pašu anonīmā statistika (bez sīkdatnēm, bez IP): lapu skatījumi un notikumi
create table if not exists public.analytics_events (
  id bigserial primary key,
  ts timestamptz not null default now(),
  type text not null check (type in ('pageview','event')),
  name text check (char_length(name) <= 60),
  path text check (char_length(path) <= 300),
  ref text check (char_length(ref) <= 120),
  utm_source text check (char_length(utm_source) <= 60),
  utm_medium text check (char_length(utm_medium) <= 60),
  utm_campaign text check (char_length(utm_campaign) <= 80),
  device text check (device in ('mobile','tablet','desktop')),
  country text check (char_length(country) <= 2),
  session text check (char_length(session) <= 40),
  props jsonb check (pg_column_size(props) <= 2000)
);
create index if not exists analytics_events_ts on public.analytics_events (ts desc);
create index if not exists analytics_events_name on public.analytics_events (name, ts desc);
alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;
grant insert (type,name,path,ref,utm_source,utm_medium,utm_campaign,device,country,session,props) on public.analytics_events to anon, authenticated;
grant usage on sequence public.analytics_events_id_seq to anon, authenticated;
grant select, delete on public.analytics_events to authenticated;
drop policy if exists analytics_insert on public.analytics_events;
create policy analytics_insert on public.analytics_events for insert to anon, authenticated with check (ts > now() - interval '1 minute' and ts < now() + interval '1 minute');
drop policy if exists analytics_admin_read on public.analytics_events;
create policy analytics_admin_read on public.analytics_events for select to authenticated using (public.is_admin());
drop policy if exists analytics_admin_delete on public.analytics_events;
create policy analytics_admin_delete on public.analytics_events for delete to authenticated using (public.is_developer());

-- Kopsavilkums adminam vienā pieprasījumā
create or replace function public.analytics_summary(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 400)));
  prev timestamptz := now() - make_interval(days => 2 * greatest(1, least(p_days, 400)));
  r jsonb;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  with e as (select * from analytics_events where ts >= since),
  pv as (select * from e where type = 'pageview'),
  ep as (select * from analytics_events where ts >= prev and ts < since)
  select jsonb_build_object(
    'pageviews', (select count(*) from pv),
    'sessions', (select count(distinct session) from pv),
    'prev_pageviews', (select count(*) from ep where type = 'pageview'),
    'prev_sessions', (select count(distinct session) from ep where type = 'pageview'),
    'leads', (select count(*) from e where name = 'lead'),
    'prev_leads', (select count(*) from ep where name = 'lead'),
    'calls', (select count(*) from e where name = 'phone_click'),
    'whatsapp', (select count(*) from e where name = 'whatsapp_click'),
    'daily', (select coalesce(jsonb_agg(x order by x->>'d'), '[]') from (select jsonb_build_object('d', to_char(date_trunc('day', ts at time zone 'Europe/Riga'), 'YYYY-MM-DD'), 'pv', count(*), 's', count(distinct session)) x from pv group by date_trunc('day', ts at time zone 'Europe/Riga')) t),
    'pages', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('path', path, 'n', count(*), 's', count(distinct session)) x from pv group by path order by count(*) desc limit 25) t),
    'sources', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('src', coalesce(nullif(utm_source, ''), nullif(ref, ''), 'tieši'), 's', count(distinct session)) x from pv group by coalesce(nullif(utm_source, ''), nullif(ref, ''), 'tieši') order by count(distinct session) desc limit 15) t),
    'campaigns', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('c', utm_campaign, 'src', utm_source, 's', count(distinct session)) x from pv where utm_campaign is not null and utm_campaign <> '' group by utm_campaign, utm_source order by count(distinct session) desc limit 10) t),
    'devices', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('k', coalesce(device, '?'), 's', count(distinct session)) x from pv group by device order by count(distinct session) desc) t),
    'countries', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('k', coalesce(country, '?'), 's', count(distinct session)) x from pv group by country order by count(distinct session) desc limit 10) t),
    'events', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('name', name, 'n', count(*), 's', count(distinct session)) x from e where type = 'event' group by name order by count(*) desc) t),
    'tools', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('k', props->>'tool', 's', count(distinct session)) x from e where name = 'tool_use' group by props->>'tool' order by count(distinct session) desc) t),
    'filters', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('k', props->>'filter', 's', count(distinct session)) x from e where name = 'catalog_filter' group by props->>'filter' order by count(distinct session) desc) t),
    'lead_types', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('k', props->>'type', 'n', count(*)) x from e where name = 'lead' group by props->>'type' order by count(*) desc) t),
    'hours', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('h', extract(hour from ts at time zone 'Europe/Riga')::int, 'dow', extract(isodow from ts at time zone 'Europe/Riga')::int, 'n', count(*)) x from pv group by extract(hour from ts at time zone 'Europe/Riga'), extract(isodow from ts at time zone 'Europe/Riga')) t),
    'live', (select count(distinct session) from analytics_events where ts >= now() - interval '5 minutes')
  ) into r;
  return r;
end $$;
revoke all on function public.analytics_summary(int) from public, anon;
grant execute on function public.analytics_summary(int) to authenticated;

-- Vecāki par 13 mēnešiem dati tiek dzēsti
create or replace function public.analytics_cleanup() returns void language sql security definer set search_path = public as $$
  delete from analytics_events where ts < now() - interval '400 days';
$$;
revoke all on function public.analytics_cleanup() from public, anon;
grant execute on function public.analytics_cleanup() to authenticated;
select 'ok' as result;
