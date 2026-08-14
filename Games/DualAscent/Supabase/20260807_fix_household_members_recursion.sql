-- Fix: infinite recursion detected in policy for relation "household_members"
--
-- The existing policy "Members can view their household's members" on
-- household_members subqueries household_members from within a policy
-- defined ON household_members itself. Postgres re-evaluates that same
-- policy for the inner subquery, which recurses without bound. (Policies on
-- OTHER tables that subquery household_members — e.g. member_profiles,
-- learning_items in 20260805_dualledger_v2.sql — are fine; recursion only
-- happens when a policy queries the very table it protects.)
--
-- Fix: move the "which households am I in" lookup into a SECURITY DEFINER
-- function. Security definer functions run with the function owner's
-- privileges, so the lookup bypasses RLS entirely instead of re-triggering
-- this policy.
--
-- Run in the Supabase SQL Editor for the project backing DualAscent
-- (https://bvweuydrpildjxjmcpxa.supabase.co).

create or replace function my_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id
  from household_members
  where clerk_user_id = auth.jwt() ->> 'sub'
$$;

revoke all on function my_household_ids() from public;
grant execute on function my_household_ids() to authenticated;

drop policy "Members can view their household's members" on household_members;

create policy "Members can view their household's members"
  on household_members
  for select
  to authenticated
  using (
    household_id in (select my_household_ids())
  );
