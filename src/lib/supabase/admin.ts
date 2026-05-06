import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Alleen server-side; service role (nooit naar de client bundle). */
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim()) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ontbreekt");
  }
  if (!key?.trim()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ontbreekt voor admin-operaties");
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
