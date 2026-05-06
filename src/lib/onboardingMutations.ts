"use client";

import { createClient } from "@/lib/supabase/client";
import { ONBOARDING_VERSION_CURRENT } from "@/lib/onboardingVersion";
import type { Locale } from "@/lib/i18n/types";
import { resolveOnboardingDisplayName } from "@/lib/user";
import type { User } from "@supabase/supabase-js";

/**
 * Afronden intro: onboarding-vlag, versie, en weergavenaam (fallback via resolveOnboardingDisplayName).
 */
export async function completeOnboardingProfile(
  user: User,
  displayName: string,
  locale: Locale = "nl"
): Promise<{ error: string | null }> {
  const clean = resolveOnboardingDisplayName(user, displayName, locale).slice(0, 200);
  try {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        onboarding_completed: true,
        onboarding_version: ONBOARDING_VERSION_CURRENT,
        display_name: clean,
        preferred_name: clean,
        ...(user.email ? { email: user.email } : {}),
      },
      { onConflict: "id" }
    );
    if (error) {
      return { error: error.message };
    }
    await supabase.auth.updateUser({ data: { full_name: clean } });
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("structuro_user_name", clean);
      }
    } catch {
      /* ignore */
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Onbekende fout" };
  }
}

export async function setProfileOnboardingCompleted(
  completed: boolean
): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return { error: "Niet ingelogd" };
    }
    const payload = completed
      ? {
          onboarding_completed: true,
          onboarding_version: ONBOARDING_VERSION_CURRENT,
        }
      : { onboarding_completed: false, onboarding_version: null };
    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id);
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Onbekende fout" };
  }
}
