let cachedPublishableKey: string | null | undefined;

/** Publieke Stripe key voor Payment Request / Apple Pay op eigen site. */
export function getStripePublishableKey(): string | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return key || null;
}

/** Fallback als NEXT_PUBLIC_* niet in de client-bundle staat (runtime ophalen via API). */
export async function resolveStripePublishableKey(): Promise<string | null> {
  const inlined = getStripePublishableKey();
  if (inlined) return inlined;

  if (cachedPublishableKey !== undefined) {
    return cachedPublishableKey;
  }

  try {
    const res = await fetch("/api/stripe/config", { credentials: "include" });
    if (!res.ok) {
      cachedPublishableKey = null;
      return null;
    }
    const data = (await res.json()) as { publishableKey?: string };
    cachedPublishableKey = data.publishableKey?.trim() || null;
    return cachedPublishableKey;
  } catch {
    cachedPublishableKey = null;
    return null;
  }
}
