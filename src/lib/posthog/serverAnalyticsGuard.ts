import { createClient } from "@supabase/supabase-js";

let _serviceClient: ReturnType<typeof createClient> | null = null;

function getServiceClient() {
  if (_serviceClient) return _serviceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _serviceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _serviceClient;
}

/** Sla server-side PostHog over voor handmatig gemarkeerde testaccounts. */
export async function shouldSkipServerAnalyticsForUser(
  userId: string | null | undefined
): Promise<boolean> {
  if (!userId) return false;
  const client = getServiceClient();
  if (!client) return false;
  try {
    const { data } = await client
      .from("profiles")
      .select("is_test")
      .eq("id", userId)
      .maybeSingle();
    return Boolean((data as { is_test?: boolean } | null)?.is_test);
  } catch {
    return false;
  }
}
