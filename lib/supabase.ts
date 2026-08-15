import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anonKey) {
  // Surfaces a clear error in the browser console instead of a silent failure
  // if .env.local hasn't been set up yet.
  console.warn(
    "Supabase env vars are missing. Copy .env.local.example to .env.local and fill in your project values."
  );
}

export const supabase = createClient(url, anonKey);
