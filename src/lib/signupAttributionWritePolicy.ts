import {
  isWeakProfileSourceForJasperUpgrade,
  JASPER_SIGNUP_SOURCE,
} from "@/lib/jasper/jasperOffer";
import { isGiftCompSignupSource } from "@/lib/giftCompAccess";
import {
  isEventSignupSource,
  normalizeSignupSourceKey,
} from "@/lib/stripe/trialConfig";

export type SignupAttributionWriteDecision =
  | "skip_empty"
  | "reject_entitlement"
  | "already_set"
  | "write";

/** Zelfde sanitizing als client-attributie: letters, cijfers, _ en -. */
export function sanitizeSignupAttributionValue(
  raw: string | null | undefined,
  max = 64
): string {
  const t = (raw ?? "").trim().slice(0, max);
  if (!t) return "";
  return t.replace(/[^a-zA-Z0-9_-]/g, "");
}

/**
 * Bronnen die de ingelogde client mag ná-schrijven (alleen als het profiel
 * nog leeg is). Geen event-trial en geen gift_comp: die gaan via signup-trigger
 * of auth-callback (service_role).
 */
export function isClientPersistableSignupSource(
  source: string | null | undefined
): boolean {
  const key = normalizeSignupSourceKey(source);
  if (!key || key === "direct") return false;
  if (isGiftCompSignupSource(key)) return false;
  if (isEventSignupSource(key)) return false;
  return true;
}

/** Beslisregel voor POST /api/profile/signup-attribution. */
export function shouldApplySignupAttributionWrite(opts: {
  currentSource: string | null | undefined;
  proposedSource: string | null | undefined;
}): SignupAttributionWriteDecision {
  const proposed = sanitizeSignupAttributionValue(opts.proposedSource);
  const proposedKey = normalizeSignupSourceKey(proposed);
  if (!proposedKey || proposedKey === "direct") return "skip_empty";
  if (isGiftCompSignupSource(proposedKey) || isEventSignupSource(proposedKey)) {
    return "reject_entitlement";
  }
  const current = normalizeSignupSourceKey(opts.currentSource);
  if (current) return "already_set";
  return "write";
}

/**
 * Auth-callback (service_role, first-touch cookie): event-QR mag op een leeg
 * profiel, gift_comp nooit, jasper mag zwakke bronnen upgraden.
 */
export function shouldWriteSignupSourceFromAuthCallback(opts: {
  currentSource: string | null | undefined;
  attrSource: string | null | undefined;
}): boolean {
  const attr = normalizeSignupSourceKey(opts.attrSource);
  if (!attr || attr === "direct") return false;
  if (isGiftCompSignupSource(attr)) return false;
  const current = normalizeSignupSourceKey(opts.currentSource);
  if (!current) return true;
  if (
    attr === JASPER_SIGNUP_SOURCE &&
    isWeakProfileSourceForJasperUpgrade(current)
  ) {
    return true;
  }
  return false;
}
