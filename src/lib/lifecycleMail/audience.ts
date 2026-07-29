import { isV2CardTrialCohort } from "@/lib/stripe/v2CardTrial";
import { isEventSignupSource } from "@/lib/stripe/trialConfig";

import type { LifecycleCandidate } from "./types";

/**
 * Lifecycle-mail bereik. Standaard UIT voor v1-productiegebruikers.
 *
 * - off: niets doen (geen sends, geen candidate-scan)
 * - test: alleen is_test / allowlist / protected testaccount
 * - v2: card-cohort + event-signups + actieve Stripe-trialing (veilige live)
 * - all: echte cohort (pas bij bewuste full launch + ALLOW_V1)
 */
export type LifecycleMailAudience = "off" | "test" | "v2" | "all";

export function resolveLifecycleMailAudience(): LifecycleMailAudience {
  const raw = (process.env.LIFECYCLE_MAIL_AUDIENCE ?? "off").trim().toLowerCase();
  if (raw === "test" || raw === "all" || raw === "off" || raw === "v2") {
    return raw;
  }
  return "off";
}

export function lifecycleMailSendsEnabled(): boolean {
  return (
    process.env.LIFECYCLE_MAIL_ENABLED === "1" ||
    process.env.LIFECYCLE_MAIL_ENABLED === "true"
  );
}

/** Comma-separated emails die bij audience=test wél mogen. */
export function lifecycleMailTestAllowlist(): Set<string> {
  const raw = process.env.LIFECYCLE_MAIL_TEST_ALLOWLIST?.trim() ?? "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** Wie hoort bij audience=v2 (geen legacy v1 free-trial spam). */
export function isLifecycleV2AudienceCandidate(
  c: Pick<
    LifecycleCandidate,
    "created_at" | "signup_source" | "subscription_status" | "subscription_current_period_end" | "is_test"
  >
): boolean {
  if (c.is_test) return false;
  const status = (c.subscription_status ?? "").toLowerCase();
  if (status === "trialing" && c.subscription_current_period_end) return true;
  if (isEventSignupSource(c.signup_source)) return true;
  return isV2CardTrialCohort(c.created_at);
}
