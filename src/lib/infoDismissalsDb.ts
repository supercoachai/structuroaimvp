"use client";

import { createClient } from "@/lib/supabase/client";

const MISSING_COLUMN_HINTS = ["column", "schema cache", "does not exist", "Could not find"];

function isMissingColumnError(message: string | null | undefined): boolean {
  if (!message) return false;
  return MISSING_COLUMN_HINTS.some((hint) => message.includes(hint));
}

function normalizeKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((k): k is string => typeof k === "string" && k.length > 0);
}

export async function loadDismissedInfoKeys(userId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("dismissed_info_keys")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error.message)) return [];
    throw new Error(error.message);
  }

  return normalizeKeys(data?.dismissed_info_keys);
}

export async function dismissInfoKey(userId: string, infoId: string): Promise<void> {
  const supabase = createClient();
  const current = await loadDismissedInfoKeys(userId);
  if (current.includes(infoId)) return;

  const { error } = await supabase
    .from("profiles")
    .update({ dismissed_info_keys: [...current, infoId] })
    .eq("id", userId);

  if (error && !isMissingColumnError(error.message)) {
    throw new Error(error.message);
  }
}

export async function resetDismissedInfoKeys(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ dismissed_info_keys: [] })
    .eq("id", userId);

  if (error && !isMissingColumnError(error.message)) {
    throw new Error(error.message);
  }
}
