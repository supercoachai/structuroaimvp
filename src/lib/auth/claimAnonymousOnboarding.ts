"use client";

import { persistPreferredDisplayName } from "@/lib/accountDisplayName";
import { hasCompletedAnonymousOnboarding } from "@/lib/auth/anonymousOnboardingEntry";
import { setDagstartCookieOnClient } from "@/lib/dagstartCookie";
import { clearLocalOnboardingDoneCookieOnClient } from "@/lib/localOnboardingCookie";
import { getTodayCheckIn } from "@/lib/localStorageTasks";
import { clearStructuroLocalModeCookie } from "@/lib/localModeSession";
import { migrateLocalTasksToSupabase } from "@/lib/migrateLocalTasksToSupabase";
import {
  LOCAL_ONBOARDING_COMPLETED_KEY,
  LOCAL_ONBOARDING_VERSION_KEY,
} from "@/lib/onboardingProfile";
import { createClient } from "@/lib/supabase/client";
import type { DagstartEnergy } from "@/lib/supabase/profileDagstartDb";

function readLocalDagstartEnergy(): DagstartEnergy | null {
  const local = getTodayCheckIn();
  const energy = local?.energy_level;
  if (energy === "low" || energy === "medium" || energy === "high") {
    return energy;
  }
  return null;
}

function readStoredPreferredName(): string {
  try {
    return (window.localStorage.getItem("structuro_user_name") ?? "").trim();
  } catch {
    return "";
  }
}

/**
 * Service-role upsert (parity met /auth/callback): onboarding_completed +
 * last_dagstart_date. Energie uit lokale check-in, anders medium als fallback.
 */
async function persistClaimedOnboardingViaApi(
  energy: DagstartEnergy,
  displayName: string
): Promise<boolean> {
  try {
    const res = await fetch("/api/profile/claim-anonymous-onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        energy,
        ...(displayName.length >= 2 ? { displayName } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Pas de vóór account-aanmaak opgegeven aanspreeknaam toe op het nieuwe profiel. */
async function applyStoredPreferredName(): Promise<void> {
  const stored = readStoredPreferredName();
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

  const dagstartEnergy = readLocalDagstartEnergy() ?? "medium";
  const preferredName = readStoredPreferredName();

  await persistClaimedOnboardingViaApi(dagstartEnergy, preferredName);
  setDagstartCookieOnClient();

  await applyStoredPreferredName();

  try {
    await migrateLocalTasksToSupabase(userId);
  } catch {
    /* migratie best-effort */
  }

  clearStructuroLocalModeCookie();
  clearLocalOnboardingDoneCookieOnClient();
  try {
    window.localStorage.removeItem(LOCAL_ONBOARDING_COMPLETED_KEY);
    window.localStorage.removeItem(LOCAL_ONBOARDING_VERSION_KEY);
  } catch {
    /* ignore */
  }
  return true;
}
