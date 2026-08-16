-- DualAscent: persist the Spending Plan (CSP) and Vision & Dialogue tabs
--
-- Neither tab currently saves anything — reloading the page (or logging back
-- in later) loses whatever was entered. This adds:
--   - households.csp_budget (jsonb) — the shared Conscious Spending Plan numbers
--   - households.vision_text (text) — the shared "Rich Life" vision statement
--   - member_profiles.vision_info (jsonb) — each person's own Money Dial picks
--     (their own top dial, and their guess at their partner's), kept separate
--     from member_profiles.preferences so saving one never overwrites the other
--
-- households doesn't have a per-member UPDATE policy (only create_household,
-- a security-definer RPC, has ever written to it), so writes go through two
-- new security-definer RPCs the same way link_partner_by_email does, rather
-- than opening up direct client-side UPDATE access to the whole table.
--
-- IMPORTANT: Best-effort script — I don't have access to the live project, so
-- review this against the actual schema in the Supabase dashboard before
-- running it, the same as the other migrations in this folder.
--
-- Run in the Supabase SQL Editor for the project backing DualAscent
-- (https://bvweuydrpildjxjmcpxa.supabase.co).

alter table households
  add column if not exists csp_budget jsonb;

alter table households
  add column if not exists vision_text text;

alter table member_profiles
  add column if not exists vision_info jsonb not null default '{}'::jsonb;

create or replace function save_household_budget(
  p_net_income numeric,
  p_fixed numeric,
  p_invest numeric,
  p_savings numeric,
  p_guiltfree numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := auth.jwt() ->> 'sub';
  v_household_id uuid;
begin
  select household_id into v_household_id
  from household_members
  where clerk_user_id = v_uid
  limit 1;

  if v_household_id is null then
    raise exception 'Set up your household first, on the Household tab.';
  end if;

  update households
  set csp_budget = jsonb_build_object(
    'netIncome', p_net_income,
    'fixed', p_fixed,
    'invest', p_invest,
    'savings', p_savings,
    'guiltfree', p_guiltfree
  )
  where id = v_household_id;
end;
$$;

revoke all on function save_household_budget(numeric, numeric, numeric, numeric, numeric) from public;
grant execute on function save_household_budget(numeric, numeric, numeric, numeric, numeric) to authenticated;

create or replace function save_household_vision(p_vision_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := auth.jwt() ->> 'sub';
  v_household_id uuid;
begin
  select household_id into v_household_id
  from household_members
  where clerk_user_id = v_uid
  limit 1;

  if v_household_id is null then
    raise exception 'Set up your household first, on the Household tab.';
  end if;

  update households
  set vision_text = p_vision_text
  where id = v_household_id;
end;
$$;

revoke all on function save_household_vision(text) from public;
grant execute on function save_household_vision(text) to authenticated;
