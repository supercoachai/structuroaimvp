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

import {
  isStripeCardTrialing,
  resolveLifecycleTrialDays,
} from "./trialLength";
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

function stripeTrialDaysLeft(c: LifecycleCandidate, now: Date): number {
  const endIso = c.subscription_current_period_end;
  if (!endIso) return 0;
  const end = new Date(endIso).getTime();
  if (Number.isNaN(end) || end <= now.getTime()) return 0;
  return Math.ceil((end - now.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * 7-daagse Stripe card-trial drip (status trialing + period_end).
 *
 * daysLeft ≈ kalenderdag vóór charge:
 *   6/5 → ~dag 1 soft return (S1, morning)
 *   4   → stilte-mail als idle (S2, evening)
 *   2   → waarde-mail als er checkins zijn (S3, evening)
 *   1   → pre-charge met stopknop (S4, evening)  ← paywall-belofte
 */
function eligibleForStripeCardTrial(
  c: LifecycleCandidate,
  now: Date
): LifecycleTemplateId[] {
  const daysLeft = stripeTrialDaysLeft(c, now);
  if (daysLeft <= 0) return [];

  const out: LifecycleTemplateId[] = [];
  const checkins = c.checkin_count ?? 0;
  const sinceCheckin = daysSinceCheckin(c.last_checkin_date, now);

  // ~Dag 1: zachte terugkeer (twee dagen venster voor cron-missers)
  if (daysLeft === 6 || daysLeft === 5) {
    out.push("s1_day2");
  }

  // Mid-trial: alleen als stil (≥2 dagen geen checkin, wél ooit begonnen)
  if (
    daysLeft === 4 &&
    checkins >= 1 &&
    sinceCheckin !== null &&
    sinceCheckin >= 2
  ) {
    out.push("s2_still");
  }

  // Twee dagen vóór charge: waarde als er ritme is
  if (daysLeft === 2 && checkins >= 2) {
    out.push("s3_value");
  }

  // Dag 6 / laatste volle dag: altijd de stopmail
  if (daysLeft === 1) {
    out.push("s4_pre_paywall");
  }

  return out;
}

/**
 * Welke templates mag deze candidate krijgen op dit moment?
 * Idempotentie (al verstuurd) gebeurt in de runner, niet hier.
 */
export function eligibleTemplatesForCandidate(
  c: LifecycleCandidate,
  now = new Date()
): LifecycleTemplateId[] {
  if (c.unsubscribe_lifecycle) return [];
  if (!c.email?.trim()) return [];

  const status = (c.subscription_status ?? "").toLowerCase();
  if (status === "active") return [];

  // Stripe card-trial: eigen 7-daagse drip op period_end.
  if (isStripeCardTrialing(c)) {
    return eligibleForStripeCardTrial(c, now);
  }

  const out: LifecycleTemplateId[] = [];
  const hours = hoursSince(c.created_at, now);
  const checkins = c.checkin_count ?? 0;
  const active = trialIsActive(c, now);
  const expired = trialIsExpired(c);
  const daysLeft = trialDaysLeft(c, now);
  const sinceCheckin = daysSinceCheckin(c.last_checkin_date, now);
  const signupDay = daysSinceSignup(c, now);
  const trialLen = resolveLifecycleTrialDays(c);

  // S0 hello: directe welkom (ook mét checkin), 1× binnen 24u
  if (hours >= 0 && hours < 24 && !expired) {
    out.push("s0_hello");
  }

  // S0 welcome nudge: later als nog geen checkin (6–48u)
  if (hours >= 6 && hours < 48 && checkins === 0 && !expired) {
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

  // S2: trial actief, 48u+ stil, wel ooit checkin
  if (active && checkins >= 1 && sinceCheckin !== null && sinceCheckin >= 2) {
    out.push("s2_still");
  }

  // S3: late trial + genoeg ritme (werkt voor 3d én langere event-trials)
  if (
    active &&
    checkins >= 3 &&
    (signupDay >= Math.max(1, trialLen - 2) || daysLeft <= 2)
  ) {
    out.push("s3_value");
  }

  // S4: laatste volle dag (1 dag over)
  if (active && daysLeft === 1) {
    out.push("s4_pre_paywall");
  }

  // S5: trial expired, geen abo
  if (expired && !PAID_STATUSES.has(c.subscription_status ?? "")) {
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
      return ["s0_hello", "s0_welcome"];
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

/**
 * P0: hello/nudge + dag2/stil/waarde + pre-charge/paywall.
 * S3 zit in P0 zodat de 7-daagse card-trial waarde-mail ook zonder &full=1 gaat.
 */
export function templatesForWaveP0(wave: LifecycleWave): LifecycleTemplateId[] {
  switch (wave) {
    case "welcome":
      return ["s0_hello", "s0_welcome"];
    case "morning":
      return ["s1_day2", "s5_paywall"];
    case "evening":
      return ["s2_still", "s3_value", "s4_pre_paywall"];
    default: {
      const _e: never = wave;
      throw new Error(`Onbekende wave: ${_e}`);
    }
  }
}
