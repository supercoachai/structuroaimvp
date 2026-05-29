import { consumeCreateWelcomeTaskFlag } from "@/lib/onboardingWelcomeTask";

export type WelcomeTaskDecisionSource =
  | "stripe_metadata"
  | "session_storage"
  | "none";

export type WelcomeTaskCheckoutDecision = {
  shouldCreate: boolean;
  source: WelcomeTaskDecisionSource;
  hadCheckoutSessionId: boolean;
  metadataLookupFailed: boolean;
};

/** Primair: Stripe Checkout metadata via session_id. Fallback: sessionStorage (zelfde tab). */
export async function resolveWelcomeTaskAfterCheckout(): Promise<WelcomeTaskCheckoutDecision> {
  if (typeof window === "undefined") {
    return {
      shouldCreate: false,
      source: "none",
      hadCheckoutSessionId: false,
      metadataLookupFailed: false,
    };
  }

  const sessionId = new URLSearchParams(window.location.search).get("session_id")?.trim();
  const hadCheckoutSessionId = Boolean(sessionId?.startsWith("cs_"));

  if (hadCheckoutSessionId && sessionId) {
    try {
      const res = await fetch(
        `/api/checkout/welcome-task?session_id=${encodeURIComponent(sessionId)}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = (await res.json()) as { addWelcomeTask?: boolean };
        return {
          shouldCreate: data.addWelcomeTask === true,
          source: "stripe_metadata",
          hadCheckoutSessionId: true,
          metadataLookupFailed: false,
        };
      }
    } catch {
      /* fallback below */
    }

    const fromStorage = consumeCreateWelcomeTaskFlag();
    return {
      shouldCreate: fromStorage,
      source: fromStorage ? "session_storage" : "none",
      hadCheckoutSessionId: true,
      metadataLookupFailed: true,
    };
  }

  const fromStorage = consumeCreateWelcomeTaskFlag();
  return {
    shouldCreate: fromStorage,
    source: fromStorage ? "session_storage" : "none",
    hadCheckoutSessionId: false,
    metadataLookupFailed: false,
  };
}
