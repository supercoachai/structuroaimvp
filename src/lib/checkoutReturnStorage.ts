const CHECKOUT_RETURN_KEY = "structuro_checkout_return";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type CheckoutReturnPayload = {
  email: string;
  stripeSessionId?: string;
  startedAt: number;
};

export function markCheckoutStarted(
  email: string,
  stripeSessionId?: string
): void {
  if (typeof window === "undefined") return;
  const payload: CheckoutReturnPayload = {
    email: email.trim().toLowerCase(),
    stripeSessionId: stripeSessionId?.trim() || undefined,
    startedAt: Date.now(),
  };
  try {
    sessionStorage.setItem(CHECKOUT_RETURN_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readCheckoutReturn(): CheckoutReturnPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_RETURN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutReturnPayload;
    if (!parsed?.email || typeof parsed.startedAt !== "number") return null;
    if (Date.now() - parsed.startedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(CHECKOUT_RETURN_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearCheckoutReturn(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CHECKOUT_RETURN_KEY);
  } catch {
    /* ignore */
  }
}

export function resolveCheckoutSessionId(
  urlSessionId: string | null | undefined
): string | null {
  const fromUrl = urlSessionId?.trim();
  if (fromUrl?.startsWith("cs_")) return fromUrl;
  const stored = readCheckoutReturn()?.stripeSessionId?.trim();
  if (stored?.startsWith("cs_")) return stored;
  return null;
}
