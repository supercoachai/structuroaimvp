"use client";

import { createClient } from "@/lib/supabase/client";

export const LOCAL_ONBOARDING_COMPLETED_KEY = "structuro_onboarding_completed_local";

/** Legacy key (zonder user-id); wordt bij logout gewist. */
export const SESSION_WELCOME_DISMISSED_KEY = "structuro_onboarding_welcome_dismissed";

function welcomeDismissedStorageKey(userId: string | null): string {
  return `structuro_onboarding_welcome_dismissed:v2:${userId ?? "local"}`;
}

/** Na uitloggen/inloggen opnieuw: oude tab-sessie mag de welkomst niet blokkeren. */
export function clearAllWelcomeDismissedSessionKeys(): void {
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (
        k === SESSION_WELCOME_DISMISSED_KEY ||
        (k != null && k.startsWith("structuro_onboarding_welcome_dismissed"))
      ) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function isLocalOnboardingCompleted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(LOCAL_ONBOARDING_COMPLETED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setLocalOnboardingCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_ONBOARDING_COMPLETED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isWelcomeDismissedThisSession(userId: string | null): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v2 = window.sessionStorage.getItem(welcomeDismissedStorageKey(userId)) === "1";
    if (v2) return true;
    // Eénmalig migreren: oude globale key telt alleen voor local zonder ingelogde user
    if (userId == null) {
      return window.sessionStorage.getItem(SESSION_WELCOME_DISMISSED_KEY) === "1";
    }
    return false;
  } catch {
    return false;
  }
}

export function dismissWelcomeThisSession(userId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(welcomeDismissedStorageKey(userId), "1");
    if (userId == null) {
      window.sessionStorage.setItem(SESSION_WELCOME_DISMISSED_KEY, "1");
    }
  } catch {
    /* ignore */
  }
}

/** Na eerste geslaagde dagstart: profile of localStorage. */
export async function markOnboardingCompleted(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);
      if (error) {
        console.warn("markOnboardingCompleted:", error.message);
        setLocalOnboardingCompleted();
      }
    } else {
      setLocalOnboardingCompleted();
    }
  } catch {
    setLocalOnboardingCompleted();
  }
}
