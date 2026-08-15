-- DualAscent: Support page question/comment board
--
-- Backs the new Support page (support.html), a single shared board — not scoped
-- to a household — where anyone signed in can post a question or comment, and
-- everyone signed in can read the whole board.
--
-- IMPORTANT: Best-effort script inferred from how Games/DualAscent/app.js calls
-- Supabase. I do not have access to the live project, so I cannot see existing
-- RLS conventions beyond what earlier migrations in this folder established.
-- Review this against the actual schema in the Supabase dashboard before running.
--
-- Run in the Supabase SQL Editor for the project backing DualAscent
-- (https://bvweuydrpildjxjmcpxa.supabase.co).

create table if not exists support_messages (
    id uuid primary key default gen_random_uuid(),
    clerk_user_id text not null,
    display_name text,
    message text not null,
    created_at timestamptz not null default now()
);

alter table support_messages enable row level security;

create policy "any signed-in user can read support messages"
    on support_messages for select
    to authenticated
    using (true);

create policy "users can post their own support messages"
    on support_messages for insert
    to authenticated
    with check (clerk_user_id = auth.jwt() ->> 'sub');
