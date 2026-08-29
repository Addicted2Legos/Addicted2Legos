-- Extends game_plays with engagement/completion tracking, device & referrer
-- breakdowns, and error logging, plus the aggregate views the Statistics
-- page reads for them. Additive only -- safe to run whether or not
-- 20260829000000_create_game_analytics.sql has already been applied.

alter table game_plays add column if not exists play_id text;
alter table game_plays add column if not exists duration_seconds integer;
alter table game_plays add column if not exists completed boolean not null default false;
alter table game_plays add column if not exists device_type text;
alter table game_plays add column if not exists browser text;
alter table game_plays add column if not exists referrer_host text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'game_plays_play_id_key'
  ) then
    alter table game_plays add constraint game_plays_play_id_key unique (play_id);
  end if;
end $$;

-- Lets a page update its own row once it knows how long the visit lasted (or
-- that it hit a completion event), after the initial insert. Scoped to rows
-- carrying a play_id (older rows have none) from the last day, since an
-- anonymous client can't otherwise prove which row is "its own" -- same
-- lightweight trust model as the existing anonymous insert policy. This does
-- mean anyone holding a recent play_id could overwrite that row's
-- duration/completed fields; acceptable for a hobby analytics table with no
-- sensitive data, same tradeoff the public leaderboard table already makes.
create policy "Can complete own recent play by play_id"
  on game_plays for update
  using (play_id is not null and played_at > now() - interval '1 day')
  with check (play_id is not null);

create table if not exists game_errors (
  id bigint generated always as identity primary key,
  game_name text not null,
  session_id text,
  message text,
  source text,
  lineno integer,
  colno integer,
  stack text,
  created_at timestamptz not null default now()
);

create index if not exists game_errors_game_name_idx on game_errors (game_name);

alter table game_errors enable row level security;

create policy "Anyone can log an error"
  on game_errors for insert
  with check (true);

-- Per-game totals, extended with engagement + completion. New columns are
-- appended at the end so this remains a valid CREATE OR REPLACE of the
-- original view (Postgres won't allow reordering/removing view columns).
create or replace view game_play_counts as
  select
    game_name,
    count(*)::bigint as play_count,
    count(distinct session_id)::bigint as unique_sessions,
    max(played_at) as last_played_at,
    round(avg(duration_seconds) filter (where duration_seconds is not null))::bigint as avg_duration_seconds,
    round(100.0 * count(*) filter (where completed) / nullif(count(*), 0), 1) as completion_rate_pct
  from game_plays
  group by game_name
  order by play_count desc;

create or replace view plays_by_device as
  select coalesce(device_type, 'Unknown') as device_type, count(*)::bigint as play_count
  from game_plays
  group by coalesce(device_type, 'Unknown')
  order by play_count desc;

create or replace view plays_by_browser as
  select coalesce(browser, 'Unknown') as browser, count(*)::bigint as play_count
  from game_plays
  group by coalesce(browser, 'Unknown')
  order by play_count desc;

create or replace view plays_by_referrer as
  select coalesce(nullif(referrer_host, ''), 'Direct') as referrer_host, count(*)::bigint as play_count
  from game_plays
  group by coalesce(nullif(referrer_host, ''), 'Direct')
  order by play_count desc;

-- Bounce (<5s) vs engaged, site-wide. Visits with no duration recorded yet
-- (tab closed before the completion beacon could fire) are reported
-- separately rather than silently dropped or miscounted as bounces.
create or replace view engagement_summary as
  select
    count(*) filter (where duration_seconds is not null and duration_seconds < 5)::bigint as bounces,
    count(*) filter (where duration_seconds is not null and duration_seconds >= 5)::bigint as engaged,
    count(*) filter (where duration_seconds is null)::bigint as unknown_duration,
    round(avg(duration_seconds) filter (where duration_seconds is not null))::bigint as avg_duration_seconds
  from game_plays;

-- Multi-game and cross-day return behavior, keyed by the browser-local
-- session id (not identity -- clearing storage or switching browsers starts
-- a new session id).
create or replace view retention_summary as
  select
    count(*)::bigint as total_sessions,
    count(*) filter (where games_played_count > 1)::bigint as multi_game_sessions,
    count(*) filter (where active_days > 1)::bigint as returning_sessions
  from (
    select
      session_id,
      count(distinct game_name) as games_played_count,
      count(distinct played_at::date) as active_days
    from game_plays
    where session_id is not null
    group by session_id
  ) s;

-- Counts only -- error messages/stacks stay out of any publicly-readable
-- view, visible only to you in the Supabase dashboard.
create or replace view errors_by_game as
  select game_name, count(*)::bigint as error_count, max(created_at) as last_error_at
  from game_errors
  group by game_name
  order by error_count desc;

grant select on
  plays_by_device, plays_by_browser, plays_by_referrer,
  engagement_summary, retention_summary, errors_by_game
  to anon, authenticated;
