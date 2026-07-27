import { hasSupabaseAuthHintOnClient } from "@/lib/supabase/authStorage";

/**
 * Soft cyclus-discovery gate (historisch: peeker op guest-onboarding).
 * Propose/dagstart toont discovery niet meer; cyclus-uitleg leeft op de
 * aparte landing-demo / settings. Gate blijft voor tests en eventueel hergebruik.
 */
export function shouldShowV2CycleDiscovery(): boolean {
  if (typeof window === "undefined") return false;
  return !hasSupabaseAuthHintOnClient();
}

/** @deprecated Alias; gebruik shouldShowV2CycleDiscovery. */
export function shouldShowV2CycleModeToggle(): boolean {
  return shouldShowV2CycleDiscovery();
}
