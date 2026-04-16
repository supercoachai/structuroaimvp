"use client";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

/** Sla aanspreeknaam op in profile, auth-metadata en localStorage (consistent met rest van de app). */
export async function persistPreferredDisplayName(
  user: User,
  displayName: string
): Promise<void> {
  const trimmed = displayName.trim();
  if (!trimmed || !user.id) return;

  const supabase = createClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: trimmed,
      preferred_name: trimmed,
      ...(user.email ? { email: user.email } : {}),
    },
    { onConflict: "id" }
  );
  if (error) {
    console.warn("persistPreferredDisplayName:", error.message);
  }

  await supabase.auth.updateUser({ data: { full_name: trimmed } });

  try {
    window.localStorage.setItem("structuro_user_name", trimmed);
  } catch {
    /* ignore */
  }
}
