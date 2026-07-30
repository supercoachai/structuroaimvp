import type { SupabaseClient } from "@supabase/supabase-js";

import { startOAuthSignIn } from "@/lib/auth/socialSignIn";

/** Session flag: Google OAuth gestart vanaf account-save, nog geen succesvolle return. */

export const V2_ACCOUNT_SAVE_OAUTH_PENDING_KEY = "v2_account_save_oauth_pending";

export function markAccountSaveOauthPending(): void {
  try {
    sessionStorage.setItem(V2_ACCOUNT_SAVE_OAUTH_PENDING_KEY, "1");
  } catch {
    /* private mode / blocked storage */
  }
}

/** true als er een pending OAuth-start was (flag wordt altijd gewist). */
export function consumeAccountSaveOauthPending(): boolean {
  try {
    const pending = sessionStorage.getItem(V2_ACCOUNT_SAVE_OAUTH_PENDING_KEY) === "1";
    if (pending) sessionStorage.removeItem(V2_ACCOUNT_SAVE_OAUTH_PENDING_KEY);
    return pending;
  } catch {
    return false;
  }
}

export function clearAccountSaveOauthPending(): void {
  try {
    sessionStorage.removeItem(V2_ACCOUNT_SAVE_OAUTH_PENDING_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}

/**
 * Start Google OAuth vanaf de account-save-stap. Zet bewust GEEN
 * post-account-naam-pending: die komt bij een succesvolle terugkeer via
 * `V2_POST_ACCOUNT_NAME_PATH` (`?name=1`). Zonder die scheiding blijft de
 * naamstap-vlag hangen in sessionStorage als iemand Google afbreekt en
 * terug-navigeert, waardoor de naamstap zonder sessie zichtbaar wordt.
 */
export async function startGoogleAccountSaveOauth(
  supabase: SupabaseClient,
  redirectPath: string,
): Promise<void> {
  markAccountSaveOauthPending();
  await startOAuthSignIn(supabase, "google", redirectPath);
}
