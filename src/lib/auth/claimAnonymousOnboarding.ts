"use client";

import { persistPreferredDisplayName } from "@/lib/accountDisplayName";
import { clearLocalOnboardingDoneCookieOnClient } from "@/lib/localOnboardingCookie";
import { clearStructuroLocalModeCookie } from "@/lib/localModeSession";
import { migrateLocalTasksToSupabase } from "@/lib/migrateLocalTasksToSupabase";
import { setProfileOnboardingCompleted } from "@/lib/onboardingMutations";
import { createClient } from "@/lib/supabase/client";
import { hasCompletedAnonymousOnboarding } from "@/lib/auth/anonymousOnboardingEntry";

/** Pas de vóór account-aanmaak opgegeven aanspreeknaam toe op het nieuwe profiel. */
async function applyStoredPreferredName(): Promise<void> {
  let stored = "";
  try {
    stored = (window.localStorage.getItem("structuro_user_name") ?? "").trim();
  } catch {
    return;
  }
  if (stored.length < 2) return;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      await persistPreferredDisplayName(user, stored);
    }
  } catch {
    /* best-effort */
  }
}

/**
 * Na het aanmaken van een account vanuit de anonieme flow: claim de lokale
 * onboarding zodat die niet opnieuw start, en migreer de lokale taken.
 * @returns true als er een anonieme onboarding was om over te nemen.
 */
export async function claimAnonymousOnboardingForAccount(
  userId: string
): Promise<boolean> {
  if (!userId || !hasCompletedAnonymousOnboarding()) return false;

  try {
    await setProfileOnboardingCompleted(true);
  } catch {
    /* profiel-update niet kritiek voor de redirect */
  }

  await applyStoredPreferredName();

  try {
    await migrateLocalTasksToSupabase(userId);
  } catch {
    /* migratie best-effort */
  }

  clearStructuroLocalModeCookie();
  clearLocalOnboardingDoneCookieOnClient();
  return true;
}
