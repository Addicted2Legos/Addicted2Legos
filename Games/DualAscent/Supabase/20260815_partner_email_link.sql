-- DualAscent: connect with a partner by email instead of an invite code
--
-- Replaces the invite-code join flow (create_household p_is_solo:false + join_household)
-- with mutual email entry: each person enters the other's email address, and once both
-- sides match, they're merged into the same household automatically.
--
-- IMPORTANT: Best-effort script inferred from how Games/DualAscent/app.js now calls
-- Supabase (household_members table gains `email` / `pending_partner_email`, plus a new
-- link_partner_by_email RPC). I do not have access to the live project, so I cannot see
-- the real column types or existing RLS policies. Review this against the actual schema
-- in the Supabase dashboard before running, the same way the 20260805/20260813 migrations
-- in this folder ask you to.
--
-- Run in the Supabase SQL Editor for the project backing DualAscent
-- (https://bvweuydrpildjxjmcpxa.supabase.co).
--
-- Note: this does NOT drop the old join_household function or households.invite_code
-- column — both are left in place (harmless, unused by the app going forward) so this
-- migration stays additive and reversible. Delete them later once you've confirmed the
-- new flow works, if you want to tidy up.

-- 1. Track each member's own email and who they're waiting to match with -----------

alter table household_members
  add column if not exists email text;

alter table household_members
  add column if not exists pending_partner_email text;

-- 2. RPC: enter/update a partner's email, and auto-merge on a mutual match ---------
--
-- First call for a user creates a household for them (is_solo = false, 1 member) so
-- the rest of the app (goals/ledger/learning tabs, which only gate on "a household
-- exists") unlocks immediately, without waiting for the partner. If a second person
-- has already entered this user's email as their partner_email (and vice versa), the
-- caller's household_members row is moved into that person's household and the
-- caller's now-empty household is deleted, so there's always exactly one shared
-- household per matched pair.

create or replace function link_partner_by_email(
  p_my_email text,
  p_partner_email text,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_id text := auth.jwt() ->> 'sub';
  v_my_email text := lower(trim(p_my_email));
  v_partner_email text := lower(trim(p_partner_email));
  v_my_household_id uuid;
  v_match_member_id text;
  v_match_household_id uuid;
begin
  select household_id into v_my_household_id
  from household_members
  where clerk_user_id = v_my_id
  limit 1;

  if v_my_household_id is null then
    insert into households (name, invite_code, is_solo)
    values ('Our Household', upper(substring(md5(random()::text) from 1 for 6)), false)
    returning id into v_my_household_id;

    insert into household_members (household_id, clerk_user_id, display_name, email, pending_partner_email)
    values (v_my_household_id, v_my_id, p_display_name, v_my_email, v_partner_email);
  else
    update household_members
      set email = v_my_email,
          pending_partner_email = v_partner_email,
          display_name = p_display_name
      where clerk_user_id = v_my_id
        and household_id = v_my_household_id;
  end if;

  -- Is someone else waiting on me? (their account email = the partner email I just
  -- entered, and the email they're waiting on = mine)
  select hm.clerk_user_id, hm.household_id
    into v_match_member_id, v_match_household_id
  from household_members hm
  where hm.clerk_user_id <> v_my_id
    and hm.email = v_partner_email
    and hm.pending_partner_email = v_my_email
  limit 1;

  if v_match_member_id is not null and v_match_household_id <> v_my_household_id then
    update household_members
      set household_id = v_match_household_id,
          pending_partner_email = null
      where clerk_user_id = v_my_id;

    update household_members
      set pending_partner_email = null
      where clerk_user_id = v_match_member_id;

    delete from households where id = v_my_household_id;

    v_my_household_id := v_match_household_id;
  end if;

  return v_my_household_id;
end;
$$;

revoke all on function link_partner_by_email(text, text, text) from public;
grant execute on function link_partner_by_email(text, text, text) to authenticated;
