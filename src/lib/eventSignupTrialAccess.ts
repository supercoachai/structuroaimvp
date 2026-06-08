import {
  isEventSignupSource,
  resolveStripeTrialDaysForSignupSource,
} from "@/lib/stripe/trialConfig";

/** Einde van de app-proefperiode voor event-kanalen (QR), zonder Stripe bij signup. */
export function eventSignupTrialEndMs(
  created_at: string | null | undefined,
  signup_source: string | null | undefined
): number | null {
  if (!created_at || !isEventSignupSource(signup_source)) return null;
  const days = resolveStripeTrialDaysForSignupSource(signup_source);
  const start = new Date(created_at).getTime();
  if (isNaN(start)) return null;
  return start + days * 24 * 60 * 60 * 1000;
}

export function hasEventSignupAppTrial(
  created_at: string | null | undefined,
  signup_source: string | null | undefined
): boolean {
  const end = eventSignupTrialEndMs(created_at, signup_source);
  if (end === null) return false;
  return Date.now() < end;
}

export function eventSignupTrialDaysLeft(
  created_at: string | null | undefined,
  signup_source: string | null | undefined
): number {
  const end = eventSignupTrialEndMs(created_at, signup_source);
  if (end === null) return 0;
  const msLeft = end - Date.now();
  if (msLeft <= 0) return 0;
  return Math.ceil(msLeft / (24 * 60 * 60 * 1000));
}

export function eventSignupTrialExpired(
  created_at: string | null | undefined,
  signup_source: string | null | undefined
): boolean {
  const end = eventSignupTrialEndMs(created_at, signup_source);
  if (end === null) return false;
  return Date.now() >= end;
}
