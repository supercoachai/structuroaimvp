"use client";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

/** Sla aanspreeknaam op in profile, auth-metadata en localStorage (consistent met rest van de app). */
export async function persistPreferredDisplayName(
  user: User,
  displayName: string
): Promise<{ error: string | null }> {
  const trimmed = displayName.trim();
  if (!user.id) {
    return { error: "Geen actieve sessie" };
  }
  if (!trimmed) {
    return { error: "Vul een naam in" };
  }

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
    return { error: error.message };
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: trimmed },
  });
  if (authError) {
    return { error: authError.message };
  }

  try {
    window.localStorage.setItem("structuro_user_name", trimmed);
  } catch {
    /* ignore */
  }
  return { error: null };
}

/** Wis aanspreeknaam in profile, auth-metadata en localStorage. */
export async function clearPreferredDisplayName(
  user: User
): Promise<{ error: string | null }> {
  if (!user.id) {
    return { error: "Geen actieve sessie" };
  }

  const supabase = createClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: null,
      preferred_name: null,
      ...(user.email ? { email: user.email } : {}),
    },
    { onConflict: "id" }
  );
  if (error) {
    return { error: error.message };
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: "" },
  });
  if (authError) {
    return { error: authError.message };
  }

  try {
    window.localStorage.removeItem("structuro_user_name");
  } catch {
    /* ignore */
  }
  return { error: null };
}
