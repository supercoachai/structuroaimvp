import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Alleen gebruiken op server (Route Handlers, Server Actions, Server Components).
 * Vereist SUPABASE_SERVICE_ROLE_KEY; anders returned null (gebruiker ziet fout i.p.v. crash).
 */
export function createServiceRoleClient(): SupabaseClient<any> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
