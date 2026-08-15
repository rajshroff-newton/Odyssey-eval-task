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
drop policy if exists "anon can insert submissions" on public.eval_submissions;
create policy "anon can insert submissions"
  on public.eval_submissions
  for insert
  to anon
  with check (true);

-- Reads happen with the service role key only (e.g. the Supabase Table Editor,
-- or an internal review dashboard you build later). Never expose the
-- service role key in the app.

-- ============================================================
-- Golden rewrite submissions
-- ============================================================

create table if not exists public.golden_rewrite_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- who
  attempter_name text not null,
  attempter_email text not null,
  task_id text not null,           -- e.g. 'xauusdt-golden-rewrite-2026-08-12'

  -- each persona's reasoning checklist, stored as an ordered array of
  -- {step, observations, conclusion} objects (a chain-of-thought style
  -- record, not a flat list of topics)
  -- e.g. [{"step": "...", "observations": "...", "conclusion": "..."}, ...]
  rookie_checklist jsonb not null,
  mid_tier_checklist jsonb not null,
  experienced_checklist jsonb not null,

  -- each persona's rewrite, stored as an array of {heading, bullets: string[]}
  -- e.g. [{"heading": "Core Conclusion", "bullets": ["...", "..."]}, ...]
  rookie_answer jsonb not null,
  mid_tier_answer jsonb not null,
  experienced_answer jsonb not null,

  -- timing, for QA
  total_seconds int
);

alter table public.golden_rewrite_submissions enable row level security;

-- If golden_rewrite_submissions already existed before the checklist
-- columns were added to the create statement above, this adds them now.
-- No-op if they're already there (e.g. on a brand-new table).
alter table public.golden_rewrite_submissions
  add column if not exists rookie_checklist jsonb not null default '[]'::jsonb,
  add column if not exists mid_tier_checklist jsonb not null default '[]'::jsonb,
  add column if not exists experienced_checklist jsonb not null default '[]'::jsonb;

drop policy if exists "anon can insert golden rewrite submissions" on public.golden_rewrite_submissions;
create policy "anon can insert golden rewrite submissions"
  on public.golden_rewrite_submissions
  for insert
  to anon
  with check (true);

-- Reads happen with the service role key only, same as eval_submissions above.

-- ============================================================
-- Task sessions — server-side timing
-- ============================================================
-- The client creates one of these the moment "Start task" is clicked
-- (with an id it generates itself), before any task content is shown.
-- started_at is set by Postgres's own clock (`now()`, server-side), not
-- reported by the browser. The submission tables reference this row's id
-- as session_id; a trigger below computes total_seconds by comparing this
-- row's started_at against the submission row's own server-side now() at
-- insert time — both ends of the measurement happen inside the database,
-- so the browser's clock, tab state, or sleep/wake never enters into it.

create table if not exists public.task_sessions (
  id uuid primary key,              -- generated client-side (crypto.randomUUID())
  attempter_email text not null,
  task_id text not null,
  task_kind text not null,          -- 'evaluation' | 'golden_rewrite'
  started_at timestamptz not null default now()
);

alter table public.task_sessions enable row level security;

-- Anon can create a session (there's nothing sensitive in this table beyond
-- an email and a timestamp), but there's no select/update/delete policy for
-- anon, so a session can't be read back, listed, or backdated once created.
drop policy if exists "anon can insert task sessions" on public.task_sessions;
create policy "anon can insert task sessions"
  on public.task_sessions
  for insert
  to anon
  with check (true);

-- ============================================================
-- Attempt numbering + server-side elapsed time
-- ============================================================
-- If you already ran an earlier version of this file, these ALTERs add the
-- new columns without touching existing data; existing rows will just have
-- a null session_id/attempt_number, which is fine.

alter table public.eval_submissions
  add column if not exists session_id uuid references public.task_sessions(id),
  add column if not exists attempt_number int;

alter table public.golden_rewrite_submissions
  add column if not exists session_id uuid references public.task_sessions(id),
  add column if not exists attempt_number int;

-- One trigger function, reused on both submission tables. It always
-- overwrites attempt_number and total_seconds itself — whatever the client
-- sends for these (if anything) is ignored, so neither value can be spoofed
-- by editing client state or the browser clock.
create or replace function public.set_submission_metadata()
returns trigger as $$
declare
  session_started_at timestamptz;
begin
  -- Nth time this email has submitted this task_id on this table.
  execute format(
    'select coalesce(max(attempt_number), 0) + 1 from %I where attempter_email = $1 and task_id = $2',
    TG_TABLE_NAME
  )
  into new.attempt_number
  using new.attempter_email, new.task_id;

  -- Elapsed time since the matching task_sessions row was created, entirely
  -- via server timestamps (session's started_at vs. this row's own now()).
  if new.session_id is not null then
    select started_at into session_started_at
    from public.task_sessions
    where id = new.session_id;

    if session_started_at is not null then
      new.total_seconds := extract(epoch from (now() - session_started_at))::int;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists eval_submissions_set_metadata on public.eval_submissions;
create trigger eval_submissions_set_metadata
before insert on public.eval_submissions
for each row execute function public.set_submission_metadata();

drop trigger if exists golden_rewrite_submissions_set_metadata on public.golden_rewrite_submissions;
create trigger golden_rewrite_submissions_set_metadata
before insert on public.golden_rewrite_submissions
for each row execute function public.set_submission_metadata();

-- Optional cleanup: if you created eval_submissions_latest /
-- golden_rewrite_submissions_latest views earlier, attempt_number above
-- supersedes them — you can drop them if you'd rather rely on this instead:
--   drop view if exists public.eval_submissions_latest;
--   drop view if exists public.golden_rewrite_submissions_latest;
