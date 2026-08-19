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
--
-- SECURITY DEFINER + a locked search_path: the anon role only has an INSERT
-- policy on task_sessions and on these two submission tables (no SELECT),
-- so without this the function's own internal reads (looking up
-- task_sessions.started_at, and counting prior submissions for
-- attempt_number) would be silently blocked by RLS and return zero rows —
-- total_seconds would stay null, and attempt_number would always compute as
-- 1 regardless of how many times someone actually submitted. Running as
-- the function's owner (via SECURITY DEFINER) lets it read those tables
-- internally without changing what the app or anon role can read from the
-- outside.
create or replace function public.set_submission_metadata()
returns trigger
security definer
set search_path = public, pg_temp
as $$
declare
  session_started_at timestamptz;
begin
  -- Nth time this email has submitted this task_id on this table.
  -- lower() on both sides so "Raj@NewtonX.com" and "raj@newtonx.com" count
  -- as the same person.
  execute format(
    'select coalesce(max(attempt_number), 0) + 1 from %I where lower(attempter_email) = lower($1) and task_id = $2',
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

-- These two views (if you created them, back when attempt tracking was
-- first being designed) are fully superseded by the attempt_number trigger
-- above, and one of them depends on feedback_general — which gets dropped
-- further down — so they need to go first or that drop fails.
drop view if exists public.eval_submissions_latest;
drop view if exists public.golden_rewrite_submissions_latest;

-- ============================================================
-- Per-persona scoring on the Evaluation task
-- ============================================================
-- Client confirmed: all three personas are scored on every eval task, not
-- just one — intent recognition especially (and utility) can land
-- differently depending on who's reading it. Each persona now gets its own
-- full set of three dimension scores + justifications, stored the same way
-- golden rewrite already stores its per-persona answers: one jsonb column
-- per persona, shaped like
--   {"intent_recognition": {"score": 4, "justification": "..."},
--    "authority": {...}, "utility": {...}}

alter table public.eval_submissions
  add column if not exists rookie_scores jsonb not null default '{}'::jsonb,
  add column if not exists mid_tier_scores jsonb not null default '{}'::jsonb,
  add column if not exists experienced_scores jsonb not null default '{}'::jsonb;

-- The old flat columns (one score/justification per dimension, no persona)
-- are superseded by the three above. Rather than drop them and lose
-- whatever's already in them, they're just relaxed to nullable so new
-- inserts — which no longer populate them — don't get rejected by the old
-- NOT NULL constraints. Their CHECK constraints are untouched, since a
-- CHECK evaluates to "satisfied" on a null value, so leaving a column null
-- never trips them.
alter table public.eval_submissions
  alter column score_intent_recognition drop not null,
  alter column intent_recognition_justification drop not null,
  alter column score_authority drop not null,
  alter column authority_justification drop not null,
  alter column score_utility drop not null,
  alter column utility_justification drop not null;

-- The "what worked well / what would you do differently" field was removed
-- from the eval task, leaving only the optional "additional dimensions"
-- feedback field. Dropped outright (not just relaxed) since it's no longer
-- collected at all.
alter table public.eval_submissions
  drop column if exists feedback_general;

-- ============================================================
-- Combined report tasks (SOL / BTC / US100): Part A evaluation
-- + Track 2 rewrite in one submission, with server-side
-- eval-phase vs rewrite-phase timing.
-- ============================================================

-- Phase markers. The client inserts one 'eval_complete' event when the
-- attempter finishes Part A and moves to the rewrite. created_at comes from
-- Postgres's clock, so the eval/rewrite time split is entirely server-side,
-- like everything else here.
create table if not exists public.session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.task_sessions(id),
  event_type text not null,          -- 'eval_complete'
  created_at timestamptz not null default now()
);

alter table public.session_events enable row level security;

drop policy if exists "anon can insert session events" on public.session_events;
create policy "anon can insert session events"
  on public.session_events
  for insert
  to anon
  with check (true);

