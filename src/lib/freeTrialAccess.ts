/**
 * Legacy gratis proeftijd (pre v2 card-cohort).
 *
 * V2 card-cohort (na cutoff) heeft geen app-trial zonder Stripe-checkout.
 * Event-kanalen (jasper_podcast, adhd_cafe) en gift_comp houden hun eigen trial.
 *
 * Na afloop wordt de gebruiker doorgestuurd naar /abonnement (via de middleware paywall).
 */

import { isGiftCompSignupSource } from "@/lib/giftCompAccess";
import { isEventSignupSource } from "@/lib/stripe/trialConfig";
import { isV2CardTrialCohort } from "@/lib/stripe/v2CardTrial";

export const FREE_TRIAL_DAYS = 3;

export type LegacyFreeTrialRow = {
  created_at?: string | null;
  signup_source?: string | null;
};

/** V2 card-cohort zonder event/gift: geen legacy 3-dagen app-trial. */
export function skipsLegacyFreeTrial(
  row: LegacyFreeTrialRow | null | undefined
): boolean {
  if (!row?.created_at) return false;
  if (!isV2CardTrialCohort(row.created_at)) return false;
  if (isEventSignupSource(row.signup_source)) return false;
  if (isGiftCompSignupSource(row.signup_source)) return false;
  return true;
}

/** Unix-timestamp (ms) waarop de proeftijd afloopt. */
function trialEndMs(created_at: string): number {
  return new Date(created_at).getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * True als de gebruiker nog binnen de proeftijd zit.
 * created_at komt uit profiles.created_at (ISO-string).
 */
export function hasFreeTrial(
  created_at: string | null | undefined,
  signup_source?: string | null
): boolean {
  if (skipsLegacyFreeTrial({ created_at, signup_source })) return false;
  if (!created_at) return false;
  const end = trialEndMs(created_at);
  if (isNaN(end)) return false;
  return Date.now() < end;
}

/**
 * Aantal volle dagen dat de proeftijd nog loopt (afgerond naar boven, minimaal 1
 * als er nog tijd over is). Geeft 0 terug als de proeftijd verlopen is.
 */
export function freeTrialDaysLeft(
  created_at: string | null | undefined,
  signup_source?: string | null
): number {
  if (skipsLegacyFreeTrial({ created_at, signup_source })) return 0;
  if (!created_at) return 0;
  const end = trialEndMs(created_at);
  if (isNaN(end)) return 0;
  const msLeft = end - Date.now();
  if (msLeft <= 0) return 0;
  return Math.ceil(msLeft / (24 * 60 * 60 * 1000));
}

/**
 * True als de proeftijd ooit is gestart (created_at bestaat) maar inmiddels
 * verlopen is. Gebruik dit voor de "trial expired" messaging op /abonnement.
 */
export function freeTrialExpired(
  created_at: string | null | undefined,
  signup_source?: string | null
): boolean {
  if (skipsLegacyFreeTrial({ created_at, signup_source })) return false;
  if (!created_at) return false;
  const end = trialEndMs(created_at);
  if (isNaN(end)) return false;
  return Date.now() >= end;
}
