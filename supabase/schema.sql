-- Odyssey Eval Task: submissions table
-- Run this once in Supabase SQL Editor (Project -> SQL Editor -> New query)
-- If you already ran the old version of this file, drop the old table first:
--   drop table if exists public.eval_submissions;

create table if not exists public.eval_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- who
  attempter_name text not null,
  attempter_email text not null,
  task_id text not null,           -- e.g. 'xauusdt-macro-2026-08-12'

  -- three scored dimensions, 1-5, each with its own justification
  score_intent_recognition int not null check (score_intent_recognition between 1 and 5),
  intent_recognition_justification text not null,

  score_authority int not null check (score_authority between 1 and 5),
  authority_justification text not null,

  score_utility int not null check (score_utility between 1 and 5),
  utility_justification text not null,

  -- open feedback
  feedback_general text not null,       -- what worked well / what you'd do differently
  feedback_new_dimensions text,         -- optional: proposed additional dimension(s) + definition

  -- timing, for QA
  total_seconds int
);

alter table public.eval_submissions enable row level security;

-- Allow inserts from the anon/publishable key (attempters submitting via the app).
-- No public read/update/delete policy is created, so submissions cannot
-- be listed or altered with that key once written.
create policy "anon can insert submissions"
  on public.eval_submissions
  for insert
  to anon
  with check (true);

-- Reads happen with the service role key only (e.g. the Supabase Table Editor,
-- or an internal review dashboard you build later). Never expose the
-- service role key in the app.
