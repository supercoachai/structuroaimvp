"use client";

import { hasSupabaseAuthHintOnClient } from "@/lib/supabase/authStorage";

import { hasV2FirstValue } from "./v2CycleOptInPrompt";
import { patchV2Settings, readV2Settings } from "./v2Settings";

/**
 * Soft "Bewaar met Google" op Home: pas ná eerste focus- of shutdown-win,
 * nooit direct na onboarding-binnenkomst.
 */
export function shouldShowAccountSavePrompt(): boolean {
  if (typeof window === "undefined") return false;
  if (hasSupabaseAuthHintOnClient()) return false;
  if (!hasV2FirstValue()) return false;
  if (readV2Settings().accountSavePromptDismissed) return false;
  return true;
}

export function dismissAccountSavePrompt(): void {
  patchV2Settings({ accountSavePromptDismissed: true });
}
