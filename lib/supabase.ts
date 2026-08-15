import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaces a clear warning in the browser/build console instead of a
  // silent failure or a build crash if .env.local (or Vercel's project env
  // vars) hasn't been set up yet. Falling back to placeholders here lets
  // the build/prerender succeed even when misconfigured; real Supabase
  // calls will fail at runtime with a clear network/auth error instead.
  console.warn(
    "Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (locally in .env.local, or in the Vercel project's Environment Variables)."
  );
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key"
);
