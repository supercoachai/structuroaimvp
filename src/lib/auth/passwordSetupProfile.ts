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

/**
 * Zet password_setup_completed betrouwbaar op true.
 *
 * Een directe browser-update vlak na signUp/updateUser kan stil 0 rijen raken:
 * de profielrij bestaat soms nog niet of de sessie-JWT is net geroteerd, waardoor
 * RLS auth.uid() niet matcht. De vlag blijft dan false en de middleware bounct de
 * gebruiker naar /auth/wachtwoord-aanmaken (dat lijkt op het signup-scherm). De
 * server-route schrijft met de service-role en omzeilt dat probleem. Browser-update
 * blijft de fallback als de route faalt.
 */
export async function markPasswordSetupCompletedReliably(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    const res = await fetch("/api/auth/complete-password-setup", {
      method: "POST",
    });
    if (res.ok) {
      return { error: null };
    }
  } catch {
    /* val terug op de browser-update hieronder */
  }
  return markPasswordSetupCompleted(supabase, userId);
}

/**
 * Supabase weigert updateUser({ password }) met 422 "same_password" als het
 * nieuwe wachtwoord gelijk is aan het bestaande. Bij het instellen van een
 * wachtwoord betekent dat: het wachtwoord staat al goed. Behandel dit als succes
 * i.p.v. een harde fout, anders zit de gebruiker vast in een lus.
 */
export function isSamePasswordError(err: unknown): boolean {
  if (!err) return false;
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: unknown }).code ?? "")
      : "";
  if (code === "same_password") return true;
  const message = err instanceof Error ? err.message : String(err ?? "");
  return message
    .toLowerCase()
    .includes("should be different from the old password");
}
