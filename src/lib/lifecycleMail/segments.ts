import {
  freeTrialDaysLeft,
  freeTrialExpired,
  hasFreeTrial,
} from "@/lib/freeTrialAccess";
import { hasActiveAppTrialOverride } from "@/lib/appTrialOverride";
import {
  eventSignupTrialDaysLeft,
  eventSignupTrialExpired,
  hasEventSignupAppTrial,
} from "@/lib/eventSignupTrialAccess";
import { resolveStripeTrialDaysForSignupSource } from "@/lib/stripe/trialConfig";

import type { LifecycleCandidate, LifecycleTemplateId, LifecycleWave } from "./types";

const PAID_STATUSES = new Set(["active", "trialing"]);

function hoursSince(iso: string, now: Date): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return (now.getTime() - t) / (1000 * 60 * 60);
}

function daysSinceCheckin(ymd: string | null, now: Date): number | null {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  const then = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((today - then) / (1000 * 60 * 60 * 24));
}

function trialDaysLeft(c: LifecycleCandidate, now: Date): number {
  if (hasActiveAppTrialOverride(c.app_trial_override_until)) {
    const end = new Date(c.app_trial_override_until!).getTime();
    const msLeft = end - now.getTime();
    if (msLeft <= 0) return 0;
    return Math.ceil(msLeft / (24 * 60 * 60 * 1000));
  }
  if (hasEventSignupAppTrial(c.created_at, c.signup_source)) {
    return eventSignupTrialDaysLeft(c.created_at, c.signup_source);
  }
  if (hasFreeTrial(c.created_at)) {
    return freeTrialDaysLeft(c.created_at);
  }
  return 0;
}

function trialIsActive(c: LifecycleCandidate, now: Date): boolean {
  if (PAID_STATUSES.has(c.subscription_status ?? "")) return false;
  if (hasActiveAppTrialOverride(c.app_trial_override_until)) return true;
  if (hasEventSignupAppTrial(c.created_at, c.signup_source)) return true;
  return hasFreeTrial(c.created_at);
}

function trialIsExpired(c: LifecycleCandidate): boolean {
  if (c.subscription_status === "trial_expired") return true;
  if (PAID_STATUSES.has(c.subscription_status ?? "")) return false;
  if (hasActiveAppTrialOverride(c.app_trial_override_until)) return false;
  if (hasEventSignupAppTrial(c.created_at, c.signup_source)) {
    return eventSignupTrialExpired(c.created_at, c.signup_source);
  }
  return freeTrialExpired(c.created_at);
}

function daysSinceSignup(c: LifecycleCandidate, now: Date): number {
  const t = new Date(c.created_at).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((now.getTime() - t) / (24 * 60 * 60 * 1000));
}

/**
 * Welke templates mag deze candidate krijgen op dit moment?
 * Idempotentie (al verstuurd) gebeurt in de runner, niet hier.
 */
export function eligibleTemplatesForCandidate(
  c: LifecycleCandidate,
  now = new Date()
): LifecycleTemplateId[] {
  if (c.unsubscribe_lifecycle || c.is_test) return [];
  if (!c.email?.trim()) return [];
  if (PAID_STATUSES.has((c.subscription_status ?? "").toLowerCase())) return [];

  const out: LifecycleTemplateId[] = [];
  const hours = hoursSince(c.created_at, now);
  const checkins = c.checkin_count ?? 0;
  const active = trialIsActive(c, now);
  const expired = trialIsExpired(c);
  const daysLeft = trialDaysLeft(c, now);
  const sinceCheckin = daysSinceCheckin(c.last_checkin_date, now);
  const signupDay = daysSinceSignup(c, now);
  const trialLen = resolveStripeTrialDaysForSignupSource(c.signup_source);

  // S0: 2–24u na signup, nog 0 checkins
  if (hours >= 2 && hours < 24 && checkins === 0 && !expired) {
    out.push("s0_welcome");
  }

  // S1: trial dag 2 (signupDay === 1), wel eerdere checkin, niet gisteren
  if (
    active &&
    signupDay === 1 &&
    checkins >= 1 &&
    (sinceCheckin === null || sinceCheckin >= 1)
  ) {
    out.push("s1_day2");
  }

  // S2: trial actief, 48u+ stil, wel ooit checkin, max 1x (cohort in log)
  if (active && checkins >= 1 && sinceCheckin !== null && sinceCheckin >= 2) {
    out.push("s2_still");
  }

  // S3: trial dag 3 of ≥3 checkins op laatste trial-dagen
  if (
    active &&
    checkins >= 3 &&
    (signupDay >= trialLen - 1 || daysLeft <= 1)
  ) {
    out.push("s3_value");
  }

  // S4: laatste volle dag (1 dag over)
  if (active && daysLeft === 1) {
    out.push("s4_pre_paywall");
  }

  // S5: trial expired, geen abo
  if (expired && !PAID_STATUSES.has(c.subscription_status ?? "")) {
    // Alleen eerste dagen na expiry (niet eindeloos)
    if (signupDay <= trialLen + 2) {
      out.push("s5_paywall");
    }
  }

  // S6: expired ≥7d, ≥2 checkins ooit
  if (expired && checkins >= 2 && signupDay >= trialLen + 7) {
    out.push("s6_winback");
  }

  return out;
}

/** Templates per cron-wave (P0: welcome/morning/evening). */
export function templatesForWave(wave: LifecycleWave): LifecycleTemplateId[] {
  switch (wave) {
    case "welcome":
      return ["s0_welcome"];
    case "morning":
      return ["s1_day2", "s5_paywall", "s6_winback"];
    case "evening":
      return ["s2_still", "s3_value", "s4_pre_paywall"];
    default: {
      const _e: never = wave;
      throw new Error(`Onbekende wave: ${_e}`);
    }
  }
}

/** P0-only: S0/S4/S5 (beslisdocument week 1). */
export function templatesForWaveP0(wave: LifecycleWave): LifecycleTemplateId[] {
  switch (wave) {
    case "welcome":
      return ["s0_welcome"];
    case "morning":
      return ["s5_paywall"];
    case "evening":
      return ["s4_pre_paywall"];
    default: {
      const _e: never = wave;
      throw new Error(`Onbekende wave: ${_e}`);
    }
  }
}
