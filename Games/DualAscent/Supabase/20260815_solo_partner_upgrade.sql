-- DualAscent: let a solo household upgrade to a shared one via partner linking
--
-- app.js now defaults every new sign-in straight into a solo household (instead
-- of making Profile/Spending Plan/Vision wait on a manual "Just Me" vs. "With a
-- Partner" choice on the Household tab). That means link_partner_by_email's old
-- assumption -- that a caller either has NO household yet, or already has a
-- non-solo one -- no longer holds: someone who started solo and later hits
-- "Connect with a Partner" from the Household tab now calls this RPC while
-- already belonging to a solo household, and its existing-household branch
-- never flipped is_solo to false. Without this fix, shared features (ledger,
-- goal type, partner dial, etc. -- gated on households.is_solo in
-- applyModeVisibility) would stay hidden even after a partner is linked.
--
-- Run in the Supabase SQL Editor for the project backing DualAscent, after
-- 20260815_partner_email_link.sql.

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
