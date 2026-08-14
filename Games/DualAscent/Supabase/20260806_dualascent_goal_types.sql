-- DualAscent: individual vs. shared goals
--
-- IMPORTANT: Best-effort script inferred from how Games/DualAscent/app.js calls
-- Supabase (goals table: id, household_id, title, target_amount, target_date,
-- created_by, created_at). I do not have access to the live project, so I cannot
-- see the real column types or existing RLS policies on `goals`. Review this
-- against the actual schema in the Supabase dashboard before running.
--
-- Run in the Supabase SQL Editor for the project backing DualAscent
-- (https://bvweuydrpildjxjmcpxa.supabase.co).

alter table goals
  add column if not exists goal_type text not null default 'shared';

alter table goals
  add constraint goals_goal_type_check check (goal_type in ('shared', 'individual'));

-- Note: this migration only adds the column. It does not change RLS on `goals` —
-- individual goals are still readable by every household member (the app just
-- labels and groups them differently in the UI), not hidden at the database
-- layer. If you want individual goals to be truly private from a partner, that
-- needs a policy change here too, which I'm not making blind without seeing the
-- existing `goals` policies.
