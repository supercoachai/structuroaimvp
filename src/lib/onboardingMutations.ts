"use client";

import { createClient } from "@/lib/supabase/client";

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
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed: completed })
      .eq("id", user.id);
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Onbekende fout" };
  }
}
