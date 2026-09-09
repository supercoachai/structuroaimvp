import { trackOpinly, trackOpinlyPurchase } from "./browser";

const SEEN_PREFIX = "opinly_checkout_tracked_";

function alreadyTracked(orderId: string): boolean {
  try {
    return sessionStorage.getItem(SEEN_PREFIX + orderId) === "1";
  } catch {
    return false;
  }
}

function markTracked(orderId: string): void {
  try {
    sessionStorage.setItem(SEEN_PREFIX + orderId, "1");
  } catch {
    /* privémodus */
  }
}

/** Bevestigingspagina na hosted Stripe Checkout. Dedupe't met de webhook via session.id. */
export async function trackOpinlyCheckoutConfirmation(
  sessionId: string | null | undefined
): Promise<void> {
  const orderId = sessionId?.trim();
  if (!orderId?.startsWith("cs_") || alreadyTracked(orderId)) return;

  try {
    const res = await fetch(
      `/api/checkout/session-status?session_id=${encodeURIComponent(orderId)}`,
      { credentials: "include" }
    );
    if (!res.ok) return;
    const data = (await res.json()) as {
      paid?: boolean;
      value?: number;
      currency?: string;
    };
    if (!data.paid) return;

    const value = typeof data.value === "number" ? data.value : 0;
    const currency = (data.currency || "EUR").toUpperCase();
    if (value > 0) {
      trackOpinlyPurchase({ value, currency, orderId });
    } else {
      trackOpinly(
        "start_trial",
        { currency, value: 0 },
        { externalEventId: orderId }
      );
    }
    markTracked(orderId);
  } catch {
    /* best-effort */
  }
}

export function trackOpinlyWalletConfirmation(input: {
  subscriptionId?: string | null;
  value?: number;
  currency?: string;
  status?: string | null;
}): void {
  const orderId = input.subscriptionId?.trim();
  if (!orderId || alreadyTracked(orderId)) return;
  const value = typeof input.value === "number" ? input.value : 0;
  const currency = (input.currency || "EUR").toUpperCase();
  if (value > 0) {
    trackOpinlyPurchase({ value, currency, orderId });
  } else {
    trackOpinly(
      "start_trial",
      { plan: input.status ?? undefined, currency, value: 0 },
      { externalEventId: orderId }
    );
  }
  markTracked(orderId);
}
