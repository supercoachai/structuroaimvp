"use client";

import { hasSupabaseAuthHintOnClient } from "@/lib/supabase/authStorage";

import { patchV2Settings, readV2Settings } from "./v2Settings";

/**
 * Soft "Bewaar met Google" op Home is verwijderd: account-save gebeurt in
 * onboarding (V2AccountSaveStep). Altijd false zodat de home-CTA niet terugkomt.
 */
export function shouldShowAccountSavePrompt(): boolean {
  return false;
}

/**
 * Direct na eerste onboarding-done: account-save voor guests, ook zonder firstValueAt.
 */
export function shouldShowPostOnboardingAccountSave(): boolean {
  if (typeof window === "undefined") return false;
  if (hasSupabaseAuthHintOnClient()) return false;
  if (readV2Settings().accountSavePromptDismissed) return false;
  return true;
}

export function dismissAccountSavePrompt(): void {
  patchV2Settings({ accountSavePromptDismissed: true });
}
