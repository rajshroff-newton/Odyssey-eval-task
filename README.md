# Odyssey Eval Task

Two combined tasks for this pilot, one per report — SOL (assigned portrait
G3) and Nasdaq (assigned portrait G1). Full report text is the stimulus, no
screenshots. Each task is Part A (five-question evaluation per Attempter
Guidelines v2.0: Q1 portrait fit against G1/G2/G3 + best fit, Q2 analytical
soundness, Q3 sharpness via the sequential decision flow, Q4 compliance, Q5
publishability) followed by Part B (Track 2 full rewrite: the portrait is
fixed per report, not a choice — rewrites in full within ±20% of the
original word count, data-integrity flag, no-AI pledge signature).

The attempter picks which report to do first on the start screen; both must
be completed. Answers autosave to localStorage (browser-local only) and
resume on return, including after submitting. Copy, paste, and drag-and-drop
are all unrestricted — normal browser behavior throughout.

A third report (BTC, portrait G1) is fully built and still defined in
`data/task.ts`, just excluded from `TASK_ORDER` for this pilot. Re-enabling
it is a one-line change — see "Editing the task content" below.

Submissions post to `report_submissions`. Timing is server-side in Postgres:
session start (`task_sessions`), an `eval_complete` marker (`session_events`)
when the attempter moves from evaluation to rewrite, and the insert itself —
a trigger computes `total_seconds`, `eval_seconds`, and `rewrite_seconds`,
plus `attempt_number` (case-insensitive on email). See `supabase/schema.sql`.

## Stack
- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + anon-insert-only RLS)
- Deploy target: Vercel

## Local setup

```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local` with your Supabase project's URL and anon key (see
Supabase setup below), then:

```bash
npm run dev
```

Open http://localhost:3000.

## Supabase setup

1. Create the project (or use the existing one).
2. In the Supabase dashboard: **SQL Editor → New query**, paste the contents
   of `supabase/schema.sql`, and run it. This creates `task_sessions` (the
   server-side timing anchor), `session_events` (the eval/rewrite phase
   marker), and `report_submissions` (one row per completed task), all with
   RLS enabled and an insert-only policy for the anon key — the app can
   write but can't read, list, or edit anything back with that key. It also
   adds a trigger that fills in `attempt_number`, `total_seconds`,
   `eval_seconds`, and `rewrite_seconds` on every insert, overriding
   whatever (if anything) the client sent for those fields.
   - The whole file is safe to re-run from scratch at any point — every
     statement (`create table if not exists`, `add column if not exists`,
     `create or replace function`, and `drop policy if exists` /
     `drop trigger if exists` before each `create`) is idempotent, so
     re-running it after adding something new won't touch existing data or
     error on things that already exist.
   - The file also still contains the original `eval_submissions` /
     `golden_rewrite_submissions` tables from an earlier version of this
     task. They're harmless leftovers (nothing in the app writes to them
     anymore) — kept only because they hold real pilot-test data.
3. **Project Settings → API**: copy the **Project URL** and the **anon
   public** key into `.env.local`.

## Editing the task content

All three reports (full text, no screenshots) live in `data/task.ts` under
`REPORTS`, keyed by `TaskKey` (`sol` / `btc` / `nasdaq`). Only `TASK_ORDER`
(currently `["sol", "btc"]`) controls which ones are actually active in the
app — add `"nasdaq"` back to that array to bring the third report (portrait
G2) back into the flow. Each report is `{ taskId, label, title, ticker,
category, generatedAt, sections, assignedPortrait, canary }`, where
`sections` is the actual report body (heading + text per section) shown in
the stimulus panel.

The three reader portraits (G1/G2/G3) and the Q2 reason lists are also in
`data/task.ts`, shared across all reports.

To add a fourth report: add an entry to `REPORTS` and its key to
`TASK_ORDER`. `app/page.tsx` doesn't need to change — the gate screen's
report picker and everything downstream are driven entirely by
`TASK_ORDER`.

## Reviewing submissions

The anon key can only insert, not read. To review responses, use the
Supabase **Table Editor** (project → Table Editor → `report_submissions`),
or query it with SQL directly in the Supabase SQL Editor — both work with
your own Supabase login, not the app's anon key, so this doesn't require any
changes to the app itself.
