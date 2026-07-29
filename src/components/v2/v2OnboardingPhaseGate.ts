"use client";

/**
 * Houdt post-value onboarding-UI (account/name) over SPA-remounts.
 * Zonder dit wist resetToEnergy na auth/middleware-bounce de suggest-stap terug.
 */

import {
  peekV2PostAccountNamePending,
} from "./v2PostAccountName";

export type V2OnboardingUiPhase = "account" | "name";

export const V2_ONBOARDING_UI_PHASE_KEY = "v2_onboarding_ui_phase";

export function persistV2OnboardingUiPhase(phase: V2OnboardingUiPhase): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(V2_ONBOARDING_UI_PHASE_KEY, phase);
  } catch {
    /* privémodus */
  }
}

export function peekV2OnboardingUiPhase(): V2OnboardingUiPhase | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(V2_ONBOARDING_UI_PHASE_KEY);
    if (raw === "account" || raw === "name") return raw;
    return null;
  } catch {
    return null;
  }
}

export function clearV2OnboardingUiPhase(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(V2_ONBOARDING_UI_PHASE_KEY);
  } catch {
    /* ignore */
  }
}

/** Fresh-start mag energy-reset niet doen tijdens/na account-save. */
export function shouldSkipFreshStartEnergyReset(): boolean {
  if (typeof window === "undefined") return false;
  if (peekV2OnboardingUiPhase()) return true;
  return peekV2PostAccountNamePending();
}
