import { hasSupabaseAuthHintOnClient } from "@/lib/supabase/authStorage";

/**
 * Soft cyclus-discovery (“Eenmalig instellen”): alleen tijdens eerste guest-onboarding.
 * Met account staat de keuze in settings/profiel; niet elke ochtend opnieuw.
 * Dagstart en landing-phone-mocks tonen deze hint niet.
 *
 * Alleen na client-mount aanroepen. Niet in useState-initializers:
 * op de server is window afwezig en zou SSR vs hydration uit elkaar lopen.
 */
export function shouldShowV2CycleDiscovery(): boolean {
  if (typeof window === "undefined") return false;
  return !hasSupabaseAuthHintOnClient();
}

/** @deprecated Alias; gebruik shouldShowV2CycleDiscovery. */
export function shouldShowV2CycleModeToggle(): boolean {
  return shouldShowV2CycleDiscovery();
}
