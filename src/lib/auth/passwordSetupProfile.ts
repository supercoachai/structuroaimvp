import type { SupabaseClient } from "@supabase/supabase-js";

export const PASSWORD_CREATE_PATH = "/auth/wachtwoord-aanmaken";

export function isPasswordCreatePath(pathname: string): boolean {
  return (
    pathname === PASSWORD_CREATE_PATH ||
    pathname.startsWith(`${PASSWORD_CREATE_PATH}/`)
  );
}

export async function markPasswordSetupCompleted(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("profiles")
    .update({ password_setup_completed: true })
    .eq("id", userId);

  return { error: error ? new Error(error.message) : null };
}
