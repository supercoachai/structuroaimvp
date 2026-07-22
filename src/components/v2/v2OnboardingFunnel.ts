"use client";

/**
 * Cookieless step-events voor /v2/onboarding drop-off.
 * Geen analyticsConsent-gate: zelfde patroon als activatie-funnel (P0 meting).
 */

import {
  trackActivationFunnelStep,
  trackDagstartCompleted,
  trackOnboardingCompleted,
  trackOnboardingStarted,
} from "@/lib/posthog/activationFunnelAnalyticsClient";
import {
  getStoredSignupCampaign,
  getStoredSignupSource,
} from "@/lib/posthog/signupAttribution";
import { captureActivationFunnelEvent } from "@/lib/posthog/track";

import type { V2Energy } from "./V2Context";

export type V2OnboardingStep =
  | "welcome"
  | "energy"
  | "tasks"
  | "done"
  | "home";

const STEP_FIRED_PREFIX = "v2_onboarding_step_fired_";

function attribution(): Record<string, unknown> {
  const signup_source = getStoredSignupSource();
  return {
    signup_source,
    utm_campaign: getStoredSignupCampaign(),
    is_tiktok: signup_source === "tiktok",
    funnel: "v2_onboarding",
    source: "v2",
  };
}

function oncePerSession(step: V2OnboardingStep): boolean {
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
 * Daarnaast: bestaande activatie-events waar die mappen (welcome/done).
 */
export function trackV2OnboardingStep(
  step: V2OnboardingStep,
  properties?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  if (!oncePerSession(step)) return;

  const props = { ...attribution(), step, ...properties };
  captureActivationFunnelEvent("v2_onboarding_step", props);

  if (step === "welcome") {
    trackOnboardingStarted();
  }
}

export function trackV2OnboardingEnergy(energy: V2Energy): void {
  captureActivationFunnelEvent("v2_onboarding_energy_chosen", {
    ...attribution(),
    energy_level: energy,
  });
  const mapped = mapEnergy(energy);
  if (mapped) {
    trackActivationFunnelStep("dagstart_energy_chosen", {
      energy_level: mapped,
      source: "v2",
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
  captureActivationFunnelEvent("v2_onboarding_cycle_choice", {
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
  trackOnboardingCompleted({ duration_bucket: "v2" });
  const mapped = mapEnergy(props.energy) ?? "medium";
  trackDagstartCompleted({
    energy_level: mapped,
    tasks_selected_count: Math.min(3, Math.max(0, props.thingCount)),
    has_cycle_phase: props.cycleOptIn,
    source: "v2",
    db_persisted: false,
  });
}

export function trackV2AccountSaveShown(surface: "home"): void {
  captureActivationFunnelEvent("v2_account_save_shown", {
    ...attribution(),
    surface,
    after_first_value: true,
  });
}

export function trackV2AccountSaveClicked(surface: "home"): void {
  captureActivationFunnelEvent("v2_account_save_clicked", {
    ...attribution(),
    surface,
    after_first_value: true,
  });
}
