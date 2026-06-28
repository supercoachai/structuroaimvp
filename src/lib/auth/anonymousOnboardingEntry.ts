"use client";

import {
  LOCAL_ONBOARDING_DONE_COOKIE,
  clearLocalOnboardingDoneCookieOnClient,
  isLocalOnboardingDoneCookieValue,
  markEnteringLocalOnboardingSession,
} from "@/lib/localOnboardingCookie";
import {
  LOCAL_ONBOARDING_COMPLETED_KEY,
  LOCAL_ONBOARDING_VERSION_KEY,
  isLocalOnboardingCompleted,
} from "@/lib/onboardingProfile";
import { markLocalSessionFresh } from "@/lib/localModeSession";
import { getTasksFromStorage } from "@/lib/localStorageTasks";

const LOCAL_MODE_COOKIE = "structuro_local_mode";
const LOCAL_MODE_MAX_AGE = 604800; // 7 dagen

function setLocalModeCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCAL_MODE_COOKIE}=1; path=/; max-age=${LOCAL_MODE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Acquisitie-CTA zonder account: start de onboarding meteen, anoniem.
 * Voortgang in localStorage; pas na de eerste dagstart vragen we om gegevens.
 * Bestaande anonieme voortgang blijft staan (geen reset bij her-klik).
 */
export function enterAnonymousOnboarding(options?: { reset?: boolean }): void {
  if (typeof window === "undefined") return;
  setLocalModeCookie();
  markLocalSessionFresh();
  markEnteringLocalOnboardingSession();

  if (options?.reset) {
    try {
      window.localStorage.removeItem(LOCAL_ONBOARDING_COMPLETED_KEY);
      window.localStorage.removeItem(LOCAL_ONBOARDING_VERSION_KEY);
      // Geen oude aanspreeknaam tonen bij een verse start: de naam vragen we
      // pas op /registreren, na de eerste dagstart.
      window.localStorage.removeItem("structuro_user_name");
    } catch {
      /* ignore */
    }
    clearLocalOnboardingDoneCookieOnClient();
  }
}

/** True als de anonieme onboarding al is afgerond (cookie of localStorage). */
export function hasCompletedAnonymousOnboarding(): boolean {
  if (typeof document !== "undefined") {
    const raw = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${LOCAL_ONBOARDING_DONE_COOKIE}=`));
    if (raw && isLocalOnboardingDoneCookieValue(raw.split("=")[1])) {
      return true;
    }
  }
  return isLocalOnboardingCompleted();
}

/**
 * Pure beslissingslogica: mag een marketing-CTA de anonieme onboarding resetten?
 *
 * Reset ALLEEN bij een verse sessie: er is geen afgeronde anonieme onboarding én
 * er staan geen lokale taken open. Zodra er voortgang of lokale data is, blijft
 * die staan (geen reset), zodat een her-klik niets wist.
 */
export function shouldResetAnonymousOnboarding(input: {
  hasCompletedOnboarding: boolean;
  localTaskCount: number;
}): boolean {
  return !input.hasCompletedOnboarding && input.localTaskCount === 0;
}

/**
 * Bestemming wanneer een lokale (anonieme) bezoeker /onboarding opent terwijl de
 * onboarding al is afgerond. Een acquisitie-bezoeker (jasper/start/tiktok) zonder
 * account hoort naar het "Bewaar je dagstart" account-scherm op /registreren, niet
 * de app in te vallen. Een gewone lokale gebruiker zonder attributie gaat naar de app.
 */
export function resolveCompletedLocalOnboardingDestination(input: {
  hasAuthHint: boolean;
  signupSource: string | null;
  hasJasperAttribution: boolean;
  registrerenHref: string;
}): string {
  const isAnonymousAcquisition =
    !input.hasAuthHint &&
    ((input.signupSource != null && input.signupSource !== "direct") ||
      input.hasJasperAttribution);
  return isAnonymousAcquisition ? input.registrerenHref : "/";
}

/**
 * Leest de huidige clientstaat (afgeronde onboarding + lokale taken) en bepaalt
 * of een verse start gerechtvaardigd is. Gebruikt door de acquisitie-CTA.
 */
export function shouldResetAnonymousOnboardingFromClient(): boolean {
  let localTaskCount = 0;
  try {
    localTaskCount = getTasksFromStorage().length;
  } catch {
    localTaskCount = 0;
  }
  return shouldResetAnonymousOnboarding({
    hasCompletedOnboarding: hasCompletedAnonymousOnboarding(),
    localTaskCount,
  });
}
