# Odyssey Eval Task

Single evaluation task (Gold / XAUUSDT macro report) built to spec from the
Attempter Guidelines doc. The stimulus (screenshot + full extracted table)
stays pinned on screen while the attempter scores three dimensions, each
with its own justification, then leaves feedback. Submissions post to
Supabase.

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
   of `supabase/schema.sql`, and run it. This creates `eval_submissions`
   with RLS enabled and an insert-only policy for the anon key — the app can
   write submissions but can't read, list, or edit them back with that key.
3. **Project Settings → API**: copy the **Project URL** and the **anon
   public** key into `.env.local`.

## Editing the task content

Everything specific to this one task (the screenshot, the full extracted
table, task id) lives in `data/task.ts` and `public/xauusdt-screenshot.png`.
To stand up a second task, add a new screenshot to `public/`, duplicate
`task.ts`'s shape pointing at it, and swap the content — the flow in
`app/page.tsx` doesn't need to change.

## Reviewing submissions

The anon key can only insert, not read. To review responses, use the
Supabase **Table Editor** (Odyssey-eval-task project → Table Editor →
`eval_submissions`), or query it with the service role key from a trusted
environment only — never expose the service role key in the app.
