# Odyssey Eval Task

# Odyssey Eval Task

Seven reports are defined; which ones are actually reachable depends on
who's typing their email in. **Open to anyone:** SOL (rewrite for G3) and
Nasdaq (rewrite for G1). **Restricted to one specific expert each,** shown
in the picker only when their exact email is typed in: MU and IBIT
(Sid Kalla), XRP and S&P 500 (Joel Hugentobler). BTC is fully built but
currently excluded entirely — see "Editing the task content" below.

Every task is Part A (five-question evaluation per Attempter Guidelines
v2.0: Q1 portrait fit against G1/G2/G3 + best fit, Q2 analytical soundness,
Q3 sharpness via the sequential decision flow, Q4 compliance, Q5
publishability) followed by Part B (Track 2 full rewrite). Part A is
answered once regardless of the report. Part B's shape depends on the
report: SOL and Nasdaq each require exactly one rewrite, for a fixed
portrait that isn't a choice. MU, IBIT, XRP, and S&P 500 each require
**two** rewrites in the same task — one for G1 and one for G3, back to
back, both against the same Part A answers.

The attempter picks which report to do first on the start screen; every
report available to them must be completed. Answers autosave to
localStorage (browser-local only) and resume on return, including after
submitting. Copy, paste, and drag-and-drop are all unrestricted — normal
browser behavior throughout.

**The per-report email restriction is a UI convenience, not real access
control.** It hides an option from the picker unless the typed email
matches exactly — there's no authentication anywhere in this app, so
someone who knew the exact allowed email could still type it in themselves.
This is the same trust model the rest of the app already uses (name/email
have never been verified for the open reports either).

Submissions post to `report_submissions` — one row per rewrite, so a
dual-portrait report (MU/IBIT/XRP/S&P 500) produces two rows per completed
task, sharing identical Part A answers and differing only in
`rewrite_portrait`/`rewrite_text`/`rewrite_word_count`. Timing is
server-side in Postgres: session start (`task_sessions`), an
`eval_complete` marker (`session_events`) when the attempter moves from
evaluation to rewrite, and the insert itself — a trigger computes
`total_seconds`, `eval_seconds`, and `rewrite_seconds`, plus
`attempt_number` (case-insensitive on email). See `supabase/schema.sql`.

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
   marker), and `report_submissions` (one row per completed rewrite), all
   with RLS enabled and an insert-only policy for the anon key — the app can
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

All seven reports (full text, no screenshots) live in `data/task.ts` under
`REPORTS`, keyed by `TaskKey` (`sol` / `btc` / `nasdaq` / `mu` / `ibit` /
`xrp` / `sp500`). Each report is `{ taskId, label, title, ticker, category,
generatedAt, sections, assignedPortraits, allowedEmails?, canary }`:

- `assignedPortraits` is an array — one entry means Part B is a single
  fixed-portrait rewrite (today's SOL/Nasdaq behavior); two entries means
  Part B requires a separate rewrite for each, in order, inside the same
  task.
- `allowedEmails`, if present, restricts the report to those exact emails
  (case-insensitive). Omit it entirely for an open report.

`TASK_ORDER` (currently `["sol", "nasdaq"]`) controls which reports are
open to everyone. Restricted reports never go in `TASK_ORDER` — they're
surfaced automatically by `visibleTasksForEmail(email)`, which the gate
screen calls live as the email field changes. To bring BTC back as an open
report, add `"btc"` to `TASK_ORDER`. To restrict it to someone instead, add
an `allowedEmails` array to its entry and leave it out of `TASK_ORDER`.

The three reader portraits (G1/G2/G3) and the Q2 reason lists are also in
`data/task.ts`, shared across all reports.

To add a new report: add an entry to `REPORTS` with a unique `TaskKey`
(update the `TaskKey` union type too), and either add its key to
`TASK_ORDER` (open to everyone) or give it `allowedEmails` (restricted).
`app/page.tsx` doesn't need to change either way — the picker, Part B's
rewrite count, and submission logic are all driven directly by each
report's own `assignedPortraits` and `allowedEmails`.

## Reviewing submissions

The anon key can only insert, not read. To review responses, use the
Supabase **Table Editor** (project → Table Editor → `report_submissions`),
or query it with SQL directly in the Supabase SQL Editor — both work with
your own Supabase login, not the app's anon key, so this doesn't require any
changes to the app itself.
