import { freeTrialExpired } from "@/lib/freeTrialAccess";
import { hasActiveAppTrialOverride } from "@/lib/appTrialOverride";
import {
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

function trialIsExpired(c: LifecycleCandidate): boolean {
  if (c.subscription_status === "trial_expired") return true;
  if (PAID_STATUSES.has(c.subscription_status ?? "")) return false;
  if (hasActiveAppTrialOverride(c.app_trial_override_until)) return false;
  if (hasEventSignupAppTrial(c.created_at, c.signup_source)) {
    return eventSignupTrialExpired(c.created_at, c.signup_source);
  }
  return freeTrialExpired(c.created_at, c.signup_source);
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

/** Lokale uur in Europe/Amsterdam (0–23). */
export function amsterdamHour(now: Date): number {
  const hourStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    hour: "numeric",
    hourCycle: "h23",
  }).format(now);
  const hour = Number(hourStr);
  return Number.isFinite(hour) ? hour : now.getUTCHours();
}

/** Geen checkout-recover 's nachts (22:00–07:59 Amsterdam). */
export function isCheckoutRecoverSendWindow(now: Date): boolean {
  const hour = amsterdamHour(now);
  return hour >= 8 && hour < 22;
}

/**
 * 7-daagse Stripe card-trial drip (status trialing + period_end).
 *
 * daysLeft ≈ kalenderdag vóór charge:
 *   6/5 → ~dag 1 soft return (S1, morning)
 *   ≥3 + stil ≥2d → habit nudge (S2, evening)
 *   3   → waarde-mail als er checkins zijn (S3, evening)
 *   2/1 → pre-charge met stopknop (S4, evening)  ← ~2 dagen vóór charge
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

  // Mid-trial stilte vóór pre-charge-venster (één keer via cohortKey)
  if (
    daysLeft >= 3 &&
    checkins >= 1 &&
    sinceCheckin !== null &&
    sinceCheckin >= 2
  ) {
    out.push("s2_still");
  }

  // Drie dagen vóór charge: waarde als er ritme is
  if (daysLeft === 3 && checkins >= 2) {
    out.push("s3_value");
  }

  // ~2 dagen vóór charge (+ dag-1 vangnet)
  if (daysLeft === 2 || daysLeft === 1) {
    out.push("s4_pre_paywall");
  }

  return out;
}

/**
 * Checkout abandon: account + ≥1 checkin + checkout-intent, nog geen trial.
 * Mail 1: T+2–48u. Mail 2: T+48–96u. Geen nacht-sends.
 */
function eligibleCheckoutAbandon(
  c: LifecycleCandidate,
  now: Date
): LifecycleTemplateId[] {
  const status = (c.subscription_status ?? "").toLowerCase();
  if (status === "trialing" || status === "active") return [];
  if (!c.checkout_started_at) return [];
  if ((c.checkin_count ?? 0) < 1) return [];
  if (!isCheckoutRecoverSendWindow(now)) return [];

  const hours = hoursSince(c.checkout_started_at, now);
  const out: LifecycleTemplateId[] = [];

  if (hours >= 2 && hours < 48) {
    out.push("s0_checkout_resume");
  }
  if (hours >= 48 && hours < 96) {
    out.push("s0_checkout_help");
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
  const expired = trialIsExpired(c);
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

  // Checkout abandon recover (alleen zonder Stripe-trial)
  out.push(...eligibleCheckoutAbandon(c, now));

  // S1–S4: alleen via Stripe card-trial tak hierboven (trialing + period_end).

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
      return [
        "s0_hello",
        "s0_welcome",
        "s0_checkout_resume",
        "s0_checkout_help",
      ];
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
 * P0: hello/nudge/checkout-recover + dag2/stil/waarde + pre-charge/paywall.
 * S3 zit in P0 zodat de 7-daagse card-trial waarde-mail ook zonder &full=1 gaat.
 */
export function templatesForWaveP0(wave: LifecycleWave): LifecycleTemplateId[] {
  switch (wave) {
    case "welcome":
      return [
        "s0_hello",
        "s0_welcome",
        "s0_checkout_resume",
        "s0_checkout_help",
      ];
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
