-- Restricts game_name in game_plays/game_errors to the known set of games,
-- via a small reference table + foreign key. This blocks bogus or malicious
-- game_name values (e.g. HTML/script payloads sent by scripting the public
-- anon key directly against the REST API, bypassing analytics.js entirely)
-- from ever landing in the table -- on top of, not instead of, the safe DOM
-- rendering already in place on the Statistics page.
--
-- Run this after 20260829000000_create_game_analytics.sql and
-- 20260829010000_add_engagement_tracking.sql (needs game_plays and
-- game_errors to already exist).
--
-- To add a new game later: insert its display name into `games` (matching
-- the window.GAME_NAME set on its entry page) before wiring up its tracking
-- snippet, or its plays will be rejected until you do.

create table if not exists games (
  name text primary key
);

insert into games (name) values
  ('Acid Cap'),
  ('Arena Security Guard'),
  ('Boat Ramp'),
  ('Buff Man'),
  ('Bunny Bunching'),
  ('Click Lasers'),
  ('Convince Me'),
  ('Creature Concatenizer'),
  ('Current Climber'),
  ('Defensive Day'),
  ('Demolition Derby'),
  ('Desolation Drift'),
  ('Dock Director'),
  ('Dragon Dinner'),
  ('DualAscent'),
  ('Echo Swarm'),
  ('Fire Town'),
  ('Fluffy Mech Warrior'),
  ('Following Frogs'),
  ('Forest Adventure'),
  ('Grappling Hook'),
  ('Grown Up Stuff'),
  ('Hazzard Whopper'),
  ('Hexagon Tycoon'),
  ('Iron Horizons'),
  ('King Shot Remake'),
  ('Laser Mirrors'),
  ('Life In Reverse'),
  ('Mighty Marching'),
  ('Mr Shark'),
  ('Pancake Panic'),
  ('Pic Pick'),
  ('Rover Rush'),
  ('Scary Go Round'),
  ('Skyward Bounty'),
  ('Slap Face'),
  ('Space Shooter'),
  ('Squeeling Dragon'),
  ('Subnautic Biosphere'),
  ('Swarm Shepherd'),
  ('Train Game'),
  ('Train from Gemin'),
  ('Triple Axel'),
  ('Truck & Trailer'),
  ('Vector Strike'),
  ('Water Falling'),
  ('Wheeling Wilderness')
on conflict (name) do nothing;

alter table games enable row level security;

create policy "Anyone can read the game list"
  on games for select
  using (true);

grant select on games to anon, authenticated;

-- If either of these fails with a foreign key violation, some rows already
-- in game_plays/game_errors have a game_name that isn't in the list above
-- (e.g. spam, or a game whose name changed) -- add it to `games` or delete
-- those rows, then re-run.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'game_plays_game_name_fkey'
  ) then
    alter table game_plays
      add constraint game_plays_game_name_fkey
      foreign key (game_name) references games (name);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'game_errors_game_name_fkey'
  ) then
    alter table game_errors
      add constraint game_errors_game_name_fkey
      foreign key (game_name) references games (name);
  end if;
end $$;
