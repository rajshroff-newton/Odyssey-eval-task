# Odyssey Eval Task

Two tasks built to spec from the Attempter Guidelines doc, both using the
same stimulus (Gold / XAUUSDT macro report screenshot + full extracted
table, pinned on screen while working):

- **Evaluation** — score three dimensions (intent recognition, authority,
  utility), each with its own required justification, then two feedback
  boxes.
- **Golden rewrite** — write an improved answer for each of the three
  personas (Rookie, Mid-tier, Experienced), each as up to 4 heading +
  bullet-point sections.

The attempter picks which one to do from a dropdown on the start screen.
Submissions post to Supabase, one table per task type.

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
   of `supabase/schema.sql`, and run it. This creates `eval_submissions` and
   `golden_rewrite_submissions`, both with RLS enabled and an insert-only
   policy for the anon key — the app can write submissions but can't read,
   list, or edit them back with that key.
3. **Project Settings → API**: copy the **Project URL** and the **anon
   public** key into `.env.local`.

## Editing the task content

Everything specific to this module (the screenshot, the full extracted
table, persona definitions, suggested headings, task ids) lives in
`data/task.ts` and `public/xauusdt-screenshot.png`. To stand up a new module,
add a new screenshot to `public/`, duplicate `task.ts`'s shape pointing at
it, and swap the content — the flow in `app/page.tsx` doesn't need to change.

## Reviewing submissions

The anon key can only insert, not read. To review responses, use the
Supabase **Table Editor** (Odyssey-eval-task project → Table Editor →
`eval_submissions` or `golden_rewrite_submissions`), or query it with the
service role key from a trusted environment only — never expose the service
role key in the app.
