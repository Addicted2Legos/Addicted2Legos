-- DualAscent: fix "column reference "household_id" is ambiguous" in link_partner_by_email
--
-- 20260816_partner_link_code.sql declared `returns table(household_id uuid, ...)`,
-- which implicitly creates a plpgsql variable named household_id in scope for the
-- whole function body. The WHERE clause `and household_id = v_my_household_id`
-- (no table alias) was then ambiguous between that variable and the
-- household_members.household_id column, so every call errored out and rolled
-- back -- nobody ever actually got an invite code. This renames the output
-- columns so they can't collide with any real table column, and qualifies every
-- household_members reference with an alias so this can't happen again.
--
-- Run in the Supabase SQL Editor for the project backing DualAscent, after
-- 20260816_partner_link_code.sql.

create or replace function link_partner_by_email(
  p_my_email text,
  p_partner_email text,
  p_display_name text,
  p_partner_code text default null
)
returns table(out_household_id uuid, out_link_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_id text := auth.jwt() ->> 'sub';
  v_my_email text := lower(trim(p_my_email));
  v_partner_email text := lower(trim(p_partner_email));
  v_partner_code text := nullif(upper(trim(p_partner_code)), '');
  v_my_household_id uuid;
  v_my_code text := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
  v_match_member_id text;
  v_match_household_id uuid;
begin
  select hm.household_id into v_my_household_id
  from household_members hm
  where hm.clerk_user_id = v_my_id
  limit 1;

  if v_my_household_id is null then
    insert into households (name, invite_code, is_solo)
    values ('Our Household', upper(substring(md5(random()::text) from 1 for 6)), false)
    returning id into v_my_household_id;

    insert into household_members (household_id, clerk_user_id, display_name, email, pending_partner_email, partner_link_code)
    values (v_my_household_id, v_my_id, p_display_name, v_my_email, v_partner_email, v_my_code);
  else
    update household_members hm
      set email = v_my_email,
          pending_partner_email = v_partner_email,
          display_name = p_display_name,
          partner_link_code = v_my_code
      where hm.clerk_user_id = v_my_id
        and hm.household_id = v_my_household_id;

    -- Was solo (e.g. the default single-member household app.js creates on
    -- first sign-in) -- entering a partner's email means we're no longer solo.
    update households set is_solo = false where id = v_my_household_id;
  end if;

  -- Only counts as a match if the caller supplied the code from the partner's
  -- actual invite message. Their email alone is no longer sufficient -- that
  -- was the whole point of this migration.
  if v_partner_code is not null then
    select hm.clerk_user_id, hm.household_id
      into v_match_member_id, v_match_household_id
    from household_members hm
    where hm.clerk_user_id <> v_my_id
      and hm.email = v_partner_email
      and hm.pending_partner_email = v_my_email
      and hm.partner_link_code = v_partner_code
    limit 1;
  end if;

  if v_match_member_id is not null and v_match_household_id <> v_my_household_id then
    update household_members hm
      set household_id = v_match_household_id,
          pending_partner_email = null,
          partner_link_code = null
      where hm.clerk_user_id = v_my_id;

    update household_members hm
      set pending_partner_email = null,
          partner_link_code = null
      where hm.clerk_user_id = v_match_member_id;

    delete from households where id = v_my_household_id;

    v_my_household_id := v_match_household_id;

    -- The household we merged into may itself have been someone's solo
    -- household (they were also going it alone until this match).
    update households set is_solo = false where id = v_my_household_id;
  end if;

  return query select v_my_household_id, v_my_code;
end;
$$;

revoke all on function link_partner_by_email(text, text, text, text) from public;
grant execute on function link_partner_by_email(text, text, text, text) to authenticated;