-- One row per completed combined task (evaluation + rewrite together).
create table if not exists public.report_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  attempter_name text not null,
  attempter_email text not null,
  task_id text not null,             -- e.g. 'sol-market-report-2026-08-18'
  session_id uuid references public.task_sessions(id),
  attempt_number int,

  -- Q1 portrait fit: each portrait rated 1-3, plus best fit
  q1_g1 int not null check (q1_g1 between 1 and 3),
  q1_g2 int not null check (q1_g2 between 1 and 3),
  q1_g3 int not null check (q1_g3 between 1 and 3),
  q1_best_fit text not null,         -- 'G1' | 'G2' | 'G3' | 'none'
  q1_note text,                      -- mandatory app-side when best fit = none or no 3

  -- Q2 analytical soundness
  q2_score int not null check (q2_score between 1 and 3),
  q2_reason text,                    -- primary reason when score <= 2
  q2_note text,                      -- mandatory app-side when score = 1

  -- Q3 sharpness (derived from the sequential decision flow)
  q3_score int not null check (q3_score between 1 and 5),
  q3_step2_tag text,                 -- which step-2 leg failed, when score = 2

  -- Q4 compliance
  q4_score int not null check (q4_score between 1 and 3),
  q4_note text,                      -- mandatory app-side when score = 1

  -- Q5 publishability
  q5_publishability text not null,   -- 'publishable' | 'publishable_after_revision' | 'not_publishable'

  -- Part B: Track 2 full rewrite
  rewrite_portrait text not null,    -- 'G1' | 'G2' | 'G3' (chosen by the expert)
  rewrite_text text not null,
  rewrite_word_count int not null,
  original_word_count int not null,
  data_integrity_flag boolean not null default false,
  data_integrity_note text,

  -- No-AI pledge: the app requires this to match the attempter's own name
  -- before it will let them submit at all, so it should never actually be
  -- empty in practice — but no not-null constraint here, since the pledge
  -- is enforced app-side, not by the database.
  no_ai_attestation_signature text,

  -- Server-side timing, filled by trigger
  total_seconds int,
  eval_seconds int,
  rewrite_seconds int
);

alter table public.report_submissions enable row level security;

-- Safety net in case report_submissions was already created by an earlier
-- run of this file, before the pledge field existed.
alter table public.report_submissions
  add column if not exists no_ai_attestation_signature text;

drop policy if exists "anon can insert report submissions" on public.report_submissions;
create policy "anon can insert report submissions"
  on public.report_submissions
  for insert
  to anon
  with check (true);

-- Trigger: attempt numbering plus the three durations. All timestamps are
-- Postgres's own (session start, eval_complete event, and this insert's
-- now()), so nothing here can be influenced by the browser clock.
-- SECURITY DEFINER for the same reason as set_submission_metadata above:
-- the anon role has no SELECT policy on any of these tables, so the
-- function's internal reads would otherwise silently return nothing.
create or replace function public.set_report_submission_metadata()
returns trigger
security definer
set search_path = public, pg_temp
as $$
declare
  session_started_at timestamptz;
  eval_done_at timestamptz;
begin
  select coalesce(max(attempt_number), 0) + 1 into new.attempt_number
  from public.report_submissions
  where lower(attempter_email) = lower(new.attempter_email)
    and task_id = new.task_id;

  if new.session_id is not null then
    select started_at into session_started_at
    from public.task_sessions
    where id = new.session_id;

    if session_started_at is not null then
      new.total_seconds := extract(epoch from (now() - session_started_at))::int;

      -- First eval_complete event for this session marks the phase split.
      select min(created_at) into eval_done_at
      from public.session_events
      where session_id = new.session_id
        and event_type = 'eval_complete';

      if eval_done_at is not null then
        new.eval_seconds := extract(epoch from (eval_done_at - session_started_at))::int;
        new.rewrite_seconds := extract(epoch from (now() - eval_done_at))::int;
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists report_submissions_set_metadata on public.report_submissions;
create trigger report_submissions_set_metadata
before insert on public.report_submissions
for each row execute function public.set_report_submission_metadata();
