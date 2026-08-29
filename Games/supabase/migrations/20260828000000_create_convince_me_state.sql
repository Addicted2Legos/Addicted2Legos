-- Convince Me: per-user save data, keyed to the Clerk user id.
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
-- Assumes Clerk is already wired up as a third-party auth provider on this
-- project (Authentication > Sign In With Clerk) -- the same setup ClickLasers'
-- leaderboard table relies on -- so auth.jwt()->>'sub' resolves to the Clerk user id.

create table if not exists convince_me_state (
  clerk_user_id text primary key,
  goal_name text not null default '',
  goal_amount numeric not null default 0,
  saved_total numeric not null default 0,
  resisted_count integer not null default 0,
  flow_count integer not null default 0,
  waiting_items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table convince_me_state enable row level security;

create policy "Users can view own convince_me state"
  on convince_me_state for select
  using ((auth.jwt() ->> 'sub') = clerk_user_id);

create policy "Users can insert own convince_me state"
  on convince_me_state for insert
  with check ((auth.jwt() ->> 'sub') = clerk_user_id);

create policy "Users can update own convince_me state"
  on convince_me_state for update
  using ((auth.jwt() ->> 'sub') = clerk_user_id)
  with check ((auth.jwt() ->> 'sub') = clerk_user_id);
