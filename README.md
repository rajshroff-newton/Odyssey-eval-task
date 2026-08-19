# Odyssey Eval Task

Three combined tasks, one per report (SOL, BTC, US100 — full report text as
the stimulus, no screenshots). Each task is Part A (five-question evaluation
per Attempter Guidelines v2.0: Q1 portrait fit against G1/G2/G3 + best fit,
Q2 analytical soundness, Q3 sharpness via the sequential decision flow, Q4
compliance, Q5 publishability) followed by Part B (Track 2 full rewrite:
expert chooses the portrait, rewrites in full within ±20% of the original
word count, data-integrity flag).

The attempter picks which report to do first on the start screen; all three
must be completed. Answers autosave to localStorage (browser-local only) and
resume on return, including after submitting. Copy/right-click is blocked
outside form fields and paste is blocked everywhere.

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

1. Create the project (or use the existing one named `Odyssey-eval-task`).
2. In the Supabase dashboard: **SQL Editor → New query**, paste the contents
   of `supabase/schema.sql`, and run it. This creates `eval_submissions`,
   `golden_rewrite_submissions`, and `task_sessions` (the server-side timing
   anchor), all with RLS enabled and an insert-only policy for the anon
   key — the app can write but can't read, list, or edit anything back with
   that key. It also adds a trigger that fills in `attempt_number` and
   `total_seconds` on every insert, overriding whatever (if anything) the
   client sent for those fields.
   - The whole file is safe to re-run from scratch at any point — every
     statement (`create table if not exists`, `add column if not exists`,
     `create or replace function`, and `drop policy if exists` /
     `drop trigger if exists` before each `create`) is idempotent, so
     re-running it after adding something new won't touch existing data or
     error on things that already exist.
3. **Project Settings → API**: copy the **Project URL** and the **anon
   public** key into `.env.local`.

## Editing the task content

All three modules (screenshot, extracted table, task ids) live in
`data/task.ts`, under `MODULES` (keyed `gold` / `energy` / `bnb`) plus the
`DOMAIN_TASK_MODULE` and `TASK_IDS` maps that decide which module and task
id a given domain + task-type combination gets. Persona definitions and
suggested headings are shared across all modules, so they're defined once,
outside `MODULES`.

To add a new module: drop its screenshot in `public/`, add an entry to
`MODULES`, and point one of the `DOMAIN_TASK_MODULE` slots at it (or add a
new domain entirely). `app/page.tsx` doesn't need to change — it always
renders whichever module the current domain + task type resolves to.

**Known gap:** the BNB module's source table was cut off after Probability
Assessment (the source screenshot had a scroll indicator past that point).
There may be a further section — like the Additional Assessment / trade-plan
sections the other two modules have — that isn't captured yet. Add it to
`MODULES.bnb.fields` in `data/task.ts` once the full table is available.

## Reviewing submissions

The anon key can only insert, not read. To review responses, use the
Supabase **Table Editor** (Odyssey-eval-task project → Table Editor →
`eval_submissions` or `golden_rewrite_submissions`), or query it with the
service role key from a trusted environment only — never expose the service
role key in the app.
