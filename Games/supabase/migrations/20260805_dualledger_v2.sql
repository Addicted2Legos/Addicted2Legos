-- DualLedger v2 migration
--
-- IMPORTANT: This is a best-effort script inferred from how Games/DualLedger.html
-- calls Supabase (create_household/join_household RPCs, households, household_members,
-- goals, ledger_entries tables). I do not have access to the live project, so I cannot
-- see the real column types, existing RLS policies, or the current body of
-- create_household/join_household. Review every statement below against the actual
-- schema in the Supabase dashboard (Table Editor + Database > Functions) before running
-- any of this, especially the CREATE OR REPLACE FUNCTION block, which will overwrite
-- your existing create_household function.
--
-- Run in the Supabase SQL Editor for the project backing DualLedger.html
-- (https://bvweuydrpildjxjmcpxa.supabase.co).

-- 1. Solo vs. partner households -------------------------------------------------

alter table households
  add column if not exists is_solo boolean not null default false;

-- Best-effort replacement of create_household to accept a p_is_solo flag.
-- >>> Compare this against your existing function definition before running. <<<
-- If your real function has different parameter names/order, or does more than
-- insert into households + household_members, copy this is_solo logic into the
-- real body instead of replacing it wholesale.
create or replace function create_household(
  p_name text,
  p_display_name text,
  p_is_solo boolean default false
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_household_id uuid;
  v_invite_code text;
begin
  v_invite_code := upper(substring(md5(random()::text) from 1 for 6));

  insert into households (name, invite_code, is_solo)
  values (p_name, v_invite_code, p_is_solo)
  returning id into v_household_id;

  insert into household_members (household_id, clerk_user_id, display_name)
  values (v_household_id, auth.jwt() ->> 'sub', p_display_name);

  return v_household_id;
end;
$$;

-- 2. Per-member profile: archetype, XP, personal/financial info, preferences -----

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

-- Mirror whatever policy pattern goals/ledger_entries already use (household
-- members only). Adjust the auth.jwt() claim lookup if your existing policies
-- use a different expression.
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

-- 3. Learning Together items -------------------------------------------------------

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
