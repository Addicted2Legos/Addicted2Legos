-- DualAscent: Connected Accounts tab (optional LinkedIn identity link)
--
-- Scope, deliberately narrow: this lets someone connect their own LinkedIn
-- account to verify their identity and optionally add a self-typed
-- professional headline to their profile. It does NOT ingest job history,
-- employer, connections, posts, or anything else — LinkedIn's standard
-- "Sign In with LinkedIn using OpenID Connect" product (the only product
-- available without LinkedIn Partner Program approval) only returns name,
-- email, and profile photo. There is no attempt here to infer income,
-- net worth, or spending capacity from any of this.
--
-- Adds columns to member_profiles for: the LinkedIn account's stable id
-- (linkedin_sub), the identity fields OAuth returns (name/email/photo),
-- when it was connected, and an optional self-typed headline (since the
-- job title/company aren't available via the API and have to be typed in
-- by the person themselves if they want them reflected here).
--
-- No new RLS policies needed — these are just additional columns on
-- member_profiles, already covered by the existing "members can
-- upsert/update their own profile" policies from 20260805_dualledger_v2.sql.
--
-- Run in the Supabase SQL Editor for the project backing DualAscent
-- (https://bvweuydrpildjxjmcpxa.supabase.co), after the other 20260815
-- migrations in this folder.

alter table member_profiles
  add column if not exists linkedin_sub text,
  add column if not exists linkedin_name text,
  add column if not exists linkedin_email text,
  add column if not exists linkedin_photo_url text,
  add column if not exists linkedin_headline text,
  add column if not exists linkedin_connected_at timestamptz;
