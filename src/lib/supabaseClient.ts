import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-d2l.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Runtime logging for environment verification
if (typeof window !== "undefined") {
  const maskedKey = supabaseAnonKey
    ? `${supabaseAnonKey.slice(0, 10)}...${supabaseAnonKey.slice(-6)}`
    : "(NOT SET)";
  console.log("⚡ [D2L SUPABASE RUNTIME CONFIG]");
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Anon Key: ${maskedKey}`);
  console.log(`   Configured: ${isSupabaseConfigured ? "YES ✅" : "NO ❌"}`);
}

/** Remove retired league-data snapshots while leaving Supabase Auth sessions intact. */
export function clearRetiredLeagueCaches() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("d2l_league_storage_v1");
    localStorage.removeItem("d2l_offline_events_queue");
    localStorage.removeItem("d2l_ui_prefs_v1");
  } catch {
    // ignore quota / private-mode errors
  }
}
