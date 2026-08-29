-- Site-wide game analytics: one row per page load of a game's entry page.
-- Logged client-side by Games/analytics.js using the anon key, so RLS only
-- allows inserts -- raw rows (country/region/referrer/user-agent) are not
-- publicly readable. The Statistics page reads pre-aggregated views instead,
-- which are owned by the migration role and therefore bypass the base
-- table's RLS (Postgres: table owners bypass RLS by default, and a view
-- runs with its owner's privileges), while still only ever exposing counts.

create table if not exists game_plays (
  id bigint generated always as identity primary key,
  game_name text not null,
  session_id text,
  country text,
  region text,
  referrer text,
  user_agent text,
  played_at timestamptz not null default now()
);

create index if not exists game_plays_game_name_idx on game_plays (game_name);
create index if not exists game_plays_played_at_idx on game_plays (played_at);

alter table game_plays enable row level security;

create policy "Anyone can log a play"
  on game_plays for insert
  with check (true);

-- Total plays per game, most-played first.
create or replace view game_play_counts as
  select
    game_name,
    count(*)::bigint as play_count,
    count(distinct session_id)::bigint as unique_sessions,
    max(played_at) as last_played_at
  from game_plays
  group by game_name
  order by play_count desc;

-- Plays by country.
create or replace view plays_by_country as
  select
    coalesce(country, 'Unknown') as country,
    count(*)::bigint as play_count
  from game_plays
  group by coalesce(country, 'Unknown')
  order by play_count desc;

-- Plays by state/region within a country.
create or replace view plays_by_region as
  select
    coalesce(country, 'Unknown') as country,
    coalesce(region, 'Unknown') as region,
    count(*)::bigint as play_count
  from game_plays
  group by coalesce(country, 'Unknown'), coalesce(region, 'Unknown')
  order by play_count desc;

-- Daily play volume (site-wide), for a trend line.
create or replace view plays_by_day as
  select
    date_trunc('day', played_at)::date as day,
    count(*)::bigint as play_count
  from game_plays
  group by date_trunc('day', played_at)::date
  order by day;

-- Site-wide totals for the summary tiles.
create or replace view game_stats_summary as
  select
    count(*)::bigint as total_plays,
    count(distinct session_id)::bigint as unique_sessions,
    count(distinct game_name)::bigint as games_played,
    count(distinct country) filter (where country is not null)::bigint as countries_reached,
    min(played_at) as tracking_since
  from game_plays;

grant select on game_play_counts, plays_by_country, plays_by_region, plays_by_day, game_stats_summary
  to anon, authenticated;
