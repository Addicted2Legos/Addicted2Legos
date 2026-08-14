-- DualAscent: apply schema that was written but never run against the live project
--
-- Verified live against https://bvweuydrpildjxjmcpxa.supabase.co (via the app's own
-- anon key) that the following are missing, which is why profile saves, archetype
-- selection, Learning Together topics, and goal creation all silently fail today:
--   - table public.member_profiles  (from 20260805_dualledger_v2.sql)
--   - table public.learning_items   (from 20260805_dualledger_v2.sql)
--   - column public.goals.goal_type (from 20260806_dualascent_goal_types.sql)
--
-- households.is_solo and the create_household/join_household functions already
-- work, so this file intentionally does NOT re-run the "create or replace function
-- create_household" block from 20260805_dualledger_v2.sql — that part is already
-- live and re-running it would be an unnecessary risk to working functions.
--
-- Run this once in the Supabase SQL Editor for the DualAscent project, then reload
-- the app and re-save your profile.

-- 1. Per-member profile: archetype, XP, personal/financial info, preferences -----

create table if not exists member_profiles (
  household_id uuid not null references households(id) on delete cascade,
  clerk_user_id text not null,
  archetype text,
  xp integer not null default 0,
  personal_info jsonb not null default '{}'::jsonb,
  financial_info jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (household_id, clerk_user_id)
);

alter table member_profiles enable row level security;

create policy "household members can read profiles"
  on member_profiles for select
  using (
    exists (
      select 1 from household_members hm
      where hm.household_id = member_profiles.household_id
        and hm.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "members can upsert their own profile"
  on member_profiles for insert
  with check (clerk_user_id = auth.jwt() ->> 'sub');

create policy "members can update their own profile"
  on member_profiles for update
  using (clerk_user_id = auth.jwt() ->> 'sub');

-- 2. Learning Together items -------------------------------------------------------

create table if not exists learning_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  author_clerk_user_id text not null,
  target_clerk_user_id text, -- null = "for myself"
  topic text not null,
  note text,
  status text not null default 'open', -- 'open' | 'done'
  created_at timestamptz not null default now()
);

alter table learning_items enable row level security;

create policy "household members can read learning items"
  on learning_items for select
  using (
    exists (
      select 1 from household_members hm
      where hm.household_id = learning_items.household_id
        and hm.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "household members can add learning items"
  on learning_items for insert
  with check (
    author_clerk_user_id = auth.jwt() ->> 'sub'
    and exists (
      select 1 from household_members hm
      where hm.household_id = learning_items.household_id
        and hm.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "household members can update learning items"
  on learning_items for update
  using (
    exists (
      select 1 from household_members hm
      where hm.household_id = learning_items.household_id
        and hm.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- 3. Individual vs. shared goals ---------------------------------------------------

alter table goals
  add column if not exists goal_type text not null default 'shared';

alter table goals
  add constraint goals_goal_type_check check (goal_type in ('shared', 'individual'));
