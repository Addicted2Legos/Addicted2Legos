-- DualAscent: admin roster (with roles) + site-wide error log
--
-- Two new pieces, backing the new Admin section (admin.html, admin-errors.html,
-- admin-admins.html, admin-accept.html):
--
-- 1. app_admins -- who is an admin and at what role (read / manage / full).
--    Adding a new admin works like the partner-linking fix: you invite by
--    email, and a random one-time token is generated. UNLIKE partner-linking,
--    that token is never matched against a self-reported email -- it's only
--    ever revealed to whoever the inviting full-admin actually sends the
--    accept-invite link to, so there's no way to hijack someone else's
--    pending invite by guessing their email (which is exactly the bug we just
--    fixed in link_partner_by_email -- admin access is more sensitive, so
--    this uses the stronger of the two patterns).
--
-- 2. error_logs -- every uncaught JS error/rejection, plus the app's existing
--    handled failures (failed saves/loads), all funneled through one
--    logAndConsoleError() helper in app.js. Anyone can insert (so errors
--    before sign-in still get captured); only admins can read.
--
-- Run in the Supabase SQL Editor for the project backing DualAscent, after
-- 20260816_fix_partner_link_code_ambiguous_column.sql.

create table if not exists app_admins (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  clerk_user_id text,
  display_name text,
  role text not null default 'read' check (role in ('read', 'manage', 'full')),
  invite_token text,
  created_at timestamptz not null default now(),
  created_by text,
  activated_at timestamptz
);
create unique index if not exists app_admins_email_key on app_admins (lower(email));
create unique index if not exists app_admins_clerk_user_id_key on app_admins (clerk_user_id) where clerk_user_id is not null;
alter table app_admins enable row level security;

-- security definer so RLS on app_admins itself never has to reference
-- app_admins from within its own policy (same recursion trap the
-- household_members fix addressed) -- and so it can be reused from error_logs'
-- policies below.
create or replace function is_admin(p_min_role text default 'read')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from app_admins a
    where a.clerk_user_id = auth.jwt() ->> 'sub'
      and (
        p_min_role = 'read'
        or (p_min_role = 'manage' and a.role in ('manage', 'full'))
        or (p_min_role = 'full' and a.role = 'full')
      )
  );
$$;
revoke all on function is_admin(text) from public;
grant execute on function is_admin(text) to authenticated;

-- One round trip for the client to find out its own role (or null), instead
-- of calling is_admin() three times to figure out which tier applies.
create or replace function my_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from app_admins where clerk_user_id = auth.jwt() ->> 'sub';
$$;
revoke all on function my_admin_role() from public;
grant execute on function my_admin_role() to authenticated;

-- All writes to app_admins go through the functions below (each checks
-- is_admin('full') itself) -- no direct insert/update/delete policy exists,
-- so nothing can bypass that check.
create policy "admins can view the admin roster" on app_admins
  for select using (is_admin('read'));

create or replace function invite_admin(p_email text, p_role text)
returns table(out_id uuid, out_invite_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_token text := md5(random()::text || clock_timestamp()::text);
  v_id uuid;
begin
  if not is_admin('full') then
    raise exception 'Only full admins can invite new admins.';
  end if;
  if p_role not in ('read', 'manage', 'full') then
    raise exception 'Invalid role: %', p_role;
  end if;

  insert into app_admins (email, role, invite_token, created_by)
  values (v_email, p_role, v_token, auth.jwt() ->> 'sub')
  on conflict (lower(email)) do update
    set role = excluded.role,
        invite_token = excluded.invite_token,
        created_by = excluded.created_by,
        created_at = now()
    where app_admins.clerk_user_id is null
  returning id into v_id;

  if v_id is null then
    raise exception 'That email is already an active admin.';
  end if;

  return query select v_id, v_token;
end;
$$;
revoke all on function invite_admin(text, text) from public;
grant execute on function invite_admin(text, text) to authenticated;

-- Deliberately callable by anyone signed in, regardless of admin status --
-- accepting your own invite is how you become an admin in the first place.
-- Matching is purely on the unguessable token, never on email, so this can't
-- be used to claim an invite meant for someone else.
create or replace function accept_admin_invite(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matched uuid;
begin
  update app_admins
    set clerk_user_id = auth.jwt() ->> 'sub',
        activated_at = now(),
        invite_token = null
    where invite_token = p_token
      and clerk_user_id is null
    returning id into v_matched;
  return v_matched is not null;
end;
$$;
revoke all on function accept_admin_invite(text) from public;
grant execute on function accept_admin_invite(text) to authenticated;

create or replace function update_admin_role(p_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin('full') then
    raise exception 'Only full admins can change admin roles.';
  end if;
  if p_role not in ('read', 'manage', 'full') then
    raise exception 'Invalid role: %', p_role;
  end if;
  update app_admins set role = p_role where id = p_id;
end;
$$;
revoke all on function update_admin_role(uuid, text) from public;
grant execute on function update_admin_role(uuid, text) to authenticated;

create or replace function remove_admin(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin('full') then
    raise exception 'Only full admins can remove admins.';
  end if;
  delete from app_admins where id = p_id;
end;
$$;
revoke all on function remove_admin(uuid) from public;
grant execute on function remove_admin(uuid) to authenticated;

-- ---------------------------------------------------------------------------

create table if not exists error_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  severity text not null default 'error' check (severity in ('error', 'warning', 'info')),
  source text not null,
  message text not null check (char_length(message) <= 4000),
  stack text check (char_length(stack) <= 8000),
  page text,
  url text,
  user_agent text,
  clerk_user_id text,
  context jsonb,
  resolved boolean not null default false,
  resolved_by text,
  resolved_at timestamptz
);
alter table error_logs enable row level security;

create policy "anyone can log an error" on error_logs
  for insert with check (true);

create policy "admins can view error logs" on error_logs
  for select using (is_admin('read'));

create policy "managers can resolve error logs" on error_logs
  for update using (is_admin('manage'));

-- Lets the admin pages get live "new error" / "new support message" updates
-- via Supabase Realtime instead of polling. Wrapped in DO blocks since this
-- errors (harmlessly) if the table's already a publication member.
do $$
begin
  execute 'alter publication supabase_realtime add table error_logs';
exception when others then
  raise notice 'error_logs may already be in supabase_realtime: %', sqlerrm;
end $$;

do $$
begin
  execute 'alter publication supabase_realtime add table support_messages';
exception when others then
  raise notice 'support_messages may already be in supabase_realtime: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- One-time bootstrap: without this, nobody could ever pass is_admin('full')
-- to invite the first real admin. >>> Verify this clerk_user_id is actually
-- yours before running -- it's inferred from households.created_by in an
-- earlier session; if it's wrong, sign in, open the browser console, and run
-- window.Clerk.user.id to get the right value, then fix this insert. <<<
insert into app_admins (email, clerk_user_id, display_name, role, activated_at)
values ('rileyjohnson@gmail.com', 'user_3HXrdyacccVITdQjCS9lj5RX4HI', 'Riley Johnson', 'full', now())
on conflict (lower(email)) do update
  set clerk_user_id = excluded.clerk_user_id,
      role = 'full',
      activated_at = now();
