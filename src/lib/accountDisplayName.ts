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

  try {
    const res = await fetch("/api/profile/display-name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: trimmed }),
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      return { error: payload.error ?? `HTTP ${res.status}` };
    }

    const supabase = createClient();
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
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Wis aanspreeknaam in profile, auth-metadata en localStorage. */
export async function clearPreferredDisplayName(
  user: User
): Promise<{ error: string | null }> {
  if (!user.id) {
    return { error: "Geen actieve sessie" };
  }

  const res = await fetch("/api/profile/display-name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: "" }),
  });
  const payload = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    return { error: payload.error ?? `HTTP ${res.status}` };
  }

  const supabase = createClient();
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
