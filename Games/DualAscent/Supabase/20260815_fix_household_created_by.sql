-- DualAscent: fix household creation so profile/goals/ledger/etc. can save at all
--
-- Confirmed live against https://bvweuydrpildjxjmcpxa.supabase.co (via the app's own
-- anon key): every RPC that inserts a new row into `households` --
-- create_household() and both versions of link_partner_by_email() -- omits the
-- `created_by` column, which is NOT NULL on the live table. Every one of those
-- calls fails with:
--   23502 null value in column "created_by" of relation "households" violates
--   not-null constraint
--
-- Because app.js auto-calls create_household on every first sign-in (see
-- loadHousehold() in app.js), this means brand-new sign-ins -- and anyone whose
-- household got deleted/merged away by link_partner_by_email's matching logic --
-- can never get a household. Without a household, currentHousehold stays null,
-- and every save path that gates on it (saveProfile, saveArchetype, goals,
-- ledger, learning items, CSP/vision) silently fails or shows "Couldn't reach
-- your account yet."
--
-- This re-defines both functions with `created_by` set to the calling user's
-- Clerk id (auth.jwt() ->> 'sub'), matching how every other user-identity column
-- in this schema (household_members.clerk_user_id, member_profiles.clerk_user_id,
-- etc.) is stored. I don't have access to the live project, so double check
-- households.created_by's actual column type in the dashboard before running --
-- if it's a uuid FK rather than text, this insert will fail differently and the
-- cast needs to change.
--
-- Run in the Supabase SQL Editor for the project backing DualAscent
-- (https://bvweuydrpildjxjmcpxa.supabase.co), after the other 20260815 migrations
-- in this folder.

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

  insert into households (name, invite_code, is_solo, created_by)
  values (p_name, v_invite_code, p_is_solo, auth.jwt() ->> 'sub')
  returning id into v_household_id;

  insert into household_members (household_id, clerk_user_id, display_name)
  values (v_household_id, auth.jwt() ->> 'sub', p_display_name);

  return v_household_id;
end;
$$;

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
    insert into households (name, invite_code, is_solo, created_by)
    values ('Our Household', upper(substring(md5(random()::text) from 1 for 6)), false, v_my_id)
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

    -- Was solo (e.g. the default single-member household app.js now creates on
    -- first sign-in) -- entering a partner's email means we're no longer solo.
    update households set is_solo = false where id = v_my_household_id;
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

    -- The household we merged into may itself have been someone's solo
    -- household (they were also going it alone until this match).
    update households set is_solo = false where id = v_my_household_id;
  end if;

  return v_my_household_id;
end;
$$;

revoke all on function link_partner_by_email(text, text, text) from public;
grant execute on function link_partner_by_email(text, text, text) to authenticated;
