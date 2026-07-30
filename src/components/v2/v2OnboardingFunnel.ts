"use client";

/**
 * Cookieless step-events voor /onboarding drop-off.
 * Geen analyticsConsent-gate: zelfde patroon als activatie-funnel (P0 meting).
 * Client + server-backup via trackClientFunnelEvent.
 */

import {
  trackActivationFunnelStep,
  trackDagstartCompleted,
  trackOnboardingCompleted,
  trackOnboardingStarted,
} from "@/lib/posthog/activationFunnelAnalyticsClient";
import { trackClientFunnelEvent } from "@/lib/posthog/clientFunnelAnalyticsClient";
import {
  getStoredSignupCampaign,
  getStoredSignupSource,
} from "@/lib/posthog/signupAttribution";

import type { V2Energy } from "./V2Context";
import { clearAccountSaveOauthPending } from "./v2AccountSaveOauth";

export type OnboardingStep =
  | "energy"
  | "tasks"
  | "done"
  | "account"
  | "name"
  | "home";

/** @deprecated gebruik OnboardingStep */
export type V2OnboardingStep = OnboardingStep;

const STEP_FIRED_PREFIX = "onboarding_step_fired_";

function attribution(): Record<string, unknown> {
  const signup_source = getStoredSignupSource();
  return {
    signup_source,
    utm_campaign: getStoredSignupCampaign(),
    is_tiktok: signup_source === "tiktok",
    funnel: "onboarding",
    source: "app",
  };
}

function oncePerSession(step: OnboardingStep): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = `${STEP_FIRED_PREFIX}${step}`;
    if (window.sessionStorage.getItem(key) === "1") return false;
    window.sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

function mapEnergy(energy: V2Energy | null): "low" | "medium" | "high" | null {
  if (energy === "low") return "low";
  if (energy === "high") return "high";
  if (energy === "enough") return "medium";
  return null;
}

/**
 * Fijnmazige client-stap. Eén keer per browsersessie per stap.
 * Daarnaast: bestaande activatie-events waar die mappen (energy/done).
 */
export function trackV2OnboardingStep(
  step: OnboardingStep,
  properties?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  if (!oncePerSession(step)) return;

  const props = { ...attribution(), step, ...properties };
  trackClientFunnelEvent("onboarding_step", props);

  if (step === "energy") {
    trackOnboardingStarted();
  }
}

export function trackV2OnboardingEnergy(energy: V2Energy): void {
  trackClientFunnelEvent("onboarding_energy_chosen", {
    ...attribution(),
    energy_level: energy,
  });
  const mapped = mapEnergy(energy);
  if (mapped) {
    trackActivationFunnelStep("dagstart_energy_chosen", {
      energy_level: mapped,
      source: "app",
    });
  }
}

export function trackV2OnboardingTasks(props: {
  energy: V2Energy | null;
  thingCount: number;
  adjusted: boolean;
}): void {
  trackV2OnboardingStep("tasks", {
    energy_level: props.energy,
    thing_count: props.thingCount,
    adjusted: props.adjusted,
  });
}

export function trackV2OnboardingCycle(props: { optedIn: boolean }): void {
  trackClientFunnelEvent("onboarding_cycle_choice", {
    ...attribution(),
    cycle_opt_in: props.optedIn,
    has_cycle_phase: props.optedIn,
  });
}

export function trackV2OnboardingDone(props: {
  energy: V2Energy | null;
  thingCount: number;
  cycleOptIn: boolean;
}): void {
  trackV2OnboardingStep("done", {
    energy_level: props.energy,
    thing_count: props.thingCount,
    cycle_opt_in: props.cycleOptIn,
  });
  trackOnboardingCompleted({ duration_bucket: "app" });
  const mapped = mapEnergy(props.energy) ?? "medium";
  trackDagstartCompleted({
    energy_level: mapped,
    tasks_selected_count: Math.min(3, Math.max(0, props.thingCount)),
    has_cycle_phase: props.cycleOptIn,
    source: "app",
    db_persisted: false,
  });
  trackClientFunnelEvent("dagstart_completed_anon", {
    ...attribution(),
    energy_level: mapped,
    tasks_selected_count: Math.min(3, Math.max(0, props.thingCount)),
    has_cycle_phase: props.cycleOptIn,
    source: "onboarding",
  });
}

export function trackV2AccountSaveShown(
  surface: "home" | "onboarding",
): void {
  trackV2OnboardingStep("account");
  trackClientFunnelEvent("account_save_shown", {
    ...attribution(),
    surface,
    after_first_value: surface === "home",
  });
}

export function trackV2AccountSaveClicked(
  surface: "home" | "onboarding",
): void {
  trackClientFunnelEvent("account_save_clicked", {
    ...attribution(),
    surface,
    after_first_value: surface === "home",
  });
}

export function trackV2AccountSaveOauthStarted(
  surface: "home" | "onboarding",
): void {
  trackClientFunnelEvent("account_save_oauth_started", {
    ...attribution(),
    surface,
    provider: "google",
    after_first_value: surface === "home",
  });
}

export function trackV2AccountSaveReturned(
  surface: "home" | "onboarding",
): void {
  trackClientFunnelEvent("account_save_returned", {
    ...attribution(),
    surface,
    after_first_value: surface === "home",
  });
}

export function trackV2NameStepShown(): void {
  clearAccountSaveOauthPending();
  trackV2OnboardingStep("name");
  trackClientFunnelEvent("name_step_shown", {
    ...attribution(),
    surface: "onboarding",
  });
}

export function trackV2NameStepCompleted(props: {
  skipped: boolean;
  hadPrefill: boolean;
}): void {
  trackClientFunnelEvent("name_step_completed", {
    ...attribution(),
    skipped: props.skipped,
    had_prefill: props.hadPrefill,
  });
}
